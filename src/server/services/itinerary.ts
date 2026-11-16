import type { Prisma } from "@prisma/client";
import type { AddStopInput, ReplanInput, UpdateStopInput } from "@/lib/validation/trips";
import { prisma } from "@/server/db/prisma";
import { ServiceError, notFound } from "@/server/errors";
import { getLlmProvider } from "@/server/providers/llm";
import type { Explanation } from "@/server/providers/llm/types";
import { getRoutingProvider } from "@/server/providers/routing";
import {
  budgetAlternatives, estimateTripCosts, summarizeBudget,
  type BudgetCategory, type EstimateInput, type KnownPrice, type UnavailableLine,
} from "@/server/services/budget/engine";
import { planItinerary } from "@/server/services/optimizer/planner";
import { paceConfig, timeDay } from "@/server/services/optimizer/scheduler";
import type {
  CandidatePlace, DayWarning, DroppedPlace, RouteEstimate, ScoreBreakdown,
} from "@/server/services/optimizer/types";
import { candidatesForCity } from "@/server/services/places";
import { loadTripForUser, toIsoDate, tripDayCount } from "@/server/services/trips";

// ───────────────────────── persisted plan metadata ─────────────────────────

export interface VersionMeta {
  input: {
    interests: string[];
    travelStyle: string | null;
    transportPref: string | null;
    paceFactor: number;
    excludedPlaceIds: string[];
    durationOverrides: Record<string, number>;
    reason?: string;
    note?: string;
  };
  notes: string[];
  dropped: (DroppedPlace & { placeName?: string })[];
  warningsByDay: Record<string, DayWarning[]>;
  scores: Record<string, ScoreBreakdown>;
  unavailable: UnavailableLine[];
  alternatives: { kind: string; message: string; estimatedPaise: number }[];
  explanation: Explanation | null;
  explanationSource: "ai" | "deterministic";
}

function emptyMeta(input: VersionMeta["input"]): VersionMeta {
  return {
    input, notes: [], dropped: [], warningsByDay: {}, scores: {}, unavailable: [],
    alternatives: [], explanation: null, explanationSource: "deterministic",
  };
}

function readMeta(json: unknown): VersionMeta {
  const m = (json ?? {}) as Partial<VersionMeta>;
  return {
    ...emptyMeta({
      interests: [], travelStyle: null, transportPref: null, paceFactor: 1,
      excludedPlaceIds: [], durationOverrides: {},
    }),
    ...m,
    input: {
      interests: [], travelStyle: null, transportPref: null, paceFactor: 1,
      excludedPlaceIds: [], durationOverrides: {},
      ...(m.input ?? {}),
    },
  };
}

const asJson = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

// ───────────────────────────── loading helpers ─────────────────────────────

const stopInclude = {
  place: {
    include: {
      categories: { include: { category: true } },
      openingHours: true,
      prices: true,
      city: true,
    },
  },
  tripDay: true,
} satisfies Prisma.ItineraryStopInclude;

type StopRow = Prisma.ItineraryStopGetPayload<{ include: typeof stopInclude }>;

function toCandidate(p: StopRow["place"]): CandidatePlace {
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    lat: p.lat,
    lng: p.lng,
    categories: p.categories.map((c) => c.category.slug),
    typicalVisitMins: p.typicalVisitMins,
    openingHours: p.openingHours.map((h) => ({
      dayOfWeek: h.dayOfWeek, opensMin: h.opensMin, closesMin: h.closesMin,
    })),
    verified: p.verificationStatus === "VERIFIED",
  };
}

function knownPrice(p: StopRow["place"]): KnownPrice | null {
  const wanted = p.kind === "ACTIVITY" ? ["ACTIVITY", "ENTRY_INDIAN"] : ["ENTRY_INDIAN"];
  const price = p.prices.find((x) => wanted.includes(x.kind));
  if (!price) return null;
  return { amountPaise: BigInt(price.amountPaise), source: price.source, perPerson: true };
}

async function activeDays(tripId: string, dayCount: number) {
  return prisma.tripDay.findMany({
    where: { tripId, index: { lt: dayCount } },
    orderBy: { index: "asc" },
  });
}

async function log(
  tripId: string,
  versionId: string | null,
  stage: string,
  startedAt: number,
  ok: boolean,
  extra?: { model?: string; inputTokens?: number; outputTokens?: number; error?: string },
) {
  try {
    await prisma.generationLog.create({
      data: { tripId, versionId, stage, durationMs: Date.now() - startedAt, ok, ...extra },
    });
  } catch {
    // Logging must never fail a generation.
  }
}

// ─────────────────── finalize: time, route, cost, validate ───────────────────

/**
 * Recomputes everything derived for a version from its stop order and visit
 * durations: clock times, route legs, cost estimates, warnings and
 * feasibility. Called after generation, replanning and every user edit, so
 * the stored plan is always internally consistent.
 */
