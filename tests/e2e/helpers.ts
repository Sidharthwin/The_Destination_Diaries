import { expect, type Page } from "@playwright/test";

export type DevUser = "traveller" | "other" | "admin";

/** Signs in through the local development sign-in endpoint. */
export async function signIn(page: Page, user: DevUser = "traveller") {
  const res = await page.request.post("/api/dev-auth", { data: { user } });
  expect(res.ok(), "DEV_AUTH=1 must be set for the e2e server").toBeTruthy();
}

export async function signOut(page: Page) {
  await page.request.delete("/api/dev-auth");
}

export const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http"));

/** Creates and generates a trip through the API; returns its id. */
export async function createPlannedTrip(page: Page, citySlug = "kochi", extra: Record<string, unknown> = {}) {
  const search = await (await page.request.get(`/api/places/search?city=${citySlug}&limit=1`)).json();
  const cityId = search.data.places[0].city.id as string;
  const created = await page.request.post("/api/trips", {
    data: {
      title: `E2E ${citySlug} trip`, destinationCityId: cityId, startDate: "2027-03-05", endDate: "2027-03-07",
      travellers: 2, totalBudgetRupees: 50000, travelStyle: "CULTURAL", interests: ["history", "photography"],
      transportPref: "MIXED", accommodationPref: "MID_RANGE_HOTEL", ...extra,
    },
  });
  expect(created.status()).toBe(201);
  const id = (await created.json()).data.id as string;
  const generated = await page.request.post(`/api/trips/${id}/generate`);
  expect(generated.status()).toBe(201);
  return id;
}

export async function deleteTrip(page: Page, id: string) {
  await page.request.delete(`/api/trips/${id}`);
}

/** Application alerts, excluding Next.js's own route announcer. */
export const alerts = (page: Page) => page.locator('[role="alert"]:not(#__next-route-announcer__)');
