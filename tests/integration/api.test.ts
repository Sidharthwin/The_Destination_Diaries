import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth/session", async () => (await import("./helpers")).sessionMock);

import { GET as nearbyGET } from "@/app/api/places/nearby/route";
import { GET as placeGET } from "@/app/api/places/[id]/route";
import { GET as searchGET } from "@/app/api/places/search/route";
import { POST as feedbackPOST } from "@/app/api/feedback/route";
import { GET as tripsGET, POST as tripsPOST } from "@/app/api/trips/route";
import { DELETE as tripDELETE, GET as tripGET, PATCH as tripPATCH } from "@/app/api/trips/[id]/route";
import { GET as budgetGET } from "@/app/api/trips/[id]/budget/route";
import { POST as expensePOST } from "@/app/api/trips/[id]/expenses/route";
import { POST as generatePOST } from "@/app/api/trips/[id]/generate/route";
import { POST as replanPOST } from "@/app/api/trips/[id]/replan/route";
import { POST as sharePOST } from "@/app/api/trips/[id]/share/route";
import { POST as stopsPOST } from "@/app/api/trips/[id]/stops/route";
import { DELETE as stopDELETE, PATCH as stopPATCH } from "@/app/api/trips/[id]/stops/[stopId]/route";
import { POST as activatePOST } from "@/app/api/trips/[id]/versions/[versionId]/activate/route";
import { prisma } from "@/server/db/prisma";
import { setLlmProviderForTests } from "@/server/providers/llm";
import { setRoutingProviderForTests } from "@/server/providers/routing";
import { getSharedTripView } from "@/server/services/itinerary";
import { USER_A, USER_B, body, cityId, jsonRequest, params, resetTestData, signInAs } from "./helpers";

const tripInput = (destinationCityId: string, extra: Record<string, unknown> = {}) => ({
  title: "Test trip",
  destinationCityId,
  startDate: "2026-12-07",
  endDate: "2026-12-09",
  travellers: 2,
  totalBudgetRupees: 60000,
  travelStyle: "CULTURAL",
  interests: ["history", "photography"],
  transportPref: "MIXED",
  accommodationPref: "MID_RANGE_HOTEL",
  ...extra,
});

async function createTrip(extra: Record<string, unknown> = {}, city = "jaipur") {
  const res = await tripsPOST(jsonRequest("POST", "/api/trips", tripInput(await cityId(city), extra)));
  expect(res.status).toBe(201);
  return (await body(res)).data.id as string;
}

async function generate(id: string) {
  const res = await generatePOST(jsonRequest("POST", `/api/trips/${id}/generate`), params({ id }));
  return { res, json: await body(res) };
}

beforeAll(async () => {
  // No live third parties in tests: heuristic routing, no AI.
  setRoutingProviderForTests(null);
  setLlmProviderForTests(null);
  await resetTestData();
});

afterAll(async () => {
  await resetTestData();
  await prisma.$disconnect();
});

