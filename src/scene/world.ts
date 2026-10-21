import * as THREE from "three";
import type { ConsumerView, Snapshot, UnitView } from "../game";
import { makeBattery } from "./buildings/battery";
import { makeDistrict } from "./buildings/city";
import type { SceneActor, UnitActor } from "./buildings/common";
import { makeDataCenter, makeEvChargers, makeFactory } from "./buildings/consumers";
import { makeGasPlant } from "./buildings/gas";
import { makeHydro } from "./buildings/hydro";
import { makeSolarField } from "./buildings/solar";
import { createSubstation } from "./buildings/substation";
import { makeWindTurbine } from "./buildings/wind";
import { GROUND_Y, disposeObject, worldPoint } from "./parts";
import { DISTRICTS, LOAD_SLOT_KINDS, SLOTS, SlotAllocator, UNIT_SLOT_KINDS, loadSlotKind, unitSlotKind } from "./slots";
import type { SlotKind } from "./slots";
import { createWire, nearest, updateGlow } from "./wires";
import type { Wire } from "./wires";

const OCGT_SCALE = 0.55;
const SHED_EPSILON_MW = 1e-6;

export interface World {
  update(snapshot: Snapshot, dt: number, motion: boolean): void;
  /** Number of lit windows in the whole scene right now. */
  litWindowCount(): number;
}

interface Placed<A extends SceneActor> {
  actor: A;
  wire: Wire;
}

interface Placer<V extends { id: string }, A extends SceneActor> {
  readonly placed: ReadonlyMap<string, Placed<A>>;
  sync(items: readonly V[]): void;
}

function createUnitActor(kind: UnitView["kind"]): UnitActor | null {
  switch (kind) {
    case "hydro":
      return makeHydro();
    case "ccgt":
      return makeGasPlant(1);
    case "ocgt":
      return makeGasPlant(OCGT_SCALE);
    case "solar":
      return makeSolarField();
    case "wind":
      return makeWindTurbine();
    case "battery":
      return makeBattery();
    case "nuclear":
    case "coal":
      return null;
  }
}

function createLoadActor(kind: ConsumerView["kind"]): SceneActor | null {
  switch (kind) {
    case "factory":
      return makeFactory();
    case "datacenter":
      return makeDataCenter();
    case "ev":
      return makeEvChargers();
    case "homes":
      return null;
  }
}

/**
 * Keeps one scene object (and one wire to `targets`) per item, in the first free slot of the item's
 * kind. Objects appear when the item appears and are removed when it disappears.
 */
function createPlacer<V extends { id: string }, A extends SceneActor>(
  scene: THREE.Scene,
  slotKinds: readonly SlotKind[],
  slotOf: (item: V) => SlotKind | null,
  create: (item: V) => A | null,
  targets: readonly THREE.Vector3[],
): Placer<V, A> {
  const allocators = new Map<SlotKind, SlotAllocator>(slotKinds.map((k) => [k, new SlotAllocator(SLOTS[k].length)]));
  const placed = new Map<string, Placed<A>>();

  function remove(id: string): void {
    const p = placed.get(id);
    if (!p) return;
    scene.remove(p.actor.group, p.wire.mesh);
    disposeObject(p.actor.group);
    disposeObject(p.wire.mesh);
    placed.delete(id);
  }

  return {
    placed,
    sync(items: readonly V[]): void {
      const byId = new Map(items.map((v) => [v.id, v]));
      for (const [kind, allocator] of allocators) {
        const ids = items.filter((v) => slotOf(v) === kind).map((v) => v.id);
        const { added, removed } = allocator.sync(ids);
        for (const id of removed) remove(id);
        for (const { id, slot } of added) {
          const item = byId.get(id);
          const at = SLOTS[kind][slot];
          const actor = item ? create(item) : null;
          if (!actor || !at) continue;
          actor.group.position.set(at.x, GROUND_Y, at.z);
          actor.group.rotation.y = at.rotY;
          scene.add(actor.group);
          const from = worldPoint(actor.group, actor.attach);
          const wire = createWire(from, nearest(targets, from));
          scene.add(wire.mesh);
          placed.set(id, { actor, wire });
        }
      }
    },
  };
}

