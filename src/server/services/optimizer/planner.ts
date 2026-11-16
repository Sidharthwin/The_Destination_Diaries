import { centroid, estimateRoute, haversineMeters } from "./geo";
import { dayCapacityMins, hoursOn, paceConfig, timeDay, visitMinutes, type DayConfig } from "./scheduler";
import { scoreAll } from "./scorer";
import type {
  CandidatePlace, DroppedPlace, LatLng, PlanResult, PlannedDay, PlannerInput,
} from "./types";

/** Rough per-stop travel allowance used only while choosing how many places fit. */
const SELECTION_TRAVEL_ALLOWANCE_MINS = 25;
/** Diminishing returns for many places of the same kind (variety). */
const VARIETY_PENALTY = 2.5;
const KMEANS_ITERATIONS = 12;

/**
 * Builds a day-wise itinerary with a practical heuristic:
 * score → select to fit capacity (with variety) → cluster geographically into
 * days → order each day to limit backtracking → time and validate each day
 * against opening hours and the day window → repair (move/drop/fill).
 *
 * It is deterministic and explainable. It is NOT a mathematically optimal
 * solver, and never claims to be.
 */
export function planItinerary(input: PlannerInput): PlanResult {
  const cfg = paceConfig(input.travelStyle, input.paceFactor ?? 1);
  const notes: string[] = [
    "Built with a heuristic optimizer: results are sensible, not guaranteed optimal.",
    "Travel times are planning estimates unless a leg is marked as measured.",
  ];
  const dropped: DroppedPlace[] = [];
  const dayCount = input.days.length;
  if (dayCount === 0) return { days: [], scores: [], dropped, notes };

  const excluded = new Set(input.excludedPlaceIds ?? []);
  const lockedDay = new Map<string, number>();
  for (const l of input.locked ?? []) {
    if (l.dayIndex >= 0 && l.dayIndex < dayCount) lockedDay.set(l.placeId, l.dayIndex);
  }

  const seen = new Set<string>();
  const candidates = input.candidates.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return !excluded.has(p.id) || lockedDay.has(p.id);
  });
  const byId = new Map(candidates.map((p) => [p.id, p]));
  for (const id of [...lockedDay.keys()]) if (!byId.has(id)) lockedDay.delete(id);

  const scores = scoreAll(candidates, {
    interests: input.interests,
    travelStyle: input.travelStyle,
    retainPlaceIds: new Set(input.retainPlaceIds ?? []),
  });
  const scoreOf = new Map(scores.map((s) => [s.placeId, s.total]));

  // ── Places closed on every trip day can never be scheduled ──
  const schedulable = candidates.filter((p) => {
    if (lockedDay.has(p.id)) return true;
    const openSomeDay = input.days.some((d) => hoursOn(p, d.date).kind !== "closed");
    if (!openSomeDay) {
      dropped.push({
        placeId: p.id,
        reason: "CLOSED_ON_TRIP_DAYS",
        message: `${p.name} is recorded as closed on all of your trip days.`,
      });
    }
    return openSomeDay;
  });

  // ── Select what fits the total time available, with variety ──
  const capacity = dayCapacityMins(cfg);
  const totalCapacity = capacity * dayCount;
  const cost = (p: CandidatePlace) =>
    visitMinutes(p, cfg, input.durationOverrides) + SELECTION_TRAVEL_ALLOWANCE_MINS;

  const selected: CandidatePlace[] = [];
  const kindCount = new Map<string, number>();
  let used = 0;
  const take = (p: CandidatePlace) => {
    selected.push(p);
    used += cost(p);
    kindCount.set(p.kind, (kindCount.get(p.kind) ?? 0) + 1);
  };
  for (const p of schedulable) if (lockedDay.has(p.id)) take(p);

  const pool = schedulable.filter((p) => !lockedDay.has(p.id));
  while (pool.length > 0) {
    let bestIdx = -1;
    let bestAdj = -Infinity;
    pool.forEach((p, i) => {
      const repeats = Math.max(0, (kindCount.get(p.kind) ?? 0) - dayCount + 1);
      const adj = (scoreOf.get(p.id) ?? 0) - VARIETY_PENALTY * repeats;
      if (adj > bestAdj) {
        bestAdj = adj;
        bestIdx = i;
      }
    });
    const [p] = pool.splice(bestIdx, 1);
    if (used + cost(p) <= totalCapacity) take(p);
  }
  const selectedIds = new Set(selected.map((p) => p.id));
  const reserve = schedulable
    .filter((p) => !selectedIds.has(p.id))
    .sort((a, b) => (scoreOf.get(b.id) ?? 0) - (scoreOf.get(a.id) ?? 0));

  // ── Cluster into days ──
  const buckets = clusterIntoDays(selected, dayCount, input.center, lockedDay, cfg, input, capacity);

  // ── Respect weekday closures: move a place to a day it is open ──
  buckets.forEach((bucket, d) => {
    for (const p of [...bucket]) {
      if (lockedDay.has(p.id)) continue;
      if (hoursOn(p, input.days[d].date).kind !== "closed") continue;
      const target = input.days
        .map((day, idx) => idx)
        .filter((idx) => idx !== d && hoursOn(p, input.days[idx].date).kind !== "closed")
        .sort((a, b) => distToBucket(p, buckets[a], input.center) - distToBucket(p, buckets[b], input.center))[0];
      bucket.splice(bucket.indexOf(p), 1);
      if (target !== undefined) buckets[target].push(p);
    }
  });

  // ── Order, time and repair each day ──
  const lockedIds = new Set(lockedDay.keys());
  const overflow: CandidatePlace[] = [];
  const build = (d: number, places: CandidatePlace[]): PlannedDay =>
    timeDay({
      dayIndex: input.days[d].index,
      date: input.days[d].date,
      places,
      cfg,
      transportPref: input.transportPref,
      lockedIds,
      durationOverrides: input.durationOverrides,
    });

  const dayOrders: CandidatePlace[][] = buckets.map((bucket, d) => {
    let order = orderStops(bucket, input);
    let plan = build(d, order);

    // Fix opening-hour conflicts by trying other positions for the stop.
    for (const w of plan.warnings.filter((x) => x.code === "OUTSIDE_OPENING_HOURS")) {
      const place = byId.get(w.placeId!)!;
      const fixed = repositionForHours(order, place, (o) => build(d, o));
      if (fixed) order = fixed;
      else if (!lockedIds.has(place.id)) {
        order = order.filter((p) => p.id !== place.id);
        dropped.push({
          placeId: place.id,
          reason: "OUTSIDE_OPENING_HOURS",
          message: `${place.name} could not be fitted within its recorded opening hours.`,
        });
      }
      plan = build(d, order);
    }

    // Too long: remove the lowest-scoring unlocked stop until the day fits.
    while (plan.warnings.some((x) => x.code === "RUNS_LATE")) {
      const removable = order
        .filter((p) => !lockedIds.has(p.id))
        .sort((a, b) => (scoreOf.get(a.id) ?? 0) - (scoreOf.get(b.id) ?? 0))[0];
      if (!removable) break;
      order = orderStops(order.filter((p) => p.id !== removable.id), input);
      overflow.push(removable);
      plan = build(d, order);
    }
    return order;
  });

  // ── Fill spare time: overflow first, then the best unused candidates ──
  const fillers = [
    ...overflow.sort((a, b) => (scoreOf.get(b.id) ?? 0) - (scoreOf.get(a.id) ?? 0)),
    ...reserve,
  ];
  const placed = new Set<string>();
  for (const p of fillers) {
    let best: { d: number; order: CandidatePlace[]; travel: number } | null = null;
    dayOrders.forEach((order, d) => {
      const before = build(d, order).totalTravelMins;
      for (let pos = 0; pos <= order.length; pos++) {
        const trial = [...order.slice(0, pos), p, ...order.slice(pos)];
        const plan = build(d, trial);
        if (plan.warnings.length > 0) continue;
        const added = plan.totalTravelMins - before;
        if (!best || added < best.travel) best = { d, order: trial, travel: added };
      }
    });
    const chosen = best as { d: number; order: CandidatePlace[]; travel: number } | null;
    if (chosen && chosen.travel <= 45) {
      dayOrders[chosen.d] = chosen.order;
      placed.add(p.id);
    }
  }
  for (const p of overflow) {
    if (!placed.has(p.id)) {
      dropped.push({
        placeId: p.id,
        reason: "NO_TIME_AVAILABLE",
        message: `${p.name} did not fit in the time available.`,
      });
    }
  }
  for (const p of reserve) {
    if (!placed.has(p.id)) {
      dropped.push({
        placeId: p.id,
        reason: "LOWER_PRIORITY",
        message: `${p.name} matched your preferences less than the places chosen.`,
      });
    }
  }

  const days = dayOrders.map((order, d) => build(d, order));
  if (days.some((d) => d.stops.some((s) => s.hoursUnknown))) {
    notes.push("Some places have no recorded opening hours — confirm timings before you go.");
  }
  return { days, scores, dropped, notes };
}

