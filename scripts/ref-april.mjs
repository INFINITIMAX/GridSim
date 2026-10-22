// Reference captures of april-zhu.com/colorfigures for art direction (saved to data/refs, not committed).
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://april-zhu.com/colorfigures", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(3000);
const h = await page.evaluate(() => document.body.scrollHeight);
console.log("height", h, "title", await page.title());
for (let i = 0, y = 0; y < Math.min(h, 9000) && i < 10; i++, y += 900) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `data/refs/april/${String(i).padStart(2, "0")}.png` });
}
const info = await page.evaluate(() => ({
  svgs: document.querySelectorAll("svg").length,
  canvases: document.querySelectorAll("canvas").length,
  imgs: [...document.querySelectorAll("img")].slice(0, 10).map((i) => i.src),
  scripts: [...document.querySelectorAll("script[src]")].map((s) => s.src).slice(0, 10),
  text: document.body.innerText.slice(0, 1500),
}));
console.log(JSON.stringify(info, null, 1));
await browser.close();
