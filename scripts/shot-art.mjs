// Stills of the art diorama, both palettes, from the running dev server.
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
for (const p of ["a", "b"]) {
  await page.goto(`http://localhost:5173/art/?palette=${p}`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `shots/art-${p}.png` });
}
console.log(`console errors: ${errors.length ? errors.join(" | ") : "none"}`);
await browser.close();
