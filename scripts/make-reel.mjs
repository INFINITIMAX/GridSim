// Records a vertical Instagram reel (1080x1920, 30 fps, no audio) of /learn/ from the local site.
// Frames come from the Chrome screencast at 2x a 540x960 phone viewport; ffmpeg adds the captions
// and an end card and writes shots/reel/reel.mp4. Usage: node scripts/make-reel.mjs [--probe]
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { ROOT } from "./lib.mjs";

const OUT = resolve(ROOT, "shots/reel");
const FRAMES = resolve(OUT, "frames");
const PROBE = process.argv.includes("--probe");
const FONT = "C\\:/Windows/Fonts/bahnschrift.ttf";
const URL_TEXT = "grid-sim-ebon.vercel.app/learn";

// Video-only styling: a taller scene, no tab panel; the product page itself is unchanged.
const REEL_CSS = `
  #stage { height: 500px !important; }
  .side .panel, .credit { display: none !important; }
  html { scroll-behavior: auto !important; }
`;

rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });

const server = await createServer({ root: ROOT, server: { port: 5199, strictPort: true }, logLevel: "error" });
await server.listen();
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const wait = (ms) => page.waitForTimeout(ms);

async function open(n) {
  await page.goto(`http://localhost:5199/learn/?lesson=${n}`);
  await page.waitForFunction(() => window.__learnReady === true, null, { timeout: 60000 });
  await page.addStyleTag({ content: REEL_CSS });
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await wait(300);
}
// Scroll so that `sel` sits `y` CSS px from the top of the screen.
async function scrollTo(sel, y) {
  await page.evaluate(([s, off]) => {
    const el = document.querySelector(s);
    if (el) window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - off);
  }, [sel, y]);
  await wait(150);
}
async function setRange(name, v) {
  await page.evaluate(([n, val]) => {
    const el = document.querySelector(`#sim input[name=${n}]`);
    if (!el) throw new Error(`no input ${n}`);
    el.value = String(val);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, [name, v]);
}
async function setCheck(name, on) {
  await page.evaluate(([n, val]) => {
    const el = document.querySelector(`#sim input[name=${n}]`);
    el.checked = val;
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, [name, on]);
}
// Slide a range input from a to b over ms, in small steps, so the change is visible.
async function sweep(name, a, b, ms, steps = 40) {
  for (let i = 0; i <= steps; i++) {
    await setRange(name, +(a + ((b - a) * i) / steps).toFixed(3));
    await wait(ms / steps);
  }
}
// Drag on the scene to turn it slowly.
async function orbit(dx, ms) {
  const box = await page.locator("#gl").boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  const steps = Math.max(10, Math.round(ms / 33));
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x + (dx * i) / steps, y);
    await wait(ms / steps);
  }
  await page.mouse.up();
}

if (PROBE) {
  for (const [n, sel, y] of [[1, "#stage", 150], [5, "#stage", 40], [7, "#stage", 0], [11, "#sim [data-out=f1]", 330], [12, "#stage", 20]]) {
    await open(n);
    await scrollTo(sel, y);
    await page.screenshot({ path: resolve(OUT, `probe-${n}.png`) });
  }
  await browser.close();
  await server.close();
  process.exit(0);
}

// ---------- record ----------
const cdp = await ctx.newCDPSession(page);
const frames = [];
const shots = []; // { caption, end } per shot; frames carry the index of their shot
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
  const file = `f${String(frames.length).padStart(5, "0")}.jpg`;
  writeFileSync(resolve(FRAMES, file), Buffer.from(data, "base64"));
  frames.push({ file, t: metadata.timestamp, shot: shots.length - 1 });
  await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});

// Only what happens inside act() ends up in the video; page loads between shots are cut.
async function shot(n, prep, act, caption) {
  await open(n);
  await prep();
  shots.push({ caption, end: 0 });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  await act();
  shots[shots.length - 1].end = Date.now() / 1000;
  await cdp.send("Page.stopScreencast");
  await wait(200);
}

