// Step 5 screenshots from the running dev server: the visible calculation and the "i" explanations.
import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://localhost:5173/2d/");
await page.waitForTimeout(1000);
await page.mouse.click(607, 333);
await page.waitForTimeout(1200);
const shot = async (name) => { await page.waitForTimeout(500); await page.screenshot({ path: `shots/2d-step5-${name}.png` }); };
// The brief's example: Kaplan medium x1, dam 5, river 3, no fish ladder, auto cleaner keeps the rack near clean.
await page.click('[data-toggle="fishLadder"]');
await page.click('[data-toggle="autoCleaner"]');
await page.click('.up-calc-toggle');
await shot("calc");
console.log("calc block:\n" + (await page.locator('.upgrade').innerText()).split("\n").slice(0, 14).join("\n"));
await page.click('[data-info="turbines"] button, h3[data-info="turbines"] button').catch(async () => {
  await page.locator('h3').filter({ hasText: "Turbines" }).locator("button").click();
});
await page.locator('h3').filter({ hasText: "Fish ladder" }).locator("button").click();
await page.locator('h3').filter({ hasText: "Turbines" }).scrollIntoViewIfNeeded();
await shot("info-turbines");
await page.locator('h3').filter({ hasText: "Fish ladder" }).scrollIntoViewIfNeeded();
await shot("info-fish");
// A stopped plant: flood without gates.
await page.click('[data-preset="flood"]');
await page.locator(".upgrade").evaluate((el) => el.scrollTo(0, 0));
await shot("stopped");
console.log(`console errors: ${errors.length ? errors.join(" | ") : "none"}`);
await browser.close();
