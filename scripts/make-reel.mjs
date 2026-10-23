// Renders a vertical Instagram reel (1080x1920, 30 fps, no audio) of /learn/, frame by frame.
// The page runs on a virtual clock: performance.now and requestAnimationFrame are replaced, every frame
// advances time by exactly 1/30 s and is then captured, so motion is even however slow the capture is.
// ffmpeg adds the captions, cross-fades between shots and the end card; output: shots/reel/reel.mp4.
// Usage: node scripts/make-reel.mjs [--probe]
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { ROOT } from "./lib.mjs";

const OUT = resolve(ROOT, "shots/reel");
const PROBE = process.argv.includes("--probe");
const FPS = 30;
const DT = 1000 / FPS;
const FADE = 0.35; // cross-fade between shots, s
const FONT = "C\\:/Windows/Fonts/bahnschrift.ttf";
const URL_TEXT = "grid-sim-ebon.vercel.app/learn";

// Video-only styling: a taller scene, no tab panel; the product page itself is unchanged.
const REEL_CSS = `
  #stage { height: 500px !important; }
  .side .panel, .credit { display: none !important; }
  html { scroll-behavior: auto !important; }
`;

// Virtual clock, installed before the app's own code runs.
const CLOCK = `
  (() => {
    let vt = 0, id = 0;
    const queue = [];
    performance.now = () => vt;
    window.requestAnimationFrame = (cb) => { queue.push([++id, cb]); return id; };
    window.cancelAnimationFrame = (i) => { const k = queue.findIndex((e) => e[0] === i); if (k >= 0) queue.splice(k, 1); };
    window.__advance = (ms) => { vt += ms; for (const [, cb] of queue.splice(0)) cb(vt); };
  })();
`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const server = await createServer({ root: ROOT, server: { port: 5199, strictPort: true }, logLevel: "error" });
await server.listen();
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(CLOCK);
const page = await ctx.newPage();

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2); // ease-in-out cubic

async function open(n) {
  await page.goto(`http://localhost:5199/learn/?lesson=${n}`);
  await page.waitForFunction(() => window.__learnReady === true, null, { timeout: 60000, polling: 100 });
  await page.addStyleTag({ content: REEL_CSS });
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.evaluate(() => window.__advance(50));
}
async function scrollTo(sel, y) {
  await page.evaluate(([s, off]) => {
    const el = document.querySelector(s);
    if (el) window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - off);
  }, [sel, y]);
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
  }, [name, on]);
}

// One shot = a list of frames; `each(k, x)` runs before frame k (x = k / frames) and may move a slider etc.
let shotNo = 0;
const shots = [];
async function shot(n, prep, seconds, caption, each = async () => {}, speed = 1) {
  await open(n);
  await prep();
  const dir = resolve(OUT, `s${shotNo}`);
  mkdirSync(dir);
  const total = Math.round(seconds * FPS);
  for (let k = 0; k < total; k++) {
    await each(k, k / (total - 1));
    await page.evaluate((ms) => window.__advance(ms), DT * speed);
    await page.screenshot({ path: resolve(dir, `f${String(k).padStart(4, "0")}.jpg`), type: "jpeg", quality: 92 });
  }
  shots.push({ dir, caption, seconds: total / FPS });
  shotNo++;
}

if (PROBE) {
  for (const [n, sel, y] of [[1, "#stage", 40], [5, "#stage", 40], [7, "#stage", 50], [11, "#sim [data-out=f1]", 330], [12, "#stage", 20]]) {
    await open(n);
    await scrollTo(sel, y);
    await page.screenshot({ path: resolve(OUT, `probe-${n}.png`) });
  }
  await browser.close();
  await server.close();
  process.exit(0);
}

