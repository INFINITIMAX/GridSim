// Gates M4 for lessons 4-6, 7-9 and 10-12: all 12 lessons of /learn/ in headless Chrome, checked against the DOM contract in docs/learn/pelton/plan.md.
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
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
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
    if (n === 7) {
      await setRange(page, "ratio", 0.25); await setRange(page, "angle", 165);
      await expectOut(page, tag, "u", "8.34");
      await expectOut(page, tag, "eta", "73.7");
      await expectOut(page, tag, "power", "17.2");
      await expectOut(page, tag, "exit", "17.1");
      await setRange(page, "ratio", 0.5);
      await expectOut(page, tag, "u", "16.67");
      await expectOut(page, tag, "eta", "98.3");
      await expectOut(page, tag, "power", "22.9");
      await expectOut(page, tag, "exit", "4.4");
      await setRange(page, "angle", 90);
      await expectOut(page, tag, "eta", "50.0");
      await setRange(page, "angle", 165); await setRange(page, "ratio", 1);
      await expectOut(page, tag, "power", "0.0");
      await setRange(page, "ratio", 0.5);
    }
    if (n === 8) {
      await setRange(page, "flow", 50); await setSelect(page, "jets", "1");
      await expectOut(page, tag, "eta", "89.0");
      await expectOut(page, tag, "peak", "66.3");
      await expectOut(page, tag, "power", "10.8");
      await setRange(page, "flow", 100);
      await expectOut(page, tag, "eta", "87.0");
      await expectOut(page, tag, "power", "21.1");
      await setRange(page, "flow", 20);
      await expectOut(page, tag, "eta", "75.2");
      await setSelect(page, "jets", "2");
      await expectOut(page, tag, "eta", "77.7");
      await expectOut(page, tag, "peak", "66.4");
      if ((await page.locator("#sim svg[data-curve] [data-dot]").count()) !== 1) problems.push(`${tag}: efficiency curve or its dot missing`);
      await setRange(page, "flow", 50); await setSelect(page, "jets", "1");
    }
    if (n === 9) {
      await setField(page, "#sim input[name=head]", 59); await setField(page, "#sim input[name=flow]", 41.9);
      await setSelect(page, "speed", "750"); await setSelect(page, "jets", "1");
      await expectOut(page, tag, "nqe", "0.0217");
      await expectOut(page, tag, "d1", "0.42");
      await expectOut(page, tag, "verdict", "Pelton (1 jet)");
      await setSelect(page, "speed", "1500");
      await expectOut(page, tag, "nqe", "0.0434");
      await expectOut(page, tag, "verdict", "No standard runner");
      if (((await out(page, "d1").textContent()) ?? "").trim() !== "") problems.push(`${tag}: d1 not empty when no Pelton fits`);
      await setSelect(page, "jets", "4");
      await expectOut(page, tag, "verdict", "Pelton (4 jets)");
      await expectOut(page, tag, "d1", "0.21");
      await setField(page, "#sim input[name=head]", 100); await setField(page, "#sim input[name=flow]", 900); await setSelect(page, "jets", "1");
      await expectOut(page, tag, "nqe", "0.1353");
      await expectOut(page, tag, "verdict", "Francis");
      await setField(page, "#sim input[name=head]", 10); await setField(page, "#sim input[name=flow]", 5000); await setSelect(page, "speed", "500");
      await expectOut(page, tag, "verdict", "Kaplan");
      await setField(page, "#sim input[name=head]", 59); await setField(page, "#sim input[name=flow]", 41.9); await setSelect(page, "speed", "750");
    }
    if (n === 10) {
      await setSelect(page, "turbine", "750"); await setSelect(page, "poles", "4"); await setSelect(page, "drive", "belt"); await setRange(page, "ratio", 2);
      await expectOut(page, tag, "gen", "1500");
      await expectOut(page, tag, "freq", "50.0");
      await expectOut(page, tag, "need", "2.00");
      if (!(await out(page, "ok").isVisible())) problems.push(`${tag}: 50 Hz mark hidden at 1500 rpm, 4 poles`);
      const shown = async (part) => page.locator(`#callouts .callout[data-part=${part}]`).isVisible();
      if (!(await shown("belt")) || (await shown("coupling"))) problems.push(`${tag}: belt mode should show the Belt callout only`);
      await setSelect(page, "drive", "direct");
      await expectOut(page, tag, "gen", "750");
      await expectOut(page, tag, "freq", "25.0");
      if ((await shown("belt")) || !(await shown("coupling"))) problems.push(`${tag}: direct mode should show the Coupling callout only`);
      if (await out(page, "ok").isVisible()) problems.push(`${tag}: 50 Hz mark shown at 25 Hz`);
      await setSelect(page, "poles", "8");
      await expectOut(page, tag, "freq", "50.0");
      await expectOut(page, tag, "need", "1.00");
      await setSelect(page, "poles", "6"); await setSelect(page, "drive", "belt"); await setRange(page, "ratio", 2);
      await expectOut(page, tag, "freq", "75.0");
      await expectOut(page, tag, "need", "1.33");
      await setSelect(page, "poles", "4");
    }
    if (n === 11) {
      await setRange(page, "load", 0); await setCheck(page, "elc", false);
      await expectOut(page, tag, "f1", "69.7");
      await expectOut(page, tag, "f10", "99.7");
      await expectOut(page, tag, "ballast", "0.0");
      if (!(await out(page, "warn").isVisible())) problems.push(`${tag}: over-frequency warning hidden without ELC`);
      await setRange(page, "load", 50);
      await expectOut(page, tag, "f1", "60.9");
      await expectOut(page, tag, "f10", "84.7");
      await setCheck(page, "elc", true);
      await expectOut(page, tag, "f10", "50.0");
      await expectOut(page, tag, "ballast", "7.3");
      await expectOut(page, tag, "village", "7.3");
      if (await out(page, "warn").isVisible()) problems.push(`${tag}: over-frequency warning shown with ELC`);
      await setRange(page, "load", 0);
      await expectOut(page, tag, "ballast", "14.6");
      if ((await page.locator("#sim svg[data-curve]").count()) !== 1) problems.push(`${tag}: frequency chart missing`);
      if ((await page.locator("#sim [data-run]").count()) < 1) problems.push(`${tag}: no run button`);
    }
    if (n === 12) {
      await setRange(page, "flow", 100); await setSelect(page, "machines", "maker"); await setRange(page, "load", 40);
      await expectOut(page, tag, "gross", "24.7");
      await expectOut(page, tag, "net", "24.2");
      await expectOut(page, tag, "shaft", "21.1");
      await expectOut(page, tag, "elec", "19.2");
      await expectOut(page, tag, "overall", "77.7");
      await expectOut(page, tag, "energy", "67,200");
      await setSelect(page, "machines", "small");
      await expectOut(page, tag, "shaft", "18.2");
      await expectOut(page, tag, "elec", "14.5");
      await expectOut(page, tag, "overall", "58.9");
      await expectOut(page, tag, "energy", "50,900");
      await setSelect(page, "machines", "maker"); await setRange(page, "flow", 50);
      await expectOut(page, tag, "elec", "9.9");
      await expectOut(page, tag, "overall", "80.6");
      await expectOut(page, tag, "energy", "34,800");
      await setRange(page, "flow", 100);
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
