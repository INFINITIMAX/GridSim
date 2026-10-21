import * as THREE from "three";
import { PALETTE as P } from "./palette";
import { flat, lineLive } from "./parts";

const LINE_RADIUS = 0.035;
const LINE_SAG_RATIO = 0.06;
const SEGMENTS = 12;

const GLOW_BASE = 0.25;
const GLOW_LEVEL = 0.55;
const GLOW_PULSE = 0.2;
const PULSE_RATE_IDLE = 1.2; // rad/s
const PULSE_RATE_LOADED = 3.0; // extra rad/s at full generation

let glowPhase = 0;

export interface Wire {
  readonly mesh: THREE.Mesh;
  /** Live wires carry the electric accent; dead ones are plain grey cable. */
  setLive(live: boolean): void;
}

/** Sagging wire between two world points. Starts dead. */
export function createWire(a: THREE.Vector3, b: THREE.Vector3): Wire {
  const sag = a.distanceTo(b) * LINE_SAG_RATIO;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const p = a.clone().lerp(b, t);
    p.y -= sag * 4 * t * (1 - t);
    points.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const dead = flat(P.dark);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, LINE_RADIUS, 5, false), dead);
  mesh.castShadow = true;
  let live = false;
  return {
    mesh,
    setLive(value: boolean): void {
      if (value === live) return;
      live = value;
      mesh.material = value ? lineLive : dead;
    },
  };
}

/**
 * Pulse of the live wires: brighter and faster as generation grows, so the motion shows energy
 * flowing. Without motion the glow stays at a steady level that still follows the generation.
 */
export function updateGlow(dt: number, generation: number, motion: boolean): void {
  const g = Math.min(1, Math.max(0, generation));
  let pulse = 0;
  if (motion) {
    glowPhase = (glowPhase + dt * (PULSE_RATE_IDLE + PULSE_RATE_LOADED * g)) % (2 * Math.PI);
    pulse = GLOW_PULSE * g * Math.sin(glowPhase);
  }
  lineLive.emissiveIntensity = GLOW_BASE + GLOW_LEVEL * g + pulse;
}

export function nearest(candidates: readonly THREE.Vector3[], p: THREE.Vector3): THREE.Vector3 {
  let best: THREE.Vector3 | undefined;
  for (const c of candidates) {
    if (!best || c.distanceTo(p) < best.distanceTo(p)) best = c;
  }
  if (!best) throw new Error("no candidate point");
  return best;
}