/** The island's buildings, wires and their reaction to the game snapshot. */
export function createWorld(scene: THREE.Scene): World {
  const substation = createSubstation(scene);

  // Transformer -> pylon: each bushing takes the nearest upper insulator not yet used.
  const fixedWires: Wire[] = [];
  let upper = [...substation.upperTips];
  for (const bushing of substation.bushingTops) {
    const tip = nearest(upper, bushing);
    upper = upper.filter((t) => t !== tip);
    const wire = createWire(bushing, tip);
    scene.add(wire.mesh);
    fixedWires.push(wire);
  }

  const districts = DISTRICTS.map((slot, index) => {
    const actor = makeDistrict(index);
    actor.group.position.set(slot.x, GROUND_Y, slot.z);
    actor.group.rotation.y = slot.rotY;
    scene.add(actor.group);
    const from = worldPoint(actor.group, actor.attach);
    const wire = createWire(from, nearest(substation.lowerTips, from));
    scene.add(wire.mesh);
    return { actor, wire };
  });

  const unitPlacer = createPlacer<UnitView, UnitActor>(
    scene,
    UNIT_SLOT_KINDS,
    (u) => unitSlotKind(u.kind),
    (u) => createUnitActor(u.kind),
    substation.bushingTops,
  );
  const loadPlacer = createPlacer<ConsumerView, SceneActor>(
    scene,
    LOAD_SLOT_KINDS,
    (c) => loadSlotKind(c.kind),
    (c) => createLoadActor(c.kind),
    substation.lowerTips,
  );

  function lit(actor: SceneActor): number {
    return actor.windows.lit ? actor.windows.count : 0;
  }

  return {
    update(snapshot: Snapshot, dt: number, motion: boolean): void {
      const blackout = snapshot.blackout !== null;
      for (const wire of fixedWires) wire.setLive(!blackout);

      unitPlacer.sync(snapshot.units);
      let onlineCapacity = 0;
      for (const u of snapshot.units) {
        if (u.online) onlineCapacity += u.pMax;
        const p = unitPlacer.placed.get(u.id);
        if (!p) continue;
        p.actor.update(u, dt, motion);
        p.wire.setLive(u.online && !blackout);
      }
      updateGlow(dt, onlineCapacity > 0 ? snapshot.pGen / onlineCapacity : 0, motion);

      // UFLS: consumers switch off in a fixed order (districts first, then the other consumers),
      // each block going dark while the MW shed so far has not yet been covered.
      loadPlacer.sync(snapshot.consumers);
      let homesMW = 0;
      let totalMW = 0;
      for (const c of snapshot.consumers) {
        totalMW += c.mw;
        if (c.kind === "homes") homesMW += c.mw;
      }
      const shedMW = snapshot.shedFraction * totalMW;
      let covered = 0;
      const blockLit = (mw: number): boolean => {
        const dark = covered < shedMW - SHED_EPSILON_MW;
        covered += mw;
        return !blackout && mw > 0 && !dark;
      };
      for (const d of districts) {
        const on = blockLit(homesMW / districts.length);
        d.actor.windows.setLit(on);
        d.wire.setLive(on);
      }
      for (const c of snapshot.consumers) {
        if (c.kind === "homes") continue;
        const on = blockLit(c.mw);
        const p = loadPlacer.placed.get(c.id);
        if (!p) continue;
        p.actor.windows.setLit(on);
        p.wire.setLive(on);
      }
    },

    litWindowCount(): number {
      let n = 0;
      for (const d of districts) n += lit(d.actor);
      for (const p of unitPlacer.placed.values()) n += lit(p.actor);
      for (const p of loadPlacer.placed.values()) n += lit(p.actor);
      return n;
    },
  };
}
