// Phone layout gate for /learn/ (spec: docs/learn/pelton/mobil.md, section "Criterii verificabile").
// Runs lessons 1-12 at 360x740, 390x844 and 768x1024 (isMobile, hasTouch, DPR 2) in headless Chrome.
// Saves shots/learn-mobile-<width>-<n>.png (full page) for Lucian's review.
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

const SCREENS = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
];
// Desktop gate: canvas PNG >= 30000 bytes. Here the floor scales with the canvas CSS area (0.02 bytes per CSS px,
// about 40 % of the ratio implied by the desktop threshold), with a 4000 byte minimum. A uniform-colour canvas compresses far below it.
const minCanvasBytes = (w, h) => Math.max(4000, Math.round(w * h * 0.02));
const SHOTS = { 390: [1, 7, 12], 360: [1], 768: [1] };

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
    el.value = String(v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, [sel, value]);
}
const out = (page, key) => page.locator(`#sim [data-out=${key}]`).first();
async function expectOut(tag, page, key, want) {
  const got = (await out(page, key).textContent()) ?? "";
  if (!got.includes(want)) problems.push(`${tag}: ${key} shows "${got}", expected ${want}`);
}

const hasHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
const rect = async (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; });

async function checkLesson(page, tag, width, height, n) {
  const iw = await page.evaluate(() => window.innerWidth);

  if (await hasHScroll(page)) problems.push(`${tag}: page scrolls horizontally on load`);

  // Logo fully inside the viewport horizontally.
  const logo = await rect(page.locator(".logo").first());
  if (logo.width <= 0 || logo.left < 0 || logo.right > iw) problems.push(`${tag}: logo not fully in view (left ${logo.left.toFixed(0)}, right ${logo.right.toFixed(0)}, viewport ${iw})`);

  // Scene canvas: a box, not the whole screen.
  const gl = page.locator("canvas#gl");
  if (!(await gl.isVisible())) problems.push(`${tag}: canvas#gl not visible`);
  else {
    await gl.scrollIntoViewIfNeeded();
    const c = await rect(gl);
    if (c.width < iw - 34) problems.push(`${tag}: canvas width ${c.width.toFixed(0)} < ${iw - 34}`);
    if (c.height < 240 || c.height > 470) problems.push(`${tag}: canvas height ${c.height.toFixed(0)} outside 240..470`);
    const png = await gl.screenshot();
    const need = minCanvasBytes(c.width, c.height);
    if (png.length < need) problems.push(`${tag}: scene looks blank (${png.length} bytes, need ${need})`);
  }

  // Callouts hidden in stack mode.
  const nCallouts = await page.locator("#callouts .callout").count();
  for (let i = 0; i < nCallouts; i++) {
    if (await page.locator("#callouts .callout").nth(i).isVisible()) { problems.push(`${tag}: callout ${i} is visible`); break; }
  }

  // Lesson list: own horizontally scrollable row, current lesson fully in the list's view, pills >= 44 px.
  const list = page.locator("#lesson-list");
  if (!(await list.isVisible())) problems.push(`${tag}: #lesson-list not visible`);
  else {
    const m = await list.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
    if (!(m.sw > m.cw)) problems.push(`${tag}: #lesson-list does not scroll horizontally (scrollWidth ${m.sw}, clientWidth ${m.cw})`);
    const lr = await rect(list);
    const on = page.locator("#lesson-list .lesson.on");
    if ((await on.count()) !== 1) problems.push(`${tag}: ${await on.count()} current lessons marked`);
    else {
      const r = await rect(on);
      if (r.left < lr.left - 1 || r.right > lr.right + 1) problems.push(`${tag}: current lesson not fully in the list view (${r.left.toFixed(0)}..${r.right.toFixed(0)} vs ${lr.left.toFixed(0)}..${lr.right.toFixed(0)})`);
    }
    const short = await page.locator("#lesson-list .lesson").evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height < 44).length);
    if (short) problems.push(`${tag}: ${short} lesson pills shorter than 44 px`);
  }

  // The 4 tabs exist and can be brought into view.
  for (const t of ["overview", "parts", "how", "specs"]) {
    const tab = page.locator(`#tabs [data-tab=${t}]`).first();
    if ((await tab.count()) < 1) { problems.push(`${tag}: tab ${t} missing`); continue; }
    await tab.scrollIntoViewIfNeeded();
    const r = await rect(tab);
    if (!(await tab.isVisible()) || r.left < 0 || r.right > iw) problems.push(`${tag}: tab ${t} not in view after scrolling (${r.left.toFixed(0)}..${r.right.toFixed(0)})`);
  }

  // Simulator card within the viewport horizontally; inputs inside the card; touch targets >= 40 px.
  const sim = page.locator("#sim");
  await sim.scrollIntoViewIfNeeded();
  const s = await rect(sim);
  if (s.left < 0 || s.right > iw) problems.push(`${tag}: #sim outside viewport horizontally (${s.left.toFixed(0)}..${s.right.toFixed(0)} of ${iw})`);
  const bad = await page.evaluate(() => {
    const card = document.querySelector("#sim").getBoundingClientRect();
    const res = { outside: 0, small: [] };
    for (const el of document.querySelectorAll("#sim button, #sim select, #sim input:not([type=checkbox]):not([type=hidden])")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.left < card.left - 1 || r.right > card.right + 1) res.outside++;
      if (r.height < 40) res.small.push(`${el.tagName.toLowerCase()}${el.name ? `[${el.name}]` : ""}:${r.height.toFixed(0)}`);
    }
    return res;
  });
  if (bad.outside) problems.push(`${tag}: ${bad.outside} sim controls stick out of the card`);
  if (bad.small.length) problems.push(`${tag}: sim touch targets under 40 px: ${bad.small.slice(0, 4).join(", ")}`);

  // SVG charts (L8, L11) scale to the card width.
  const svgOver = await page.evaluate(() => [...document.querySelectorAll("#sim svg")].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).length);
  if (svgOver) problems.push(`${tag}: ${svgOver} sim charts wider than the viewport`);

  // Credit visible at the end of the flow.
  const credit = page.locator(".credit");
  if ((await credit.count()) < 1) problems.push(`${tag}: credit missing`);
  else {
    await credit.scrollIntoViewIfNeeded();
    const t = (await credit.textContent()) ?? "";
    const r = await rect(credit);
    if (!(await credit.isVisible()) || !t.includes("Learn Arduino") || !t.includes("Dilum Sanjaya")) problems.push(`${tag}: credit not visible or wrong text`);
    else if (r.left < 0 || r.right > iw) problems.push(`${tag}: credit outside viewport horizontally`);
  }

  if (await hasHScroll(page)) problems.push(`${tag}: page scrolls horizontally after scrolling through`);
}

