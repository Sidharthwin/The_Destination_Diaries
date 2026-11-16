import { expect, test } from "@playwright/test";
import { alerts, signIn } from "./helpers";

test.describe("administration", () => {
  test("admin can review data quality, edit a place and manage its hours", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Data quality");
    await expect(page.getByText("Missing opening hours")).toBeVisible();

    await page.getByRole("link", { name: "Places", exact: true }).click();
    await page.getByLabel("Name").fill("Peace Pagoda");
    await page.getByRole("button", { name: "Filter" }).click();
    await page.getByRole("row", { name: /Peace Pagoda/ }).getByRole("link", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Peace Pagoda" })).toBeVisible();
    await expect(page.getByText(/hand-curated, unverified/)).toBeVisible(); // provenance

    // Edit and restore the typical visit duration
    const visit = page.getByLabel("Typical visit (minutes)");
    const original = await visit.inputValue();
    await visit.fill("50");
    await page.getByRole("button", { name: "Save place" }).click();
    await expect(page.getByRole("status")).toContainText("Saved");
    await expect(visit).toHaveValue("50");
    await visit.fill(original);
    await page.getByRole("button", { name: "Save place" }).click();
    await expect(visit).toHaveValue(original);

    // Opening hours: invalid range is rejected; a valid one is added, then removed
    await page.getByLabel("Mon").check();
    await page.getByLabel("Opens").fill("17:00");
    await page.getByLabel("Closes").fill("09:00");
    await page.getByRole("button", { name: "Add hours" }).click();
    await expect(alerts(page)).toContainText("Closing time must be after opening time");
    await page.getByLabel("Mon").check();
    await page.getByLabel("Opens").fill("06:00");
    await page.getByLabel("Closes").fill("18:30");
    await page.getByRole("button", { name: "Add hours" }).click();
    const hours = page.locator("li", { hasText: "6:00 am – 6:30 pm" });
    await expect(hours).toBeVisible();
    await hours.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText("No hours on record.")).toBeVisible();
  });

  test("ingestion, feedback, review and provider pages load with real data", async ({ page }) => {
    await signIn(page, "admin");
    await page.goto("/admin/ingestion");
    await expect(page.getByRole("cell", { name: "seed:sample-dataset" }).first()).toBeVisible();
    await expect(page.getByText(/© OpenStreetMap contributors/)).toBeVisible();
    await page.goto("/admin/feedback");
    await expect(page.getByRole("heading", { level: 1, name: "Feedback" })).toBeVisible();
    await page.goto("/admin/places/review");
    await expect(page.getByRole("heading", { name: /Open reports/ })).toBeVisible();
    await page.goto("/admin/providers");
    await expect(page.getByText("Mapbox Directions")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Itinerary generation/ })).toBeVisible();
  });
});
