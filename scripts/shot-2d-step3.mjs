// Step 3 screenshots from the running dev server: the plant with different upgrade sets.
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
const shot = async (name) => { await page.waitForTimeout(700); await page.screenshot({ path: `shots/2d-step3-${name}.png` }); };
await shot("default");
// Let the rack clog for a while, no cleaner.
await page.waitForTimeout(4000);
await shot("clogging");
// Big build: 8 m dam, canal, Francis x2, gates, auto cleaner.
await page.click('[data-dam="8"]');
await page.click('[data-toggle="canal"]');
await page.click('[data-tech="francis"]');
await page.click('[data-step="1"]');
await page.click('[data-toggle="gates"]');
await page.click('[data-toggle="autoCleaner"]');
await shot("bigbuild");
await page.locator(".upgrade").evaluate((el) => el.scrollTo(0, el.scrollHeight));
await shot("bigbuild-year");
// Flood without gates.
await page.click('[data-toggle="gates"]');
await page.click('[data-preset="flood"]');
await shot("flood-nogates");
await page.keyboard.press("Escape");
await page.waitForTimeout(1000);
await shot("overview");
console.log(`console errors: ${errors.length ? errors.join(" | ") : "none"}`);
await browser.close();