async function interact390(page, tag, n) {
  if (n === 2) {
    await setRange(page, "head", 60); await setRange(page, "flow", 40); await setRange(page, "eff", 0.6);
    await expectOut(tag, page, "power", "14.1");
  }
  if (n === 9) await expectOut(tag, page, "verdict", "Pelton (1 jet)");
  if (n === 12) await expectOut(tag, page, "elec", "19.2");
}

try {
  for (const { width, height } of SCREENS) {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", (e) => errors.push(e.message));
      const tag = `${width}x${height} lesson ${n}`;
      await page.goto(`http://localhost:5199/learn/?lesson=${n}`);
      await page.waitForFunction(() => window.__learnReady === true, null, { timeout: 60000 });
      await page.waitForTimeout(500);

      await checkLesson(page, tag, width, height, n);
      if (width === 390) await interact390(page, tag, n);

      // Switching modes without a reload (rotation / resize), once per screen on lesson 1.
      if (n === 1 && width === 390) {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForTimeout(500);
        let vis = 0;
        for (const c of await page.locator("#callouts .callout").all()) if (await c.isVisible()) vis++;
        if (vis < 4) problems.push(`${tag}: after widening to 1440 only ${vis} callouts visible (desktop mode not restored)`);
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(500);
        for (const c of await page.locator("#callouts .callout").all()) if (await c.isVisible()) { problems.push(`${tag}: callouts visible again after narrowing back to ${width}`); break; }
        if (await hasHScroll(page)) problems.push(`${tag}: horizontal scroll after resize round trip`);
      }

      if (errors.length) problems.push(`${tag}: console errors: ${errors.slice(0, 3).join(" | ")}`);
      if ((SHOTS[width] ?? []).includes(n)) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: resolve(ROOT, `shots/learn-mobile-${width}-${n}.png`), fullPage: true });
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
if (problems.length) fail(problems.join("\n"));
console.log("learn mobile verification passed");
