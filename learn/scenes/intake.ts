// The intake in section, as a desk object (lesson 3): weir, side intake with rack, settling basin, flushing gate, canal start.
import * as THREE from "three";
import { at, box, C, cyl, part, setGlow, withThickMul, type LessonScene } from "../toon";

export interface IntakeScene extends LessonScene {
  /** Tunes the sand animation: a bigger flow or a narrower basin carries the grains faster. */
  setBasin(flowLps: number, widthM: number): void;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// basin geometry, shared by the sand animation
const BX0 = -2.6;
const BX1 = 1.75;
const FLOOR = 0.04;
const DEPTH = 0.26;
const BZ = -2.2;
const N = 64;

export function createIntake(): IntakeScene {
  return withThickMul(1.4, build);
}

function build(): IntakeScene {
  const group = new THREE.Group();
  const parts: Record<string, THREE.Object3D[]> = {};
  const reg = (id: string, o: THREE.Object3D): void => {
    (parts[id] ??= []).push(o);
    group.add(o);
  };
  const water = (w: number, h: number, d: number, x: number, y: number, z: number) =>
    at(box(w, h, d, C.water, { edges: false }), x, y, z);

  // --- terrain with the river groove ---
  group.add(at(box(0.85, 0.9, 5.2, C.terrain), -4.575, -0.45, -1.0));
  group.add(at(box(7.65, 0.9, 5.2, C.terrain), 1.175, -0.45, -1.0));
  group.add(at(box(1.5, 0.5, 5.2, C.terrain), -3.4, -0.65, -1.0));

  // --- river: pool above the weir, sheet over it, lower water below ---
  group.add(water(1.5, 0.54, 2.2, -3.4, -0.13, -2.5));
  reg("weir", at(box(1.5, 0.5, 0.4, C.concrete), -3.4, -0.15, -1.2));
  reg("weir", water(1.5, 0.04, 0.4, -3.4, 0.12, -1.2));
  reg("residual", water(1.5, 0.15, 2.6, -3.4, -0.325, 0.3));

  // --- side intake with trash rack ---
  for (const dz of [-0.65, 0.65]) reg("rack", at(box(0.75, 0.45, 0.3, C.concrete), -2.275, 0.225, BZ + dz));
  reg("rack", at(box(0.75, 0.06, 1.0, C.concrete), -2.275, 0.03, BZ));
  reg("rack", water(0.75, 0.2, 0.9, -2.275, 0.1, BZ));
  for (let k = 0; k < 9; k++) {
    reg("rack", at(box(0.03, 0.4, 0.03, C.steelD, { edges: false, hull: false }), -2.62, 0.2, BZ - 0.4 + k * 0.1));
  }
  reg("rack", at(box(0.05, 0.03, 0.9, C.steelD, { edges: false, hull: false }), -2.62, 0.42, BZ));

  // --- settling basin ---
  reg("basin", at(box(3.8, 0.04, 1.6, C.concrete), 0, 0.02, BZ));
  reg("basin", at(box(3.8, 0.5, 0.1, C.concrete), 0, 0.25, BZ - 0.8));
  reg("basin", at(box(3.8, 0.5, 0.1, C.concrete), 0, 0.25, BZ + 0.8));
  for (const dz of [-0.5, 0.5]) reg("basin", at(box(0.1, 0.5, 0.4, C.concrete), 1.9, 0.25, BZ + dz));
  reg("basin", at(box(1.1, 0.1, 0.45, C.sand, { edges: false, hull: false }), -0.9, 0.09, BZ + 0.4));
  reg("basin", at(part(new THREE.BoxGeometry(3.6, DEPTH, 1.4), C.water, { edges: false, hull: false, opacity: 0.8 }), 0, FLOOR + DEPTH / 2, BZ));
  // outlet sill
  reg("spillway", at(box(0.15, 0.2, 1.4, C.concrete), 1.8, 0.14, BZ));

  // --- canal start ---
  group.add(at(box(3.1, 0.04, 0.6, C.concrete), 3.45, 0.02, BZ));
  for (const dz of [-0.34, 0.34]) group.add(at(box(3.1, 0.25, 0.08, C.concrete), 3.45, 0.125, BZ + dz));
  group.add(water(3.0, 0.06, 0.5, 3.45, 0.07, BZ));

  // --- flushing gate and its channel back to the river ---
  reg("gate", at(box(0.5, 0.3, 0.06, C.red), -1.0, 0.2, BZ + 0.88));
  reg("gate", at(cyl(0.03, 0.3, C.shaft, 10), -1.0, 0.45, BZ + 0.88));
  const wheel = part(new THREE.TorusGeometry(0.15, 0.025, 10, 28).rotateX(Math.PI / 2), C.red, { edges: false, thick: 0.01 });
  wheel.position.set(-1.0, 0.62, BZ + 0.88);
  reg("gate", wheel);
  reg("gate", at(box(0.4, 0.06, 2.4, C.concrete), -1.0, 0.03, -0.1));
  reg("gate", water(0.25, 0.03, 2.2, -1.0, 0.075, -0.1));
  reg("gate", at(box(1.8, 0.06, 0.4, C.concrete), -1.75, 0.03, 1.0));
  reg("gate", water(1.6, 0.03, 0.25, -1.75, 0.075, 1.0));

  // --- sand grains ---
  const pos = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xa8814a, size: 4.5, sizeAttenuation: false }));
  points.frustumCulled = false;
  group.add(points);
  // A grain enters at height u (0 = floor, 1 = surface) and sinks at a constant speed, so it
  // reaches the floor after the fraction u of the basin, then rests before a new grain enters.
  interface Grain { u: number; z: number; t: number; wait: number }
  const grains: Grain[] = [];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) grains.push({ u: 0.1 + 0.9 * rnd(), z: BZ + (rnd() - 0.5) * 0.8, t: 0, wait: rnd() * 6 });
  let crossT = 6; // seconds a grain needs to cross the whole basin

  const update = (dt: number): boolean => {
    grains.forEach((g, i) => {
      if (g.wait > 0) {
        g.wait -= dt;
        if (g.wait <= 0) g.t = 0;
        else {
          pos.set([0, -500, 0], i * 3); // beyond the far plane: hidden
          return;
        }
      }
      g.t += dt;
      const f = g.t / crossT;
      const x = BX0 + Math.min(f, g.u) * (BX1 - BX0);
      const y = FLOOR + Math.max(0, g.u * DEPTH - DEPTH * f);
      if (f >= g.u + 0.5) g.wait = 1 + rnd() * 2;
      pos.set([x, y, g.z], i * 3);
    });
    geo.getAttribute("position").needsUpdate = true;
    return true;
  };

  const anchors: Record<string, THREE.Vector3> = {
    weir: v(-3.4, 0.3, -1.2),
    residual: v(-3.4, -0.2, 0.7),
    rack: v(-2.62, 0.5, BZ),
    basin: v(0.3, 0.35, BZ),
    gate: v(-1.0, 0.5, BZ + 0.88),
  };

  let lit: string | null = null;
  const highlight = (id: string | null) => {
    if (lit) for (const o of parts[lit] ?? []) setGlow(o, false);
    lit = id;
    if (lit) for (const o of parts[lit] ?? []) setGlow(o, true);
  };

  return {
    group,
    anchors,
    target: v(0, 0, -1.0),
    extent: { w: 12, h: 5.8 },
    highlight,
    update,
    setBasin: (flowLps, widthM) => {
      crossT = Math.min(15, Math.max(2, 6 * (widthM / 0.4) * (40 / flowLps)));
    },
  };
}
