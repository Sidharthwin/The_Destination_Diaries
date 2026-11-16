import { describe, expect, it } from "vitest";
import { chooseMode, estimateRoute, haversineMeters } from "@/server/services/optimizer/geo";
import { orderStops, planItinerary } from "@/server/services/optimizer/planner";
import { dayOfWeek, hoursOn, paceConfig, timeDay } from "@/server/services/optimizer/scheduler";
import { SCORE_WEIGHTS, scoreAll, scorePlace } from "@/server/services/optimizer/scorer";
import { baseInput, hours, place, twoClusterFixture } from "./fixtures";

describe("geo", () => {
  it("computes great-circle distance between Delhi and Mumbai within 1%", () => {
    const delhi = { lat: 28.6139, lng: 77.209 };
    const mumbai = { lat: 19.076, lng: 72.8777 };
    const km = haversineMeters(delhi, mumbai) / 1000;
    expect(km).toBeGreaterThan(1140);
    expect(km).toBeLessThan(1165);
  });

  it("is zero for identical points and symmetric", () => {
    const a = { lat: 9.96, lng: 76.24 };
    const b = { lat: 9.93, lng: 76.26 };
    expect(haversineMeters(a, a)).toBe(0);
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });

  it("walks short hops and respects the transport preference for longer ones", () => {
    expect(chooseMode(600, "CAR_WITH_DRIVER")).toBe("WALK");
    expect(chooseMode(1800, "WALKING_FOCUSED")).toBe("WALK");
    expect(chooseMode(1800, "MIXED")).toBe("AUTO");
    expect(chooseMode(6000, "PUBLIC_TRANSPORT")).toBe("BUS");
    expect(chooseMode(6000, "SELF_DRIVE")).toBe("TAXI");
    expect(chooseMode(12000, "MIXED")).toBe("TAXI");
  });

  it("estimates longer durations for longer distances", () => {
    const a = { lat: 26.92, lng: 75.82 };
    const near = estimateRoute(a, { lat: 26.925, lng: 75.825 }, "MIXED");
    const far = estimateRoute(a, { lat: 26.985, lng: 75.85 }, "MIXED");
    expect(far.distanceMeters).toBeGreaterThan(near.distanceMeters);
    expect(far.durationMins).toBeGreaterThan(near.durationMins);
  });
});

describe("scorer", () => {
  it("returns an explainable breakdown that sums to the total", () => {
    const p = place({ name: "Fort", lat: 1, lng: 1, categories: ["history", "photography"] });
    const s = scorePlace(p, { interests: ["history", "photography"], travelStyle: "CULTURAL" });
    const sum = Object.values(s.factors).reduce((a, b) => a + b, 0);
    expect(s.total).toBeCloseTo(sum, 5);
    expect(s.matchedInterests).toEqual(["history", "photography"]);
    expect(s.factors.interestMatch).toBe(SCORE_WEIGHTS.interestMatch);
  });

  it("ranks interest matches above non-matches", () => {
    const fort = place({ name: "Fort", lat: 1, lng: 1, categories: ["history"] });
    const mall = place({ name: "Mall", lat: 1, lng: 1, kind: "SHOPPING", categories: ["shopping"] });
    const ranked = scoreAll([mall, fort], { interests: ["history"], travelStyle: null });
    expect(ranked[0].placeId).toBe(fort.id);
  });

  it("gives a retention bonus to places from the previous plan", () => {
    const p = place({ name: "A", lat: 1, lng: 1 });
    const without = scorePlace(p, { interests: [], travelStyle: null });
    const withBonus = scorePlace(p, { interests: [], travelStyle: null, retainPlaceIds: new Set([p.id]) });
    expect(withBonus.total - without.total).toBe(SCORE_WEIGHTS.retention);
  });

  it("is deterministic for ties", () => {
    const a = place({ id: "b", name: "Same", lat: 1, lng: 1 });
    const b = place({ id: "a", name: "Same", lat: 1, lng: 1 });
    const r1 = scoreAll([a, b], { interests: [], travelStyle: null }).map((s) => s.placeId);
    const r2 = scoreAll([b, a], { interests: [], travelStyle: null }).map((s) => s.placeId);
    expect(r1).toEqual(r2);
  });
});

