import { expect, test, type Page } from "@playwright/test";
import { alerts, deleteTrip, signIn, signOut } from "./helpers";

const tripIdFrom = (page: Page) => page.url().match(/\/trips\/([0-9a-f-]{36})/)![1];

test.describe("planning a trip end to end", () => {
  test("wizard → generation → workspace → budget → edit → replan → share → reopen", async ({ page, browser }) => {
    await signIn(page);
    await page.addInitScript(() => window.localStorage.removeItem("dd-trip-wizard"));
    await page.goto("/trips/new");

    // 1. Destination — moving on without one is blocked.
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(alerts(page)).toContainText("Choose where you are going");
    await page.getByRole("button", { name: /Darjeeling/ }).click();
    await page.getByRole("button", { name: /Continue/ }).click();

    // 2. Dates — an end before the start is rejected.
    await page.getByLabel("First day").fill("2027-04-09");
    await page.getByLabel("Last day").fill("2027-04-08");
    await page.getByRole("button", { name: /Continue/ }).click();
    await expect(alerts(page)).toContainText(/end date/i);
    await page.getByLabel("Last day").fill("2027-04-11");
    await expect(page.getByText("3 days, 2 nights")).toBeVisible();
    await page.getByRole("button", { name: /Continue/ }).click();

    // 3. Travellers
    await page.getByRole("button", { name: "One more traveller" }).click();
    await expect(page.locator("output")).toHaveText("3");
    await page.getByRole("button", { name: /Continue/ }).click();

    // 4. Budget
    await page.getByLabel("Total budget in rupees").fill("60000");
    await page.getByRole("button", { name: /Continue/ }).click();

    // 5–8. Style, interests, transport, stay
    await page.getByRole("button", { name: /^Relaxation/ }).click();
    await page.getByRole("button", { name: /Continue/ }).click();
    await page.getByRole("button", { name: "Nature", exact: true }).click();
    await page.getByRole("button", { name: "Photography", exact: true }).click();
    await page.getByRole("button", { name: /Continue/ }).click();
    await page.getByRole("button", { name: "Car with driver" }).click();
    await page.getByRole("button", { name: /Continue/ }).click();
    await page.getByRole("button", { name: "Homestay" }).click();
    await page.getByRole("button", { name: /Continue/ }).click();

    // 9. Special requirements, saved as a draft that survives a reload
    await page.getByLabel("Special requirements").fill("Travelling with my parents, so a gentle pace.");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText(/Draft saved/)).toBeVisible();
    await expect(page).toHaveURL(/\/trips\/new\?draft=/);
    await page.reload();
    await expect(page.getByRole("button", { name: /Darjeeling/ })).toHaveAttribute("aria-pressed", "true");

    // 10. Review and generate
    await expect(page.getByText("Where are you headed?")).toBeVisible();
    for (let i = 0; i < 9; i++) await page.getByRole("button", { name: /Continue/ }).click();
    await expect(page.getByRole("heading", { name: "Ready when you are" })).toBeVisible();
    await expect(page.getByText("Darjeeling, West Bengal")).toBeVisible();
    await expect(page.getByText("₹60,000")).toBeVisible();
    await page.getByRole("button", { name: /Build my itinerary/ }).click();

    await expect(page.getByRole("heading", { name: /Planning Darjeeling/ })).toBeVisible();
    await page.waitForURL(/\/trips\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    const tripId = tripIdFrom(page);

    try {
      // Workspace: three days of timed stops
      await expect(page.getByRole("heading", { level: 1 })).toContainText("3 days in Darjeeling");
      await page.getByRole("tab", { name: "All days" }).click();
      const stops = page.locator("ol > li");
      expect(await stops.count()).toBeGreaterThanOrEqual(6);
      await expect(page.getByText(/heuristic optimizer/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /Version 1 of 1/ })).toBeVisible();

      // Budget: estimates with provenance, honest gaps, and a recorded expense
      await page.getByRole("link", { name: "Budget", exact: true }).click();
      await expect(page.getByRole("heading", { name: "By category" })).toBeVisible();
      await expect(page.getByText("₹60,000").first()).toBeVisible();
      await expect(page.getByText("Planning estimate").first()).toBeVisible();
      await expect(page.getByRole("row", { name: /Intercity transport/ })).toContainText("Not available");
      await page.getByLabel("Amount (₹)").fill("850");
      await page.getByLabel("Note").fill("Toy train tickets");
      await page.getByRole("button", { name: "Record expense" }).click();
      await expect(page.getByText("Toy train tickets")).toBeVisible();
      await expect(page.getByText("You entered")).toBeVisible();

      // Editing: reorder and lengthen a stop; it persists across a reload
      await page.getByRole("link", { name: "Itinerary", exact: true }).click();
      await page.getByRole("tab", { name: /^Day 1/ }).click();
      const names = async () => page.locator("ol > li button[aria-label$='details and editing'] span.truncate").allTextContents();
      const before = await names();
      await page.getByRole("button", { name: `Move ${before[1]} earlier` }).click();
      await expect.poll(names).toEqual([before[1], before[0], ...before.slice(2)]);
      await expect(page.getByRole("button", { name: /Version 2 of 2/ })).toBeVisible();

      await page.getByRole("button", { name: `${before[1]} — details and editing` }).click();
      const sheet = page.getByRole("dialog");
      const shown = (await sheet.locator("output").textContent())!;
      await sheet.getByRole("button", { name: "15 minutes more" }).click();
      await expect(sheet.locator("output")).not.toHaveText(shown);
      await sheet.getByRole("button", { name: "Lock for replans" }).click();
      await expect(sheet.getByRole("button", { name: "Unlock" })).toBeVisible();
      await page.keyboard.press("Escape");
      await page.reload();
      await page.getByRole("tab", { name: /^Day 1/ }).click();
      expect((await names())[0]).toBe(before[1]);
      await expect(page.getByLabel("Locked")).toHaveCount(1);

      // Removing a stop, then replanning into a new version that keeps it out
      await page.getByRole("button", { name: `${before[0]} — details and editing` }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
      await expect.poll(names).not.toContain(before[0]);
      await page.getByRole("button", { name: "Replan" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Replan" }).click();
      await expect(page.getByRole("button", { name: /Version 3 of 3/ })).toBeVisible({ timeout: 20_000 });
      await page.getByRole("tab", { name: "All days" }).click();
      await expect(page.getByRole("button", { name: `${before[0]} — details and editing` })).toHaveCount(0);
      await expect(page.getByRole("button", { name: `${before[1]} — details and editing` })).toBeVisible();

      // Versions can be compared and an older one viewed read-only
      await page.getByRole("button", { name: /Version 3 of 3/ }).click();
      const versions = page.getByRole("dialog");
      await expect(versions.getByRole("row")).toHaveCount(4);
      await versions.getByRole("row", { name: /v1/ }).getByRole("button", { name: "View" }).click();
      await expect(page.getByText(/You are viewing version 1/)).toBeVisible();
      await expect(page.getByRole("button", { name: `${before[0]} — details and editing` })).toBeVisible();
      await page.getByRole("button", { name: "Back to current" }).click();
      await expect(page.getByText(/You are viewing version 1/)).toHaveCount(0);

      // Sharing: the link works signed out and hides private details
      await page.getByRole("link", { name: "Share", exact: true }).click();
      await page.getByRole("button", { name: "Turn on link" }).click();
      const shareUrl = await page.getByLabel("Share link").inputValue();
      expect(shareUrl).toMatch(/\/shared\/[\w-]{16,}$/);
      const guest = await browser.newContext({ reducedMotion: "reduce" });
      const guestPage = await guest.newPage();
      await guestPage.goto(new URL(shareUrl).pathname);
      await expect(guestPage.getByText("A shared itinerary · read-only")).toBeVisible();
      await expect(guestPage.getByRole("heading", { level: 1 })).toContainText("3 days in Darjeeling");
      await expect(guestPage.getByRole("button", { name: "Replan" })).toHaveCount(0);
      await expect(guestPage.getByText("₹60,000")).toHaveCount(0);
      await page.getByRole("button", { name: "Turn off link" }).click();
      await expect(page.getByText("Link sharing is off")).toBeVisible();
      expect((await guestPage.goto(new URL(shareUrl).pathname))?.status()).toBe(404);
      await guest.close();

      // Saved and reopened from My trips after signing out and back in
      await signOut(page);
      await signIn(page);
      await page.goto("/my-trips");
      await page.getByRole("link", { name: "3 days in Darjeeling" }).first().click();
      await expect(page).toHaveURL(new RegExp(`/trips/${tripId}$`));
      await expect(page.getByRole("button", { name: /Version 3 of 3/ })).toBeVisible();
    } finally {
      await deleteTrip(page, tripId);
    }
  });

  test("nearby discovery adds a place to the plan", async ({ page }) => {
    await signIn(page);
    const { createPlannedTrip } = await import("./helpers");
    // A one-day trip leaves plenty of unplanned places nearby.
    const id = await createPlannedTrip(page, "jaipur", { endDate: "2027-03-05" });
    try {
      await page.goto(`/trips/${id}/nearby`);
      await page.getByLabel("Within").selectOption("25");
      const add = page.getByRole("button", { name: /Add to day 1/ }).first();
      await add.waitFor();
      const name = (await page.locator("li", { has: add }).first().locator("span.truncate").textContent())!;
      const row = page.locator("li", { hasText: name });
      await add.click();
      await expect(row.getByText("In your plan")).toBeVisible();
      await page.getByRole("link", { name: "See the updated itinerary" }).click();
      await expect(page.getByRole("button", { name: `${name} — details and editing` })).toBeVisible();
    } finally {
      await deleteTrip(page, id);
    }
  });
});
