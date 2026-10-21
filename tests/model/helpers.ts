// Ajutoare comune pentru testele din tests/model (nu conține teste).
import { expect } from "vitest";
import { DEFAULT_CONFIG } from "../../src/model/config";
import type { GridConfig } from "../../src/model/config";
import { createGrid, step } from "../../src/model/grid";
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

/**
 * Ca `simulate`, dar frecvența e ținută fixă la `fHz`: se setează înainte de primul pas și după
 * fiecare pas. Folosit ca să se verifice rampele și limitele unei unități la o abatere cunoscută,
 * fără ca dinamica rețelei (swing) să schimbe cererea. Rețeaua din test trebuie să aibă o bară
 * sincronă mare, ca un singur pas să nu poată declanșa protecții.
 */
export function runPinned(
  state: GridState,
  cfg: GridConfig,
  seconds: number,
  fHz: number,
  firstEvents: readonly GridEvent[] = [],
  onStep?: (s: GridState, stepIndex: number) => void,
): void {
  state.f = fHz;
  simulate(state, cfg, seconds, firstEvents, (s, i) => {
    s.f = fHz;
    onStep?.(s, i);
  });
}

/**
 * Sistem tip CE: sarcină 150 000 MW, S = 200 000 MW, H_sys = 4 s (hidro H=3 + OCGT H=5, pMax egale),
 * FCR 3 000 MW (în total), + 3 000 MW solar (nesincron) care se pierde. Echilibru: 60 000 + 87 000 + 3 000.
 * Unitatea "lost" este solarul.
 */
export function ceSystem(afrrPerUnitMW: number, cfg: GridConfig = DEFAULT_CONFIG): GridState {
  return createGrid(
    cfg,
    [
      { id: "hydro", kind: "hydro", pMax: 100_000, setpoint: 60_000, fcrReserveMW: 1500, afrrReserveMW: afrrPerUnitMW },
      { id: "ocgt", kind: "ocgt", pMax: 100_000, setpoint: 87_000, fcrReserveMW: 1500, afrrReserveMW: afrrPerUnitMW },
      { id: "lost", kind: "solar", pMax: 3000, setpoint: 3000 },
    ],
    homes(150_000),
  );
}

/**
 * Insulă: sarcină 800 MW, 1 000 MW sincron (hidro 500 MW H=3 + OCGT 500 MW H=5 -> H = 4 s),
 * FCR total `fcrTotalMW`, plus `lossMW` solar (nesincron, unitatea "lost") care se pierde.
 * Echilibru: 300 + (500 - loss) + loss.
 */
export function island(fcrTotalMW: number, lossMW: number, cfg: GridConfig = DEFAULT_CONFIG): GridState {
  return createGrid(
    cfg,
    [
      { id: "hydro", kind: "hydro", pMax: 500, setpoint: 300, fcrReserveMW: fcrTotalMW / 2 },
      { id: "ocgt", kind: "ocgt", pMax: 500, setpoint: 500 - lossMW, fcrReserveMW: fcrTotalMW / 2 },
      { id: "lost", kind: "solar", pMax: lossMW, setpoint: lossMW },
    ],
    homes(800),
  );
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
