import { describe, expect, it } from "vitest";
import { formatINR, perPersonPaise, rupeesToPaise, splitPaise, sumPaise } from "@/lib/utils/money";
import {
  PLANNING_RATES, budgetAlternatives, estimateTripCosts, summarizeBudget,
  type EstimateInput,
} from "@/server/services/budget/engine";

const base: EstimateInput = {
  travellers: 2,
  nights: 2,
  dayCount: 3,
  travelStyle: "CULTURAL",
  accommodationPref: "MID_RANGE_HOTEL",
  legs: [],
  stops: [],
};

describe("money", () => {
  it("converts rupees to integer paise without float drift", () => {
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30n);
    expect(rupeesToPaise(1999.99)).toBe(199999n);
  });

  it("splits amounts so shares always sum to the total", () => {
    const shares = splitPaise(1000n, 3);
    expect(shares).toEqual([334n, 333n, 333n]);
    expect(sumPaise(shares)).toBe(1000n);
  });

  it("rounds per-person shares up", () => {
    expect(perPersonPaise(1000n, 3)).toBe(334n);
    expect(perPersonPaise(900n, 3)).toBe(300n);
  });

  it("formats rupees in the Indian numbering system", () => {
    expect(formatINR(12345600n)).toBe("₹1,23,456");
    expect(formatINR(150000000n, { compact: true })).toBe("₹15 L");
  });
});

describe("estimateTripCosts", () => {
  it("computes accommodation as rooms × nights", () => {
    const { lines } = estimateTripCosts({ ...base, travellers: 3 });
    const stay = lines.find((l) => l.category === "ACCOMMODATION")!;
    // 3 travellers → 2 rooms, 2 nights
    expect(stay.amountPaise).toBe(PLANNING_RATES.stayPerNight.MID_RANGE_HOTEL * 2n * 2n);
    expect(stay.source).toBe("HEURISTIC_ESTIMATE");
    expect(stay.confidence).toBe("LOW");
  });

  it("charges hostels per bed", () => {
    const { lines } = estimateTripCosts({ ...base, travellers: 3, accommodationPref: "HOSTEL" });
    expect(lines.find((l) => l.category === "ACCOMMODATION")!.amountPaise).toBe(
      PLANNING_RATES.stayPerNight.HOSTEL * 3n * 2n,
    );
  });

  it("omits accommodation for a day trip", () => {
    const { lines } = estimateTripCosts({ ...base, nights: 0, dayCount: 1 });
    expect(lines.some((l) => l.category === "ACCOMMODATION")).toBe(false);
  });

  it("never guesses intercity transport or shopping", () => {
    const { lines, unavailable } = estimateTripCosts(base);
    expect(lines.some((l) => l.category === "INTERCITY_TRANSPORT")).toBe(false);
    expect(lines.some((l) => l.category === "SHOPPING")).toBe(false);
    expect(unavailable.map((u) => u.category)).toEqual(
      expect.arrayContaining(["INTERCITY_TRANSPORT", "SHOPPING"]),
    );
  });

  it("uses known prices with their own source and flags unknown ones", () => {
    const { lines, unavailable } = estimateTripCosts({
      ...base,
      stops: [
        { dayIndex: 0, placeId: "a", placeName: "Fort", kind: "ATTRACTION", price: { amountPaise: 20000n, source: "VERIFIED", perPerson: true } },
        { dayIndex: 0, placeId: "b", placeName: "Palace", kind: "ATTRACTION", price: null },
        { dayIndex: 1, placeId: "c", placeName: "Rafting", kind: "ACTIVITY", price: { amountPaise: 150000n, source: "PROVIDER_ESTIMATE", perPerson: false } },
      ],
    });
    const fort = lines.find((l) => l.placeId === "a")!;
    expect(fort.amountPaise).toBe(40000n); // × 2 travellers
    expect(fort.source).toBe("VERIFIED");
    expect(fort.confidence).toBe("HIGH");
    const rafting = lines.find((l) => l.placeId === "c")!;
    expect(rafting.category).toBe("ACTIVITIES");
    expect(rafting.amountPaise).toBe(150000n);
    expect(unavailable.some((u) => u.placeId === "b")).toBe(true);
    expect(lines.some((l) => l.placeId === "b")).toBe(false);
  });

  it("prices local transport per vehicle with a minimum fare, and walking as free", () => {
    const { lines } = estimateTripCosts({
      ...base,
      travellers: 5,
      legs: [
        { dayIndex: 0, mode: "WALK", distanceMeters: 800 },
        { dayIndex: 0, mode: "AUTO", distanceMeters: 1200 }, // 2 km → ₹30 < min ₹40; 5 people → 2 autos
        { dayIndex: 0, mode: "TAXI", distanceMeters: 10_000 }, // 10 km × ₹22 = ₹220; 2 taxis
        { dayIndex: 1, mode: "BUS", distanceMeters: 10_000 }, // ₹20 × 5 people
      ],
    });
    const transport = lines.filter((l) => l.category === "LOCAL_TRANSPORT");
    expect(transport).toHaveLength(2);
    expect(transport[0].amountPaise).toBe(4000n * 2n + 22000n * 2n);
    expect(transport[1].amountPaise).toBe(2000n * 5n);
  });

  it("adds a misc buffer as an exact percentage of the subtotal", () => {
    const { lines } = estimateTripCosts(base);
    const misc = lines.find((l) => l.category === "MISC")!;
    const subtotal = sumPaise(lines.filter((l) => l.category !== "MISC").map((l) => l.amountPaise));
    expect(misc.amountPaise).toBe((subtotal * 5n) / 100n);
  });

  it("rejects zero travellers", () => {
    expect(() => estimateTripCosts({ ...base, travellers: 0 })).toThrow();
  });
});

