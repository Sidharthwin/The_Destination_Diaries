import { estimateRoute } from "./geo";
import type {
  CandidatePlace, DayWarning, OpeningWindow, PlaceKind, PlannedDay, PlannedLeg,
  PlannedStop, RouteEstimate, TransportPref, TravelStyle,
} from "./types";

export interface DayConfig {
  dayStartMin: number;
  dayEndMin: number;
  lunchEarliestMin: number;
  lunchMins: number;
  /** Multiplier applied to typical visit durations. */
  visitScale: number;
}

const PACE_BY_STYLE: Record<TravelStyle, "relaxed" | "moderate" | "packed"> = {
  BUDGET: "moderate",
  BACKPACKING: "packed",
  ADVENTURE: "packed",
  RELAXATION: "relaxed",
  CULTURAL: "moderate",
  FAMILY: "relaxed",
  LUXURY: "relaxed",
};

const PACE_WINDOWS = {
  relaxed: { start: 9 * 60 + 30, end: 17 * 60 + 30, visitScale: 1.15 },
  moderate: { start: 9 * 60, end: 19 * 60, visitScale: 1 },
  packed: { start: 8 * 60 + 30, end: 20 * 60, visitScale: 0.9 },
} as const;

const DEFAULT_VISIT_MINS: Record<PlaceKind, number> = {
  ATTRACTION: 75, MUSEUM: 75, RELIGIOUS_SITE: 45, NATURE: 90, SHOPPING: 60,
  ACTIVITY: 120, VIEWPOINT: 40, RESTAURANT: 60, OTHER: 45,
};

/** Day window derived from travel style and an optional pace factor (>1 = slower). */
export function paceConfig(style: TravelStyle | null, paceFactor = 1): DayConfig {
  const base = PACE_WINDOWS[style ? PACE_BY_STYLE[style] : "moderate"];
  const f = Math.min(2, Math.max(0.5, paceFactor));
  const window = Math.max(4 * 60, Math.round((base.end - base.start) / f));
  const dayEndMin = Math.min(21 * 60 + 30, base.start + window);
  return {
    dayStartMin: base.start,
    dayEndMin,
    lunchEarliestMin: 12 * 60 + 30,
    lunchMins: 60,
    visitScale: base.visitScale * (f > 1 ? 1.1 : 1),
  };
}

export function dayCapacityMins(cfg: DayConfig): number {
  return cfg.dayEndMin - cfg.dayStartMin - cfg.lunchMins;
}

export function visitMinutes(
  place: CandidatePlace,
  cfg: DayConfig,
  overrides?: Record<string, number>,
): number {
  const override = overrides?.[place.id];
  if (override !== undefined) return override;
  const base = place.typicalVisitMins ?? DEFAULT_VISIT_MINS[place.kind];
  return Math.max(10, Math.round((base * cfg.visitScale) / 5) * 5);
}

/** Day of week (0 = Sunday) for an ISO date, independent of server timezone. */
export function dayOfWeek(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

export type HoursStatus =
  | { kind: "unknown" }
  | { kind: "closed" }
  | { kind: "open"; windows: OpeningWindow[] };

export function hoursOn(place: CandidatePlace, isoDate: string): HoursStatus {
  if (place.openingHours.length === 0) return { kind: "unknown" };
  const dow = dayOfWeek(isoDate);
  const windows = place.openingHours
    .filter((w) => w.dayOfWeek === dow)
    .sort((a, b) => a.opensMin - b.opensMin);
  return windows.length === 0 ? { kind: "closed" } : { kind: "open", windows };
}

export interface TimeDayArgs {
  dayIndex: number;
  date: string;
  /** Stops in visiting order. */
  places: CandidatePlace[];
  cfg: DayConfig;
  transportPref: TransportPref | null;
  lockedIds?: ReadonlySet<string>;
  durationOverrides?: Record<string, number>;
  /** Measured legs (e.g. from a directions provider), keyed `${fromId}>${toId}`. */
  legOverrides?: ReadonlyMap<string, RouteEstimate>;
}

/**
 * Assigns clock times to a fixed stop order. Never reorders or drops —
 * problems are reported as warnings so callers (the planner, or a user edit)
 * can decide what to do.
 */
export function timeDay(args: TimeDayArgs): PlannedDay {
  const { places, cfg, date } = args;
  const stops: PlannedStop[] = [];
  const legs: PlannedLeg[] = [];
  const warnings: DayWarning[] = [];
  let cursor = cfg.dayStartMin;
  let lunchTaken = false;
  let totalTravelMins = 0;
  let totalDistanceMeters = 0;

  places.forEach((place, i) => {
    if (i > 0) {
      const prev = places[i - 1];
      const leg =
        args.legOverrides?.get(`${prev.id}>${place.id}`) ??
        estimateRoute(prev, place, args.transportPref);

      // Lunch: a restaurant stop around midday counts; otherwise add a break.
      if (!lunchTaken && cursor >= cfg.lunchEarliestMin) {
        if (prev.kind !== "RESTAURANT" && place.kind !== "RESTAURANT") {
          cursor += cfg.lunchMins;
        }
        lunchTaken = true;
      }

      cursor += leg.durationMins;
      totalTravelMins += leg.durationMins;
      totalDistanceMeters += leg.distanceMeters;
      legs.push({ ...leg, fromPlaceId: prev.id, toPlaceId: place.id });
    }

    const visit = visitMinutes(place, cfg, args.durationOverrides);
    const hours = hoursOn(place, date);
    let arrival = cursor;

    if (hours.kind === "closed") {
      warnings.push({
        code: "CLOSED_THAT_DAY",
        placeId: place.id,
        message: `${place.name} is recorded as closed on this day of the week.`,
      });
    } else if (hours.kind === "open") {
      const window =
        hours.windows.find((w) => arrival <= w.closesMin - visit && arrival >= w.opensMin) ??
        hours.windows.find((w) => w.opensMin >= arrival && w.closesMin - w.opensMin >= visit);
      if (window) {
        arrival = Math.max(arrival, window.opensMin); // wait for opening
      } else {
        warnings.push({
          code: "OUTSIDE_OPENING_HOURS",
          placeId: place.id,
          message: `${place.name} would be visited outside its recorded opening hours.`,
        });
      }
    }

    const departure = arrival + visit;
    stops.push({
      placeId: place.id,
      orderIndex: i,
      arrivalMin: arrival,
      departureMin: departure,
      visitDurationMins: visit,
      locked: args.lockedIds?.has(place.id) ?? false,
      hoursUnknown: hours.kind === "unknown",
    });
    cursor = departure;
  });

  if (cursor > cfg.dayEndMin) {
    warnings.push({
      code: "RUNS_LATE",
      message: `This day runs ${cursor - cfg.dayEndMin} minutes past the planned end of day.`,
    });
  }

  return {
    dayIndex: args.dayIndex,
    date,
    stops,
    legs,
    totalTravelMins,
    totalDistanceMeters,
    warnings,
  };
}
