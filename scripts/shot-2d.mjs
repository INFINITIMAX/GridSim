// Screenshot the 2D prototype from the running dev server, in both views: node scripts/shot-2d.mjs [name]
import { chromium } from "@playwright/test";

const [name = "2d-step1"] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://localhost:5173/2d/");
await page.waitForTimeout(1500);
await page.screenshot({ path: `shots/${name}-iso.png` });
await page.click('[data-view="top"]');
await page.waitForTimeout(800);
await page.screenshot({ path: `shots/${name}-top.png` });
console.log(`saved shots/${name}-iso.png, shots/${name}-top.png · console errors: ${errors.length ? errors.join(" | ") : "none"}`);
await browser.close();