describe("scheduler", () => {
  const cfg = paceConfig("CULTURAL");

  it("computes the weekday without timezone drift", () => {
    expect(dayOfWeek("2026-12-07")).toBe(1); // Monday
    expect(dayOfWeek("2026-12-13")).toBe(0); // Sunday
  });

  it("treats missing hours as unknown, never closed", () => {
    const p = place({ name: "A", lat: 1, lng: 1 });
    expect(hoursOn(p, "2026-12-07").kind).toBe("unknown");
    const q = place({ name: "B", lat: 1, lng: 1, openingHours: hours(540, 1020, [1]) });
    expect(hoursOn(q, "2026-12-07").kind).toBe("closed");
    expect(hoursOn(q, "2026-12-08").kind).toBe("open");
  });

  it("produces non-overlapping stops with travel time between them", () => {
    const a = place({ name: "A", lat: 26.92, lng: 75.82 });
    const b = place({ name: "B", lat: 26.95, lng: 75.85 });
    const c = place({ name: "C", lat: 26.985, lng: 75.851 });
    const day = timeDay({ dayIndex: 0, date: "2026-12-07", places: [a, b, c], cfg, transportPref: "MIXED" });
    expect(day.stops[0].arrivalMin).toBe(cfg.dayStartMin);
    for (let i = 1; i < day.stops.length; i++) {
      const gap = day.stops[i].arrivalMin - day.stops[i - 1].departureMin;
      expect(gap).toBeGreaterThanOrEqual(day.legs[i - 1].durationMins);
    }
    expect(day.legs).toHaveLength(2);
    expect(day.totalTravelMins).toBe(day.legs.reduce((s, l) => s + l.durationMins, 0));
  });

  it("waits for a place to open", () => {
    const late = place({ name: "Museum", lat: 26.92, lng: 75.82, openingHours: hours(11 * 60, 17 * 60) });
    const day = timeDay({ dayIndex: 0, date: "2026-12-07", places: [late], cfg, transportPref: null });
    expect(day.stops[0].arrivalMin).toBe(11 * 60);
    expect(day.warnings).toHaveLength(0);
  });

  it("warns when a stop falls outside opening hours or on a closed day", () => {
    const early = place({ name: "Sunrise", lat: 26.92, lng: 75.82, openingHours: hours(5 * 60, 8 * 60) });
    const closedMon = place({ name: "Museum", lat: 26.92, lng: 75.82, openingHours: hours(540, 1020, [1]) });
    const day = timeDay({ dayIndex: 0, date: "2026-12-07", places: [early, closedMon], cfg, transportPref: null });
    expect(day.warnings.map((w) => w.code).sort()).toEqual(["CLOSED_THAT_DAY", "OUTSIDE_OPENING_HOURS"]);
  });

  it("inserts a lunch break around midday", () => {
    const stops = [0, 1, 2, 3].map((i) =>
      place({ name: `S${i}`, lat: 26.92, lng: 75.82 + i * 0.001, typicalVisitMins: 90 }),
    );
    const day = timeDay({ dayIndex: 0, date: "2026-12-07", places: stops, cfg, transportPref: null });
    const gaps = day.stops.slice(1).map((s, i) => s.arrivalMin - day.stops[i].departureMin - day.legs[i].durationMins);
    expect(gaps.filter((g) => g === cfg.lunchMins)).toHaveLength(1);
  });

  it("flags days that run past the day window", () => {
    const stops = Array.from({ length: 9 }, (_, i) =>
      place({ name: `S${i}`, lat: 26.92, lng: 75.82 + i * 0.001, typicalVisitMins: 90 }),
    );
    const day = timeDay({ dayIndex: 0, date: "2026-12-07", places: stops, cfg, transportPref: null });
    expect(day.warnings.some((w) => w.code === "RUNS_LATE")).toBe(true);
  });

  it("slows the pace when the pace factor increases", () => {
    const normal = paceConfig("CULTURAL", 1);
    const slow = paceConfig("CULTURAL", 1.5);
    expect(slow.dayEndMin - slow.dayStartMin).toBeLessThan(normal.dayEndMin - normal.dayStartMin);
  });
});

