// Gates L4 / M4: lessons 1-6 of /learn/ in headless Chrome, checked against the DOM contract in docs/learn/pelton/plan.md.
// Saves shots/learn-lesson-N.png for Lucian's review.
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { ROOT, fail } from "./lib.mjs";

const server = await createServer({ root: ROOT, server: { port: 5199, strictPort: true }, logLevel: "error" });
await server.listen();
const browser = await chromium.launch({ channel: "chrome" });
const problems = [];
mkdirSync(resolve(ROOT, "shots"), { recursive: true });

async function setRange(page, name, value) {
  await page.evaluate(([n, v]) => {
    const el = document.querySelector(`#sim input[name=${n}]`);
    if (!el) throw new Error(`no input ${n}`);
    el.value = String(v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, [name, value]);
}
async function setField(page, sel, value) {
  await page.evaluate(([q, v]) => {
    const el = document.querySelector(q);
    if (!el) throw new Error(`no field ${q}`);
    if (el.type === "checkbox") el.checked = Boolean(v); else el.value = String(v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, [sel, value]);
}
const setSelect = (page, name, value) => setField(page, `#sim select[name=${name}]`, value);
const setCheck = (page, name, on) => setField(page, `#sim input[name=${name}]`, on);
async function expectOut(page, tag, key, want) {
  const got = (await out(page, key).textContent()) ?? "";
  if (!got.includes(want)) problems.push(`${tag}: ${key} shows "${got}", expected ${want}`);
}
const out = (page, key) => page.locator(`#sim [data-out=${key}]`).first();

try {
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://localhost:5199/learn/?lesson=${n}`);
    await page.waitForFunction(() => window.__learnReady === true, null, { timeout: 60000 });
    await page.waitForTimeout(500);
    const tag = `lesson ${n}`;

    const canvas = await page.locator("canvas#gl").screenshot();
    if (canvas.length < 30000) problems.push(`${tag}: scene looks blank (${canvas.length} bytes)`);
    const callouts = await page.locator("#callouts .callout").count();
    if (callouts < 4) problems.push(`${tag}: ${callouts} callouts, expected at least 4`);
    const credit = (await page.locator(".credit").textContent()) ?? "";
    if (!credit.includes("Learn Arduino") || !credit.includes("Dilum Sanjaya")) problems.push(`${tag}: credit line missing`);
    if ((await page.locator(`#lesson-list .lesson.on[data-n="${n}"]`).count()) !== 1) problems.push(`${tag}: lesson ${n} not marked current`);
    for (const t of ["overview", "parts", "how", "specs"]) {
      if ((await page.locator(`#tabs [data-tab=${t}]`).count()) < 1) problems.push(`${tag}: tab ${t} missing`);
    }

    if (n === 1) {
      const cards = await page.locator("#sim [data-order]").count();
      if (cards !== 7) problems.push(`${tag}: ${cards} order cards, expected 7`);
      if ((await page.locator("#sim [data-check]").count()) < 1) problems.push(`${tag}: no check button`);
    }
    if (n === 2) {
      await setRange(page, "head", 60); await setRange(page, "flow", 40); await setRange(page, "eff", 0.6);
      const p = (await out(page, "power").textContent()) ?? "";
      if (!p.includes("14.1")) problems.push(`${tag}: power shows "${p}", expected 14.1 kW`);
    }
    if (n === 3) {
      await setRange(page, "flow", 40); await setRange(page, "grain", 0.2); await setRange(page, "width", 0.4);
      const vd = (await out(page, "vd").textContent()) ?? "";
      const len = (await out(page, "length").textContent()) ?? "";
      if (!vd.includes("27.9")) problems.push(`${tag}: vD shows "${vd}", expected 27.9 mm/s`);
      if (!len.includes("3.59")) problems.push(`${tag}: length shows "${len}", expected 3.59 m (exact vD 27.889 mm/s)`);
      if (await out(page, "warn").isVisible()) problems.push(`${tag}: width warning shown at B = 0.4 m`);
      await setRange(page, "width", 0.5);
      if (!(await out(page, "warn").isVisible())) problems.push(`${tag}: width warning hidden at B = 0.5 m`);
      await setRange(page, "width", 0.4);
    }
    if (n === 4) {
      await setRange(page, "flow", 40); await setRange(page, "diameter", 200); await setRange(page, "length", 150); await setSelect(page, "material", "pe");
      await expectOut(page, tag, "velocity", "1.27");
      await expectOut(page, tag, "loss", "0.98");
      await expectOut(page, tag, "net", "59.0");
      if (await out(page, "warn").isVisible()) problems.push(`${tag}: loss warning shown at 1.6 %`);
      await setRange(page, "diameter", 100);
      if (!(await out(page, "warn").isVisible())) problems.push(`${tag}: loss warning hidden at D = 100 mm (46.6 %)`);
      await setRange(page, "diameter", 200);
    }
    if (n === 5) {
      await setSelect(page, "material", "steel"); await setRange(page, "length", 150); await setRange(page, "time", 5);
      await expectOut(page, tag, "c", "1024.7");
      await expectOut(page, tag, "tc", "0.29");
      await expectOut(page, tag, "surge", "4.02");
      await expectOut(page, tag, "mode", "gradual");
      if (await out(page, "warn").isVisible()) problems.push(`${tag}: surge warning shown at 5 s`);
      await setRange(page, "time", 0.2);
      await expectOut(page, tag, "mode", "sudden");
      await expectOut(page, tag, "surge", "133.0");
      if (!(await out(page, "warn").isVisible())) problems.push(`${tag}: surge warning hidden at 0.2 s`);
      await setSelect(page, "material", "pvc");
      await expectOut(page, tag, "c", "303.4");
      await setSelect(page, "material", "steel"); await setRange(page, "time", 5);
      if ((await page.locator("#sim [data-run]").count()) < 1) problems.push(`${tag}: no run button`);
    }
    if (n === 6) {
      await setRange(page, "head", 59); await setRange(page, "opening", 100); await setCheck(page, "deflector", false);
      await expectOut(page, tag, "speed", "33.3");
      await expectOut(page, tag, "flow", "41.9");
      await expectOut(page, tag, "power", "14.6");
      if (await out(page, "note").isVisible()) problems.push(`${tag}: deflector note shown with deflector out`);
      await setRange(page, "opening", 50);
      await expectOut(page, tag, "speed", "33.3");
      await expectOut(page, tag, "flow", "20.9"); // 20.95 exact; 20.9499 rounds down
      await setRange(page, "opening", 100); await setCheck(page, "deflector", true);
      await expectOut(page, tag, "power", "0.0");
      await expectOut(page, tag, "flow", "41.9");
      if (!(await out(page, "note").isVisible())) problems.push(`${tag}: deflector note hidden with deflector in`);
      await setCheck(page, "deflector", false);
    }

    if (errors.length) problems.push(`${tag}: console errors: ${errors.slice(0, 3).join(" | ")}`);
    await page.screenshot({ path: resolve(ROOT, `shots/learn-lesson-${n}.png`) });
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
if (problems.length) fail(problems.join("\n"));
console.log("learn page verification passed");
