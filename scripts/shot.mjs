// Screenshot the built app with the installed Chrome: node scripts/shot.mjs <out.png> [width] [height] [waitMs]
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { ROOT } from "./lib.mjs";

const [out = "shots/app.png", width = "1280", height = "800", wait = "1500"] = process.argv.slice(2);
const server = spawn("npm run preview -- --port 4174 --strictPort", { cwd: ROOT, shell: true, stdio: "ignore" });
try {
  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) } });
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(String(error)));
  for (let attempt = 0; ; attempt++) {
    try { await page.goto("http://localhost:4174/"); break; } catch (error) { if (attempt > 40) throw error; await new Promise((r) => setTimeout(r, 250)); }
  }
  await page.waitForFunction(() => window.__gridsimReady === true, null, { timeout: 15000 });
  await page.waitForTimeout(Number(wait));
  await page.screenshot({ path: out });
  console.log(`saved ${out} · console errors: ${errors.length ? errors.join(" | ") : "none"}`);
  await browser.close();
} finally {
  server.kill();
  if (process.platform === "win32") spawn("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" });
}
