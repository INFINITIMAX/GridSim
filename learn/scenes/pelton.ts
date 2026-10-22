// The Pelton unit (runner, nozzle, generator, cabinet), ported from docs/learn/pelton/frame/hydro-frame.html.
import * as THREE from "three";
import { at, box, C, cyl, decal, part, rbox, textTex, tube, xcyl, zcyl } from "../toon";

export const RUN = new THREE.Vector3(-1.2, 1.55, 0); // runner centre, shaft along x
export const R = 0.86; // pitch radius

export function makeRunner(): THREE.Group {
  const g = new THREE.Group();
  g.add(xcyl(0.56, 0.18, C.bucket, 40));
  g.add(xcyl(0.16, 0.36, C.shaft, 24));
  const N = 18;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2;
    const pos = new THREE.Vector3(0, Math.cos(a) * R, Math.sin(a) * R);
    const tan = new THREE.Vector3(0, -Math.sin(a), Math.cos(a));
    for (const sx of [-0.105, 0.105]) {
      const cup = part(
        new THREE.SphereGeometry(0.13, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.95, 0.8, 1.45),
        C.bucket,
        { angle: 50, thick: 0.01, lw: 1 },
      );
      cup.position.copy(pos).add(new THREE.Vector3(sx, 0, 0));
      cup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
      g.add(cup);
    }
    const arm = part(new THREE.BoxGeometry(0.06, 0.3, 0.08), C.bucket, { thick: 0.008, lw: 1 });
    arm.position.copy(pos.clone().multiplyScalar(0.8));
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
    g.add(arm);
  }
  return g;
}

export function makeNozzle(): THREE.Group {
  const g = new THREE.Group();
  g.add(at(zcyl(0.1, 0.24, 0.5, C.steelD, 28), 0, 0, 0));
  g.add(at(zcyl(0.24, 0.24, 0.35, C.steel, 28), 0, 0, -0.42));
  g.add(at(zcyl(0.32, 0.32, 0.05, C.steel, 28), 0, 0, -0.62));
  g.add(at(zcyl(0.035, 0.035, 0.12, C.shaft, 12), 0, 0, 0.3)); // spear tip
  return g;
}

export function makeGenerator(): THREE.Group {
  const g = new THREE.Group();
  g.add(xcyl(0.52, 1.1, C.gen, 40));
  for (let i = 0; i < 7; i++) g.add(at(xcyl(0.55, 0.05, C.gen, 40, { thick: 0.008, lw: 1 }), -0.42 + i * 0.14, 0, 0));
  g.add(at(xcyl(0.34, 0.12, 0x34558f, 40), -0.6, 0, 0));
  g.add(at(box(0.42, 0.24, 0.36, 0x34558f), 0.1, 0.62, 0));
  g.add(at(box(0.9, 0.5, 0.26, C.base), 0, -0.66, 0.34));
  g.add(at(box(0.9, 0.5, 0.26, C.base), 0, -0.66, -0.34));
  const plate = textTex(400, 160, (x, w, h) => {
    x.fillStyle = "#eef1f3";
    x.fillRect(0, 0, w, h);
    x.fillStyle = "#1c2531";
    x.font = '700 58px "Barlow Semi Condensed"';
    x.textBaseline = "middle";
    x.fillText("20 kVA", 20, 52);
    x.font = '500 30px "JetBrains Mono"';
    x.fillText("1500 rpm · 50 Hz", 20, 118);
  });
  g.add(at(decal(0.45, 0.18, plate, 0), 0.1, 0.0, 0.532));
  return g;
}

export function makeCabinet(): THREE.Group {
  const g = new THREE.Group();
  g.add(at(rbox(0.9, 1.6, 0.5, 0.04, C.white), 0, 0.8, 0));
  g.add(at(box(0.52, 0.28, 0.03, C.lcd, { lw: 1.1 }), 0, 1.25, 0.26));
  const lt = textTex(512, 256, (x) => {
    x.fillStyle = "#1f3a2a";
    x.font = '500 64px "JetBrains Mono"';
    x.textBaseline = "middle";
    x.fillText("50.0 Hz", 30, 80);
    x.font = '500 46px "JetBrains Mono"';
    x.fillText("DUMP 2.1kW", 30, 180);
  });
  g.add(at(decal(0.48, 0.25, lt, 0), 0, 1.25, 0.277));
  const lamps: [number, number][] = [[-0.2, 0x45d07a], [0, 0xe8b931], [0.2, 0xff5a3c]];
  for (const [x, c] of lamps) {
    const l = at(cyl(0.04, 0.03, c, 14, { thick: 0.006 }), x, 0.98, 0.26);
    l.rotation.x = Math.PI / 2;
    g.add(l);
  }
  g.add(at(box(0.6, 0.02, 0.02, 0x9aa3ad, { edges: false, hull: false }), 0, 0.7, 0.26));
  g.add(at(box(0.6, 0.02, 0.02, 0x9aa3ad, { edges: false, hull: false }), 0, 0.6, 0.26));
  return g;
}

/**
 * The whole unit: pit, plinth, housing, runner, shaft, generator, nozzle, jet, valve.
 * With `pipe` (default) the penstock climbs away up the slope; without it the unit ends at the valve.
 */
