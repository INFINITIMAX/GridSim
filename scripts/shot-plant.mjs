// Screenshots of the plant page from the running dev server: each dam height, and a flood.
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://localhost:5173/plant/");
await page.waitForTimeout(1500);
for (const h of [3, 5, 8]) {
  await page.click(`[data-dam="${h}"]`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `shots/plant-dam${h}.png` });
}
await page.click('[data-preset="flood"]');
await page.waitForTimeout(400);
await page.screenshot({ path: "shots/plant-flood.png" });
console.log(`console errors: ${errors.length ? errors.join(" | ") : "none"}`);
await browser.close();
