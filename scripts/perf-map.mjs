// How long one redraw of the map takes while it turns (the engine redraws the whole scene per frame).
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://localhost:5173/map/");
await page.waitForTimeout(1500);
const ms = await page.evaluate(async () => {
  const ui = window.GridMap.ui, times = [];
  for (let i = 0; i < 20; i++) { setCam(45 + i * 3, 35); const t = performance.now(); ui.render(); await new Promise((r) => requestAnimationFrame(r)); times.push(performance.now() - t); }
  setCam(45, Math.atan(1 / Math.SQRT2) * 180 / Math.PI); ui.render();
  return { median: times.sort((a, b) => a - b)[10].toFixed(1), elements: document.querySelectorAll("#art *").length };
});
console.log(JSON.stringify(ms), "errors:", errors.length ? errors.join(" | ") : "none");
await browser.close();