export function makeUnit(pipe = true): { g: THREE.Group; NZ: THREE.Vector3 } {
  const g = new THREE.Group();
  // concrete: pit block under the runner, plinth under bearings + generator
  g.add(at(box(1.5, 0.5, 2.8, C.concrete), RUN.x, 0.25, 0));
  g.add(at(box(3.1, 0.5, 1.6, C.concrete), 0.75, 0.25, 0));
  // tailrace channel out the front
  g.add(at(box(0.9, 0.24, 1.4, C.concrete), RUN.x, 0.12, 2.1));
  g.add(at(box(0.62, 0.05, 1.4, C.water, { edges: false }), RUN.x, 0.26, 2.1));
  // housing lower half, open top: the runner shows
  const hx = RUN.x;
  const hy = 0.5;
  const top = RUN.y - 0.25;
  const hh = top - hy;
  g.add(at(box(0.72, 0.06, 2.1, C.steel), hx, hy + 0.03, 0));
  g.add(at(box(0.06, hh, 2.1, C.steel), hx - 0.36, hy + hh / 2, 0));
  g.add(at(box(0.72, hh, 0.06, C.steel), hx, hy + hh / 2, -1.05));
  g.add(at(box(0.06, 0.05, 2.2, C.steelD), hx - 0.38, top, 0));
  g.add(at(box(0.8, 0.05, 0.06, C.steelD), hx, top, -1.08));
  // runner
  const runner = makeRunner();
  runner.position.copy(RUN);
  g.add(runner);
  // shaft, bearings, coupling
  g.add(at(xcyl(0.08, 2.0, C.shaft, 24), -0.2, RUN.y, 0));
  for (const bx of [-0.62, -0.05]) {
    g.add(at(box(0.3, 0.12, 0.7, C.base), bx, 0.56, 0));
    g.add(at(box(0.26, 0.85, 0.36, C.steelD), bx, 1.05, 0));
    g.add(at(xcyl(0.2, 0.28, C.steelD, 28), bx, RUN.y, 0));
  }
  g.add(at(xcyl(0.26, 0.12, C.shaft, 32), 0.32, RUN.y, 0));
  g.add(at(xcyl(0.26, 0.12, C.shaft, 32), 0.46, RUN.y, 0));
  const gen = makeGenerator();
  gen.position.set(1.25, RUN.y, 0);
  g.add(gen);
  // nozzle aims along +z at the top of the pitch circle
  const NZ = new THREE.Vector3(RUN.x, RUN.y + R, -1.42);
  const nz = makeNozzle();
  nz.position.copy(NZ);
  g.add(nz);
  // the jet
  const jet = part(new THREE.CylinderGeometry(0.055, 0.055, 1.12, 20).rotateX(Math.PI / 2), C.water, {
    edges: false,
    thick: 0.008,
    emissive: 0x1d5f80,
  });
  jet.position.set(RUN.x, NZ.y, -0.62);
  g.add(jet);
  // deflector above the jet
  const defl = box(0.34, 0.04, 0.26, C.steelD);
  defl.position.set(RUN.x, NZ.y + 0.17, -1.02);
  defl.rotation.x = -0.35;
  g.add(defl);
  // valve at the end of the penstock
  g.add(at(zcyl(0.3, 0.3, 0.36, C.steelD, 28), RUN.x, NZ.y, -1.88));
  g.add(at(box(0.5, 0.5, 0.3, C.red), RUN.x, NZ.y, -2.24));
  g.add(at(cyl(0.035, 0.42, C.shaft, 10), RUN.x, NZ.y + 0.45, -2.24));
  const wheel = part(new THREE.TorusGeometry(0.22, 0.03, 10, 32).rotateX(Math.PI / 2), C.red, { edges: false, thick: 0.01 });
  wheel.position.set(RUN.x, NZ.y + 0.66, -2.24);
  g.add(wheel);
  if (pipe) {
    g.add(tube([[RUN.x, NZ.y, -2.0], [RUN.x, NZ.y, -2.6], [RUN.x, NZ.y + 0.5, -3.3], [RUN.x, NZ.y + 1.4, -4.2]], C.pipe, 0.24));
    // concrete saddle under the pipe
    g.add(at(box(0.7, NZ.y - 0.2, 0.4, C.concrete), RUN.x, (NZ.y - 0.2) / 2, -2.75));
  }
  return { g, NZ };
}

function makeTubeThumb(): THREE.Group {
  return tube([[0, 0, 0], [0, 0.2, -0.8], [0, 0.9, -1.8]], C.pipe, 0.24);
}

function makeValveThumb(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(0.5, 0.5, 0.3, C.red));
  const w = part(new THREE.TorusGeometry(0.22, 0.03, 10, 32).rotateX(Math.PI / 2), C.red, { edges: false, thick: 0.01 });
  w.position.y = 0.55;
  g.add(w);
  return g;
}

function makeWeirThumb(): THREE.Group {
  const g = new THREE.Group();
  g.add(at(box(1.6, 0.5, 0.4, C.concrete), 0, 0.25, 0));
  g.add(at(box(1.2, 0.06, 0.6, C.water, { edges: false }), 0, 0.5, 0.5));
  return g;
}

/** Lesson thumbnails, in lesson order (as in the approved frame). */
export const THUMB_MAKERS: readonly (() => THREE.Object3D)[] = [
  () => makeUnit().g,
  makeTubeThumb,
  makeWeirThumb,
  makeTubeThumb,
  makeValveThumb,
  makeNozzle,
  makeRunner,
  makeRunner,
  makeRunner,
  makeGenerator,
  makeCabinet,
  () => makeUnit().g,
];
