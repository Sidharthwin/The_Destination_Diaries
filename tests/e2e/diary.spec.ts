import { crc32, deflateSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { alerts, signIn } from "./helpers";

/** Builds a small, valid PNG in memory so the browser's image decoder accepts it. */
function makePng(width = 48, height = 36): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body) >>> 0, body.length + 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x9a)]);
  const pixels = deflateSync(Buffer.concat(Array.from({ length: height }, () => row)));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", pixels), chunk("IEND", Buffer.alloc(0))]);
}
const PNG = makePng();
const photo = (name: string) => ({ name, mimeType: "image/png", buffer: PNG });

test.describe("travel diaries", () => {
  test("sample diaries can be read like a book", async ({ page }) => {
    await page.goto("/discover");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Journeys");
    await page.getByRole("link", { name: "Open the book" }).first().click();
    await expect(page).toHaveURL(/\/diary\/pink-city-slowly/);
    await expect(page.getByText("Front cover")).toBeVisible();
    // Two-page spreads on desktop, single pages on phones: turn until the first chapter opens.
    const opener = page.getByRole("heading", { name: "The fort before the crowds" }).first();
    for (let i = 0; i < 6 && (i < 2 || !(await opener.isVisible())); i++) {
      await page.getByRole("button", { name: "Turn the page", exact: true }).click();
      await page.waitForTimeout(200);
    }
    await expect(opener).toBeVisible();
    const here = await page.getByText(/^Pages? \d/).textContent();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText(/^Pages? \d/)).not.toHaveText(here!);
    await expect(page.getByText(/illustration, not an account by a real traveller/)).toBeVisible();
    expect((await page.goto("/diary/not-a-diary"))?.status()).toBe(404);
  });

  test("create a diary, add photos and a chapter, read it, and it survives a reload", async ({ page }) => {
    await signIn(page);
    await page.goto("/diaries");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("shelf");
    await expect(page.getByRole("link", { name: /Read the sample diary/ })).toHaveCount(3);
    await page.getByRole("link", { name: "Start a new diary" }).click();

    // Create — a title is required; the cover previews live
    await page.getByRole("button", { name: "Create diary" }).click();
    await expect(alerts(page)).toContainText("Give your diary a title");
    await page.getByLabel("Title", { exact: true }).fill("Stones and Rivers");
    await page.getByLabel("Where").fill("Hampi, Karnataka");
    await page.getByLabel("From").fill("2027-02-01");
    await page.getByRole("button", { name: /Field Notes/ }).click();
    const preview = page.getByRole("complementary", { name: "Cover preview" });
    await expect(preview.getByRole("heading", { name: "Stones and Rivers" })).toBeVisible();
    await page.getByLabel("Upload a cover photograph").setInputFiles(photo("cover.png"));
    await expect(preview.locator("img")).toBeVisible();
    await page.getByRole("button", { name: "Create diary" }).click();
    await page.waitForURL(/\/diaries\/[0-9a-f-]{36}$/);
    const diaryUrl = page.url();

    // Photos: a non-image is refused with a reason, real photos are added
    await page.getByRole("link", { name: "Photos", exact: true }).click();
    await page.getByLabel("Choose photographs to add").setInputFiles([
      photo("river.png"), photo("boulders.png"),
      { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not a photo") },
    ]);
    await expect(alerts(page)).toContainText("notes.txt: only JPEG, PNG or WebP");
    await expect(page.getByRole("heading", { name: /Not yet in a chapter \(2\)/ })).toBeVisible();
    await page.getByLabel("Caption").first().fill("The river at noon");
    await page.getByLabel("Add to a chapter").first().selectOption({ index: 1 });
    await expect(page.getByRole("heading", { name: /In the book \(1\)/ })).toBeVisible();

    // Chapter: write, add the other photo, autosave
    await page.goto(diaryUrl);
    await page.getByRole("link", { name: "The first day" }).click();
    await page.getByLabel("Chapter title").fill("Across the river");
    await page.getByLabel("What happened").fill("We crossed in a round basket boat.\n\nThe boatman spun it once, for luck.");
    await page.getByLabel(/A note in the margin/).fill("Hold on to your hat");
    await page.getByRole("button", { name: /Add .* to this chapter/ }).click();
    await expect(page.getByText("All changes saved")).toBeVisible();
    const pagePreview = page.getByRole("complementary", { name: "Page preview" });
    await expect(pagePreview.getByRole("heading", { name: "Across the river" })).toBeVisible();
    await expect(pagePreview.getByText("Hold on to your hat")).toBeVisible();

    // Persisted in the browser: survives a full reload
    await page.reload();
    await expect(page.getByLabel("Chapter title")).toHaveValue("Across the river");
    await expect(page.getByLabel("What happened")).toHaveValue(/round basket boat/);
    await expect(page.getByLabel(/Caption for photo/)).toHaveCount(2);

    // Add a second chapter and reorder
    await page.goto(diaryUrl);
    await page.getByRole("button", { name: "Add a chapter" }).click();
    await page.getByLabel("Chapter title").fill("Sunset on the hill");
    await expect(page.getByText("All changes saved")).toBeVisible();
    await page.goto(diaryUrl);
    await page.getByRole("button", { name: "Move Sunset on the hill up" }).click();
    await expect(page.locator("ol > li").first()).toContainText("Sunset on the hill");

    // Read it as a book
    await page.getByRole("link", { name: "Read as a book" }).click();
    await expect(page.getByText("Front cover")).toBeVisible();
    const turn = page.getByRole("button", { name: "Turn the page", exact: true });
    for (let i = 0; i < 12 && !(await page.getByText("Back cover").isVisible()); i++) {
      await turn.click();
      await page.waitForTimeout(150);
    }
    await expect(page.getByText("Back cover")).toBeVisible();
    await expect(turn).toBeDisabled();

    // On the shelf, then deleted
    await page.goto("/diaries");
    await expect(page.getByRole("link", { name: "Open Stones and Rivers" })).toBeVisible();
    await page.goto(diaryUrl);
    await page.getByRole("button", { name: "Delete this diary" }).click();
    await page.getByRole("button", { name: "Yes, delete it" }).click();
    await expect(page).toHaveURL(/\/diaries$/);
    await expect(page.getByRole("link", { name: "Open Stones and Rivers" })).toHaveCount(0);
    await page.goto(diaryUrl);
    await expect(page.getByRole("heading", { name: "We could not find that diary" })).toBeVisible();
  });
});
