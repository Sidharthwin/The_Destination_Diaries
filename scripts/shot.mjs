// Dev helper: node scripts/shot.mjs <url-path> <out.png> [width] [height] [fullPage] [devUser]
import { chromium } from "@playwright/test";
const [path, out, w = "1440", h = "900", full = "0", user = ""] = process.argv.slice(2);
const base = process.env.BASE_URL ?? "http://localhost:3100";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, reducedMotion: process.env.SHOT_MOTION ? "no-preference" : "reduce" });
if (user) await ctx.request.post(`${base}/api/dev-auth`, { data: { user } });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(base + path, { waitUntil: "networkidle" });
await page.waitForTimeout(2200);
if (full === "1") {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 500) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(900);
}
// SHOT_SCROLL=<px> scrolls before the screenshot (with SHOT_MOTION=1 animations stay on).
if (process.env.SHOT_SCROLL) { await page.mouse.wheel(0, +process.env.SHOT_SCROLL); await page.waitForTimeout(1200); }
// SHOT_CLICK="Accessible name:times" clicks a button before the screenshot.
if (process.env.SHOT_CLICK) {
  const [name, times = "1"] = process.env.SHOT_CLICK.split(":");
  for (let i = 0; i < +times; i++) { await page.getByRole("button", { name, exact: true }).first().click(); await page.waitForTimeout(1100); }
}
await page.screenshot({ path: out, fullPage: full === "1" });
if (errors.length) console.log("CONSOLE ERRORS:\n" + errors.slice(0, 8).join("\n"));
await browser.close();
