import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TripWizard, type WizardValues } from "@/components/trip/trip-wizard";
import { todayIso } from "@/lib/utils/time";
import { requireUserPage } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { listDestinations } from "@/server/services/places";
import { toIsoDate } from "@/server/services/trips";

export const metadata: Metadata = { title: "Plan a trip" };

export default async function NewTripPage({ searchParams }: PageProps<"/trips/new">) {
  const user = await requireUserPage("/trips/new");
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const [destinations, preference] = await Promise.all([
    listDestinations(),
    prisma.userPreference.findUnique({ where: { profileId: user.id } }),
  ]);

  let initial: WizardValues = {
    destinationCityId: destinations.find((d) => d.slug === one("destination"))?.id ?? "",
    startDate: "",
    endDate: "",
    travellers: 2,
    totalBudgetRupees: "",
    travelStyle: one("style") ?? preference?.travelStyle ?? "",
    interests: preference?.interests ?? [],
    transportPref: "",
    accommodationPref: "",
    specialRequirements: "",
    title: "",
  };

  const draftId = one("draft") ?? null;
  if (draftId) {
    // Owner-only: a draft id from the URL never loads someone else's trip.
    const draft = /^[0-9a-f-]{36}$/i.test(draftId)
      ? await prisma.trip.findFirst({ where: { id: draftId, ownerId: user.id }, include: { budget: true } })
      : null;
    if (!draft) notFound();
    initial = {
      destinationCityId: draft.destinationCityId,
      startDate: toIsoDate(draft.startDate),
      endDate: toIsoDate(draft.endDate),
      travellers: draft.travellers,
      totalBudgetRupees: draft.budget ? String(draft.budget.totalPaise / 100n) : "",
      travelStyle: draft.travelStyle ?? "",
      interests: draft.interests,
      transportPref: draft.transportPref ?? "",
      accommodationPref: draft.accommodationPref ?? "",
      specialRequirements: draft.specialRequirements ?? "",
      title: draft.title,
    };
  }

  return (
    <TripWizard
      destinations={destinations.filter((d) => d.placeCount > 0)}
      initial={initial}
      draftId={draftId}
      today={todayIso()}
    />
  );
}