async function finalizeVersion(versionId: string) {
  const version = await prisma.itineraryVersion.findUniqueOrThrow({
    where: { id: versionId },
    include: {
      trip: { include: { budget: true } },
      stops: { include: stopInclude, orderBy: [{ tripDay: { index: "asc" } }, { orderIndex: "asc" }] },
    },
  });
  const { trip } = version;
  const meta = readMeta(version.generationParams);
  const dayCount = tripDayCount(trip);
  const days = await activeDays(trip.id, dayCount);
  const cfg = paceConfig(trip.travelStyle, meta.input.paceFactor);
  const router = getRoutingProvider();

  const legRows: Prisma.RouteLegCreateManyInput[] = [];
  const estimateLegs: EstimateInput["legs"] = [];
  const estimateStops: EstimateInput["stops"] = [];
  const stopUpdates: { id: string; arrivalMin: number; departureMin: number }[] = [];
  meta.warningsByDay = {};
  const now = new Date();

  for (const day of days) {
    const dayStops = version.stops.filter((s) => s.tripDayId === day.id);
    if (dayStops.length === 0) continue;
    const places = dayStops.map((s) => toCandidate(s.place));
    const args = {
      dayIndex: day.index,
      date: toIsoDate(day.date),
      places,
      cfg,
      transportPref: trip.transportPref,
      lockedIds: new Set(dayStops.filter((s) => s.locked).map((s) => s.placeId)),
      durationOverrides: Object.fromEntries(dayStops.map((s) => [s.placeId, s.visitDurationMins])),
    };
    let planned = timeDay(args);

    // Replace heuristic legs with measured ones where a provider can answer.
    const measured = new Set<string>();
    if (router) {
      const overrides = new Map<string, RouteEstimate>();
      await Promise.all(
        planned.legs.map(async (leg, i) => {
          const m = await router.measure(places[i], places[i + 1], leg.mode);
          if (m) {
            const key = `${leg.fromPlaceId}>${leg.toPlaceId}`;
            overrides.set(key, { mode: m.mode, distanceMeters: m.distanceMeters, durationMins: m.durationMins });
            measured.add(key);
          }
        }),
      );
      if (overrides.size > 0) planned = timeDay({ ...args, legOverrides: overrides });
    }

    planned.stops.forEach((ps, i) => {
      stopUpdates.push({ id: dayStops[i].id, arrivalMin: ps.arrivalMin, departureMin: ps.departureMin });
      estimateStops.push({
        dayIndex: day.index,
        placeId: ps.placeId,
        placeName: dayStops[i].place.name,
        kind: dayStops[i].place.kind,
        price: knownPrice(dayStops[i].place),
      });
    });
    planned.legs.forEach((leg, i) => {
      legRows.push({
        versionId,
        fromStopId: dayStops[i].id,
        toStopId: dayStops[i + 1].id,
        mode: leg.mode,
        distanceMeters: leg.distanceMeters,
        durationMins: leg.durationMins,
        provider: measured.has(`${leg.fromPlaceId}>${leg.toPlaceId}`) ? "MAPBOX" : "HEURISTIC",
        estimatedAt: now,
      });
      estimateLegs.push({ dayIndex: day.index, mode: leg.mode, distanceMeters: leg.distanceMeters });
    });
    if (planned.warnings.length > 0) meta.warningsByDay[String(day.index)] = planned.warnings;
  }

  const estimateInput: EstimateInput = {
    travellers: trip.travellers,
    nights: Math.max(0, dayCount - 1),
    dayCount,
    travelStyle: trip.travelStyle,
    accommodationPref: trip.accommodationPref,
    legs: estimateLegs,
    stops: estimateStops,
  };
  const costs = estimateTripCosts(estimateInput);
  const estimatedTotal = costs.lines.reduce((s, l) => s + l.amountPaise, 0n);
  const budgetPaise = trip.budget?.totalPaise ?? null;
  const overBudget = budgetPaise !== null && estimatedTotal > budgetPaise;
  meta.unavailable = costs.unavailable;
  meta.alternatives = overBudget
    ? budgetAlternatives(estimateInput, budgetPaise!).map((a) => ({
        kind: a.kind, message: a.message, estimatedPaise: Number(a.estimatedPaise),
      }))
    : [];
  const hasWarnings = Object.keys(meta.warningsByDay).length > 0;
  const dayIdByIndex = new Map(days.map((d) => [d.index, d.id]));
  const stopIdByPlace = new Map(version.stops.map((s) => [s.placeId, s.id]));

  await prisma.$transaction([
    ...stopUpdates.map((u) =>
      prisma.itineraryStop.update({
        where: { id: u.id },
        data: { arrivalMin: u.arrivalMin, departureMin: u.departureMin },
      }),
    ),
    prisma.routeLeg.deleteMany({ where: { versionId } }),
    prisma.routeLeg.createMany({ data: legRows }),
    prisma.expenseEstimate.deleteMany({ where: { versionId } }),
    prisma.expenseEstimate.createMany({
      data: costs.lines.map((l) => ({
        versionId,
        tripDayId: l.dayIndex !== undefined ? (dayIdByIndex.get(l.dayIndex) ?? null) : null,
        stopId: l.placeId ? (stopIdByPlace.get(l.placeId) ?? null) : null,
        category: l.category,
        amountPaise: l.amountPaise,
        source: l.source,
        confidence: l.confidence,
        notes: l.notes,
      })),
    }),
    prisma.itineraryVersion.update({
      where: { id: versionId },
      data: {
        isFeasible: !overBudget && !hasWarnings,
        infeasibilityReason:
          overBudget || hasWarnings
            ? asJson({
                overBudget,
                estimatedPaise: Number(estimatedTotal),
                budgetPaise: budgetPaise === null ? null : Number(budgetPaise),
                scheduleWarnings: Object.values(meta.warningsByDay).flat().length,
                alternatives: meta.alternatives,
              })
            : undefined,
        generationParams: asJson(meta),
      },
    }),
  ]);
}

