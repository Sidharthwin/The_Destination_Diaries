import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { CreateTripInput, UpdateTripInput } from "@/lib/validation/trips";
import { prisma } from "@/server/db/prisma";
import { ServiceError, notFound } from "@/server/errors";

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function fromIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

/** Inclusive list of ISO dates between two ISO dates. */
export function dateRange(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  for (let t = Date.parse(`${startIso}T00:00:00Z`); t <= Date.parse(`${endIso}T00:00:00Z`); t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export function tripDayCount(trip: { startDate: Date; endDate: Date }): number {
  return Math.round((trip.endDate.getTime() - trip.startDate.getTime()) / 86_400_000) + 1;
}

/**
 * Loads a trip only if the user may access it. Returns 404 (not 403) for
 * trips the user has no relationship with, so existence is never leaked.
 */
export async function loadTripForUser(tripId: string, userId: string, opts?: { write?: boolean }) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { collaborators: { where: { profileId: userId } } },
  });
  if (!trip) throw notFound("Trip");
  const isOwner = trip.ownerId === userId;
  const collab = trip.collaborators[0];
  if (!isOwner && !collab) throw notFound("Trip");
  if (opts?.write && !isOwner && collab?.roleInTrip !== "EDITOR") {
    throw new ServiceError("FORBIDDEN", "You have view-only access to this trip");
  }
  return { trip, isOwner };
}

/** Makes sure a TripDay row exists for every date; never deletes old days (history). */
async function syncTripDays(tx: Prisma.TransactionClient, tripId: string, startIso: string, endIso: string) {
  const dates = dateRange(startIso, endIso);
  const existing = await tx.tripDay.findMany({ where: { tripId } });
  const byIndex = new Map(existing.map((d) => [d.index, d]));
  for (const [index, iso] of dates.entries()) {
    const row = byIndex.get(index);
    if (!row) await tx.tripDay.create({ data: { tripId, index, date: fromIsoDate(iso) } });
    else if (toIsoDate(row.date) !== iso) {
      await tx.tripDay.update({ where: { id: row.id }, data: { date: fromIsoDate(iso) } });
    }
  }
}

export async function createTrip(userId: string, input: CreateTripInput) {
  const city = await prisma.city.findUnique({ where: { id: input.destinationCityId } });
  if (!city) throw new ServiceError("VALIDATION", "Unknown destination");

  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.create({
      data: {
        ownerId: userId,
        title: input.title,
        destinationCityId: city.id,
        startDate: fromIsoDate(input.startDate),
        endDate: fromIsoDate(input.endDate),
        travellers: input.travellers,
        status: "DRAFT",
        travelStyle: input.travelStyle,
        interests: input.interests,
        transportPref: input.transportPref,
        accommodationPref: input.accommodationPref,
        specialRequirements: input.specialRequirements || null,
        ...(input.totalBudgetRupees !== undefined
          ? { budget: { create: { totalPaise: BigInt(input.totalBudgetRupees) * 100n } } }
          : {}),
      },
    });
    await syncTripDays(tx, trip.id, input.startDate, input.endDate);
    return trip;
  });
}

