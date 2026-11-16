import { perPersonPaise, sumPaise } from "@/lib/utils/money";

/**
 * Deterministic budget engine. Pure functions, integer paise only.
 *
 * Honesty rules:
 *  - A known place price (from the database, with its own source) is used as-is.
 *  - Where no price is known the engine falls back to PLANNING_RATES. Those are
 *    editorial planning assumptions, labelled HEURISTIC_ESTIMATE with LOW
 *    confidence. They are not quotes, fares or live availability.
 *  - Where even a sensible assumption is impossible (intercity transport: we
 *    do not know where the traveller starts), the line is UNAVAILABLE and
 *    contributes nothing to the total — it is surfaced, not guessed.
 */

export type BudgetCategory =
  | "ACCOMMODATION" | "INTERCITY_TRANSPORT" | "LOCAL_TRANSPORT" | "FOOD"
  | "ATTRACTION_ENTRY" | "ACTIVITIES" | "SHOPPING" | "MISC";

export const BUDGET_CATEGORY_ORDER: BudgetCategory[] = [
  "ACCOMMODATION", "INTERCITY_TRANSPORT", "LOCAL_TRANSPORT", "FOOD",
  "ATTRACTION_ENTRY", "ACTIVITIES", "SHOPPING", "MISC",
];

export type AmountSource =
  | "VERIFIED" | "PROVIDER_ESTIMATE" | "HEURISTIC_ESTIMATE" | "USER_ENTERED" | "USER_REPORTED";

export type Confidence = "LOW" | "MEDIUM" | "HIGH";

type Style = "BUDGET" | "BACKPACKING" | "ADVENTURE" | "RELAXATION" | "CULTURAL" | "FAMILY" | "LUXURY";
type Stay = "HOSTEL" | "BUDGET_HOTEL" | "MID_RANGE_HOTEL" | "LUXURY_HOTEL" | "HOMESTAY" | "RESORT";
type Mode = "WALK" | "AUTO" | "TAXI" | "BUS" | "TRAIN";

const R = (rupees: number) => BigInt(rupees * 100);

/** Editorial planning assumptions (INR). Reviewable in one place. */
export const PLANNING_RATES = {
  /** Per room per night; hostels are per bed. Rooms sleep two. */
  stayPerNight: {
    HOSTEL: R(700), BUDGET_HOTEL: R(1500), MID_RANGE_HOTEL: R(4000),
    LUXURY_HOTEL: R(12000), HOMESTAY: R(2500), RESORT: R(8000),
  } as Record<Stay, bigint>,
  defaultStayByStyle: {
    BUDGET: "BUDGET_HOTEL", BACKPACKING: "HOSTEL", ADVENTURE: "BUDGET_HOTEL",
    RELAXATION: "MID_RANGE_HOTEL", CULTURAL: "MID_RANGE_HOTEL",
    FAMILY: "MID_RANGE_HOTEL", LUXURY: "LUXURY_HOTEL",
  } as Record<Style, Stay>,
  /** Per person per day. */
  foodPerPersonDay: {
    BUDGET: R(500), BACKPACKING: R(450), ADVENTURE: R(800), RELAXATION: R(1200),
    CULTURAL: R(900), FAMILY: R(1000), LUXURY: R(3000),
  } as Record<Style, bigint>,
  /** Per vehicle per km (bus/train: per person per km). */
  transportPerKm: { WALK: 0n, AUTO: R(15), TAXI: R(22), BUS: R(2), TRAIN: R(1) } as Record<Mode, bigint>,
  /** Minimum fare per motorised leg. */
  transportMinFare: { WALK: 0n, AUTO: R(40), TAXI: R(100), BUS: R(10), TRAIN: R(10) } as Record<Mode, bigint>,
  /** Seats per hired vehicle. */
  vehicleSeats: { WALK: 1, AUTO: 3, TAXI: 4, BUS: 1, TRAIN: 1 } as Record<Mode, number>,
  /** Miscellaneous buffer as a percentage of the estimated subtotal. */
  miscPercent: 5n,
};

export interface EstimateLine {
  category: BudgetCategory;
  amountPaise: bigint;
  source: AmountSource;
  confidence: Confidence;
  notes: string;
  dayIndex?: number;
  placeId?: string;
}

export interface UnavailableLine {
  category: BudgetCategory;
  reason: string;
  placeId?: string;
}

export interface KnownPrice {
  amountPaise: bigint;
  source: AmountSource;
  /** Price is charged per person. */
  perPerson: boolean;
}

export interface EstimateInput {
  travellers: number;
  nights: number;
  dayCount: number;
  travelStyle: Style | null;
  accommodationPref: Stay | null;
  legs: { dayIndex: number; mode: Mode; distanceMeters: number }[];
  stops: { dayIndex: number; placeId: string; placeName: string; kind: string; price: KnownPrice | null }[];
}

