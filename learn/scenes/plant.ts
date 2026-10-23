// The micro-hydro plant as a small diorama on a sloping block of terrain (lessons 1 and 2).
import * as THREE from "three";
import {
  ACCENT, at, box, C, cyl, labelSprite, overlayLines, part, setGlow, tube, withThickMul,
  type LessonScene, type Pt,
} from "../toon";
import { chainKW } from "../sim/chain";
import { makeUnit, R, RUN } from "./pelton";
import { makeHouse } from "./unit";

export interface PlantScene extends LessonScene {
  /** Shows or hides the H and Q dimensions (lesson 2). */
  setDims(on: boolean): void;
  /** Lesson 12: the energy band along the water's path, from the four powers in kW; null hides it. */
  setChain(p: { gross: number; net: number; shaft: number; elec: number } | null): void;
  /** Sends a drop along the seven parts, lighting each when the water reaches it. */
  runDrop(onPart: (id: string) => void, onDone: () => void): void;
  /** Stops a running drop without calling its onDone (the lesson changed). */
  stopDrop(): void;
}

// terrain: block from z = ZB (high, back) to z = ZF (low, front), sloping down toward +z
const XH = 4.5;
const ZB = -4;
const ZF = 4.6;
const YB = 3.3;
const SLOPE = 0.38;
const BOT = -0.5;
const ALPHA = Math.atan(SLOPE);
const gy = (z: number) => YB - SLOPE * (z - ZB);

// the Pelton unit, scaled down inside the powerhouse
const S = 0.55;
const X0 = 2.62;
const Y0 = 0.12;
const Z0 = 3.0;
const UNIT_X = X0 + RUN.x * S; // x of runner, nozzle and penstock end
const NOZZLE_Y = Y0 + (RUN.y + R) * S;

// canal on the contour line, forebay at its end
const CZ = -2.6;
const CY = gy(CZ + 0.35);
const WL = CY + 0.2; // water level in the forebay

const DIM = 0xe0442e;

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

interface Waypoint {
  p: THREE.Vector3;
  id?: string;
  jump?: boolean;
}

export function createPlant(): PlantScene {
  return withThickMul(1.4, build);
}