export async function listTrips(userId: string) {
  const trips = await prisma.trip.findMany({
    where: { OR: [{ ownerId: userId }, { collaborators: { some: { profileId: userId } } }] },
    include: {
      destinationCity: { include: { district: { include: { state: true } } } },
      budget: true,
      activeVersion: { include: { _count: { select: { stops: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return trips.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    startDate: toIsoDate(t.startDate),
    endDate: toIsoDate(t.endDate),
    dayCount: tripDayCount(t),
    travellers: t.travellers,
    travelStyle: t.travelStyle,
    isOwner: t.ownerId === userId,
    destination: {
      name: t.destinationCity.name,
      slug: t.destinationCity.slug,
      state: t.destinationCity.district.state.name,
      heroImageUrl: t.destinationCity.heroImageUrl,
    },
    totalBudgetPaise: t.budget?.totalPaise ?? null,
    stopCount: t.activeVersion?._count.stops ?? 0,
    updatedAt: t.updatedAt,
  }));
}

export type TripListItem = Awaited<ReturnType<typeof listTrips>>[number];

export async function updateTrip(tripId: string, userId: string, input: UpdateTripInput) {
  const { trip } = await loadTripForUser(tripId, userId, { write: true });
  const startIso = input.startDate ?? toIsoDate(trip.startDate);
  const endIso = input.endDate ?? toIsoDate(trip.endDate);
  if (endIso < startIso) throw new ServiceError("VALIDATION", "End date must be on or after start date");
  if (dateRange(startIso, endIso).length > 21) {
    throw new ServiceError("VALIDATION", "Trips longer than 21 days are not supported yet");
  }
  const datesChanged = startIso !== toIsoDate(trip.startDate) || endIso !== toIsoDate(trip.endDate);
  if (input.destinationCityId && input.destinationCityId !== trip.destinationCityId) {
    if (trip.activeVersionId) {
      throw new ServiceError("CONFLICT", "The destination cannot change once an itinerary exists. Start a new trip instead.");
    }
    const city = await prisma.city.findUnique({ where: { id: input.destinationCityId } });
    if (!city) throw new ServiceError("VALIDATION", "Unknown destination");
  }

  await prisma.$transaction(async (tx) => {
    await tx.trip.update({
      where: { id: tripId },
      data: {
        title: input.title,
        destinationCityId: input.destinationCityId,
        startDate: fromIsoDate(startIso),
        endDate: fromIsoDate(endIso),
        travellers: input.travellers,
        travelStyle: input.travelStyle,
        interests: input.interests,
        transportPref: input.transportPref,
        accommodationPref: input.accommodationPref,
        specialRequirements:
          input.specialRequirements === undefined ? undefined : input.specialRequirements || null,
        status: input.status,
      },
    });
    if (input.totalBudgetRupees !== undefined) {
      const totalPaise = BigInt(input.totalBudgetRupees) * 100n;
      await tx.tripBudget.upsert({
        where: { tripId },
        update: { totalPaise },
        create: { tripId, totalPaise },
      });
    }
    if (datesChanged) await syncTripDays(tx, tripId, startIso, endIso);
  });
  return { datesChanged };
}

export async function deleteTrip(tripId: string, userId: string) {
  const { isOwner } = await loadTripForUser(tripId, userId, { write: true });
  if (!isOwner) throw new ServiceError("FORBIDDEN", "Only the trip owner can delete a trip");
  await prisma.$transaction([
    // Break the self-reference before cascading deletes.
    prisma.trip.update({ where: { id: tripId }, data: { activeVersionId: null } }),
    prisma.trip.delete({ where: { id: tripId } }),
  ]);
}

export async function setSharing(tripId: string, userId: string, enabled: boolean) {
  const { trip, isOwner } = await loadTripForUser(tripId, userId, { write: true });
  if (!isOwner) throw new ServiceError("FORBIDDEN", "Only the trip owner can change sharing");
  const shareSlug = trip.shareSlug ?? randomBytes(12).toString("base64url");
  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: { shareEnabled: enabled, shareSlug },
  });
  return { shareEnabled: updated.shareEnabled, shareSlug: updated.shareSlug! };
}

export async function addActualExpense(
  tripId: string,
  userId: string,
  input: { category: string; amountRupees: number; spentAt: string; note?: string; dayIndex?: number },
) {
  await loadTripForUser(tripId, userId, { write: true });
  const day =
    input.dayIndex === undefined
      ? null
      : await prisma.tripDay.findUnique({ where: { tripId_index: { tripId, index: input.dayIndex } } });
  return prisma.actualExpense.create({
    data: {
      tripId,
      tripDayId: day?.id ?? null,
      category: input.category as never,
      amountPaise: BigInt(Math.round(input.amountRupees * 100)),
      spentAt: fromIsoDate(input.spentAt),
      note: input.note || null,
      enteredById: userId,
    },
  });
}

export async function deleteActualExpense(tripId: string, userId: string, expenseId: string) {
  await loadTripForUser(tripId, userId, { write: true });
  const result = await prisma.actualExpense.deleteMany({ where: { id: expenseId, tripId } });
  if (result.count === 0) throw notFound("Expense");
}