describe("place search", () => {
  it("finds places in several states (no city is hardcoded)", async () => {
    for (const [q, state] of [["Amber", "Rajasthan"], ["Mattancherry", "Kerala"], ["Tiger Hill", "West Bengal"], ["Vittala", "Karnataka"], ["Triveni", "Uttarakhand"]]) {
      const res = await searchGET(jsonRequest("GET", `/api/places/search?q=${encodeURIComponent(q)}`));
      const json = await body(res);
      expect(res.status).toBe(200);
      expect(json.data.places[0].city.state).toBe(state);
    }
  });

  it("tolerates typos via trigram similarity", async () => {
    const json = await body(await searchGET(jsonRequest("GET", "/api/places/search?q=Hawa%20Mehal")));
    expect(json.data.places.map((p: { name: string }) => p.name)).toContain("Hawa Mahal");
  });

  it("filters by city, kind and category, and paginates", async () => {
    const json = await body(await searchGET(jsonRequest("GET", "/api/places/search?city=kochi&kind=MUSEUM&limit=2")));
    expect(json.data.places.length).toBeLessThanOrEqual(2);
    expect(json.data.total).toBeGreaterThanOrEqual(json.data.places.length);
    for (const p of json.data.places) {
      expect(p.kind).toBe("MUSEUM");
      expect(p.city.slug).toBe("kochi");
    }
    const cat = await body(await searchGET(jsonRequest("GET", "/api/places/search?city=hampi&category=museums")));
    expect(cat.data.places.length).toBeGreaterThan(0);
  });

  it("rejects invalid queries with a consistent error envelope", async () => {
    const res = await searchGET(jsonRequest("GET", "/api/places/search?limit=9999"));
    expect(res.status).toBe(400);
    expect((await body(res)).error.code).toBe("VALIDATION");
  });

  it("returns nearby places ordered by PostGIS distance", async () => {
    // Near Hawa Mahal, Jaipur
    const json = await body(await nearbyGET(jsonRequest("GET", "/api/places/nearby?lat=26.9239&lng=75.8267&radiusKm=2")));
    const d = json.data.places.map((p: { distanceMeters: number }) => p.distanceMeters);
    expect(d.length).toBeGreaterThan(2);
    expect([...d].sort((a, b) => a - b)).toEqual(d);
    expect(Math.max(...d)).toBeLessThanOrEqual(2000);
    expect(json.data.places[0].name).toBe("Hawa Mahal");
  });

  it("returns place details with provenance and honest unknowns", async () => {
    const search = await body(await searchGET(jsonRequest("GET", "/api/places/search?q=Amber%20Fort")));
    const id = search.data.places[0].id;
    const json = await body(await placeGET(jsonRequest("GET", `/api/places/${id}`), params({ id })));
    expect(json.data.verificationStatus).toBe("UNVERIFIED");
    expect(json.data.sources[0].attribution).toBeTruthy();
    expect(json.data.openingHours).toEqual([]); // unknown, not invented
    expect(json.data.prices).toEqual([]);
    const missing = await placeGET(jsonRequest("GET", "/x"), params({ id: "00000000-0000-4000-8000-00000000dead" }));
    expect(missing.status).toBe(404);
  });
});

describe("authentication and authorization", () => {
  it("rejects unauthenticated requests with 401", async () => {
    signInAs(null);
    expect((await tripsGET()).status).toBe(401);
    expect((await tripsPOST(jsonRequest("POST", "/api/trips", {}))).status).toBe(401);
    const id = "00000000-0000-4000-8000-000000000000";
    expect((await generatePOST(jsonRequest("POST", "/x"), params({ id }))).status).toBe(401);
    expect((await budgetGET(jsonRequest("GET", "/x"), params({ id }))).status).toBe(401);
  });

  it("ignores any owner id in the request body", async () => {
    signInAs(USER_A);
    const id = await createTrip({ ownerId: USER_B.id });
    const trip = await prisma.trip.findUniqueOrThrow({ where: { id } });
    expect(trip.ownerId).toBe(USER_A.id);
  });

  it("hides other users' trips (404) for read, write and delete", async () => {
    signInAs(USER_A);
    const id = await createTrip();
    signInAs(USER_B);
    expect((await tripGET(jsonRequest("GET", "/x"), params({ id }))).status).toBe(404);
    expect((await tripPATCH(jsonRequest("PATCH", "/x", { title: "Hijack" }), params({ id }))).status).toBe(404);
    expect((await tripDELETE(jsonRequest("DELETE", "/x"), params({ id }))).status).toBe(404);
    expect((await generatePOST(jsonRequest("POST", "/x"), params({ id }))).status).toBe(404);
    expect((await budgetGET(jsonRequest("GET", "/x"), params({ id }))).status).toBe(404);
    const list = await body(await tripsGET());
    expect(list.data.trips.some((t: { id: string }) => t.id === id)).toBe(false);
  });
});

