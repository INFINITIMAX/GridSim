// Learn Energy · Hydro · Pelton: page wiring (scene, camera, lesson switching).
import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LESSONS, LESSON_TITLES, UNLOCKED, type Lesson, type SceneId } from "./lessons";
import { createChart, type ChartScene } from "./scenes/chart";
import { createIntake, type IntakeScene } from "./scenes/intake";
import { createNozzle, type NozzleScene } from "./scenes/nozzle";
import { createPenstock, type PenstockScene } from "./scenes/penstock";
import { THUMB_MAKERS } from "./scenes/pelton";
import { createPlant, type PlantScene } from "./scenes/plant";
import { createRunner, type RunnerScene } from "./scenes/runner";
import { addLights, disposeObject, setLineResolution, shadowGround, type LessonScene } from "./toon";
import {
  buildLessonList, createCallouts, hydrateIcons, markCurrentLesson, mountSim, placeCallouts, renderPanel,
  renderProgress, setActiveStep, type Area, type CalloutItem, type TabId,
} from "./ui";

declare global {
  interface Window {
    __learnReady?: boolean;
  }
}

function must<T extends Element>(sel: string): T {
  const e = document.querySelector<T>(sel);
  if (!e) throw new Error(`missing element ${sel}`);
  return e;
}

const canvas = must<HTMLCanvasElement>("#gl");
const leaders = must<SVGElement>("#leaders");
const calloutHost = must<HTMLElement>("#callouts");
const listHost = must<HTMLElement>("#lesson-list");
const progressHost = must<HTMLElement>("#progress");
const tabsHost = must<HTMLElement>("#tabs");
const panelBody = must<HTMLElement>("#panel-body");
const simHost = must<HTMLElement>("#sim");
const panBtn = must<HTMLButtonElement>("#btn-pan");

// ---------- background traces ----------

function drawTraces(): void {
  const svg = must<SVGElement>("#traces");
  let s = 11;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const W = innerWidth;
  const H = innerHeight;
  let out = "";
  for (let i = 0; i < 46; i++) {
    let x = Math.round((rnd() * W) / 20) * 20;
    let y = Math.round((rnd() * H) / 20) * 20;
    let d = `M${x} ${y}`;
    out += `<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="#d3dae0" stroke-width="1.5"/>`;
    for (let k = 0; k < 3; k++) {
      const len = 40 + rnd() * 160;
      const dir = Math.floor(rnd() * 4);
      if (dir === 0) x += len;
      else if (dir === 1) y += len;
      else if (dir === 2) {
        x += len * 0.7;
        y += len * 0.7;
      } else {
        x += len * 0.7;
        y -= len * 0.7;
      }
      d += ` L${x.toFixed(0)} ${y.toFixed(0)}`;
    }
    out += `<path d="${d}" fill="none" stroke="#d6dce2" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="4" fill="none" stroke="#d3dae0" stroke-width="1.5"/>`;
  }
  svg.innerHTML = out;
}

// ---------- renderer, scene, camera ----------

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
addLights(scene, 10);
const ground = shadowGround(-0.5);
scene.add(ground);
const GROUND_Y: Record<SceneId, number> = { plant: -0.5, intake: -0.9, penstock: -0.3, nozzle: -3.45, runner: -3.7, chart: -0.2 };

const camera = new THREE.OrthographicCamera();
const ELEV = Math.atan(0.85 / Math.SQRT2);
const AZ0 = Math.PI / 4;
const view = { az: AZ0, zoom: 1, target: new THREE.Vector3(), pan: false, pxPerUnit: 60 };
let dirty = true;

let plantScene: PlantScene | null = null;
let intakeScene: IntakeScene | null = null;
const getPlant = (): PlantScene => {
  if (!plantScene) {
    plantScene = createPlant();
    plantScene.group.visible = false;
    scene.add(plantScene.group);
  }
  return plantScene;
};
const getIntake = (): IntakeScene => {
  if (!intakeScene) {
    intakeScene = createIntake();
    intakeScene.group.visible = false;
    scene.add(intakeScene.group);
  }
  return intakeScene;
};
let penstockScene: PenstockScene | null = null;
let nozzleScene: NozzleScene | null = null;
const getPenstock = (): PenstockScene => {
  if (!penstockScene) {
    penstockScene = createPenstock();
    penstockScene.group.visible = false;
    scene.add(penstockScene.group);
  }
  return penstockScene;
};
const getNozzle = (): NozzleScene => {
  if (!nozzleScene) {
    nozzleScene = createNozzle();
    nozzleScene.group.visible = false;
    scene.add(nozzleScene.group);
  }
  return nozzleScene;
};
let runnerScene: RunnerScene | null = null;
let chartScene: ChartScene | null = null;
const getRunner = (): RunnerScene => {
  if (!runnerScene) {
    runnerScene = createRunner();
    runnerScene.group.visible = false;
    scene.add(runnerScene.group);
  }
  return runnerScene;
};
const getChart = (): ChartScene => {
  if (!chartScene) {
    chartScene = createChart();
    chartScene.group.visible = false;
    scene.add(chartScene.group);
  }
  return chartScene;
};

