import * as THREE from "three";
import { PALETTE as P } from "../palette";
import { at, makeMast, placeMatrix, roundedBox, solid } from "../parts";
import { createWindowBatch } from "../windows";
import type { WindowSpec } from "../windows";
import type { SceneActor } from "./common";

function finish(g: THREE.Group, specs: readonly WindowSpec[], mastX: number, mastY: number, mastH: number): SceneActor {
  const windows = createWindowBatch(specs);
  g.add(windows.group);
  const mast = makeMast(mastH);
  mast.group.position.set(mastX, mastY, 0);
  g.add(mast.group);
  return { group: g, attach: mast.top.clone().add(mast.group.position), windows };
}

/** Factory: hall with roof lights, a chimney, a big door and a row of windows. */
export function makeFactory(): SceneActor {
  const g = new THREE.Group();
  const w = 2.2;
  const h = 1.0;
  const d = 1.5;
  g.add(at(roundedBox(w, h, d, P.wall), 0, h / 2, 0));
  g.add(at(solid(new THREE.BoxGeometry(w + 0.1, 0.08, d + 0.1), P.roofSlate), 0, h + 0.04, 0));
  for (const x of [-0.55, 0.35]) {
    g.add(at(solid(new THREE.BoxGeometry(0.6, 0.25, 1.1), P.roofClay), x, h + 0.2, 0));
  }
  g.add(at(solid(new THREE.CylinderGeometry(0.14, 0.2, 2.0, 8), P.wall), 0.75, h + 1.0, -0.4));
  g.add(at(solid(new THREE.CylinderGeometry(0.17, 0.17, 0.3, 8), P.roofClay), 0.75, h + 1.7, -0.4));
  g.add(at(solid(new THREE.BoxGeometry(0.7, 0.8, 0.06), P.dark), 0.6, 0.4, d / 2 + 0.03));
  const specs = [-0.85, -0.4, 0.05].map((x) => ({ matrix: placeMatrix(x, 0.62, d / 2, 0), w: 0.3, h: 0.22 }));
  return finish(g, specs, -0.9, h + 0.08, 0.5);
}

/** Data center: windowless-looking block with slim lit slits and rooftop cooling units. */
export function makeDataCenter(): SceneActor {
  const g = new THREE.Group();
  const w = 1.5;
  const h = 0.9;
  const d = 1.2;
  g.add(at(roundedBox(w, h, d, P.trim), 0, h / 2, 0));
  for (const x of [-0.45, 0, 0.45]) {
    g.add(at(solid(new THREE.BoxGeometry(0.35, 0.2, 0.35), P.steel), x, h + 0.1, -0.2));
  }
  g.add(at(solid(new THREE.BoxGeometry(0.4, 0.6, 0.06), P.dark), 0.45, 0.3, d / 2 + 0.03));
  const specs: WindowSpec[] = [];
  for (const y of [0.45, 0.7]) {
    specs.push({ matrix: placeMatrix(-0.3, y, d / 2, 0), w: 0.5, h: 0.1 });
  }
  return finish(g, specs, 0.6, h, 0.4);
}

/** EV chargers: three posts under a canopy. */
export function makeEvChargers(): SceneActor {
  const g = new THREE.Group();
  g.add(at(solid(new THREE.BoxGeometry(1.4, 0.06, 0.9), P.slab), 0, 0.03, 0));
  g.add(at(solid(new THREE.BoxGeometry(1.5, 0.05, 1.0), P.trim), 0, 1.1, 0));
  for (const x of [-0.7, 0.7]) {
    g.add(at(solid(new THREE.CylinderGeometry(0.04, 0.04, 1.05, 6), P.steel), x, 0.58, -0.4));
  }
  const specs: WindowSpec[] = [];
  for (const x of [-0.4, 0, 0.4]) {
    g.add(at(roundedBox(0.18, 0.7, 0.14, P.metal, 0.03), x, 0.41, 0));
    specs.push({ matrix: placeMatrix(x, 0.5, 0.07, 0), w: 0.1, h: 0.14 });
  }
  return finish(g, specs, 0.7, 0.06, 0.8);
}