describe("trip creation and editing", () => {
  it("validates dates and inputs", async () => {
    signInAs(USER_A);
    const city = await cityId("jaipur");
    const bad = [
      tripInput(city, { endDate: "2026-12-01" }),
      tripInput(city, { travellers: 0 }),
      tripInput(city, { startDate: "not-a-date" }),
      tripInput(city, { endDate: "2027-02-01" }),
      tripInput(city, { interests: ["skydiving-on-mars"] }),
      tripInput("00000000-0000-4000-8000-00000000dead"),
    ];
    for (const input of bad) {
      const res = await tripsPOST(jsonRequest("POST", "/api/trips", input));
      expect(res.status).toBe(400);
    }
  });

  it("creates a draft with one day per date and a budget", async () => {
    signInAs(USER_A);
    const id = await createTrip();
    const json = await body(await tripGET(jsonRequest("GET", "/x"), params({ id })));
    expect(json.data.trip.status).toBe("DRAFT");
    expect(json.data.days.map((d: { date: string }) => d.date)).toEqual(["2026-12-07", "2026-12-08", "2026-12-09"]);
    expect(json.data.trip.totalBudgetPaise).toBe(6000000);
    expect(json.data.version).toBeNull();
  });

  it("updates and deletes a trip", async () => {
    signInAs(USER_A);
    const id = await createTrip();
    const res = await tripPATCH(jsonRequest("PATCH", "/x", { title: "Renamed", endDate: "2026-12-10", totalBudgetRupees: 80000 }), params({ id }));
    const json = await body(res);
    expect(res.status).toBe(200);
    expect(json.data.trip.title).toBe("Renamed");
    expect(json.data.days).toHaveLength(4);
    expect(json.data.trip.totalBudgetPaise).toBe(8000000);
    expect((await tripPATCH(jsonRequest("PATCH", "/x", { ownerId: USER_B.id }), params({ id }))).status).toBe(400);
    expect((await tripDELETE(jsonRequest("DELETE", "/x"), params({ id }))).status).toBe(200);
    expect((await tripGET(jsonRequest("GET", "/x"), params({ id }))).status).toBe(404);
  });
});