describe("planner", () => {
  it("returns an empty plan for a trip with no days", () => {
    expect(planItinerary(baseInput({ days: [] })).days).toEqual([]);
  });

  it("groups geographically close places on the same day", () => {
    const { center, west, east } = twoClusterFixture();
    const plan = planItinerary(baseInput({ center, candidates: [...west, ...east] }));
    expect(plan.days).toHaveLength(2);
    for (const day of plan.days) {
      const prefixes = new Set(day.stops.map((s) => s.placeId[0]));
      expect(prefixes.size).toBe(1); // never mixes the two clusters in one day
    }
    expect(plan.days.flatMap((d) => d.stops)).toHaveLength(8);
  });

  it("orders stops to avoid backtracking along a line", () => {
    const line = [3, 0, 2, 4, 1].map((i) =>
      place({ id: `l${i}`, name: `L${i}`, lat: 26.9, lng: 75.7 + i * 0.01 }),
    );
    const ordered = orderStops(line, { transportPref: "MIXED" }).map((p) => p.id);
    const forward = ["l0", "l1", "l2", "l3", "l4"];
    expect([forward, [...forward].reverse()]).toContainEqual(ordered);
  });

  it("is deterministic regardless of candidate order", () => {
    const { center, west, east } = twoClusterFixture();
    const a = planItinerary(baseInput({ center, candidates: [...west, ...east] }));
    const b = planItinerary(baseInput({ center, candidates: [...east.reverse(), ...west.reverse()] }));
    const shape = (p: typeof a) => p.days.map((d) => d.stops.map((s) => s.placeId));
    expect(shape(a)).toEqual(shape(b));
  });

  it("never schedules past the day window and reports what was left out", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      place({ name: `M${i}`, lat: 26.9 + (i % 6) * 0.004, lng: 75.76 + Math.floor(i / 6) * 0.004, typicalVisitMins: 90 }),
    );
    const cfg = paceConfig("CULTURAL");
    const plan = planItinerary(baseInput({ candidates: many }));
    for (const day of plan.days) {
      expect(day.warnings).toEqual([]);
      for (const s of day.stops) expect(s.departureMin).toBeLessThanOrEqual(cfg.dayEndMin);
    }
    const scheduled = plan.days.flatMap((d) => d.stops).length;
    expect(scheduled).toBeGreaterThan(4);
    expect(scheduled + plan.dropped.length).toBe(30);
  });

  it("prefers places that match the traveller's interests", () => {
    const forts = Array.from({ length: 12 }, (_, i) =>
      place({ id: `fort${i}`, name: `Fort ${i}`, lat: 26.9 + i * 0.002, lng: 75.76, categories: ["history"], typicalVisitMins: 120 }),
    );
    const malls = Array.from({ length: 12 }, (_, i) =>
      place({ id: `mall${i}`, name: `Mall ${i}`, lat: 26.9 + i * 0.002, lng: 75.765, kind: "SHOPPING", categories: ["shopping"], typicalVisitMins: 120 }),
    );
    const plan = planItinerary(baseInput({ candidates: [...malls, ...forts], days: [{ index: 0, date: "2026-12-07" }] }));
    const ids = plan.days[0].stops.map((s) => s.placeId);
    expect(ids.filter((id) => id.startsWith("fort")).length).toBeGreaterThan(
      ids.filter((id) => id.startsWith("mall")).length,
    );
  });

  it("moves a place to a day when it is open", () => {
    const closedMonday = place({ id: "museum", name: "Museum", lat: 26.9, lng: 75.76, openingHours: hours(540, 1020, [1]) });
    const others = [0, 1, 2].map((i) => place({ name: `O${i}`, lat: 26.9 + i * 0.001, lng: 75.76 }));
    const plan = planItinerary(baseInput({ candidates: [closedMonday, ...others] }));
    const day = plan.days.find((d) => d.stops.some((s) => s.placeId === "museum"));
    expect(day?.date).toBe("2026-12-08"); // Tuesday
    expect(plan.days.flatMap((d) => d.warnings)).toEqual([]);
  });

  it("drops a place closed on every trip day with a structured reason", () => {
    const closed = place({ id: "x", name: "Closed", lat: 26.9, lng: 75.76, openingHours: hours(540, 1020, [1, 2]) });
    const plan = planItinerary(baseInput({ candidates: [closed] }));
    expect(plan.days.flatMap((d) => d.stops)).toHaveLength(0);
    expect(plan.dropped).toEqual([
      expect.objectContaining({ placeId: "x", reason: "CLOSED_ON_TRIP_DAYS" }),
    ]);
  });

  it("schedules within opening hours by repositioning stops", () => {
    const morningOnly = place({ id: "am", name: "Morning market", lat: 26.9, lng: 75.76, openingHours: hours(9 * 60, 11 * 60), typicalVisitMins: 60 });
    const rest = [0, 1, 2, 3].map((i) => place({ id: `r${i}`, name: `R${i}`, lat: 26.9 + (i + 1) * 0.003, lng: 75.76, typicalVisitMins: 60 }));
    const plan = planItinerary(baseInput({ candidates: [...rest, morningOnly], days: [{ index: 0, date: "2026-12-07" }] }));
    const stop = plan.days[0].stops.find((s) => s.placeId === "am");
    expect(stop).toBeDefined();
    expect(stop!.departureMin).toBeLessThanOrEqual(11 * 60);
    expect(plan.days[0].warnings).toEqual([]);
  });

  it("keeps locked stops on their day and honours exclusions", () => {
    const { center, west, east } = twoClusterFixture();
    const plan = planItinerary(
      baseInput({
        center,
        candidates: [...west, ...east],
        locked: [{ placeId: "w0", dayIndex: 1 }, { placeId: "e0", dayIndex: 1 }],
        excludedPlaceIds: ["w3"],
      }),
    );
    const day1 = plan.days[1].stops;
    expect(day1.filter((s) => s.locked).map((s) => s.placeId).sort()).toEqual(["e0", "w0"]);
    expect(plan.days.flatMap((d) => d.stops).some((s) => s.placeId === "w3")).toBe(false);
  });

  it("applies duration overrides", () => {
    const a = place({ id: "a", name: "A", lat: 26.9, lng: 75.76, typicalVisitMins: 60 });
    const plan = planItinerary(baseInput({ candidates: [a], durationOverrides: { a: 200 } }));
    expect(plan.days.flatMap((d) => d.stops)[0].visitDurationMins).toBe(200);
  });

  it("is honest that the result is heuristic", () => {
    const plan = planItinerary(baseInput({ candidates: [place({ name: "A", lat: 26.9, lng: 75.76 })] }));
    expect(plan.notes.join(" ")).toMatch(/heuristic/i);
    expect(plan.notes.join(" ")).toMatch(/opening hours/i);
  });
});