let lesson: Lesson | null = null;
let active: LessonScene | null = null;
let callouts: CalloutItem[] = [];
let tab: TabId = "overview";

function sceneArea(): Area {
  const W = innerWidth;
  const H = innerHeight;
  const left = 290;
  const right = Math.max(left + 300, W - 440);
  return { left, right, top: 96, bottom: H - 30, bottomLeft: H - 220 };
}

function fit(): void {
  const W = innerWidth;
  const H = innerHeight;
  const area = sceneArea();
  const ext = active?.extent ?? { w: 12, h: 9 };
  // the callout rows take a band above and below the object
  const band = callouts.length ? 118 : 0;
  const top = area.top + band;
  const bottom = area.bottom - band;
  const scale = Math.min((area.right - area.left) / ext.w, (bottom - top) / ext.h) * 0.95 * view.zoom;
  view.pxPerUnit = scale;
  const viewH = H / scale;
  const a = W / H;
  camera.left = (-viewH * a) / 2;
  camera.right = (viewH * a) / 2;
  camera.top = viewH / 2;
  camera.bottom = -viewH / 2;
  camera.near = 0.1;
  camera.far = 100;
  const cx = (area.left + area.right) / 2;
  const cy = (top + bottom) / 2;
  camera.setViewOffset(W, H, -(cx - W / 2), -(cy - H / 2), W, H);
  camera.updateProjectionMatrix();
}

function placeCamera(): void {
  const dir = new THREE.Vector3(Math.sin(view.az) * Math.cos(ELEV), Math.sin(ELEV), Math.cos(view.az) * Math.cos(ELEV));
  camera.position.copy(view.target).addScaledVector(dir, 30);
  camera.lookAt(view.target);
  camera.updateMatrixWorld();
}

function updateCallouts(): void {
  if (!active) return;
  const screen: Record<string, [number, number]> = {};
  for (const [id, p] of Object.entries(active.anchors)) {
    const q = p.clone().project(camera);
    screen[id] = [((q.x + 1) / 2) * innerWidth, ((1 - q.y) / 2) * innerHeight];
  }
  placeCallouts(callouts, leaders, screen, sceneArea());
}

function refreshView(): void {
  placeCamera();
  fit();
  updateCallouts();
  dirty = true;
}

function resetView(): void {
  view.az = AZ0;
  view.zoom = 1;
  view.pan = false;
  panBtn.setAttribute("aria-pressed", "false");
  view.target.copy(active?.target ?? new THREE.Vector3());
  refreshView();
}

// ---------- lessons ----------

function selectLesson(n: number): void {
  const l = LESSONS[n - 1];
  if (!l) return;
  lesson = l;
  const plant = getPlant();
  const intake = getIntake();
  active = { plant: getPlant, intake: getIntake, penstock: getPenstock, nozzle: getNozzle, runner: getRunner, chart: getChart }[l.scene]();
  for (const s of [plant, intake, penstockScene, nozzleScene, runnerScene, chartScene]) {
    if (!s) continue;
    s.group.visible = s === active;
    s.highlight(null);
  }
  plant.stopDrop();
  penstockScene?.stopHammer();
  runnerScene?.stopSpin();
  plant.setDims(n === 2);
  penstockScene?.setLesson(n);
  runnerScene?.setLesson(n);
  ground.position.y = GROUND_Y[l.scene];

  history.replaceState(null, "", `?lesson=${n}`);
  renderProgress(progressHost, n);
  markCurrentLesson(listHost, n);
  tab = "overview";
  showPanel();
  callouts = createCallouts(calloutHost, l.callouts);
  mountSim(simHost, l, {
    runDrop: (onPart, onDone) => plant.runDrop(onPart, onDone),
    onStep: (id) => setActiveStep(panelBody, id),
    setBasin: (q, b) => intake.setBasin(q, b),
    setLoss: (hf, h0) => {
      getPenstock().setLoss(hf, h0);
      updateCallouts();
      dirty = true;
    },
    runHammer: (p, onDone) => getPenstock().runHammer(p, onDone),
    setOpening: (o) => {
      getNozzle().setOpening(o);
      dirty = true;
    },
    setDeflector: (on) => getNozzle().setDeflector(on),
    setSpin: (ratio) => {
      getRunner().setSpin(ratio);
      dirty = true;
    },
    setExit: (fraction) => {
      getRunner().setExit(fraction);
      dirty = true;
    },
    setJets: (jets) => {
      if (l.scene === "chart") getChart().setJets(jets);
      else getRunner().setJets(jets);
      updateCallouts();
      dirty = true;
    },
    setFlow: (flow) => {
      getRunner().setFlow(flow);
      dirty = true;
    },
    setPoint: (headM, nqe) => {
      getChart().setPoint(headM, nqe);
      dirty = true;
    },
    setRunner: (d1M) => {
      getChart().setRunner(d1M);
      updateCallouts();
      dirty = true;
    },
  });
  resetView();
}