describe("itinerary generation", () => {
  it.each(["jaipur", "kochi", "darjeeling", "hampi", "rishikesh"])("builds a valid multi-day plan for %s", async (city) => {
    signInAs(USER_A);
    const id = await createTrip({}, city);
    const { res, json } = await generate(id);
    expect(res.status).toBe(201);
    expect(json.data.trip.status).toBe("PLANNED");
    expect(json.data.version.versionNumber).toBe(1);
    const days = json.data.days;
    const total = days.reduce((n: number, d: { stops: unknown[] }) => n + d.stops.length, 0);
    expect(total).toBeGreaterThanOrEqual(6);
    for (const day of days) {
      expect(day.warnings).toEqual([]);
      for (let i = 0; i < day.stops.length; i++) {
        const s = day.stops[i];
        expect(s.departureMin - s.arrivalMin).toBe(s.visitDurationMins);
        expect(s.place.verificationStatus).toBe("UNVERIFIED");
        expect(s.hoursKnown).toBe(false);
        if (i > 0) {
          const prev = day.stops[i - 1];
          expect(s.arrivalMin).toBeGreaterThanOrEqual(prev.departureMin + prev.legToNext.durationMins);
          expect(prev.legToNext.provider).toBe("HEURISTIC");
        }
      }
    }
    expect(json.data.version.notes.join(" ")).toMatch(/heuristic/i);
    const logs = await prisma.generationLog.findMany({ where: { tripId: id } });
    expect(logs.map((l) => l.stage)).toEqual(expect.arrayContaining(["candidates", "schedule"]));
  });

  it("flags an over-budget plan with concrete alternatives instead of hiding it", async () => {
    signInAs(USER_A);
    const id = await createTrip({ totalBudgetRupees: 5000 });
    const { res, json } = await generate(id);
    expect(res.status).toBe(201);
    expect(json.data.version.isFeasible).toBe(false);
    const kinds = json.data.version.alternatives.map((a: { kind: string }) => a.kind);
    expect(kinds).toContain("RAISE_BUDGET");
    const budget = await body(await budgetGET(jsonRequest("GET", "/x"), params({ id })));
    expect(budget.data.summary.overBudget).toBe(true);
    expect(budget.data.summary.remainingVsEstimatePaise).toBeLessThan(0);
  });

  it("returns a structured 422 when no itinerary is possible", async () => {
    signInAs(USER_A);
    const state = await prisma.state.findUniqueOrThrow({ where: { code: "IN-LD" } });
    const district = await prisma.district.upsert({
      where: { stateId_slug: { stateId: state.id, slug: "test-empty" } },
      update: {},
      create: { stateId: state.id, name: "Test Empty", slug: "test-empty" },
    });
    const empty = await prisma.city.upsert({
      where: { slug: "test-empty-island" },
      update: {},
      create: { districtId: district.id, name: "Test Empty Island", slug: "test-empty-island", lat: 10.57, lng: 72.64 },
    });
    try {
      const res = await tripsPOST(jsonRequest("POST", "/api/trips", tripInput(empty.id)));
      const id = (await body(res)).data.id;
      const out = await generate(id);
      expect(out.res.status).toBe(422);
      expect(out.json.error.code).toBe("INFEASIBLE");
      expect(out.json.error.details.reasons.length).toBeGreaterThan(0);
      expect(out.json.error.details.alternatives.length).toBeGreaterThan(0);
      const trip = await prisma.trip.findUniqueOrThrow({ where: { id } });
      expect(trip.status).toBe("DRAFT"); // rolled back from GENERATING
      await prisma.trip.delete({ where: { id } });
    } finally {
      await prisma.city.delete({ where: { id: empty.id } });
      await prisma.district.delete({ where: { id: district.id } });
    }
  });
});

