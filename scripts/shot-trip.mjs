// Sandbox: trip the gas plant and capture the scene a few seconds later (UFLS darkening check).
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { ROOT } from "./lib.mjs";

const [out = "shots/trip.png", wait = "4000"] = process.argv.slice(2);
const server = spawn("npm run preview -- --port 4176 --strictPort", { cwd: ROOT, shell: true, stdio: "ignore" });
try {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  for (let attempt = 0; ; attempt++) {
    try { await page.goto("http://localhost:4176/?mode=sandbox"); break; } catch (error) { if (attempt > 40) throw error; await new Promise((r) => setTimeout(r, 250)); }
  }
  await page.waitForFunction(() => window.__gridsimReady === true);
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => window.__gridsimScene.litWindowCount());
  const result = await page.evaluate(() => window.__gridsim.forceTrip("gas"));
  await page.waitForTimeout(Number(wait));
  const after = await page.evaluate(() => ({ lit: window.__gridsimScene.litWindowCount(), snap: window.__gridsim.snapshot() }));
  await page.screenshot({ path: out });
  console.log(JSON.stringify({ trip: result, litBefore: before, litAfter: after.lit, f: after.snap.f.toFixed(2), shed: after.snap.shedFraction, blackout: after.snap.blackout }));
  await browser.close();
} finally {
  server.kill();
  if (process.platform === "win32") spawn("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" });
}