// ─────────────────────────── generate / replan ───────────────────────────

interface BuildOptions {
  origin: "GENERATOR" | "REPLAN";
  label: string;
  paceFactor: number;
  excludedPlaceIds: string[];
  retainPlaceIds: string[];
  locked: { placeId: string; dayIndex: number; note: string | null }[];
  durationOverrides: Record<string, number>;
  reason?: string;
  note?: string;
}

async function buildVersion(tripId: string, opts: BuildOptions) {
  const trip = await prisma.trip.findUniqueOrThrow({
    where: { id: tripId },
    include: { destinationCity: true },
  });
  const dayCount = tripDayCount(trip);
  const days = await activeDays(tripId, dayCount);
  let t0 = Date.now();

  const { candidates, center } = await candidatesForCity(trip.destinationCityId);
  await log(tripId, null, "candidates", t0, true);

  // AI interprets free-text requirements into structured preferences
  // (validated). Without AI, or if it fails, the plan proceeds unchanged.
  let interests = [...trip.interests];
  let paceFactor = opts.paceFactor;
  let pool = candidates;
  const llm = getLlmProvider();
  if (llm && trip.specialRequirements) {
    t0 = Date.now();
    try {
      const known = [...new Set(candidates.flatMap((c) => c.categories))];
      const res = await llm.interpretRequirements(trip.specialRequirements, known);
      if (res) {
        const avoid = res.value.avoidCategories.filter((c) => known.includes(c));
        const boost = res.value.boostCategories.filter((c) => known.includes(c));
        interests = [...new Set([...interests, ...boost])].filter((c) => !avoid.includes(c));
        if (avoid.length > 0) {
          pool = candidates.filter(
            (c) => c.categories.length === 0 || !c.categories.every((x) => avoid.includes(x)),
          );
        }
        if (res.value.slowerPace) paceFactor = Math.max(paceFactor, 1.25);
      }
      await log(tripId, null, "preferences", t0, res !== null, res
        ? { model: res.usage.model, inputTokens: res.usage.inputTokens, outputTokens: res.usage.outputTokens }
        : { error: "Model output rejected by validation" });
    } catch (err) {
      await log(tripId, null, "preferences", t0, false, { error: err instanceof Error ? err.message : "unknown" });
    }
  }

  t0 = Date.now();
  const plan = planItinerary({
    center,
    days: days.map((d) => ({ index: d.index, date: toIsoDate(d.date) })),
    candidates: pool,
    interests,
    travelStyle: trip.travelStyle,
    transportPref: trip.transportPref,
    paceFactor,
    locked: opts.locked.map((l) => ({ placeId: l.placeId, dayIndex: l.dayIndex })),
    excludedPlaceIds: opts.excludedPlaceIds,
    retainPlaceIds: opts.retainPlaceIds,
    durationOverrides: opts.durationOverrides,
  });
  const stopCount = plan.days.reduce((n, d) => n + d.stops.length, 0);
  await log(tripId, null, "schedule", t0, stopCount > 0);

  if (stopCount === 0) {
    throw new ServiceError("INFEASIBLE", "We could not build an itinerary for this trip.", {
      reasons:
        candidates.length === 0
          ? [`Our dataset has no places near ${trip.destinationCity.name} yet.`]
          : plan.dropped.slice(0, 10).map((d) => d.message),
      alternatives: [
        candidates.length === 0
          ? "Choose a destination from Explore — those have places ready to plan."
          : "Try different dates, or remove exclusions and rebuild.",
      ],
    });
  }

  const nameOf = new Map(candidates.map((c) => [c.id, c.name]));
  const meta = emptyMeta({
    interests,
    travelStyle: trip.travelStyle,
    transportPref: trip.transportPref,
    paceFactor,
    excludedPlaceIds: opts.excludedPlaceIds,
    durationOverrides: opts.durationOverrides,
    reason: opts.reason,
    note: opts.note,
  });
  meta.notes = plan.notes;
  meta.dropped = plan.dropped.map((d) => ({ ...d, placeName: nameOf.get(d.placeId) }));
  const scheduled = new Set(plan.days.flatMap((d) => d.stops.map((s) => s.placeId)));
  meta.scores = Object.fromEntries(
    plan.scores.filter((s) => scheduled.has(s.placeId)).map((s) => [s.placeId, s]),
  );

  const dayIdByIndex = new Map(days.map((d) => [d.index, d.id]));
  const lockedNote = new Map(opts.locked.map((l) => [l.placeId, l.note]));

  const version = await prisma.$transaction(async (tx) => {
    const last = await tx.itineraryVersion.findFirst({
      where: { tripId },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });
    const v = await tx.itineraryVersion.create({
      data: {
        tripId,
        versionNumber: (last?.versionNumber ?? 0) + 1,
        label: opts.label,
        createdBy: opts.origin,
        generationParams: asJson(meta),
      },
    });
    await tx.itineraryStop.createMany({
      data: plan.days.flatMap((d) =>
        d.stops.map((s) => ({
          versionId: v.id,
          tripDayId: dayIdByIndex.get(d.dayIndex)!,
          placeId: s.placeId,
          orderIndex: s.orderIndex,
          arrivalMin: s.arrivalMin,
          departureMin: s.departureMin,
          visitDurationMins: s.visitDurationMins,
          locked: s.locked,
          note: lockedNote.get(s.placeId) ?? null,
        })),
      ),
    });
    await tx.trip.update({ where: { id: tripId }, data: { activeVersionId: v.id, status: "PLANNED" } });
    return v;
  });

  await finalizeVersion(version.id);
  await writeExplanation(version.id);
  return version.id;
}