describe("summarizeBudget", () => {
  const estimates = [
    { category: "FOOD" as const, amountPaise: 300000n },
    { category: "FOOD" as const, amountPaise: 300000n },
    { category: "ACCOMMODATION" as const, amountPaise: 800000n },
  ];

  it("keeps estimates and actuals separate", () => {
    const s = summarizeBudget({
      totalBudgetPaise: 2000000n,
      travellers: 2,
      dayCount: 3,
      estimates,
      actuals: [{ category: "FOOD", amountPaise: 120000n }],
    });
    expect(s.estimatedPaise).toBe(1400000n);
    expect(s.actualPaise).toBe(120000n);
    expect(s.remainingVsEstimatePaise).toBe(600000n);
    expect(s.remainingVsActualPaise).toBe(1880000n);
    expect(s.overBudget).toBe(false);
    const food = s.categories.find((c) => c.category === "FOOD")!;
    expect(food.estimatedPaise).toBe(600000n);
    expect(food.actualPaise).toBe(120000n);
  });

  it("derives per-person and per-day figures, rounding up", () => {
    const s = summarizeBudget({ totalBudgetPaise: null, travellers: 3, dayCount: 3, estimates, actuals: [] });
    expect(s.perPersonEstimatedPaise).toBe(466667n);
    expect(s.perDayEstimatedPaise).toBe(466667n);
    expect(s.remainingVsEstimatePaise).toBeNull();
    expect(s.overBudget).toBe(false);
  });

  it("detects an over-budget plan and marks unavailable categories", () => {
    const s = summarizeBudget({
      totalBudgetPaise: 1000000n,
      travellers: 2,
      dayCount: 3,
      estimates,
      actuals: [],
      unavailableCategories: ["INTERCITY_TRANSPORT", "FOOD"],
    });
    expect(s.overBudget).toBe(true);
    expect(s.remainingVsEstimatePaise).toBe(-400000n);
    expect(s.categories.find((c) => c.category === "INTERCITY_TRANSPORT")!.unavailable).toBe(true);
    // FOOD has an estimate, so it is not "unavailable"
    expect(s.categories.find((c) => c.category === "FOOD")!.unavailable).toBe(false);
  });

  it("always lists all eight categories", () => {
    const s = summarizeBudget({ totalBudgetPaise: null, travellers: 1, dayCount: 1, estimates: [], actuals: [] });
    expect(s.categories).toHaveLength(8);
  });
});

describe("budgetAlternatives", () => {
  it("returns nothing when the plan fits", () => {
    expect(budgetAlternatives(base, 100_000_000n)).toEqual([]);
  });

  it("proposes alternatives whose estimates really fit the budget", () => {
    const current = sumPaise(estimateTripCosts(base).lines.map((l) => l.amountPaise));
    const budget = (current * 70n) / 100n;
    const alts = budgetAlternatives(base, budget);
    expect(alts.length).toBeGreaterThan(0);
    for (const alt of alts.filter((a) => a.kind !== "RAISE_BUDGET")) {
      expect(alt.estimatedPaise).toBeLessThanOrEqual(budget);
    }
    const raise = alts.find((a) => a.kind === "RAISE_BUDGET")!;
    expect(raise.estimatedPaise).toBe(current);
  });
});
