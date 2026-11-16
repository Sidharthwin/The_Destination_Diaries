import { describe, expect, it } from "vitest";
import { classifyOsmTags, normalizeOsmElement } from "@/server/providers/places/osm";
import { safeNext } from "@/lib/utils/safe-next";
import { createTripSchema, replanSchema, updateStopSchema } from "@/lib/validation/trips";
import { nearbyQuerySchema, placeSearchQuerySchema } from "@/lib/validation/places";
import { explanationSchema } from "@/server/providers/llm/types";

describe("OSM normalization", () => {
  it("maps tags onto place kinds and interest categories", () => {
    expect(classifyOsmTags({ tourism: "museum" })).toEqual({ kind: "MUSEUM", categories: ["museums", "history"] });
    expect(classifyOsmTags({ tourism: "viewpoint" })?.kind).toBe("VIEWPOINT");
    expect(classifyOsmTags({ amenity: "place_of_worship", historic: "yes" })).toEqual({ kind: "RELIGIOUS_SITE", categories: ["religious", "history"] });
    expect(classifyOsmTags({ historic: "fort" })?.kind).toBe("ATTRACTION");
    expect(classifyOsmTags({ natural: "waterfall" })?.kind).toBe("NATURE");
    expect(classifyOsmTags({ amenity: "marketplace" })?.kind).toBe("SHOPPING");
    expect(classifyOsmTags({ shop: "supermarket" })).toBeNull();
  });

  it("normalizes nodes and ways, preferring English names and keeping a source link", () => {
    const node = normalizeOsmElement({ type: "node", id: 42, lat: 15.335, lon: 76.46, tags: { name: "ವಿರೂಪಾಕ್ಷ", "name:en": "Virupaksha Temple", amenity: "place_of_worship" } });
    expect(node).toMatchObject({
      externalId: "node/42", name: "Virupaksha Temple", kind: "RELIGIOUS_SITE", lat: 15.335, lng: 76.46,
      sourceUrl: "https://www.openstreetmap.org/node/42",
    });
    const way = normalizeOsmElement({ type: "way", id: 7, center: { lat: 26.98, lon: 75.85 }, tags: { name: "Amber Fort", historic: "fort" } });
    expect(way).toMatchObject({ externalId: "way/7", lat: 26.98, lng: 75.85 });
  });

  it("rejects elements without a name, a position or a recognised type", () => {
    expect(normalizeOsmElement({ type: "node", id: 1, lat: 1, lon: 1, tags: { historic: "fort" } })).toBeNull();
    expect(normalizeOsmElement({ type: "way", id: 2, tags: { name: "X", historic: "fort" } })).toBeNull();
    expect(normalizeOsmElement({ type: "node", id: 3, lat: 1, lon: 1, tags: { name: "Shop", shop: "bakery" } })).toBeNull();
  });

  it("never invents a description", () => {
    const p = normalizeOsmElement({ type: "node", id: 9, lat: 1, lon: 1, tags: { name: "Fort", historic: "fort" } });
    expect(p?.description).toBeNull();
  });
});

describe("redirect safety", () => {
  it("only allows same-site relative paths", () => {
    expect(safeNext("/trips/123")).toBe("/trips/123");
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("/\\evil.example")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext("", "/x")).toBe("/x");
  });
});

describe("validation schemas", () => {
  const valid = {
    title: "Trip", destinationCityId: "11111111-1111-4111-8111-111111111111",
    startDate: "2027-01-01", endDate: "2027-01-03", travellers: 2,
  };

  it("accepts a minimal valid trip and applies defaults", () => {
    const t = createTripSchema.parse(valid);
    expect(t.interests).toEqual([]);
    expect(t.isDraft).toBe(false);
  });

  it("rejects bad dates, counts, budgets and unknown enum values", () => {
    const bad = [
      { ...valid, endDate: "2026-12-31" },
      { ...valid, startDate: "01/01/2027" },
      { ...valid, endDate: "2027-02-15" },
      { ...valid, travellers: 0 },
      { ...valid, travellers: 2.5 },
      { ...valid, totalBudgetRupees: -1 },
      { ...valid, travelStyle: "TELEPORT" },
      { ...valid, destinationCityId: "not-a-uuid" },
      { ...valid, title: "   " },
    ];
    for (const input of bad) expect(createTripSchema.safeParse(input).success).toBe(false);
  });

  it("keeps stop edits and replans within safe bounds", () => {
    expect(updateStopSchema.safeParse({ visitDurationMins: 5 }).success).toBe(false);
    expect(updateStopSchema.safeParse({ visitDurationMins: 90, locked: true }).success).toBe(true);
    expect(updateStopSchema.safeParse({ placeId: "x" }).success).toBe(false); // strict
    expect(replanSchema.parse({ reason: "SLOWER_PACE" }).paceFactor).toBe(1);
    expect(replanSchema.safeParse({ reason: "BECAUSE" }).success).toBe(false);
    expect(replanSchema.safeParse({ reason: "OTHER", paceFactor: 9 }).success).toBe(false);
  });

  it("coerces and bounds search queries", () => {
    expect(placeSearchQuerySchema.parse({ limit: "5" })).toMatchObject({ limit: 5, offset: 0 });
    expect(placeSearchQuerySchema.safeParse({ limit: "500" }).success).toBe(false);
    expect(nearbyQuerySchema.parse({ lat: "26.9", lng: "75.8" }).radiusKm).toBe(5);
    expect(nearbyQuerySchema.safeParse({ lat: "126.9", lng: "75.8" }).success).toBe(false);
  });

  it("rejects malformed AI output so it can never reach users", () => {
    expect(explanationSchema.safeParse({ summary: "ok", dayNotes: [{ dayIndex: 0, title: "t", note: "n" }] }).success).toBe(true);
    expect(explanationSchema.safeParse({ summary: 5, dayNotes: [] }).success).toBe(false);
    expect(explanationSchema.safeParse({ summary: "ok", dayNotes: [{ dayIndex: "first", title: "t", note: "n" }] }).success).toBe(false);
    expect(explanationSchema.safeParse("Here is your itinerary!").success).toBe(false);
  });
});