/** AI wording when available and valid; otherwise plain deterministic text. */
async function writeExplanation(versionId: string) {
  const version = await prisma.itineraryVersion.findUniqueOrThrow({
    where: { id: versionId },
    include: {
      trip: { include: { destinationCity: true } },
      stops: { include: stopInclude, orderBy: [{ tripDay: { index: "asc" } }, { orderIndex: "asc" }] },
      routeLegs: { include: { fromStop: { include: { tripDay: true } } } },
    },
  });
  const meta = readMeta(version.generationParams);
  const byDay = new Map<number, StopRow[]>();
  for (const s of version.stops) {
    byDay.set(s.tripDay.index, [...(byDay.get(s.tripDay.index) ?? []), s]);
  }
  const travelByDay = new Map<number, number>();
  for (const l of version.routeLegs) {
    const i = l.fromStop.tripDay.index;
    travelByDay.set(i, (travelByDay.get(i) ?? 0) + l.durationMins);
  }
  const dayEntries = [...byDay.entries()].sort((a, b) => a[0] - b[0]);

  const deterministic: Explanation = {
    summary: `${dayEntries.length} day${dayEntries.length > 1 ? "s" : ""} in ${version.trip.destinationCity.name} with ${version.stops.length} stops, grouped so that each day stays in one part of town.`,
    dayNotes: dayEntries.map(([dayIndex, stops]) => ({
      dayIndex,
      title: stops.length > 1 ? `${stops[0].place.name} to ${stops[stops.length - 1].place.name}` : stops[0].place.name,
      note: `${stops.length} stop${stops.length > 1 ? "s" : ""} with about ${travelByDay.get(dayIndex) ?? 0} minutes of travel between them.`,
    })),
  };
  meta.explanation = deterministic;
  meta.explanationSource = "deterministic";

  const llm = getLlmProvider();
  if (llm) {
    const t0 = Date.now();
    try {
      const res = await llm.explainItinerary({
        destination: version.trip.destinationCity.name,
        travelStyle: version.trip.travelStyle,
        interests: meta.input.interests,
        days: dayEntries.map(([dayIndex, stops]) => ({
          dayIndex,
          date: toIsoDate(stops[0].tripDay.date),
          travelMins: travelByDay.get(dayIndex) ?? 0,
          stops: stops.map((s) => ({
            name: s.place.name,
            kind: s.place.kind,
            categories: s.place.categories.map((c) => c.category.slug),
            arrival: `${String(Math.floor(s.arrivalMin / 60)).padStart(2, "0")}:${String(s.arrivalMin % 60).padStart(2, "0")}`,
            durationMins: s.visitDurationMins,
          })),
        })),
      });
      // Accept only notes for days that exist in the plan.
      const validDays = new Set(dayEntries.map(([i]) => i));
      if (res && res.value.dayNotes.every((n) => validDays.has(n.dayIndex))) {
        meta.explanation = res.value;
        meta.explanationSource = "ai";
      }
      await log(version.tripId, versionId, "explain", t0, res !== null, res
        ? { model: res.usage.model, inputTokens: res.usage.inputTokens, outputTokens: res.usage.outputTokens }
        : { error: "Model output rejected by validation" });
    } catch (err) {
      await log(version.tripId, versionId, "explain", t0, false, { error: err instanceof Error ? err.message : "unknown" });
    }
  }
  await prisma.itineraryVersion.update({
    where: { id: versionId },
    data: { generationParams: asJson(meta), summary: meta.explanation?.summary ?? null },
  });
}

