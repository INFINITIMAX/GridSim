// Step 2 screenshots from the running dev server: overview, plant opened, flood, dry with 4 turbines.
import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://localhost:5173/2d/");
await page.waitForTimeout(1200);
await page.screenshot({ path: "shots/2d-step2-overview.png" });
// The powerhouse in the top overview (see shots/2d-step1-top.png).
await page.mouse.move(607, 333);
await page.waitForTimeout(200);
await page.mouse.click(607, 333);
await page.waitForTimeout(1200);
await page.screenshot({ path: "shots/2d-step2-open.png" });
await page.getByRole("button", { name: "Flood" }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: "shots/2d-step2-flood.png" });
await page.getByRole("button", { name: "Dry" }).click();
for (let i = 0; i < 3; i++) await page.getByRole("button", { name: /increase|more|\+/i }).first().click();
await page.waitForTimeout(800);
await page.screenshot({ path: "shots/2d-step2-dry4.png" });
console.log(`console errors: ${errors.length ? errors.join(" | ") : "none"}`);
await browser.close();