describe("editing, versioning and replanning", () => {
  it("persists edits in a new version and never destroys earlier ones", async () => {
    signInAs(USER_A);
    const id = await createTrip();
    const first = (await generate(id)).json.data;
    const v1Stops = first.days.flatMap((d: { stops: { id: string }[] }) => d.stops.map((s) => s.id));
    const day0 = first.days[0];
    const target = day0.stops[day0.stops.length - 1];

    // Reorder: move the last stop of day 1 to the front.
    let res = await stopPATCH(jsonRequest("PATCH", "/x", { orderIndex: 0 }), params({ id, stopId: target.id }));
    let json = await body(res);
    expect(res.status).toBe(200);
    expect(json.data.version.createdBy).toBe("USER_EDIT");
    expect(json.data.version.versionNumber).toBe(2);
    expect(json.data.days[0].stops[0].place.id).toBe(target.place.id);
    expect(json.data.days[0].stops.map((s: { orderIndex: number }) => s.orderIndex)).toEqual(day0.stops.map((_: unknown, i: number) => i));

    // Change duration: later stops shift, and it survives a reload.
    const edited = json.data.days[0].stops[0];
    res = await stopPATCH(jsonRequest("PATCH", "/x", { visitDurationMins: 200, locked: true }), params({ id, stopId: edited.id }));
    json = await body(res);
    expect(json.data.days[0].stops[0].visitDurationMins).toBe(200);
    expect(json.data.days[0].stops[0].locked).toBe(true);
    expect(json.data.version.versionNumber).toBe(2); // edits accumulate in one version
    const reloaded = await body(await tripGET(jsonRequest("GET", "/x"), params({ id })));
    expect(reloaded.data.days[0].stops[0].visitDurationMins).toBe(200);

    // The generated version is untouched.
    const v1 = await body(await tripGET(jsonRequest("GET", `/x?version=${first.version.id}`), params({ id })));
    expect(v1.data.days.flatMap((d: { stops: { id: string }[] }) => d.stops.map((s) => s.id))).toEqual(v1Stops);
    expect(v1.data.days[0].stops.map((s: { place: { id: string } }) => s.place.id)).toEqual(day0.stops.map((s: { place: { id: string } }) => s.place.id));
    expect(reloaded.data.versions).toHaveLength(2);
  });

  it("adds and removes stops, re-timing the day and re-estimating costs", async () => {
    signInAs(USER_A);
    const id = await createTrip();
    const first = (await generate(id)).json.data;
    // Free up a place by removing it from day 1, then add it to day 2.
    const moved = first.days[0].stops[0];
    const spare = { id: moved.place.id as string };
    const afterRemove = await body(await stopDELETE(jsonRequest("DELETE", "/x"), params({ id, stopId: moved.id })));
    expect(afterRemove.data.days[0].stops).toHaveLength(first.days[0].stops.length - 1);

    let res = await stopsPOST(jsonRequest("POST", "/x", { placeId: spare.id, dayIndex: 1, orderIndex: 0 }), params({ id }));
    let json = await body(res);
    expect(res.status).toBe(201);
    expect(json.data.days[1].stops[0].place.id).toBe(spare.id);
    const dup = await stopsPOST(jsonRequest("POST", "/x", { placeId: spare.id, dayIndex: 0 }), params({ id }));
    expect(dup.status).toBe(409);
    const outside = await stopsPOST(jsonRequest("POST", "/x", { placeId: spare.id, dayIndex: 9 }), params({ id }));
    expect(outside.status).toBe(400);

    const countBefore = json.data.days[1].stops.length;
    res = await stopDELETE(jsonRequest("DELETE", "/x"), params({ id, stopId: json.data.stopId }));
    json = await body(res);
    expect(json.data.days[1].stops).toHaveLength(countBefore - 1);
    expect(json.data.days[1].stops.map((s: { orderIndex: number }) => s.orderIndex)).toEqual(
      json.data.days[1].stops.map((_: unknown, i: number) => i),
    );
    const gone = await stopDELETE(jsonRequest("DELETE", "/x"), params({ id, stopId: "00000000-0000-4000-8000-00000000dead" }));
    expect(gone.status).toBe(404);
  });

  it("replans into a new version: keeps locked stops, keeps removed places out", async () => {
    signInAs(USER_A);
    const id = await createTrip();
    const first = (await generate(id)).json.data;
    const lockMe = first.days[1].stops[0];
    const removeMe = first.days[0].stops[0];

    let json = await body(await stopPATCH(jsonRequest("PATCH", "/x", { locked: true }), params({ id, stopId: lockMe.id })));
    const removeId = json.data.days[0].stops.find((s: { place: { id: string } }) => s.place.id === removeMe.place.id).id;
    json = await body(await stopDELETE(jsonRequest("DELETE", "/x"), params({ id, stopId: removeId })));

    const res = await replanPOST(jsonRequest("POST", "/x", { reason: "REMOVED_PLACE" }), params({ id }));
    json = await body(res);
    expect(res.status).toBe(201);
    expect(json.data.version.createdBy).toBe("REPLAN");
    expect(json.data.version.versionNumber).toBe(3);
    const all = json.data.days.flatMap((d: { index: number; stops: { place: { id: string }; locked: boolean }[] }) =>
      d.stops.map((s) => ({ ...s, day: d.index })),
    );
    expect(all.some((s: { place: { id: string } }) => s.place.id === removeMe.place.id)).toBe(false);
    const locked = all.find((s: { place: { id: string } }) => s.place.id === lockMe.place.id);
    expect(locked.day).toBe(1);
    expect(locked.locked).toBe(true);
    for (const day of json.data.days) expect(day.warnings).toEqual([]);
    expect(json.data.versions).toHaveLength(3);

    // A slower pace yields fewer stops.
    const slow = await body(await replanPOST(jsonRequest("POST", "/x", { reason: "SLOWER_PACE" }), params({ id })));
    const slowCount = slow.data.days.reduce((n: number, d: { stops: unknown[] }) => n + d.stops.length, 0);
    expect(slowCount).toBeLessThan(all.length);

    // Earlier versions can be restored.
    const back = await body(await activatePOST(jsonRequest("POST", "/x"), params({ id, versionId: first.version.id })));
    expect(back.data.version.id).toBe(first.version.id);
  });

  it("revalidates the plan when dates change", async () => {
    signInAs(USER_A);
    const id = await createTrip();
    await generate(id);
    await tripPATCH(jsonRequest("PATCH", "/x", { endDate: "2026-12-08" }), params({ id }));
    const res = await replanPOST(jsonRequest("POST", "/x", { reason: "DATES_CHANGED" }), params({ id }));
    const json = await body(res);
    expect(json.data.days).toHaveLength(2);
    expect(json.data.days.every((d: { stops: unknown[] }) => d.stops.length > 0)).toBe(true);
  });

  it("refuses to replan or edit before an itinerary exists", async () => {
    signInAs(USER_A);
    const id = await createTrip();
    expect((await replanPOST(jsonRequest("POST", "/x", { reason: "OTHER" }), params({ id }))).status).toBe(409);
  });
});

