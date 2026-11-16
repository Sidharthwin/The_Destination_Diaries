import type { CandidatePlace, PlaceKind, ScoreBreakdown, TravelStyle } from "./types";

/**
 * Explainable scoring. Each factor has a fixed maximum; the total is their
 * sum (0–100). Weights live here so they are easy to review and test.
 */
export const SCORE_WEIGHTS = {
  interestMatch: 50,
  styleAffinity: 20,
  kindBaseline: 10,
  verification: 5,
  retention: 15,
} as const;

const STYLE_AFFINITY: Record<TravelStyle, { categories: string[]; kinds: PlaceKind[] }> = {
  BUDGET: { categories: ["local-experiences", "nature", "religious"], kinds: ["VIEWPOINT", "NATURE", "RELIGIOUS_SITE", "SHOPPING"] },
  BACKPACKING: { categories: ["local-experiences", "nature", "adventure", "food"], kinds: ["VIEWPOINT", "NATURE", "ACTIVITY"] },
  ADVENTURE: { categories: ["adventure", "nature"], kinds: ["ACTIVITY", "NATURE", "VIEWPOINT"] },
  RELAXATION: { categories: ["nature", "food", "photography"], kinds: ["NATURE", "VIEWPOINT", "RESTAURANT"] },
  CULTURAL: { categories: ["history", "museums", "religious", "local-experiences"], kinds: ["ATTRACTION", "MUSEUM", "RELIGIOUS_SITE"] },
  FAMILY: { categories: ["nature", "museums", "history", "local-experiences"], kinds: ["ATTRACTION", "MUSEUM", "NATURE"] },
  LUXURY: { categories: ["history", "food", "shopping", "photography"], kinds: ["ATTRACTION", "RESTAURANT", "SHOPPING"] },
};

const KIND_BASELINE: Record<PlaceKind, number> = {
  ATTRACTION: 1,
  VIEWPOINT: 0.85,
  NATURE: 0.85,
  MUSEUM: 0.8,
  RELIGIOUS_SITE: 0.75,
  ACTIVITY: 0.75,
  SHOPPING: 0.55,
  RESTAURANT: 0.45,
  OTHER: 0.3,
};

export interface ScoreContext {
  interests: string[];
  travelStyle: TravelStyle | null;
  retainPlaceIds?: ReadonlySet<string>;
}

export function scorePlace(place: CandidatePlace, ctx: ScoreContext): ScoreBreakdown {
  const w = SCORE_WEIGHTS;
  const matched = place.categories.filter((c) => ctx.interests.includes(c));

  let interestRatio: number;
  if (ctx.interests.length === 0) interestRatio = 0.5; // no stated interests → neutral
  else if (matched.length === 0) interestRatio = 0.1;
  else interestRatio = 0.6 + 0.4 * Math.min(1, matched.length / 2);

  let styleRatio = 0.5;
  if (ctx.travelStyle) {
    const aff = STYLE_AFFINITY[ctx.travelStyle];
    const catHit = place.categories.some((c) => aff.categories.includes(c));
    const kindHit = aff.kinds.includes(place.kind);
    styleRatio = (catHit ? 0.6 : 0) + (kindHit ? 0.4 : 0);
  }

  const factors = {
    interestMatch: round1(w.interestMatch * interestRatio),
    styleAffinity: round1(w.styleAffinity * styleRatio),
    kindBaseline: round1(w.kindBaseline * KIND_BASELINE[place.kind]),
    verification: place.verified ? w.verification : 0,
    retention: ctx.retainPlaceIds?.has(place.id) ? w.retention : 0,
  };
  const total = round1(
    factors.interestMatch + factors.styleAffinity + factors.kindBaseline +
      factors.verification + factors.retention,
  );
  return { placeId: place.id, total, factors, matchedInterests: matched };
}

/** Scores all candidates and returns them best-first with a stable tie-break. */
export function scoreAll(places: CandidatePlace[], ctx: ScoreContext): ScoreBreakdown[] {
  const names = new Map(places.map((p) => [p.id, p.name]));
  return places
    .map((p) => scorePlace(p, ctx))
    .sort(
      (a, b) =>
        b.total - a.total ||
        (names.get(a.placeId) ?? "").localeCompare(names.get(b.placeId) ?? "") ||
        a.placeId.localeCompare(b.placeId),
    );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
