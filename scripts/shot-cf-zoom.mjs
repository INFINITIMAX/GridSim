// The plant close-up of the Colorfigures map (?zoom=plant), at the default view and turned.
import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const url = pathToFileURL("art/colorfigures/map-built.html").href;
for (const [name, q] of [["zoom", "?zoom=plant"], ["zoom-turned", "?zoom=plant&free=1&yaw=115&pitch=40"], ["map", ""]]) {
  await page.goto(url + q);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `shots/cf-${name}.png`, clip: { x: 150, y: 40, width: 900, height: 640 } });
}
console.log("errors:", errors.length ? errors.join(" | ") : "none");
await browser.close();