export interface EstimateResult {
  lines: EstimateLine[];
  unavailable: UnavailableLine[];
}

export function estimateTripCosts(input: EstimateInput): EstimateResult {
  if (input.travellers < 1) throw new Error("travellers must be at least 1");
  const lines: EstimateLine[] = [];
  const unavailable: UnavailableLine[] = [];
  const style: Style = input.travelStyle ?? "CULTURAL";
  const travellers = BigInt(input.travellers);

  // Accommodation
  if (input.nights > 0) {
    const stay = input.accommodationPref ?? PLANNING_RATES.defaultStayByStyle[style];
    const units = stay === "HOSTEL" ? input.travellers : Math.ceil(input.travellers / 2);
    lines.push({
      category: "ACCOMMODATION",
      amountPaise: PLANNING_RATES.stayPerNight[stay] * BigInt(units) * BigInt(input.nights),
      source: "HEURISTIC_ESTIMATE",
      confidence: "LOW",
      notes: `${units} ${stay === "HOSTEL" ? "bed" : "room"}${units > 1 ? "s" : ""} × ${input.nights} night${input.nights > 1 ? "s" : ""} at a planning rate — not a quote or live availability.`,
    });
  }

  // Intercity transport — origin unknown, so never guessed.
  unavailable.push({
    category: "INTERCITY_TRANSPORT",
    reason: "We do not estimate fares to and from the destination. Add your own tickets as actual expenses.",
  });

  // Local transport, per day
  const byDay = new Map<number, bigint>();
  for (const leg of input.legs) {
    if (leg.mode === "WALK") continue;
    const km = BigInt(Math.max(1, Math.ceil(leg.distanceMeters / 1000)));
    const shared = leg.mode === "BUS" || leg.mode === "TRAIN";
    const units = shared
      ? travellers
      : BigInt(Math.ceil(input.travellers / PLANNING_RATES.vehicleSeats[leg.mode]));
    const perUnit = max(PLANNING_RATES.transportPerKm[leg.mode] * km, PLANNING_RATES.transportMinFare[leg.mode]);
    byDay.set(leg.dayIndex, (byDay.get(leg.dayIndex) ?? 0n) + perUnit * units);
  }
  for (const [dayIndex, amountPaise] of [...byDay].sort((a, b) => a[0] - b[0])) {
    lines.push({
      category: "LOCAL_TRANSPORT",
      amountPaise,
      source: "HEURISTIC_ESTIMATE",
      confidence: "LOW",
      notes: "Estimated from route distances at planning per-km rates.",
      dayIndex,
    });
  }

  // Food, per day
  for (let d = 0; d < input.dayCount; d++) {
    lines.push({
      category: "FOOD",
      amountPaise: PLANNING_RATES.foodPerPersonDay[style] * travellers,
      source: "HEURISTIC_ESTIMATE",
      confidence: "LOW",
      notes: `Planning allowance for ${input.travellers} traveller${input.travellers > 1 ? "s" : ""}.`,
      dayIndex: d,
    });
  }

  // Entry fees and activities: only where a price is actually known.
  for (const stop of input.stops) {
    if (stop.kind === "RESTAURANT" || stop.kind === "SHOPPING") continue;
    const category: BudgetCategory = stop.kind === "ACTIVITY" ? "ACTIVITIES" : "ATTRACTION_ENTRY";
    if (!stop.price) {
      unavailable.push({
        category,
        placeId: stop.placeId,
        reason: `No recorded price for ${stop.placeName}. It may be free or ticketed — check locally.`,
      });
      continue;
    }
    lines.push({
      category,
      amountPaise: stop.price.perPerson ? stop.price.amountPaise * travellers : stop.price.amountPaise,
      source: stop.price.source,
      confidence: stop.price.source === "VERIFIED" ? "HIGH" : "MEDIUM",
      notes: `${stop.placeName}${stop.price.perPerson ? ` × ${input.travellers}` : ""}`,
      dayIndex: stop.dayIndex,
      placeId: stop.placeId,
    });
  }

  // Shopping is personal: surfaced, never assumed.
  unavailable.push({
    category: "SHOPPING",
    reason: "Shopping is up to you — record purchases as actual expenses.",
  });

  // Misc buffer
  const subtotal = sumPaise(lines.map((l) => l.amountPaise));
  if (subtotal > 0n) {
    lines.push({
      category: "MISC",
      amountPaise: (subtotal * PLANNING_RATES.miscPercent) / 100n,
      source: "HEURISTIC_ESTIMATE",
      confidence: "LOW",
      notes: `${PLANNING_RATES.miscPercent}% buffer for tips, water, and small surprises.`,
    });
  }

  return { lines, unavailable };
}

