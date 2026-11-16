import { expect, test } from "@playwright/test";
import { alerts } from "./helpers";

test.describe("public site and place discovery", () => {
  test("landing page tells the story and every internal link resolves", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("intelligently");
    await expect(page.getByRole("heading", { name: /A planner that does the sums/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /A weekend, worked out/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Know the number/i })).toBeVisible();

    const hrefs = await page.locator("a[href^='/']").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!.split("#")[0]))]);
    expect(hrefs.length).toBeGreaterThan(15);
    for (const href of hrefs) {
      const res = await page.request.get(href, { maxRedirects: 5 });
      expect(res.status(), `dead link: ${href}`).toBeLessThan(400);
    }
  });

  test("interactive itinerary demo and budget calculator respond", async ({ page }) => {
    await page.goto("/");
    const demo = page.locator("section", { has: page.getByRole("heading", { name: /A weekend, worked out/i }) });
    await demo.getByRole("tab", { name: "Day 2" }).click();
    await expect(demo.getByRole("tab", { name: "Day 2" })).toHaveAttribute("aria-selected", "true");
    await expect(demo.locator("ol > li").first()).toBeVisible();

    const budget = page.locator("section", { has: page.getByRole("heading", { name: /Know the number/i }) });
    const total = budget.locator("p[aria-live='polite']");
    await expect(total).toContainText("₹");
    const before = await total.textContent();
    await budget.getByRole("button", { name: "Luxury" }).click();
    await expect(total).not.toHaveText(before!);
    await expect(budget.getByText("not estimated — you add this").first()).toBeVisible();
  });

  test("search finds a place and leads to its destination", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox").or(page.getByLabel(/Search destinations/i)).first().fill("Vittala");
    await page.getByRole("link", { name: /Vittala Temple/ }).click();
    await expect(page).toHaveURL(/\/destinations\/hampi/);
    await expect(page.getByRole("heading", { level: 1, name: "Hampi" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Vittala Temple" })).toBeVisible();
  });

  test("explore filters and typo-tolerant search work", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByRole("main").getByRole("heading", { name: "Destinations", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Museums", exact: true }).click();
    await expect(page).toHaveURL(/category=museums/);
    await expect(page.getByRole("heading", { name: /\d+ places?/ })).toBeVisible();
    await page.getByRole("link", { name: "Kochi", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Hill Palace Museum" })).toBeVisible();

    await page.goto("/explore?q=Hawa%20Mehal");
    await expect(page.getByRole("heading", { name: "Hawa Mahal" })).toBeVisible();
    await page.goto("/explore?q=zzzzqqq");
    await expect(page.getByText(/Nothing matches yet/)).toBeVisible();
  });

  test("contact form validates and submits", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel("Message").fill("short");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(alerts(page)).toContainText(/at least a sentence/);
    await page.getByLabel("Message").fill("[e2e] The opening hours for a museum look wrong to me.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("heading", { name: /message received/i })).toBeVisible();
  });

  test("unknown pages show a helpful 404", async ({ page }) => {
    const res = await page.goto("/destinations/atlantis");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("link", { name: "Back home" })).toBeVisible();
  });
});