function build(): PlantScene {
  const group = new THREE.Group();
  const parts: Record<string, THREE.Object3D[]> = {};
  const reg = (id: string, o: THREE.Object3D): THREE.Object3D => {
    (parts[id] ??= []).push(o);
    group.add(o);
    return o;
  };
  const tilt = <T extends THREE.Object3D>(o: T): T => {
    o.rotation.x = ALPHA;
    return o;
  };

  // --- terrain ---
  const shape = new THREE.Shape();
  shape.moveTo(ZB, BOT);
  shape.lineTo(ZF, BOT);
  shape.lineTo(ZF, gy(ZF));
  shape.lineTo(ZB, YB);
  shape.closePath();
  const eg = new THREE.ExtrudeGeometry(shape, { depth: 2 * XH, bevelEnabled: false });
  eg.rotateY(-Math.PI / 2);
  eg.translate(XH, 0, 0);
  group.add(part(eg, C.terrain));

  // --- stream, down the left side ---
  const slopeLen = (ZF - ZB) / Math.cos(ALPHA);
  group.add(tilt(at(box(0.9, 0.07, slopeLen, C.water, { edges: false }), -3.4, gy(0.3) + 0.03, 0.3)));

  // --- 1. weir and intake ---
  reg("weir", tilt(at(box(1.5, 0.4, 0.3, C.concrete), -3.4, gy(CZ) + 0.1, CZ)));
  reg("weir", at(box(0.7, 0.4, 0.7, C.concrete), -2.6, gy(CZ) + 0.15, CZ));

  // --- 2. canal ---
  reg("canal", at(box(3.8, 0.1, 0.7, C.concrete), -0.35, CY + 0.05, CZ));
  for (const dz of [-0.31, 0.31]) reg("canal", at(box(3.8, 0.3, 0.08, C.concrete), -0.35, CY + 0.15, CZ + dz));
  reg("canal", at(box(3.7, 0.06, 0.5, C.water, { edges: false }), -0.35, CY + 0.13, CZ));

  // --- 3. forebay with trash rack ---
  reg("forebay", at(box(1.3, 0.1, 1.2, C.concrete), 2.2, CY + 0.05, CZ));
  reg("forebay", at(box(1.3, 0.45, 0.1, C.concrete), 2.2, CY + 0.225, CZ - 0.55));
  reg("forebay", at(box(1.3, 0.45, 0.1, C.concrete), 2.2, CY + 0.225, CZ + 0.55));
  reg("forebay", at(box(0.1, 0.45, 1.2, C.concrete), 2.8, CY + 0.225, CZ));
  reg("forebay", at(box(1.1, 0.06, 1.0, C.water, { edges: false }), 2.2, CY + 0.17, CZ));
  for (let k = 0; k < 9; k++) {
    reg("forebay", at(box(0.025, 0.4, 0.025, C.steelD, { edges: false, hull: false }), 1.6, CY + 0.3, CZ - 0.5 + k * 0.125));
  }
  reg("forebay", at(box(0.04, 0.03, 1.05, C.steelD, { edges: false, hull: false }), 1.6, CY + 0.5, CZ));

  // --- 4. penstock down the slope ---
  const pen: Pt[] = [
    [UNIT_X, CY + 0.15, CZ + 0.5],
    [UNIT_X, gy(-1) + 0.28, -1],
    [UNIT_X, gy(0.2) + 0.28, 0.2],
    [UNIT_X, gy(1.4) + 0.3, 1.4],
    [UNIT_X, NOZZLE_Y, Z0 - 0.83],
  ];
  reg("penstock", tube(pen, C.pipe, 0.14));
  for (const [z, py] of [[0.2, gy(0.2) + 0.28], [1.4, gy(1.4) + 0.3]] as const) {
    const h = py - 0.14 - gy(z) + 0.02;
    reg("penstock", at(box(0.4, h, 0.3, C.concrete), UNIT_X, gy(z) + h / 2 - 0.02, z));
  }

  // --- 5. powerhouse: open-top walls around the unit ---
  const { g: unit } = withThickMul(4, () => makeUnit(false));
  unit.scale.setScalar(S);
  unit.position.set(X0, Y0, Z0);
  reg("powerhouse", unit);
  // walls around the unit's footprint: two sides and the back (with a gap for the penstock); the front stays open
  unit.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(unit);
  const wx0 = bb.min.x - 0.1, wx1 = bb.max.x + 0.1, wz0 = bb.min.z + 0.35, wz1 = bb.max.z - 0.5;
  const WH = 1.25, wy = Y0 + WH / 2 - 0.05;
  reg("powerhouse", at(box(0.08, WH, wz1 - wz0, C.white), wx0, wy, (wz0 + wz1) / 2));
  reg("powerhouse", at(box(0.08, WH, wz1 - wz0, C.white), wx1, wy, (wz0 + wz1) / 2));
  const gap0 = UNIT_X - 0.3, gap1 = UNIT_X + 0.3;
  reg("powerhouse", at(box(gap0 - wx0, WH, 0.08, C.white), (wx0 + gap0) / 2, wy, wz0));
  reg("powerhouse", at(box(wx1 - gap1, WH, 0.08, C.white), (gap1 + wx1) / 2, wy, wz0));

  // --- 6. tailrace back to the stream ---
  reg("tailrace", at(box(5.36, 0.14, 0.45, C.concrete), -0.32, gy(4.1) - 0.04, 4.1));
  reg("tailrace", at(box(5.2, 0.04, 0.3, C.water, { edges: false }), -0.32, gy(4.1) + 0.04, 4.1));

  // --- 7. power line: two poles ---
  const generatorTerminal: Pt = [X0 + 1.35 * S, Y0 + (RUN.y + 0.74) * S, Z0];
  const poleX = wx1 + 0.45;
  const poles: [number, number][] = [[poleX, 3.3], [poleX, 0.2]];
  for (const [px, pz] of poles) {
    reg("powerline", at(cyl(0.05, 1.5, C.steelD, 10), px, gy(pz) + 0.75, pz));
    reg("powerline", at(box(0.7, 0.05, 0.06, C.steelD), px, gy(pz) + 1.45, pz));
  }
  const arm1 = gy(3.3) + 1.49;
  const arm2 = gy(0.2) + 1.49;
  reg("powerline", tube([generatorTerminal, [poleX - 0.55, (generatorTerminal[1] + arm1) / 2, 3.3], [poleX - 0.3, arm1, 3.3]], 0x2b3038, 0.02, { thick: 0.006 }));
  for (const wx of [poleX - 0.3, poleX + 0.3]) {
    reg("powerline", tube([[wx, arm1, 3.3], [wx, (arm1 + arm2) / 2 - 0.12, 1.75], [wx, arm2, 0.2]], 0x2b3038, 0.02, { thick: 0.006 }));
  }

  // --- lesson 2: H and Q ---
  const dims = new THREE.Group();
  dims.visible = false;
  group.add(dims);
  const hx = 1.15;
  const hz = 0.9;
  dims.add(overlayLines([hx, WL, hz, hx, NOZZLE_Y, hz], DIM, 2.4));
  dims.add(overlayLines([hx - 0.18, WL, hz, hx + 0.18, WL, hz, hx - 0.18, NOZZLE_Y, hz, hx + 0.18, NOZZLE_Y, hz], DIM, 2.4));
  dims.add(overlayLines([2.85, WL, CZ, hx, WL, hz], DIM, 1.4, true));
  dims.add(overlayLines([UNIT_X, NOZZLE_Y, Z0 - 0.7, hx, NOZZLE_Y, hz], DIM, 1.4, true));
  const hLabel = labelSprite("H", "#e0442e", 0.7);
  hLabel.position.set(hx + 0.45, (WL + NOZZLE_Y) / 2, hz);
  dims.add(hLabel);

  const qa = v(UNIT_X, gy(-1) + 0.28, -1);
  const qb = v(UNIT_X, gy(0.2) + 0.28, 0.2);
  const qDir = qb.clone().sub(qa).normalize();
  const qPos = qa.clone().add(qb).multiplyScalar(0.5).add(v(0.5, 0.3, 0));
  const arrow = new THREE.Group();
  arrow.add(at(part(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 10), ACCENT, { edges: false, hull: false }), 0, 0, 0));
  arrow.add(at(part(new THREE.ConeGeometry(0.1, 0.24, 14), ACCENT, { edges: false, hull: false }), 0, 0.47, 0));
  arrow.quaternion.setFromUnitVectors(v(0, 1, 0), qDir);
  arrow.position.copy(qPos);
  dims.add(arrow);
  const qLabel = labelSprite("Q", "#e0442e", 0.7);
  qLabel.position.copy(qPos).add(v(0.45, 0.2, 0));
  dims.add(qLabel);

  // --- lesson 12: the energy band, from the intake to the village ---
  const chain = new THREE.Group();
  chain.visible = false;
  group.add(chain);
  const lift = (p: Pt): THREE.Vector3 => v(p[0], p[1] + 0.45, p[2]);
  const turbineTop = v(UNIT_X, NOZZLE_Y + 0.45, Z0);
  const generatorTop = v(X0 + 1.25 * S, NOZZLE_Y + 0.45, Z0);
  const villagePt = v(poleX - 0.3, gy(-0.9) + 1.2, -0.9);
  const stages: THREE.Vector3[][] = [
    [v(-3.4, gy(CZ) + 0.6, CZ), v(-0.35, CY + 0.55, CZ), v(UNIT_X, CY + 0.55, CZ)],
    [v(UNIT_X, CY + 0.55, CZ), ...pen.slice(1).map(lift)],
    [lift(pen[pen.length - 1] ?? generatorTerminal), turbineTop, generatorTop],
    [generatorTop, v(poleX - 0.3, arm1 + 0.15, 3.3), v(poleX - 0.3, arm2 + 0.15, 0.2), villagePt],
  ];
  // a thin grey strip leaves the band at each step: pipe, turbine, generator
  const strips: [THREE.Vector3, THREE.Vector3][] = [
    [stages[1]?.[0] ?? v(0, 0, 0), v(1, 0.5, 0)],
    [turbineTop, v(-1, 0.6, 0)],
    [generatorTop, v(-0.5, 0.6, -1)],
  ];
  const STRIP_LEN = 1;
  const bandMats = [0x2aa4e0, 0x2aa4e0, 0x3c63a8, 0xe8b931, 0x9aa3ad, 0x9aa3ad, 0x9aa3ad].map((c) => new THREE.MeshBasicMaterial({ color: c }));
  const bandBox = new THREE.BoxGeometry(1, 1, 1);
  const bandParts: { mesh: THREE.Mesh; idx: number; len: number }[] = [];
  const addBand = (idx: number, a: THREE.Vector3, b: THREE.Vector3) => {
    const mesh = new THREE.Mesh(bandBox, bandMats[idx]);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.lookAt(b);
    chain.add(mesh);
    bandParts.push({ mesh, idx, len: a.distanceTo(b) });
  };
  stages.forEach((pts, idx) => {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      if (a && b) addBand(idx, a, b);
    }
  });
  strips.forEach(([origin, dir], k) => {
    const d = dir.clone().normalize();
    addBand(4 + k, origin, origin.clone().addScaledVector(d, STRIP_LEN));
  });
  const BAND_MAX = 0.7; // width of the band at the full gross power
  const REF_GROSS_KW = chainKW(1, "maker").gross;
  const MIN_STRIP = 0.03;
  const widthNow = new Array<number>(7).fill(0);
  const widthTo = new Array<number>(7).fill(0);
  const applyBand = () => {
    for (const { mesh, idx, len } of bandParts) {
      const w = widthNow[idx] ?? 0;
      mesh.scale.set(w, 0.05, idx < 4 ? len + w * 0.5 : len);
    }
  };
  for (const z of [-0.9, -2]) {
    const house = tilt(at(makeHouse(), poleX - 0.3, gy(z) - 0.02, z));
    house.scale.setScalar(0.6);
    chain.add(house);
    (parts.village ??= []).push(house);
  }

  // --- anchors for callouts ---
  const anchors: Record<string, THREE.Vector3> = {
    stream: v(-3.4, gy(CZ) + 0.6, CZ),
    turbine: turbineTop.clone(),
    generator: generatorTop.clone(),
    village: v(poleX - 0.3, gy(-0.9) + 0.8, -0.9),
    weir: v(-3.4, gy(CZ) + 0.45, CZ),
    canal: v(-0.35, CY + 0.3, CZ),
    forebay: v(1.6, CY + 0.5, CZ),
    penstock: v(UNIT_X, gy(0.2) + 0.4, 0.2),
    powerhouse: v((wx0 + wx1) / 2, Y0 + WH, wz0 + 0.6),
    tailrace: v(-0.3, 0.3, 4.1),
    powerline: v(poleX, gy(3.3) + 1.5, 3.3),
    head: v(hx, (WL + NOZZLE_Y) / 2, hz),
    flow: qPos.clone(),
    losses: v(UNIT_X, gy(-1) + 0.35, -1),
    eff: v(X0 + 0.7 * S, Y0 + (RUN.y + 0.5) * S, Z0),
  };

  // --- highlight ---
  const aliases: Record<string, string[]> = {
    head: ["forebay", "powerhouse"],
    flow: ["penstock"],
    losses: ["penstock"],
    eff: ["powerhouse"],
    stream: ["weir", "canal"],
    turbine: ["powerhouse"],
    generator: ["powerhouse"],
  };
  let lit: string[] = [];
  const highlight = (id: string | null) => {
    for (const k of lit) for (const o of parts[k] ?? []) setGlow(o, false);
    lit = id === null ? [] : (aliases[id] ?? [id]);
    for (const k of lit) for (const o of parts[k] ?? []) setGlow(o, true);
  };

  // --- the drop ---
  const runnerPos = v(UNIT_X, Y0 + RUN.y * S, Z0);
  const arm1Pt = v(poleX - 0.3, arm1, 3.3);
  const path: Waypoint[] = [
    { p: v(-3.4, gy(-3.6) + 0.2, -3.6) },
    { p: v(-3.4, gy(CZ) + 0.4, CZ), id: "weir" },
    { p: v(-2.6, CY + 0.2, CZ) },
    { p: v(-0.35, CY + 0.2, CZ), id: "canal" },
    { p: v(2.0, WL + 0.08, CZ), id: "forebay" },
    ...pen.map((q, i): Waypoint => (i === 2 ? { p: v(...q), id: "penstock" } : { p: v(...q) })),
    { p: runnerPos, id: "powerhouse" },
    { p: v(UNIT_X, 0.3, 4.0), id: "tailrace" },
    { p: v(UNIT_X, 0.3, 4.1) },
    { p: v(...generatorTerminal), jump: true },
    { p: arm1Pt, id: "powerline" },
    { p: v(poleX - 0.3, arm2, 0.2) },
  ];
  const cum: number[] = [0];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    cum.push((cum[i - 1] ?? 0) + (a && b && !b.jump ? a.p.distanceTo(b.p) : 0));
  }
  const total = cum[cum.length - 1] ?? 0;
  const pointAt = (s: number): THREE.Vector3 => {
    let i = 1;
    while (i < path.length - 1 && (cum[i] ?? 0) < s) i++;
    const a = path[i - 1];
    const b = path[i];
    if (!a || !b) return v(0, 0, 0);
    const len = (cum[i] ?? 0) - (cum[i - 1] ?? 0);
    const t = len > 0 ? Math.min(1, Math.max(0, (s - (cum[i - 1] ?? 0)) / len)) : 1;
    return a.p.clone().lerp(b.p, t);
  };

  const dropMat = new THREE.MeshBasicMaterial({ color: 0x2aa4e0, depthTest: false });
  const drops: THREE.Mesh[] = [];
  for (let k = 0; k < 5; k++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.1 - k * 0.012, 14, 10), dropMat);
    m.renderOrder = 9;
    drops.push(m);
  }
  const dropGroup = new THREE.Group();
  dropGroup.visible = false;
  for (const m of drops) dropGroup.add(m);
  group.add(dropGroup);

  const SPEED = 3.2;
  const run = { on: false, s: 0, next: 0, hold: 0, onPart: (_id: string) => {}, onDone: () => {} };

  const update = (dt: number): boolean => {
    let moved = false;
    if (chain.visible) {
      const k = 1 - Math.exp(-12 * dt);
      for (let i = 0; i < widthTo.length; i++) {
        const to = widthTo[i] ?? 0;
        const now = widthNow[i] ?? 0;
        if (Math.abs(to - now) < 1e-4) widthNow[i] = to;
        else {
          widthNow[i] = now + (to - now) * k;
          moved = true;
        }
      }
      if (moved) applyBand();
    }
    if (!run.on) return moved;
    if (run.s < total) {
      run.s = Math.min(total, run.s + SPEED * dt);
      while (run.next < path.length && (cum[run.next] ?? 0) <= run.s) {
        const id = path[run.next]?.id;
        if (path[run.next]?.jump) dropMat.color.setHex(0xe8b931);
        if (id) {
          highlight(id);
          run.onPart(id);
        }
        run.next++;
      }
      drops.forEach((m, k) => m.position.copy(pointAt(Math.max(0, run.s - k * 0.28))));
    } else {
      run.hold += dt;
      if (run.hold > 0.9) {
        run.on = false;
        dropGroup.visible = false;
        highlight(null);
        run.onDone();
      }
    }
    return true;
  };

  return {
    group,
    anchors,
    target: v(0.1, 1.4, 0.3),
    extent: { w: 11.5, h: 8.8 },
    highlight,
    update,
    setDims: (on) => {
      dims.visible = on;
    },
    setChain: (p) => {
      if (!p) {
        chain.visible = false;
        return;
      }
      const scale = BAND_MAX / REF_GROSS_KW;
      const loss = (kW: number) => (kW > 1e-6 ? Math.max(MIN_STRIP, kW * scale) : 0);
      const to = [p.gross * scale, p.net * scale, p.shaft * scale, p.elec * scale, loss(p.gross - p.net), loss(p.net - p.shaft), loss(p.shaft - p.elec)];
      to.forEach((w, i) => (widthTo[i] = w));
      if (!chain.visible) {
        to.forEach((w, i) => (widthNow[i] = w));
        applyBand();
        chain.visible = true;
      }
    },
    stopDrop: () => {
      run.on = false;
      dropGroup.visible = false;
      highlight(null);
    },
    runDrop: (onPart, onDone) => {
      if (run.on) return;
      Object.assign(run, { on: true, s: 0, next: 0, hold: 0, onPart, onDone });
      dropMat.color.setHex(0x2aa4e0);
      dropGroup.visible = true;
      highlight(null);
    },
  };
}