// ───────────────────────────── helpers ─────────────────────────────

function distToBucket(p: LatLng, bucket: CandidatePlace[], fallback: LatLng): number {
  return haversineMeters(p, bucket.length > 0 ? centroid(bucket) : fallback);
}

/**
 * Deterministic k-means with farthest-point seeding, followed by a capacity
 * balancing pass. Locked places are pinned to their day.
 */
function clusterIntoDays(
  places: CandidatePlace[],
  k: number,
  center: LatLng,
  lockedDay: ReadonlyMap<string, number>,
  cfg: DayConfig,
  input: PlannerInput,
  capacity: number,
): CandidatePlace[][] {
  const buckets: CandidatePlace[][] = Array.from({ length: k }, () => []);
  const free = places.filter((p) => !lockedDay.has(p.id));
  for (const p of places) {
    const d = lockedDay.get(p.id);
    if (d !== undefined) buckets[d].push(p);
  }
  if (free.length === 0) return buckets;

  // Seed centroids: locked days use their locked places; others farthest-point.
  const seeds: (LatLng | null)[] = buckets.map((b) => (b.length > 0 ? centroid(b) : null));
  const chosen: LatLng[] = seeds.filter((s): s is LatLng => s !== null);
  for (let d = 0; d < k; d++) {
    if (seeds[d]) continue;
    let pick: CandidatePlace | null = null;
    let pickDist = -1;
    for (const p of free) {
      const dist =
        chosen.length === 0
          ? -haversineMeters(p, center) // first seed: the place nearest the centre
          : Math.min(...chosen.map((c) => haversineMeters(p, c)));
      if (dist > pickDist || pick === null) {
        pick = p;
        pickDist = dist;
      }
    }
    seeds[d] = pick ? { lat: pick.lat, lng: pick.lng } : center;
    chosen.push(seeds[d]!);
  }
  let centroids = seeds as LatLng[];

  let assignment = new Map<string, number>();
  for (let iter = 0; iter < KMEANS_ITERATIONS; iter++) {
    const next = new Map<string, number>();
    for (const p of free) {
      let bestD = 0;
      let bestDist = Infinity;
      centroids.forEach((c, d) => {
        const dist = haversineMeters(p, c);
        if (dist < bestDist) {
          bestDist = dist;
          bestD = d;
        }
      });
      next.set(p.id, bestD);
    }
    const stable = free.every((p) => assignment.get(p.id) === next.get(p.id));
    assignment = next;
    if (stable) break;
    centroids = centroids.map((c, d) => {
      const members = [
        ...buckets[d],
        ...free.filter((p) => assignment.get(p.id) === d),
      ];
      return members.length > 0 ? centroid(members) : c;
    });
  }
  for (const p of free) buckets[assignment.get(p.id)!].push(p);

  // Balance: move places out of over-full days into the nearest day with room.
  const load = (b: CandidatePlace[]) =>
    b.reduce(
      (sum, p) => sum + visitMinutes(p, cfg, input.durationOverrides) + SELECTION_TRAVEL_ALLOWANCE_MINS,
      0,
    );
  for (let guard = 0; guard < places.length * 2; guard++) {
    const overIdx = buckets
      .map((b, d) => ({ d, over: load(b) - capacity }))
      .filter((x) => x.over > 0)
      .sort((a, b) => b.over - a.over)[0]?.d;
    if (overIdx === undefined) break;
    let move: { p: CandidatePlace; to: number; dist: number } | null = null;
    for (const p of buckets[overIdx]) {
      if (lockedDay.has(p.id)) continue;
      const pCost = visitMinutes(p, cfg, input.durationOverrides) + SELECTION_TRAVEL_ALLOWANCE_MINS;
      buckets.forEach((b, d) => {
        if (d === overIdx || load(b) + pCost > capacity) return;
        const dist = distToBucket(p, b, center);
        if (!move || dist < move.dist) move = { p, to: d, dist };
      });
    }
    const m = move as { p: CandidatePlace; to: number; dist: number } | null;
    if (!m) break; // nowhere to move; the repair step will handle the overflow
    buckets[overIdx].splice(buckets[overIdx].indexOf(m.p), 1);
    buckets[m.to].push(m.p);
  }

  // Unless locks pin days, put the clusters nearest the centre first.
  if (lockedDay.size === 0) {
    buckets.sort((a, b) => distToBucket(center, a, center) - distToBucket(center, b, center));
    // Empty days go last.
    buckets.sort((a, b) => Number(a.length === 0) - Number(b.length === 0));
  }
  return buckets;
}