export async function generateItinerary(tripId: string, userId: string) {
  const { trip } = await loadTripForUser(tripId, userId, { write: true });
  if (trip.status === "GENERATING") {
    throw new ServiceError("CONFLICT", "This trip is already being generated");
  }
  const previousStatus = trip.status;
  await prisma.trip.update({ where: { id: tripId }, data: { status: "GENERATING" } });
  try {
    return await buildVersion(tripId, {
      origin: "GENERATOR",
      label: "Generated plan",
      paceFactor: 1,
      excludedPlaceIds: [],
      retainPlaceIds: [],
      locked: [],
      durationOverrides: {},
    });
  } catch (err) {
    await prisma.trip.update({ where: { id: tripId }, data: { status: previousStatus } });
    throw err;
  }
}

const REPLAN_LABELS: Record<ReplanInput["reason"], string> = {
  REMOVED_PLACE: "Replanned after removing a place",
  PLACE_CLOSED: "Replanned around a closure",
  BUDGET_DECREASED: "Replanned for a new budget",
  RUNNING_LATE: "Replanned for longer visits",
  DATES_CHANGED: "Replanned for new dates",
  SLOWER_PACE: "Replanned at a slower pace",
  OTHER: "Replanned",
};

/**
 * Builds a NEW version from the current one: locked stops stay on their day,
 * previously chosen places are favoured, removed places stay out, and user
 * duration changes carry over. Times, hours and budget are all revalidated.
 */
export async function replanItinerary(tripId: string, userId: string, input: ReplanInput) {
  const { trip } = await loadTripForUser(tripId, userId, { write: true });
  if (!trip.activeVersionId) {
    throw new ServiceError("CONFLICT", "Generate an itinerary before replanning");
  }
  const current = await prisma.itineraryVersion.findUniqueOrThrow({
    where: { id: trip.activeVersionId },
    include: { stops: { include: { tripDay: true } } },
  });
  const meta = readMeta(current.generationParams);
  const dayCount = tripDayCount(trip);
  const paceFactor =
    input.reason === "SLOWER_PACE" && input.paceFactor === 1
      ? Math.min(2, meta.input.paceFactor * 1.3)
      : meta.input.paceFactor * input.paceFactor;

  return buildVersion(tripId, {
    origin: "REPLAN",
    label: REPLAN_LABELS[input.reason],
    paceFactor: Math.min(2, Math.max(0.5, paceFactor)),
    excludedPlaceIds: meta.input.excludedPlaceIds,
    retainPlaceIds: current.stops.map((s) => s.placeId),
    locked: current.stops
      .filter((s) => s.locked && s.tripDay.index < dayCount)
      .map((s) => ({ placeId: s.placeId, dayIndex: s.tripDay.index, note: s.note })),
    durationOverrides: meta.input.durationOverrides,
    reason: input.reason,
    note: input.note,
  });
}

// ─────────────────────────────── user edits ───────────────────────────────

/**
 * Generated and replanned versions are immutable snapshots. The first manual
 * edit forks a USER_EDIT version; further edits accumulate there.
 * Returns the editable version id and a map from old stop ids to new ones.
 */
async function ensureEditableVersion(tripId: string, activeVersionId: string) {
  const current = await prisma.itineraryVersion.findUniqueOrThrow({
    where: { id: activeVersionId },
    include: { stops: true },
  });
  const idMap = new Map(current.stops.map((s) => [s.id, s.id]));
  if (current.createdBy === "USER_EDIT") return { versionId: current.id, idMap };

  const versionId = await prisma.$transaction(async (tx) => {
    const last = await tx.itineraryVersion.findFirst({
      where: { tripId }, orderBy: { versionNumber: "desc" }, select: { versionNumber: true },
    });
    const v = await tx.itineraryVersion.create({
      data: {
        tripId,
        versionNumber: (last?.versionNumber ?? 0) + 1,
        label: "Your edits",
        createdBy: "USER_EDIT",
        generationParams: current.generationParams ?? undefined,
        summary: current.summary,
      },
    });
    for (const s of current.stops) {
      const copy = await tx.itineraryStop.create({
        data: {
          versionId: v.id, tripDayId: s.tripDayId, placeId: s.placeId, orderIndex: s.orderIndex,
          arrivalMin: s.arrivalMin, departureMin: s.departureMin,
          visitDurationMins: s.visitDurationMins, note: s.note, locked: s.locked,
        },
      });
      idMap.set(s.id, copy.id);
    }
    await tx.trip.update({ where: { id: tripId }, data: { activeVersionId: v.id } });
    return v.id;
  });
  return { versionId, idMap };
}

