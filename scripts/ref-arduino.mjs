// Reference captures of learn-arduino-red.vercel.app for art direction (saved to data/refs, not committed).
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://learn-arduino-red.vercel.app/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(3000);
// Zoom into the 3D board.
await page.mouse.move(530, 420);
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -200); await page.waitForTimeout(150); }
await page.waitForTimeout(1500);
await page.screenshot({ path: "data/refs/arduino/02-zoom.png" });
for (const name of ["Components", "Simulator", "Lessons"]) {
  await page.locator(`a:has-text("${name}"), [aria-label="${name}"], [title="${name}"]`).first().click({ timeout: 5000 }).catch(() => console.log("no click", name));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `data/refs/arduino/03-${name.toLowerCase()}.png` });
}
await browser.close();