/** Nearest-neighbour path from an extreme point, improved with 2-opt. */
export function orderStops(
  places: CandidatePlace[],
  input: Pick<PlannerInput, "transportPref">,
): CandidatePlace[] {
  if (places.length <= 2) return [...places];
  const mid = centroid(places);
  const sorted = [...places].sort((a, b) => a.id.localeCompare(b.id));
  let current = sorted.reduce((far, p) =>
    haversineMeters(p, mid) > haversineMeters(far, mid) ? p : far,
  );
  const path = [current];
  const remaining = sorted.filter((p) => p !== current);
  while (remaining.length > 0) {
    let bi = 0;
    for (let i = 1; i < remaining.length; i++) {
      if (haversineMeters(current, remaining[i]) < haversineMeters(current, remaining[bi])) bi = i;
    }
    current = remaining.splice(bi, 1)[0];
    path.push(current);
  }

  const legCost = (a: CandidatePlace, b: CandidatePlace) =>
    estimateRoute(a, b, input.transportPref).durationMins;
  const total = (p: CandidatePlace[]) =>
    p.slice(1).reduce((sum, x, i) => sum + legCost(p[i], x), 0);

  let best = path;
  let bestCost = total(best);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const trial = [...best.slice(0, i), ...best.slice(i, j + 1).reverse(), ...best.slice(j + 1)];
        const c = total(trial);
        if (c < bestCost) {
          best = trial;
          bestCost = c;
          improved = true;
        }
      }
    }
  }
  return best;
}

/** Try every position for `place`; return the lowest-travel order with no hour conflicts. */
function repositionForHours(
  order: CandidatePlace[],
  place: CandidatePlace,
  build: (o: CandidatePlace[]) => PlannedDay,
): CandidatePlace[] | null {
  const rest = order.filter((p) => p.id !== place.id);
  let best: { order: CandidatePlace[]; travel: number } | null = null;
  for (let pos = 0; pos <= rest.length; pos++) {
    const trial = [...rest.slice(0, pos), place, ...rest.slice(pos)];
    const plan = build(trial);
    const conflict = plan.warnings.some(
      (w) => w.code === "OUTSIDE_OPENING_HOURS" || w.code === "CLOSED_THAT_DAY",
    );
    if (conflict) continue;
    if (!best || plan.totalTravelMins < best.travel) best = { order: trial, travel: plan.totalTravelMins };
  }
  return (best as { order: CandidatePlace[]; travel: number } | null)?.order ?? null;
}