describe("budget", () => {
  it("reports estimates with provenance and keeps actuals separate", async () => {
    signInAs(USER_A);
    const id = await createTrip();
    await generate(id);
    let json = await body(await budgetGET(jsonRequest("GET", "/x"), params({ id })));
    const s = json.data.summary;
    expect(s.totalBudgetPaise).toBe(6000000);
    expect(s.categories).toHaveLength(8);
    const sum = json.data.estimates.reduce((n: number, e: { amountPaise: number }) => n + e.amountPaise, 0);
    expect(s.estimatedPaise).toBe(sum);
    expect(s.remainingVsEstimatePaise).toBe(6000000 - sum);
    expect(s.perPersonEstimatedPaise).toBe(Math.ceil(sum / 2));
    expect(s.perDayEstimatedPaise).toBe(Math.ceil(sum / 3));
    for (const e of json.data.estimates) expect(e.source).toBe("HEURISTIC_ESTIMATE");
    expect(s.categories.find((c: { category: string }) => c.category === "INTERCITY_TRANSPORT").unavailable).toBe(true);
    expect(json.data.unavailable.length).toBeGreaterThan(0);

    const res = await expensePOST(
      jsonRequest("POST", "/x", { category: "FOOD", amountRupees: 1250.5, spentAt: "2026-12-07", note: "Lunch", dayIndex: 0 }),
      params({ id }),
    );
    json = await body(res);
    expect(res.status).toBe(201);
    expect(json.data.summary.actualPaise).toBe(125050);
    expect(json.data.summary.estimatedPaise).toBe(sum); // estimates untouched
    expect(json.data.actuals[0].source).toBe("USER_ENTERED");
    expect((await expensePOST(jsonRequest("POST", "/x", { category: "FOOD", amountRupees: -5, spentAt: "2026-12-07" }), params({ id }))).status).toBe(400);
  });

  it("uses a recorded place price with its own source", async () => {
    signInAs(USER_A);
    const id = await createTrip();
    const first = (await generate(id)).json.data;
    const stop = first.days[0].stops.find((s: { place: { kind: string } }) => !["RESTAURANT", "SHOPPING"].includes(s.place.kind));
    const price = await prisma.placePrice.create({
      data: { placeId: stop.place.id, kind: "ENTRY_INDIAN", amountPaise: 12300, source: "USER_REPORTED", notes: "[test fixture]" },
    });
    try {
      await body(await stopPATCH(jsonRequest("PATCH", "/x", { note: "re-estimate" }), params({ id, stopId: stop.id })));
      const json = await body(await budgetGET(jsonRequest("GET", "/x"), params({ id })));
      const line = json.data.estimates.find((e: { placeName: string | null }) => e.placeName === stop.place.name);
      expect(line.amountPaise).toBe(12300 * 2);
      expect(line.source).toBe("USER_REPORTED");
      expect(line.category).toMatch(/ATTRACTION_ENTRY|ACTIVITIES/);
    } finally {
      await prisma.placePrice.delete({ where: { id: price.id } });
    }
  });
});