/** Writes a new per-day ordering without tripping the unique order index. */
async function applyLayout(versionId: string, layout: Map<string, string[]>) {
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  let temp = -1;
  for (const [dayId, stopIds] of layout) {
    for (const id of stopIds) {
      ops.push(prisma.itineraryStop.update({ where: { id }, data: { tripDayId: dayId, orderIndex: temp-- } }));
    }
  }
  for (const [, stopIds] of layout) {
    stopIds.forEach((id, i) => {
      ops.push(prisma.itineraryStop.update({ where: { id }, data: { orderIndex: i } }));
    });
  }
  await prisma.$transaction(ops);
  void versionId;
}

async function currentLayout(versionId: string) {
  const stops = await prisma.itineraryStop.findMany({
    where: { versionId },
    orderBy: [{ tripDayId: "asc" }, { orderIndex: "asc" }],
  });
  const layout = new Map<string, string[]>();
  for (const s of stops) layout.set(s.tripDayId, [...(layout.get(s.tripDayId) ?? []), s.id]);
  return { stops, layout };
}

async function patchMeta(versionId: string, patch: (m: VersionMeta) => void) {
  const v = await prisma.itineraryVersion.findUniqueOrThrow({ where: { id: versionId } });
  const meta = readMeta(v.generationParams);
  patch(meta);
  await prisma.itineraryVersion.update({ where: { id: versionId }, data: { generationParams: asJson(meta) } });
}

async function requireActiveVersion(tripId: string, userId: string) {
  const { trip } = await loadTripForUser(tripId, userId, { write: true });
  if (!trip.activeVersionId) {
    throw new ServiceError("CONFLICT", "Generate an itinerary before editing stops");
  }
  return { trip, activeVersionId: trip.activeVersionId };
}

async function dayForIndex(tripId: string, dayIndex: number, dayCount: number) {
  if (dayIndex >= dayCount) throw new ServiceError("VALIDATION", "That day is outside the trip dates");
  const day = await prisma.tripDay.findUnique({ where: { tripId_index: { tripId, index: dayIndex } } });
  if (!day) throw new ServiceError("VALIDATION", "That day is outside the trip dates");
  return day;
}

export async function addStop(tripId: string, userId: string, input: AddStopInput) {
  const { trip, activeVersionId } = await requireActiveVersion(tripId, userId);
  const place = await prisma.place.findFirst({ where: { id: input.placeId, isActive: true } });
  if (!place) throw new ServiceError("VALIDATION", "Unknown place");
  const day = await dayForIndex(tripId, input.dayIndex, tripDayCount(trip));

  const { versionId } = await ensureEditableVersion(tripId, activeVersionId);
  const { stops, layout } = await currentLayout(versionId);
  if (stops.some((s) => s.placeId === place.id)) {
    throw new ServiceError("CONFLICT", `${place.name} is already in this itinerary`);
  }
  const cfg = paceConfig(trip.travelStyle, 1);
  const visit = input.visitDurationMins ?? Math.max(10, Math.round(((place.typicalVisitMins ?? 60) * cfg.visitScale) / 5) * 5);
  const created = await prisma.itineraryStop.create({
    data: {
      versionId, tripDayId: day.id, placeId: place.id,
      orderIndex: 10_000 + stops.length, // placed properly by applyLayout below
      arrivalMin: 0, departureMin: visit, visitDurationMins: visit, note: input.note ?? null,
    },
  });
  const order = layout.get(day.id) ?? [];
  const pos = Math.min(input.orderIndex ?? order.length, order.length);
  order.splice(pos, 0, created.id);
  layout.set(day.id, order);
  await applyLayout(versionId, layout);
  await patchMeta(versionId, (m) => {
    m.input.excludedPlaceIds = m.input.excludedPlaceIds.filter((id) => id !== place.id);
    if (input.visitDurationMins) m.input.durationOverrides[place.id] = input.visitDurationMins;
  });
  await finalizeVersion(versionId);
  return { versionId, stopId: created.id };
}

export async function updateStop(tripId: string, userId: string, stopId: string, input: UpdateStopInput) {
  const { trip, activeVersionId } = await requireActiveVersion(tripId, userId);
  const original = await prisma.itineraryStop.findFirst({ where: { id: stopId, versionId: activeVersionId } });
  if (!original) throw notFound("Stop");

  const { versionId, idMap } = await ensureEditableVersion(tripId, activeVersionId);
  const id = idMap.get(stopId)!;
  const { stops, layout } = await currentLayout(versionId);
  const stop = stops.find((s) => s.id === id)!;

  if (input.dayIndex !== undefined || input.orderIndex !== undefined) {
    const targetDay =
      input.dayIndex !== undefined
        ? (await dayForIndex(tripId, input.dayIndex, tripDayCount(trip))).id
        : stop.tripDayId;
    layout.set(stop.tripDayId, (layout.get(stop.tripDayId) ?? []).filter((x) => x !== id));
    const order = layout.get(targetDay) ?? [];
    const pos = Math.min(input.orderIndex ?? order.length, order.length);
    order.splice(pos, 0, id);
    layout.set(targetDay, order);
    await applyLayout(versionId, layout);
  }
  await prisma.itineraryStop.update({
    where: { id },
    data: {
      visitDurationMins: input.visitDurationMins,
      note: input.note === undefined ? undefined : input.note || null,
      locked: input.locked,
    },
  });
  if (input.visitDurationMins !== undefined) {
    await patchMeta(versionId, (m) => {
      m.input.durationOverrides[stop.placeId] = input.visitDurationMins!;
    });
  }
  await finalizeVersion(versionId);
  return { versionId, stopId: id };
}

