"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { retryIngestion, runIngestion } from "@/server/services/ingestion";

// Every action re-checks admin rights on the server: forms are not a security boundary.

const uuid = z.string().uuid();
const placeSchema = z.object({
  id: uuid,
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000),
  kind: z.enum(["ATTRACTION", "RESTAURANT", "MUSEUM", "RELIGIOUS_SITE", "NATURE", "SHOPPING", "ACTIVITY", "VIEWPOINT", "OTHER"]),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  typicalVisitMins: z.union([z.literal(""), z.coerce.number().int().min(5).max(720)]),
  verificationStatus: z.enum(["UNVERIFIED", "COMMUNITY", "VERIFIED"]),
  isActive: z.string().optional(),
});

function fail(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
}

export async function updatePlace(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const parsed = placeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) fail(`/admin/places/${id}`, "Please check the fields: " + parsed.error.issues.map((i) => i.path.join(".")).join(", "));
  const d = parsed.data;
  const before = await prisma.place.findUniqueOrThrow({ where: { id: d.id } });
  await prisma.place.update({
    where: { id: d.id },
    data: {
      name: d.name,
      description: d.description || null,
      kind: d.kind,
      lat: d.lat,
      lng: d.lng,
      typicalVisitMins: d.typicalVisitMins === "" ? null : d.typicalVisitMins,
      verificationStatus: d.verificationStatus,
      // Verification is a human statement made now, by an admin.
      lastVerifiedAt: d.verificationStatus === "VERIFIED" && before.verificationStatus !== "VERIFIED" ? new Date() : d.verificationStatus === "VERIFIED" ? before.lastVerifiedAt : null,
      isActive: d.isActive === "on",
    },
  });
  revalidatePath("/admin/places");
  redirect(`/admin/places/${d.id}?saved=1`);
}

const hm = z.string().regex(/^\d{2}:\d{2}$/);
const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));

export async function addOpeningHours(formData: FormData) {
  await requireAdmin();
  const placeId = uuid.parse(formData.get("placeId"));
  const parsed = z.object({ opens: hm, closes: hm, source: z.enum(["VERIFIED", "PROVIDER_ESTIMATE", "USER_REPORTED"]) }).safeParse(Object.fromEntries(formData));
  const days = formData.getAll("days").map(Number).filter((d) => d >= 0 && d <= 6);
  if (!parsed.success || days.length === 0) fail(`/admin/places/${placeId}`, "Choose at least one day and valid opening and closing times.");
  const opensMin = toMin(parsed.data.opens);
  const closesMin = toMin(parsed.data.closes);
  if (closesMin <= opensMin) fail(`/admin/places/${placeId}`, "Closing time must be after opening time.");
  await prisma.placeOpeningHour.createMany({
    data: days.map((dayOfWeek) => ({ placeId, dayOfWeek, opensMin, closesMin, source: parsed.data.source })),
  });
  redirect(`/admin/places/${placeId}?saved=1`);
}

export async function deleteOpeningHours(formData: FormData) {
  await requireAdmin();
  const placeId = uuid.parse(formData.get("placeId"));
  await prisma.placeOpeningHour.deleteMany({ where: { id: uuid.parse(formData.get("id")), placeId } });
  redirect(`/admin/places/${placeId}?saved=1`);
}

export async function addPrice(formData: FormData) {
  await requireAdmin();
  const placeId = uuid.parse(formData.get("placeId"));
  const parsed = z.object({
    kind: z.enum(["ENTRY_INDIAN", "ENTRY_FOREIGNER", "MEAL_AVG", "ACTIVITY"]),
    amountRupees: z.coerce.number().min(0).max(1_000_000),
    source: z.enum(["VERIFIED", "PROVIDER_ESTIMATE", "USER_REPORTED"]),
    notes: z.string().trim().max(300).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) fail(`/admin/places/${placeId}`, "Enter a valid price.");
  await prisma.placePrice.create({
    data: {
      placeId,
      kind: parsed.data.kind,
      amountPaise: Math.round(parsed.data.amountRupees * 100),
      source: parsed.data.source,
      verifiedAt: parsed.data.source === "VERIFIED" ? new Date() : null,
      notes: parsed.data.notes || null,
    },
  });
  redirect(`/admin/places/${placeId}?saved=1`);
}

export async function deletePrice(formData: FormData) {
  await requireAdmin();
  const placeId = uuid.parse(formData.get("placeId"));
  await prisma.placePrice.deleteMany({ where: { id: uuid.parse(formData.get("id")), placeId } });
  redirect(`/admin/places/${placeId}?saved=1`);
}

export async function resolveReport(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z.object({
    id: uuid,
    status: z.enum(["REVIEWING", "RESOLVED", "REJECTED"]),
    resolutionNote: z.string().trim().max(1000).optional(),
  }).parse(Object.fromEntries(formData));
  await prisma.placeReport.update({
    where: { id: parsed.id },
    data: {
      status: parsed.status,
      resolutionNote: parsed.resolutionNote || null,
      resolvedById: parsed.status === "REVIEWING" ? null : admin.id,
    },
  });
  revalidatePath("/admin/places/review");
}

export async function setFeedbackStatus(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ id: uuid, status: z.enum(["NEW", "REVIEWED", "CLOSED"]) }).parse(Object.fromEntries(formData));
  await prisma.feedback.update({ where: { id: parsed.id }, data: { status: parsed.status } });
  revalidatePath("/admin/feedback");
}

export async function startIngestion(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ provider: z.enum(["MANUAL", "OSM"]), cityId: uuid }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) fail("/admin/ingestion", "Choose a provider and a city.");
  await runIngestion(parsed.data.provider, parsed.data.cityId);
  revalidatePath("/admin/ingestion");
}

export async function retryJob(formData: FormData) {
  await requireAdmin();
  await retryIngestion(uuid.parse(formData.get("id")));
  revalidatePath("/admin/ingestion");
}
