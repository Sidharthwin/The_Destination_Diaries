import { expect, test } from "@playwright/test";
import { alerts, createPlannedTrip, deleteTrip, signIn, signOut, supabaseConfigured } from "./helpers";

test.describe("authentication and authorization", () => {
  test("protected pages redirect signed-out visitors to sign in, then back", async ({ page }) => {
    for (const path of ["/dashboard", "/diaries", "/diaries/new", "/my-trips", "/saved", "/profile", "/trips/new", "/admin"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path).replace(/%/g, "%")}`));
    }
    await page.goto("/my-trips");
    await page.getByRole("button", { name: "Traveller", exact: true }).click();
    await expect(page).toHaveURL(/\/my-trips$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Every plan");
  });

  test("protected APIs reject signed-out requests", async ({ request }) => {
    expect((await request.get("/api/trips")).status()).toBe(401);
    expect((await request.post("/api/trips", { data: {} })).status()).toBe(401);
    expect((await request.get("/api/saved")).status()).toBe(401);
    expect((await request.patch("/api/profile", { data: { displayName: "x" } })).status()).toBe(401);
    const body = await (await request.get("/api/trips")).json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  test("sign out ends the session", async ({ page }) => {
    await signIn(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello");
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL(/\/login\?notice=signed-out/);
    await expect(page.getByText("You have been signed out.")).toBeVisible();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("one user cannot see or change another user's trip", async ({ page }) => {
    await signIn(page, "traveller");
    const id = await createPlannedTrip(page);
    try {
      await signOut(page);
      await signIn(page, "other");
      const res = await page.goto(`/trips/${id}`);
      expect(res?.status()).toBe(404);
      for (const sub of ["budget", "nearby", "share"]) {
        expect((await page.request.get(`/trips/${id}/${sub}`)).status()).toBe(404);
      }
      expect((await page.request.get(`/api/trips/${id}`)).status()).toBe(404);
      expect((await page.request.patch(`/api/trips/${id}`, { data: { title: "Mine now" } })).status()).toBe(404);
      expect((await page.request.post(`/api/trips/${id}/replan`, { data: { reason: "OTHER" } })).status()).toBe(404);
      expect((await page.request.delete(`/api/trips/${id}`)).status()).toBe(404);
      await page.goto("/my-trips");
      await expect(page.getByText("E2E kochi trip")).toHaveCount(0);
    } finally {
      await signOut(page);
      await signIn(page, "traveller");
      await deleteTrip(page, id);
    }
  });

  test("non-admins are kept out of the admin area", async ({ page }) => {
    await signIn(page, "traveller");
    await page.goto("/admin/places");
    await expect(page).toHaveURL(/\/dashboard\?notice=admin-only/);
    await expect(page.getByText("That area is for administrators only.")).toBeVisible();
  });

  test("new user registration form validates input", async ({ page }) => {
    test.skip(!supabaseConfigured, "Needs Supabase credentials (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).");
    await page.goto("/signup");
    await page.getByLabel("Email").fill("new-user@example.com");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(alerts(page)).toContainText("at least 8 characters");
  });

  test("Google sign-in hands off to the identity provider", async ({ page }) => {
    test.skip(!supabaseConfigured, "Needs Supabase credentials and the Google provider enabled.");
    await page.goto("/login");
    const [request] = await Promise.all([
      page.waitForRequest((r) => r.url().includes("/auth/v1/authorize") && r.url().includes("provider=google")),
      page.getByRole("button", { name: "Continue with Google" }).click(),
    ]);
    expect(request.url()).toContain(encodeURIComponent("/auth/callback"));
  });

  test("without Supabase credentials the sign-in pages explain what is missing", async ({ page }) => {
    test.skip(supabaseConfigured, "Only relevant before Supabase is configured.");
    for (const path of ["/login", "/signup", "/forgot-password"]) {
      await page.goto(path);
      await expect(page.getByText("Sign-in is not connected yet.")).toBeVisible();
    }
  });
});