export interface BudgetSummary {
  currency: "INR";
  totalBudgetPaise: bigint | null;
  estimatedPaise: bigint;
  actualPaise: bigint;
  /** Budget minus estimate (plan view). Null when no budget is set. */
  remainingVsEstimatePaise: bigint | null;
  /** Budget minus actual spend (on-trip view). Null when no budget is set. */
  remainingVsActualPaise: bigint | null;
  perPersonEstimatedPaise: bigint;
  perDayEstimatedPaise: bigint;
  overBudget: boolean;
  categories: {
    category: BudgetCategory;
    estimatedPaise: bigint;
    actualPaise: bigint;
    /** True when no estimate exists and information is unavailable. */
    unavailable: boolean;
  }[];
}

export function summarizeBudget(args: {
  totalBudgetPaise: bigint | null;
  travellers: number;
  dayCount: number;
  estimates: { category: BudgetCategory; amountPaise: bigint }[];
  actuals: { category: BudgetCategory; amountPaise: bigint }[];
  unavailableCategories?: BudgetCategory[];
}): BudgetSummary {
  const est = new Map<BudgetCategory, bigint>();
  const act = new Map<BudgetCategory, bigint>();
  for (const e of args.estimates) est.set(e.category, (est.get(e.category) ?? 0n) + e.amountPaise);
  for (const a of args.actuals) act.set(a.category, (act.get(a.category) ?? 0n) + a.amountPaise);

  const estimatedPaise = sumPaise(est.values());
  const actualPaise = sumPaise(act.values());
  const budget = args.totalBudgetPaise;
  const days = BigInt(Math.max(1, args.dayCount));

  return {
    currency: "INR",
    totalBudgetPaise: budget,
    estimatedPaise,
    actualPaise,
    remainingVsEstimatePaise: budget === null ? null : budget - estimatedPaise,
    remainingVsActualPaise: budget === null ? null : budget - actualPaise,
    perPersonEstimatedPaise: perPersonPaise(estimatedPaise, Math.max(1, args.travellers)),
    perDayEstimatedPaise: (estimatedPaise + days - 1n) / days,
    overBudget: budget !== null && estimatedPaise > budget,
    categories: BUDGET_CATEGORY_ORDER.map((category) => ({
      category,
      estimatedPaise: est.get(category) ?? 0n,
      actualPaise: act.get(category) ?? 0n,
      unavailable:
        !est.has(category) && (args.unavailableCategories?.includes(category) ?? false),
    })),
  };
}

export interface BudgetAlternative {
  kind: "CHEAPER_STAY" | "SHORTER_TRIP" | "RAISE_BUDGET";
  message: string;
  estimatedPaise: bigint;
}

/** When the estimate exceeds the budget, compute concrete, checkable alternatives. */
export function budgetAlternatives(
  input: EstimateInput,
  totalBudgetPaise: bigint,
): BudgetAlternative[] {
  const total = (i: EstimateInput) => sumPaise(estimateTripCosts(i).lines.map((l) => l.amountPaise));
  const current = total(input);
  if (current <= totalBudgetPaise) return [];
  const out: BudgetAlternative[] = [];

  const style: Style = input.travelStyle ?? "CULTURAL";
  const currentStay = input.accommodationPref ?? PLANNING_RATES.defaultStayByStyle[style];
  const cheaper = (Object.keys(PLANNING_RATES.stayPerNight) as Stay[])
    .filter((s) => PLANNING_RATES.stayPerNight[s] < PLANNING_RATES.stayPerNight[currentStay])
    .sort((a, b) => Number(PLANNING_RATES.stayPerNight[b] - PLANNING_RATES.stayPerNight[a]));
  for (const stay of cheaper) {
    const t = total({ ...input, accommodationPref: stay });
    if (t <= totalBudgetPaise) {
      out.push({
        kind: "CHEAPER_STAY",
        message: `Switching accommodation to ${stay.replaceAll("_", " ").toLowerCase()} brings the estimate within budget.`,
        estimatedPaise: t,
      });
      break;
    }
  }

  for (let days = input.dayCount - 1; days >= 1; days--) {
    const t = total({
      ...input,
      dayCount: days,
      nights: Math.max(0, input.nights - (input.dayCount - days)),
      legs: input.legs.filter((l) => l.dayIndex < days),
      stops: input.stops.filter((s) => s.dayIndex < days),
    });
    if (t <= totalBudgetPaise) {
      out.push({
        kind: "SHORTER_TRIP",
        message: `A ${days}-day version of this trip fits the budget.`,
        estimatedPaise: t,
      });
      break;
    }
  }

  out.push({
    kind: "RAISE_BUDGET",
    message: "Raising the budget to the current estimate would cover this plan as it stands.",
    estimatedPaise: current,
  });
  return out;
}

function max(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}
