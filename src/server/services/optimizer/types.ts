/**
 * Types for the deterministic itinerary engine. Everything in this folder is
 * pure TypeScript with no I/O, so it is fully unit-testable.
 */

export type TravelStyle =
  | "BUDGET" | "BACKPACKING" | "ADVENTURE" | "RELAXATION" | "CULTURAL" | "FAMILY" | "LUXURY";

export type TransportPref =
  | "PUBLIC_TRANSPORT" | "CAR_WITH_DRIVER" | "SELF_DRIVE" | "TWO_WHEELER" | "WALKING_FOCUSED" | "MIXED";

export type TravelMode = "WALK" | "AUTO" | "TAXI" | "BUS" | "TRAIN";

export type PlaceKind =
  | "ATTRACTION" | "RESTAURANT" | "MUSEUM" | "RELIGIOUS_SITE" | "NATURE"
  | "SHOPPING" | "ACTIVITY" | "VIEWPOINT" | "OTHER";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface OpeningWindow {
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
  /** minutes from midnight */
  opensMin: number;
  closesMin: number;
}

export interface CandidatePlace extends LatLng {
  id: string;
  name: string;
  kind: PlaceKind;
  categories: string[];
  /** null when unknown — a kind-based default is used and flagged. */
  typicalVisitMins: number | null;
  /** Empty array = hours unknown (never treated as closed). */
  openingHours: OpeningWindow[];
  verified: boolean;
}

export interface PlannerDay {
  index: number;
  /** ISO date YYYY-MM-DD */
  date: string;
}

export interface LockedStop {
  placeId: string;
  dayIndex: number;
}

export interface PlannerInput {
  center: LatLng;
  days: PlannerDay[];
  candidates: CandidatePlace[];
  interests: string[];
  travelStyle: TravelStyle | null;
  transportPref: TransportPref | null;
  /** 1 = default pace; >1 = slower (fewer stops per day); <1 = more packed. */
  paceFactor?: number;
  /** Stops that must stay on their day (replanning preserves user decisions). */
  locked?: LockedStop[];
  /** Places to leave out (removed by the user, reported closed, …). */
  excludedPlaceIds?: string[];
  /** Places from the previous plan; they get a stability bonus when replanning. */
  retainPlaceIds?: string[];
  /** Per-place visit-duration overrides (user said "this takes longer"). */
  durationOverrides?: Record<string, number>;
}

export interface ScoreBreakdown {
  placeId: string;
  total: number;
  factors: {
    interestMatch: number;
    styleAffinity: number;
    kindBaseline: number;
    verification: number;
    retention: number;
  };
  matchedInterests: string[];
}

export interface RouteEstimate {
  mode: TravelMode;
  distanceMeters: number;
  durationMins: number;
}

export interface PlannedStop {
  placeId: string;
  orderIndex: number;
  /** minutes from midnight */
  arrivalMin: number;
  departureMin: number;
  visitDurationMins: number;
  locked: boolean;
  /** True when the place has no recorded opening hours. */
  hoursUnknown: boolean;
}

export interface PlannedLeg extends RouteEstimate {
  fromPlaceId: string;
  toPlaceId: string;
}

export type DayWarningCode = "RUNS_LATE" | "OUTSIDE_OPENING_HOURS" | "CLOSED_THAT_DAY";

export interface DayWarning {
  code: DayWarningCode;
  placeId?: string;
  message: string;
}

export interface PlannedDay {
  dayIndex: number;
  date: string;
  stops: PlannedStop[];
  legs: PlannedLeg[];
  totalTravelMins: number;
  totalDistanceMeters: number;
  warnings: DayWarning[];
}

export type DropReason =
  | "NO_TIME_AVAILABLE"
  | "CLOSED_ON_TRIP_DAYS"
  | "OUTSIDE_OPENING_HOURS"
  | "LOWER_PRIORITY";

export interface DroppedPlace {
  placeId: string;
  reason: DropReason;
  message: string;
}

export interface PlanResult {
  days: PlannedDay[];
  scores: ScoreBreakdown[];
  dropped: DroppedPlace[];
  /** Human-readable notes about how the plan was built (heuristic, limits…). */
  notes: string[];
}