export async function removeStop(tripId: string, userId: string, stopId: string) {
  const { activeVersionId } = await requireActiveVersion(tripId, userId);
  const original = await prisma.itineraryStop.findFirst({ where: { id: stopId, versionId: activeVersionId } });
  if (!original) throw notFound("Stop");

  const { versionId, idMap } = await ensureEditableVersion(tripId, activeVersionId);
  const id = idMap.get(stopId)!;
  await prisma.itineraryStop.delete({ where: { id } });
  const { layout } = await currentLayout(versionId);
  await applyLayout(versionId, layout);
  // Remember the removal so a later replan does not bring the place back.
  await patchMeta(versionId, (m) => {
    if (!m.input.excludedPlaceIds.includes(original.placeId)) m.input.excludedPlaceIds.push(original.placeId);
    delete m.input.durationOverrides[original.placeId];
  });
  await finalizeVersion(versionId);
  return { versionId };
}

/** Restore any earlier version as the active plan (nothing is deleted). */
export async function activateVersion(tripId: string, userId: string, versionId: string) {
  await loadTripForUser(tripId, userId, { write: true });
  const version = await prisma.itineraryVersion.findFirst({ where: { id: versionId, tripId } });
  if (!version) throw notFound("Version");
  await prisma.trip.update({ where: { id: tripId }, data: { activeVersionId: versionId } });
  // Budget or dates may have changed since this version was made.
  await finalizeVersion(versionId);
}

// ───────────────────────────────── views ─────────────────────────────────

async function buildTripView(tripId: string, versionIdOverride?: string) {
  const trip = await prisma.trip.findUniqueOrThrow({
    where: { id: tripId },
    include: {
      destinationCity: { include: { district: { include: { state: true } } } },
      budget: true,
      versions: {
        orderBy: { versionNumber: "desc" },
        include: { _count: { select: { stops: true } }, estimates: { select: { amountPaise: true } } },
      },
    },
  });
  const dayCount = tripDayCount(trip);
  const days = await activeDays(tripId, dayCount);
  const versionId = versionIdOverride ?? trip.activeVersionId;
  const version = versionId
    ? await prisma.itineraryVersion.findFirst({
        where: { id: versionId, tripId },
        include: {
          stops: { include: stopInclude, orderBy: { orderIndex: "asc" } },
          routeLegs: true,
          estimates: true,
        },
      })
    : null;
  const meta = version ? readMeta(version.generationParams) : null;
  const legByFrom = new Map(version?.routeLegs.map((l) => [l.fromStopId, l]) ?? []);

  return {
    trip: {
      id: trip.id,
      title: trip.title,
      status: trip.status,
      startDate: toIsoDate(trip.startDate),
      endDate: toIsoDate(trip.endDate),
      dayCount,
      travellers: trip.travellers,
      travelStyle: trip.travelStyle,
      interests: trip.interests,
      transportPref: trip.transportPref,
      accommodationPref: trip.accommodationPref,
      specialRequirements: trip.specialRequirements,
      shareEnabled: trip.shareEnabled,
      shareSlug: trip.shareSlug,
      totalBudgetPaise: trip.budget ? Number(trip.budget.totalPaise) : null,
      activeVersionId: trip.activeVersionId,
      destination: {
        id: trip.destinationCity.id,
        name: trip.destinationCity.name,
        slug: trip.destinationCity.slug,
        state: trip.destinationCity.district.state.name,
        lat: trip.destinationCity.lat,
        lng: trip.destinationCity.lng,
        heroImageUrl: trip.destinationCity.heroImageUrl,
      },
    },
    version: version
      ? {
          id: version.id,
          versionNumber: version.versionNumber,
          label: version.label,
          createdBy: version.createdBy,
          isFeasible: version.isFeasible,
          summary: version.summary,
          notes: meta!.notes,
          dropped: meta!.dropped,
          alternatives: meta!.alternatives,
          explanationSource: meta!.explanationSource,
          estimatedPaise: Number(version.estimates.reduce((s, e) => s + e.amountPaise, 0n)),
        }
      : null,
    days: days.map((d) => {
      const stops = (version?.stops ?? []).filter((s) => s.tripDayId === d.id);
      const dayNote = meta?.explanation?.dayNotes.find((n) => n.dayIndex === d.index);
      return {
        id: d.id,
        index: d.index,
        date: toIsoDate(d.date),
        title: dayNote?.title ?? null,
        note: dayNote?.note ?? null,
        warnings: meta?.warningsByDay[String(d.index)] ?? [],
        stops: stops.map((s) => {
          const leg = legByFrom.get(s.id);
          const score = meta?.scores[s.placeId];
          return {
            id: s.id,
            orderIndex: s.orderIndex,
            arrivalMin: s.arrivalMin,
            departureMin: s.departureMin,
            visitDurationMins: s.visitDurationMins,
            note: s.note,
            locked: s.locked,
            hoursKnown: s.place.openingHours.length > 0,
            priceKnown: knownPrice(s.place) !== null,
            matchedInterests: score?.matchedInterests ?? [],
            score: score?.total ?? null,
            place: {
              id: s.place.id,
              name: s.place.name,
              kind: s.place.kind,
              lat: s.place.lat,
              lng: s.place.lng,
              description: s.place.description,
              verificationStatus: s.place.verificationStatus,
              categories: s.place.categories.map((c) => c.category.slug),
            },
            legToNext: leg
              ? { mode: leg.mode, distanceMeters: leg.distanceMeters, durationMins: leg.durationMins, provider: leg.provider }
              : null,
          };
        }),
      };
    }),
    versions: trip.versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      label: v.label,
      createdBy: v.createdBy,
      isFeasible: v.isFeasible,
      stopCount: v._count.stops,
      estimatedPaise: Number(v.estimates.reduce((s, e) => s + e.amountPaise, 0n)),
      createdAt: v.createdAt.toISOString(),
      isActive: v.id === trip.activeVersionId,
    })),
  };
}