await shot(1, () => scrollTo("#stage", 40), async () => { await wait(400); await orbit(-260, 2200); }, ["How does a micro-hydro", "plant work?"]);
await shot(5, async () => { await setRange("time", 0.2); await scrollTo("#stage", 40); }, async () => {
  await wait(500);
  await page.click("#sim [data-run]");
  await wait(4300);
}, ["Shut the valve too fast:", "water hammer"]);
await shot(7, async () => { await setRange("ratio", 0.05); await scrollTo("#stage", 50); }, async () => {
  await wait(300);
  await sweep("ratio", 0.05, 0.5, 1500, 18);
  await wait(1600);
}, ["Pelton buckets work best", "at half the jet speed"]);
await shot(11, async () => { await setCheck("elc", false); await setRange("load", 0); await scrollTo("#sim [data-out=f1]", 330); }, async () => {
  await wait(300);
  await page.click("#sim [data-run]");
  await wait(4800);
}, ["No load controller?", "The frequency runs away"]);
await shot(12, async () => { await setRange("flow", 20); await scrollTo("#stage", 20); }, async () => {
  await wait(300);
  await sweep("flow", 20, 100, 1600, 14);
  await wait(1300);
}, ["Follow the energy from", "stream to socket"]);

// End card, rendered by the same browser with the site's fonts.
await page.setContent(`<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@600;700&family=Barlow:wght@400;500&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;height:100%;background:#eef1f4;color:#1c2531}
  .c{height:100%;display:flex;flex-direction:column;justify-content:center;padding:0 48px;gap:22px}
  h1{margin:0;font:700 64px/1 "Barlow Semi Condensed";letter-spacing:.08em;text-transform:uppercase}
  .t2{font:600 22px "Barlow Semi Condensed";letter-spacing:.32em;color:#5d6a77;text-transform:uppercase}
  p{margin:18px 0 0;font:500 30px/1.35 Barlow}
  .u{margin-top:26px;font:500 26px "JetBrains Mono";color:#e0442e}
  .cr{position:absolute;bottom:40px;left:48px;font:400 17px Barlow;color:#5d6a77}
</style></head><body><div class="c">
  <h1>Learn Energy</h1><div class="t2">Hydro · Pelton</div>
  <p>12 interactive 3D lessons on how a micro-hydro plant turns a stream into electricity.</p>
  <div class="u">${URL_TEXT}</div>
</div><div class="cr">Layout inspired by Learn Arduino by Dilum Sanjaya</div></body></html>`);
await page.evaluate(() => document.fonts.ready);
await wait(500);
await page.screenshot({ path: resolve(OUT, "endcard.png") });
await browser.close();
await server.close();

// ---------- assemble ----------
// Each frame lasts until the next frame of its shot; the last one lasts until the shot ends.
let list = "";
let clock = 0;
const spans = [];
shots.forEach((sh, k) => {
  const fs = frames.filter((f) => f.shot === k);
  if (!fs.length) throw new Error(`shot ${k + 1} recorded no frames`);
  const a = clock;
  fs.forEach((f, i) => {
    const d = Math.max(0.001, (i + 1 < fs.length ? fs[i + 1].t : sh.end) - f.t);
    list += `file 'frames/${f.file}'
duration ${d.toFixed(4)}
`;
    clock += d;
  });
  spans.push({ text: sh.caption, a, b: clock });
});
list += `file 'frames/${frames[frames.length - 1].file}'
`;
writeFileSync(resolve(OUT, "frames.txt"), list);

// Captions: one per shot, two centred lines in dark bands at the top.
const draws = spans.flatMap((sp, i) =>
  sp.text.map((line, k) => {
    const file = `cap${i}-${k}.txt`;
    writeFileSync(resolve(OUT, file), line);
    return `drawtext=fontfile='${FONT}':textfile='${file}':fontsize=58:fontcolor=white:box=1:boxcolor=0x1c2531@0.92:boxborderw=22:x=(w-text_w)/2:y=${48 + k * 104}:enable='between(t,${sp.a.toFixed(2)},${sp.b.toFixed(2)})'`;
  }),
);
const vf = `[0:v]fps=30,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0xeef1f4,${draws.join(",")},format=yuv420p[rec];` +
  `[1:v]scale=1080:1920,fps=30,format=yuv420p[end];[rec][end]concat=n=2:v=1:a=0[v]`;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "frames.txt", "-loop", "1", "-t", "3.2", "-i", "endcard.png",
  "-filter_complex", vf, "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-r", "30", "-movflags", "+faststart", "reel.mp4"], { cwd: OUT, stdio: "inherit" });
console.log(spans.map((s) => `${s.text.join(" ")}: ${(s.b - s.a).toFixed(1)} s`).join(" | "));
console.log(`reel written: shots/reel/reel.mp4 (${frames.length} frames, ${(clock + 3.2).toFixed(1)} s)`);