// 1. The plant turns slowly (a drag on the scene, eased).
{
  let box;
  let last = 0;
  await shot(1, async () => {
    await scrollTo("#stage", 40);
    box = await page.locator("#gl").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
  }, 4.2, ["How does a micro-hydro", "plant work?"], async (k, x) => {
    const dx = -300 * ease(Math.min(1, x / 0.92));
    if (Math.abs(dx - last) > 0.01) await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2);
    last = dx;
  });
  await page.mouse.up();
}
// 2. Water hammer: the valve shuts in 0.2 s.
await shot(5, async () => { await setRange("time", 0.2); await scrollTo("#stage", 40); }, 4.8, ["Shut the valve too fast:", "water hammer"],
  async (k) => { if (k === 12) await page.click("#sim [data-run]"); });
// 3. Bucket speed from 5 % to 50 % of the jet speed.
await shot(7, async () => { await setRange("ratio", 0.05); await scrollTo("#stage", 50); }, 4.8, ["Pelton buckets work best", "at half the jet speed"],
  async (k, x) => { await setRange("ratio", (0.05 + 0.45 * ease(Math.min(1, x / 0.7))).toFixed(2)); });
// 4. No load controller: the frequency runs away (simulation shown at 2x).
await shot(11, async () => { await setCheck("elc", false); await setRange("load", 0); await scrollTo("#sim [data-out=f1]", 330); }, 5.4,
  ["No load controller?", "The frequency runs away"], async (k) => { if (k === 0) await page.click("#sim [data-run]"); }, 2);
// 5. The energy band widens as the flow goes from 20 % to 100 %.
await shot(12, async () => { await setRange("flow", 20); await scrollTo("#stage", 20); }, 4.8, ["Follow the energy from", "stream to socket"],
  async (k, x) => { await setRange("flow", Math.round(20 + 80 * ease(Math.min(1, x / 0.75)))); });

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
await page.waitForFunction(() => document.fonts.status === "loaded", null, { polling: 100 });
await page.screenshot({ path: resolve(OUT, "endcard.png") });
await browser.close();
await server.close();

// ---------- assemble ----------
// Each shot becomes a clip with its caption (two lines, fading in); clips are joined with cross-fades.
const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { cwd: OUT, stdio: "inherit" });
shots.forEach((sh, i) => {
  const draws = sh.caption.map((line, k) => {
    const file = `cap${i}-${k}.txt`;
    writeFileSync(resolve(OUT, file), line);
    return `drawtext=fontfile='${FONT}':textfile='${file}':fontsize=58:fontcolor=white:box=1:boxcolor=0x1c2531@0.92:boxborderw=22:x=(w-text_w)/2:y=${48 + k * 104}:alpha='min(1,max(0,(t-0.15)/0.3))'`;
  });
  ff(["-framerate", String(FPS), "-i", `s${i}/f%04d.jpg`, "-vf", `${draws.join(",")},format=yuv420p`, "-c:v", "libx264", "-crf", "16", "-preset", "slow", `clip${i}.mp4`]);
});
ff(["-loop", "1", "-framerate", String(FPS), "-t", "3.2", "-i", "endcard.png", "-vf", "format=yuv420p", "-c:v", "libx264", "-crf", "16", "clip-end.mp4"]);

const clips = [...shots.map((_, i) => `clip${i}.mp4`), "clip-end.mp4"];
const lengths = [...shots.map((s) => s.seconds), 3.2];
let chain = "";
let prev = "[0:v]";
let offset = 0;
for (let i = 1; i < clips.length; i++) {
  offset += lengths[i - 1] - FADE;
  const out = i === clips.length - 1 ? "[v]" : `[x${i}]`;
  chain += `${prev}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${offset.toFixed(3)}${out};`;
  prev = out;
}
ff([...clips.flatMap((c) => ["-i", c]), "-filter_complex", chain.slice(0, -1), "-map", "[v]", "-r", String(FPS),
  "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "reel.mp4"]);
const length = lengths.reduce((a, b) => a + b, 0) - FADE * (clips.length - 1);
console.log(`reel written: shots/reel/reel.mp4 (${shots.reduce((a, s) => a + Math.round(s.seconds * FPS), 0)} rendered frames, ${length.toFixed(1)} s)`);