export type TripView = Awaited<ReturnType<typeof buildTripView>>;

export async function getTripView(tripId: string, userId: string, versionId?: string) {
  const { isOwner } = await loadTripForUser(tripId, userId);
  return { ...(await buildTripView(tripId, versionId)), isOwner };
}

/** Public, read-only view by share slug. Exposes no owner details. */
export async function getSharedTripView(shareSlug: string) {
  const trip = await prisma.trip.findFirst({ where: { shareSlug, shareEnabled: true }, select: { id: true } });
  if (!trip) throw notFound("Shared trip");
  const view = await buildTripView(trip.id);
  return { ...view, trip: { ...view.trip, totalBudgetPaise: null, specialRequirements: null } };
}

export async function getTripBudget(tripId: string, userId: string) {
  const { trip } = await loadTripForUser(tripId, userId);
  const [budget, estimates, actuals, version] = await Promise.all([
    prisma.tripBudget.findUnique({ where: { tripId } }),
    trip.activeVersionId
      ? prisma.expenseEstimate.findMany({
          where: { versionId: trip.activeVersionId },
          include: { tripDay: true, stop: { include: { place: true } } },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    prisma.actualExpense.findMany({ where: { tripId }, include: { tripDay: true }, orderBy: { spentAt: "asc" } }),
    trip.activeVersionId
      ? prisma.itineraryVersion.findUnique({ where: { id: trip.activeVersionId } })
      : Promise.resolve(null),
  ]);
  const meta = version ? readMeta(version.generationParams) : null;
  const unavailable = meta?.unavailable ?? [];
  const summary = summarizeBudget({
    totalBudgetPaise: budget?.totalPaise ?? null,
    travellers: trip.travellers,
    dayCount: tripDayCount(trip),
    estimates: estimates.map((e) => ({ category: e.category as BudgetCategory, amountPaise: e.amountPaise })),
    actuals: actuals.map((a) => ({ category: a.category as BudgetCategory, amountPaise: a.amountPaise })),
    unavailableCategories: [...new Set(unavailable.map((u) => u.category))],
  });
  return {
    summary,
    estimates: estimates.map((e) => ({
      id: e.id,
      category: e.category,
      amountPaise: e.amountPaise,
      currency: e.currency,
      source: e.source,
      confidence: e.confidence,
      notes: e.notes,
      dayIndex: e.tripDay?.index ?? null,
      placeName: e.stop?.place.name ?? null,
    })),
    actuals: actuals.map((a) => ({
      id: a.id,
      category: a.category,
      amountPaise: a.amountPaise,
      currency: a.currency,
      source: "USER_ENTERED" as const,
      spentAt: toIsoDate(a.spentAt),
      note: a.note,
      dayIndex: a.tripDay?.index ?? null,
    })),
    unavailable,
    alternatives: meta?.alternatives ?? [],
    hasItinerary: Boolean(trip.activeVersionId),
  };
}

/** After budget/date/preference changes, keep the stored plan's numbers honest. */
export async function refreshActiveVersion(tripId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { activeVersionId: true } });
  if (trip?.activeVersionId) await finalizeVersion(trip.activeVersionId);
}