function showPanel(): void {
  if (!lesson || !active) return;
  const sc = active;
  for (const b of tabsHost.querySelectorAll<HTMLElement>("[data-tab]")) b.classList.toggle("on", b.dataset.tab === tab);
  sc.highlight(null);
  renderPanel(panelBody, lesson, tab, (id) => sc.highlight(id));
}

for (const b of tabsHost.querySelectorAll<HTMLElement>("[data-tab]")) {
  b.addEventListener("click", () => {
    tab = b.dataset.tab as TabId;
    showPanel();
    dirty = true;
  });
}

// ---------- thumbnails ----------

function makeThumbs(): string[] {
  const TW = 184;
  const TH = 140;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(2);
  r.setSize(TW, TH);
  const out: string[] = [];
  for (const make of THUMB_MAKERS) {
    const s = new THREE.Scene();
    addLights(s);
    const o = make();
    s.add(o);
    const sph = new THREE.Box3().setFromObject(o).getBoundingSphere(new THREE.Sphere());
    const cam = new THREE.OrthographicCamera();
    const rad = sph.radius;
    const a = TW / TH;
    Object.assign(cam, { left: -rad * a, right: rad * a, top: rad, bottom: -rad, near: 0.1, far: 100 });
    cam.position.copy(sph.center).add(new THREE.Vector3(1, 0.85, 1).normalize().multiplyScalar(30));
    cam.lookAt(sph.center);
    cam.updateProjectionMatrix();
    o.traverse((m) => {
      const mat = (m as THREE.Mesh).material;
      if (mat instanceof LineMaterial) mat.resolution.set(TW, TH);
    });
    r.render(s, cam);
    out.push(r.domElement.toDataURL());
    disposeObject(o);
  }
  r.dispose();
  return out;
}

// ---------- camera controls ----------

let drag: { x: number; y: number } | null = null;
canvas.addEventListener("pointerdown", (e) => {
  drag = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
  canvas.style.cursor = "grabbing";
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  drag = { x: e.clientX, y: e.clientY };
  if (view.pan) {
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    view.target.addScaledVector(right, -dx / view.pxPerUnit).addScaledVector(up, dy / view.pxPerUnit);
  } else {
    view.az -= dx * 0.008;
  }
  refreshView();
});
const endDrag = () => {
  drag = null;
  canvas.style.cursor = "grab";
};
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    view.zoom = Math.min(3.5, Math.max(0.6, view.zoom * Math.exp(-e.deltaY * 0.0015)));
    refreshView();
  },
  { passive: false },
);

const zoomBy = (k: number) => {
  view.zoom = Math.min(3.5, Math.max(0.6, view.zoom * k));
  refreshView();
};
must<HTMLElement>("#btn-in").addEventListener("click", () => zoomBy(1.2));
must<HTMLElement>("#btn-out").addEventListener("click", () => zoomBy(1 / 1.2));
must<HTMLElement>("#btn-reset").addEventListener("click", resetView);
panBtn.addEventListener("click", () => {
  view.pan = !view.pan;
  panBtn.setAttribute("aria-pressed", String(view.pan));
});

window.addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  drawTraces();
  refreshView();
});

// ---------- loop ----------

let last = performance.now();
function tick(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const animating = active?.update(dt) ?? false;
  if (dirty || animating) {
    setLineResolution(innerWidth, innerHeight);
    renderer.render(scene, camera);
    dirty = false;
  }
  requestAnimationFrame(tick);
}

// ---------- boot ----------

async function boot(): Promise<void> {
  hydrateIcons(document);
  drawTraces();
  renderer.setSize(innerWidth, innerHeight);
  await Promise.allSettled([
    document.fonts.load('600 40px "Barlow Semi Condensed"'),
    document.fonts.load('700 40px "Barlow Semi Condensed"'),
    document.fonts.load('500 40px "JetBrains Mono"'),
  ]);
  buildLessonList(listHost, LESSON_TITLES, makeThumbs(), UNLOCKED, selectLesson);
  const asked = Number(new URLSearchParams(location.search).get("lesson"));
  selectLesson(Number.isInteger(asked) && asked >= 1 && asked <= UNLOCKED ? asked : 1);
  await document.fonts.ready;
  refreshView();
  setLineResolution(innerWidth, innerHeight);
  renderer.render(scene, camera);
  dirty = false;
  requestAnimationFrame(tick);
  window.__learnReady = true;
}

void boot();
