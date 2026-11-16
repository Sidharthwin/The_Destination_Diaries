import type { CandidatePlace, PlannerInput } from "@/server/services/optimizer/types";

let n = 0;
export function place(
  partial: Partial<CandidatePlace> & { name: string; lat: number; lng: number },
): CandidatePlace {
  n += 1;
  return {
    id: partial.id ?? `p${String(n).padStart(3, "0")}`,
    kind: "ATTRACTION",
    categories: ["history"],
    typicalVisitMins: 60,
    openingHours: [],
    verified: false,
    ...partial,
  };
}

/** Two tight geographic groups ~12 km apart, plus the centre between them. */
export function twoClusterFixture(): { center: { lat: number; lng: number }; west: CandidatePlace[]; east: CandidatePlace[] } {
  const west = [0, 1, 2, 3].map((i) =>
    place({ id: `w${i}`, name: `West ${i}`, lat: 26.9 + i * 0.002, lng: 75.7 + i * 0.002 }),
  );
  const east = [0, 1, 2, 3].map((i) =>
    place({ id: `e${i}`, name: `East ${i}`, lat: 26.9 + i * 0.002, lng: 75.82 + i * 0.002 }),
  );
  return { center: { lat: 26.9, lng: 75.76 }, west, east };
}

export function baseInput(overrides: Partial<PlannerInput> = {}): PlannerInput {
  return {
    center: { lat: 26.9, lng: 75.76 },
    days: [
      { index: 0, date: "2026-12-07" }, // Monday
      { index: 1, date: "2026-12-08" }, // Tuesday
    ],
    candidates: [],
    interests: ["history"],
    travelStyle: "CULTURAL",
    transportPref: "MIXED",
    ...overrides,
  };
}

/** Open every day 09:00–17:00 except the listed weekdays. */
export function hours(opens: number, closes: number, exceptDays: number[] = []) {
  return [0, 1, 2, 3, 4, 5, 6]
    .filter((d) => !exceptDays.includes(d))
    .map((dayOfWeek) => ({ dayOfWeek, opensMin: opens, closesMin: closes }));
}
