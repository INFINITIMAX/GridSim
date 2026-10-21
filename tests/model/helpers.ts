// Ajutoare comune pentru testele din tests/model (nu conține teste).
import { expect } from "vitest";
import type { GridConfig } from "../../src/model/config";
import { step } from "../../src/model/grid";
import type { GridEvent, GridState, LoadInit, UnitState } from "../../src/model/grid";

/** Rulează `seconds` de timp simulat (pași de cfg.dt); evenimentele se aplică în primul pas. */
export function simulate(
  state: GridState,
  cfg: GridConfig,
  seconds: number,
  firstEvents: readonly GridEvent[] = [],
  onStep?: (s: GridState, stepIndex: number) => void,
): void {
  const n = Math.round(seconds / cfg.dt);
  for (let i = 0; i < n; i++) {
    step(state, cfg, i === 0 && firstEvents.length > 0 ? { events: firstEvents } : undefined);
    onStep?.(state, i);
  }
}

export function homes(mw: number): LoadInit[] {
  return [{ id: "load", kind: "homes", mw }];
}

/**
 * Verifică |actual - expected| <= |expected| · pct/100. La eșec, mesajul arată valoarea reală,
 * cea așteptată și toleranța (în loc de "expected false to be true").
 */
export function expectWithinPct(actual: number, expected: number, pct: number, label: string): void {
  const tolerance = Math.abs(expected) * (pct / 100);
  expect(
    Math.abs(actual - expected),
    `${label}: actual=${actual}, expected=${expected} +-${pct}% (toleranță ${tolerance})`,
  ).toBeLessThanOrEqual(tolerance);
}

export function getUnit(state: GridState, id: string): UnitState {
  const u = state.units.find((x) => x.id === id);
  if (!u) {
    throw new Error(`unitatea ${id} lipsește din stare`);
  }
  return u;
}