describe("sharing and feedback", () => {
  it("shares by unguessable slug only while enabled, without private fields", async () => {
    signInAs(USER_A);
    const id = await createTrip({ specialRequirements: "private note" });
    await generate(id);
    let json = await body(await sharePOST(jsonRequest("POST", "/x", { enabled: true }), params({ id })));
    const slug = json.data.shareSlug as string;
    expect(slug.length).toBeGreaterThanOrEqual(16);
    expect(json.data.url).toContain(`/shared/${slug}`);
    const view = await getSharedTripView(slug);
    expect(view.trip.totalBudgetPaise).toBeNull();
    expect(view.trip.specialRequirements).toBeNull();
    expect(view.days[0].stops.length).toBeGreaterThan(0);

    signInAs(USER_B);
    expect((await sharePOST(jsonRequest("POST", "/x", { enabled: false }), params({ id }))).status).toBe(404);
    signInAs(USER_A);
    json = await body(await sharePOST(jsonRequest("POST", "/x", { enabled: false }), params({ id })));
    expect(json.data.url).toBeNull();
    await expect(getSharedTripView(slug)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("accepts feedback from signed-out visitors and validates it", async () => {
    signInAs(null);
    const good = await feedbackPOST(jsonRequest("POST", "/x", { email: "v@test.local", topic: "[test] hello", message: "This is a test message." }));
    expect(good.status).toBe(201);
    const bad = await feedbackPOST(jsonRequest("POST", "/x", { topic: "[test]", message: "short" }));
    expect(bad.status).toBe(400);
  });
});

describe("row level security", () => {
  it("lets a user read only their own trips at the database level", async () => {
    signInAs(USER_A);
    const mine = await createTrip();
    signInAs(USER_B);
    const theirs = await createTrip();

    await prisma.$executeRawUnsafe(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rls_tester') THEN CREATE ROLE rls_tester NOLOGIN; END IF;
    END $$;`);
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO rls_tester`);
    await prisma.$executeRawUnsafe(`GRANT SELECT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rls_tester`);

    const asUser = (userId: string | null, sql: string) =>
      prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('request.jwt.claim.sub', '${userId ?? ""}', true)`);
        await tx.$executeRawUnsafe(`SET LOCAL ROLE rls_tester`);
        return tx.$queryRawUnsafe<{ id: string }[]>(sql);
      });

    const seenByA = (await asUser(USER_A.id, `SELECT id FROM trips`)).map((r) => r.id);
    expect(seenByA).toContain(mine);
    expect(seenByA).not.toContain(theirs);

    const anon = await asUser(null, `SELECT id FROM trips`);
    expect(anon).toEqual([]);

    // A cannot modify or delete B's trip, even with direct SQL.
    await asUser(USER_A.id, `UPDATE trips SET title = 'hacked' WHERE id = '${theirs}' RETURNING id`);
    await asUser(USER_A.id, `DELETE FROM trips WHERE id = '${theirs}' RETURNING id`);
    const still = await prisma.trip.findUniqueOrThrow({ where: { id: theirs } });
    expect(still.title).toBe("Test trip");

    // Reference data stays publicly readable; child rows follow the trip.
    expect((await asUser(null, `SELECT id FROM places LIMIT 3`)).length).toBe(3);
    expect(await asUser(USER_A.id, `SELECT id FROM trip_days WHERE "tripId" = '${theirs}'`)).toEqual([]);
    expect((await asUser(USER_B.id, `SELECT id FROM trip_days WHERE "tripId" = '${theirs}'`)).length).toBe(3);
  });
});
