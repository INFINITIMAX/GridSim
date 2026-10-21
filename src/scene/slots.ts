import type { ConsumerView, UnitView } from "../game";

export type SlotKind = "hydro" | "ccgt" | "ocgt" | "solar" | "wind" | "battery" | "factory" | "datacenter" | "ev";

export interface Slot {
  /** World position on the island (x, z); the building stands on the ground there. */
  readonly x: number;
  readonly z: number;
  readonly rotY: number;
}

/** Fixed places, in the order they are filled. A kind with no free slot is not drawn. */
export const SLOTS: Record<SlotKind, readonly Slot[]> = {
  hydro: [
    { x: 3.6, z: 5.0, rotY: 0 },
    { x: -1.6, z: -6.0, rotY: Math.PI },
  ],
  ccgt: [{ x: 3.2, z: -3.8, rotY: 0 }],
  ocgt: [
    { x: 5.9, z: -1.0, rotY: 0.2 },
    { x: 6.0, z: 1.0, rotY: 0.2 },
  ],
  solar: [
    { x: 1.0, z: -6.4, rotY: 0.3 },
    { x: 2.8, z: -6.4, rotY: 0.3 },
    { x: 6.2, z: 3.4, rotY: 0.5 },
  ],
  wind: [
    { x: 4.5, z: -6.0, rotY: 0.7 },
    { x: 6.7, z: -3.3, rotY: 0.7 },
    { x: -3.8, z: -6.6, rotY: 0.7 },
  ],
  battery: [
    { x: 0.7, z: 3.4, rotY: 0.2 },
    { x: -1.2, z: 3.1, rotY: 0.2 },
  ],
  factory: [{ x: -3.0, z: -1.9, rotY: 0.3 }],
  datacenter: [{ x: 2.8, z: 0.3, rotY: 0.3 }],
  ev: [{ x: -1.0, z: -0.5, rotY: 0.3 }],
};

/** City districts (groups of houses), in the order UFLS switches them off. */
export const DISTRICTS: readonly Slot[] = [
  { x: -5.4, z: 3.0, rotY: 0 },
  { x: -2.6, z: 4.9, rotY: 0 },
  { x: -6.1, z: -0.9, rotY: 0 },
  { x: 0.2, z: 5.6, rotY: 0 },
  { x: -5.0, z: -4.4, rotY: 0 },
  { x: -3.0, z: 1.0, rotY: 0 },
];

export const UNIT_SLOT_KINDS: readonly SlotKind[] = ["hydro", "ccgt", "ocgt", "solar", "wind", "battery"];
export const LOAD_SLOT_KINDS: readonly SlotKind[] = ["factory", "datacenter", "ev"];

/** Slot kind of a generating unit; null for kinds the island has no model for. */
export function unitSlotKind(kind: UnitView["kind"]): SlotKind | null {
  switch (kind) {
    case "hydro":
    case "ccgt":
    case "ocgt":
    case "solar":
    case "wind":
    case "battery":
      return kind;
    case "nuclear":
    case "coal":
      return null;
  }
}

/** Slot kind of a consumer; null for homes (the city districts are always there). */
export function loadSlotKind(kind: ConsumerView["kind"]): SlotKind | null {
  switch (kind) {
    case "factory":
    case "datacenter":
    case "ev":
      return kind;
    case "homes":
      return null;
  }
}

export interface Placement {
  readonly id: string;
  readonly slot: number;
}

/** Hands out the first free slot index to each id and takes it back when the id disappears. */
export class SlotAllocator {
  private readonly taken = new Map<string, number>();

  constructor(private readonly capacity: number) {}

  /** Aligns the allocation with the ids present now. Ids that do not fit stay unplaced and are retried. */
  sync(ids: readonly string[]): { added: Placement[]; removed: string[] } {
    const present = new Set(ids);
    const removed: string[] = [];
    for (const id of this.taken.keys()) {
      if (!present.has(id)) {
        this.taken.delete(id);
        removed.push(id);
      }
    }
    const used = new Set(this.taken.values());
    const added: Placement[] = [];
    for (const id of ids) {
      if (this.taken.has(id)) continue;
      let slot = 0;
      while (slot < this.capacity && used.has(slot)) slot += 1;
      if (slot >= this.capacity) break;
      this.taken.set(id, slot);
      used.add(slot);
      added.push({ id, slot });
    }
    return { added, removed };
  }
}
