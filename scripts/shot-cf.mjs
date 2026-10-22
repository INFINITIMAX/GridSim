// Screenshots of a Colorfigures page over file://, at a few camera angles.
import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
const [file, out = "shots/cf"] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
for (const v of ["", "yaw=20&pitch=50", "yaw=135"]) {
  await page.goto(pathToFileURL(file).href + (v ? "?free=1&" + v : ""));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}-${v ? v.replace(/[&=]/g, "_") : "default"}.png` });
}
console.log("errors:", errors.length ? errors.join(" | ") : "none", await page.evaluate(() => document.documentElement.dataset.errors || ""));
await browser.close();
