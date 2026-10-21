// Teste T1-T4, T6, T7 pentru src/model. Valorile așteptate vin din docs/calcule.md, secțiunea 3
// (calcule de mână), nu din rularea modelului. T5 (date reale) vine în P3.
import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../src/model/config";
import type { GridConfig } from "../../src/model/config";
import { createGrid, step } from "../../src/model/grid";
import type { GridEvent, GridState, LoadInit, UnitInit } from "../../src/model/grid";

const CFG: GridConfig = DEFAULT_CONFIG;
const F0 = 50;

/** Rulează `seconds` de timp simulat (pași de cfg.dt); evenimentele se aplică în primul pas. */
function simulate(
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

function homes(mw: number): LoadInit[] {
  return [{ id: "load", kind: "homes", mw }];
}

function withinPct(actual: number, expected: number, pct: number): boolean {
  return Math.abs(actual - expected) <= Math.abs(expected) * (pct / 100);
}

// ---------------------------------------------------------------- T1

/** ROCOF-ul din primul pas după pierderea a 1 000 MW (solar), pe un sistem sincron cu `sync`. */
function t1FirstRocof(sync: UnitInit, loadMw = 9000): number {
  const units: UnitInit[] = [sync, { id: "lost", kind: "solar", pMax: 1000, setpoint: 1000 }];
  const state = createGrid(CFG, units, homes(loadMw));
  step(state, CFG, { events: [{ type: "tripUnit", id: "lost" }] });
  return state.rocof;
}

describe("T1: ROCOF inițial (calcule.md, T1)", () => {
  // S = 10 000 MW, H = 5 s (OCGT), echilibru 9 000 MW; se pierd 1 000 MW (solar, nesincron).
  // df/dt = 50 · (-1000) / (2 · 5 · 10000) = -0,5 Hz/s.
  const ocgt10k: UnitInit = { id: "sync", kind: "ocgt", pMax: 10_000, setpoint: 8000 };

  it("T1: initial ROCOF after losing 1 GW of 10 GW (H = 5 s) is -0.5 Hz/s +-10%", () => {
    const state = createGrid(CFG, [ocgt10k, { id: "lost", kind: "solar", pMax: 1000, setpoint: 1000 }], homes(9000));
    step(state, CFG, { events: [{ type: "tripUnit", id: "lost" }] });
    expect(withinPct(state.rocof, -0.5, 10)).toBe(true);
    // după un pas de 0,05 s, frecvența a scăzut cu ~0,025 Hz
    expect(withinPct(F0 - state.f, 0.025, 10)).toBe(true);
  });

  it("T1: a balanced system has zero ROCOF (precondiția scenariului)", () => {
    const state = createGrid(CFG, [ocgt10k, { id: "lost", kind: "solar", pMax: 1000, setpoint: 1000 }], homes(9000));
    step(state, CFG);
    expect(Math.abs(state.rocof)).toBeLessThan(1e-9);
    expect(state.f).toBeCloseTo(F0, 9);
  });

  it("T1 (negativ): doubling the synchronous capacity halves the ROCOF", () => {
    // Setpoint 10 000 stays above the OCGT minimum load (45% of 20 000 = 9 000), so the system starts balanced.
    // df/dt = 50 · (-1000) / (2 · 5 · 20000) = -0,25 Hz/s.
    const rocof = t1FirstRocof({ id: "sync", kind: "ocgt", pMax: 20_000, setpoint: 10_000 }, 11_000);
    expect(withinPct(rocof, -0.25, 10)).toBe(true);
  });

  it("T1 (negativ): ROCOF scales inversely with H (hydro H = 3 s vs OCGT H = 5 s)", () => {
    // Nu avem tehnologie cu H dublu; hidro (H = 3) față de OCGT (H = 5) prinde același defect:
    // un model care ignoră H ar da -0,5 în ambele cazuri. Așteptat: -0,5 · 5/3 = -0,8333.
    const rocof = t1FirstRocof({ id: "sync", kind: "hydro", pMax: 10_000, setpoint: 8000 });
    expect(withinPct(rocof, -0.5 * (5 / 3), 10)).toBe(true);
  });
});

// ---------------------------------------------------------------- T2 / T4

/**
 * Sistem tip CE: sarcină 150 000 MW, S = 200 000 MW, H_sys = 4 s (hidro H=3 + OCGT H=5, pMax egale),
 * FCR 3 000 MW (în total), + 3 000 MW solar (nesincron) care se pierde. Echilibru: 60 000 + 87 000 + 3 000.
 */
function ceSystem(afrrPerUnitMW: number): GridState {
  return createGrid(
    CFG,
    [
      { id: "hydro", kind: "hydro", pMax: 100_000, setpoint: 60_000, fcrReserveMW: 1500, afrrReserveMW: afrrPerUnitMW },
      { id: "ocgt", kind: "ocgt", pMax: 100_000, setpoint: 87_000, fcrReserveMW: 1500, afrrReserveMW: afrrPerUnitMW },
      { id: "lost", kind: "solar", pMax: 3000, setpoint: 3000 },
    ],
    homes(150_000),
  );
}

const LOSS_3GW: readonly GridEvent[] = [{ type: "tripUnit", id: "lost" }];
// calcule.md, T2: 3 150 / 16 500
const QUASI_STATIONARY_DEV_HZ = 3150 / 16_500;

describe("T2: incidentul de referință CE, aFRR dezactivat (calcule.md, T2)", () => {
  it("T2: nadir >= 49.2 Hz and quasi-steady deviation 191 mHz +-10% after >= 60 s", () => {
    const state = ceSystem(0);
    let minF = Infinity;
    simulate(state, CFG, 120, LOSS_3GW, (s) => {
      minF = Math.min(minF, s.f);
    });
    expect(state.blackout).toBeNull();
    expect(minF).toBeGreaterThanOrEqual(49.2); // abatere instantanee <= 800 mHz (SO GL)
    expect(minF).toBeLessThan(F0 - 0.2); // incidentul chiar a coborât frecvența sub 49,8 Hz
    const dev = F0 - state.f;
    expect(withinPct(dev, QUASI_STATIONARY_DEV_HZ, 10)).toBe(true);
    expect(dev).toBeLessThan(0.2); // abaterea staționară maximă din SO GL
  }, 30_000);

  it("T2: initial ROCOF is 0.094 Hz/s +-10% (H_sys = 4 s, S = 200 000 MW)", () => {
    const state = ceSystem(0);
    step(state, CFG, { events: LOSS_3GW });
    expect(withinPct(state.rocof, -0.09375, 10)).toBe(true);
  });

  it("T2 (negativ): with aFRR = 0 the quasi-steady deviation is not zero", () => {
    const state = ceSystem(0);
    simulate(state, CFG, 120, LOSS_3GW);
    expect(F0 - state.f).toBeGreaterThan(0.15);
    expect(state.afrrDeployed).toBe(0);
  }, 30_000);
});

describe("T4: restabilirea prin aFRR (calcule.md, T4)", () => {
  it("T4: frequency returns to 50.00 +-0.01 Hz and stays there within 15 simulated minutes", () => {
    // aFRR alocat 2 x 2 000 = 4 000 MW (>= 3 000 MW, conform raportului coder-ului)
    const state = ceSystem(2000);
    let lastOutside = -1;
    let minF = Infinity;
    simulate(state, CFG, 1200, LOSS_3GW, (s, i) => {
      minF = Math.min(minF, s.f);
      if (Math.abs(s.f - F0) > 0.01) {
        lastOutside = i;
      }
    });
    expect(state.blackout).toBeNull();
    expect(minF).toBeGreaterThanOrEqual(49.2);
    // după ultimul pas în afara benzii, frecvența rămâne în bandă până la capătul simulării (20 min)
    const settleSeconds = (lastOutside + 1) * CFG.dt;
    expect(settleSeconds).toBeLessThanOrEqual(900);
    expect(Math.abs(state.f - F0)).toBeLessThanOrEqual(0.01);
    // frecvența chiar a fost deviată (altfel testul ar trece și fără incident)
    expect(lastOutside).toBeGreaterThan(0);
  }, 60_000);

  it("T4 (negativ): without aFRR the frequency is still outside the band after 15 minutes", () => {
    const state = ceSystem(0);
    simulate(state, CFG, 900, LOSS_3GW);
    expect(Math.abs(state.f - F0)).toBeGreaterThan(0.1);
  }, 60_000);
});

// ---------------------------------------------------------------- T3

/**
 * Insulă: sarcină 800 MW, 1 000 MW sincron (hidro 500 MW H=3 + OCGT 500 MW H=5 -> H = 4 s),
 * FCR total `fcrTotalMW`, plus `lossMW` solar (nesincron) care se pierde. Echilibru: 300 + (500 - loss) + loss.
 */
function island(fcrTotalMW: number, lossMW: number): GridState {
  return createGrid(
    CFG,
    [
      { id: "hydro", kind: "hydro", pMax: 500, setpoint: 300, fcrReserveMW: fcrTotalMW / 2 },
      { id: "ocgt", kind: "ocgt", pMax: 500, setpoint: 500 - lossMW, fcrReserveMW: fcrTotalMW / 2 },
      { id: "lost", kind: "solar", pMax: lossMW, setpoint: lossMW },
    ],
    homes(800),
  );
}

interface IslandRun {
  state: GridState;
  minF: number;
  /** Timpul și frecvența primei declanșări UFLS (treapta 1), sau null. */
  stage1: { t: number; f: number; fBefore: number } | null;
}

function runIsland(fcrTotalMW: number, lossMW: number, seconds: number): IslandRun {
  const state = island(fcrTotalMW, lossMW);
  const run: IslandRun = { state, minF: Infinity, stage1: null };
  let prevF = state.f;
  simulate(state, CFG, seconds, [{ type: "tripUnit", id: "lost" }], (s) => {
    run.minF = Math.min(run.minF, s.f);
    if (run.stage1 === null && s.uflsTripped[0] === true) {
      run.stage1 = { t: s.t, f: s.f, fBefore: prevF };
    }
    prevF = s.f;
  });
  return run;
}

describe("T3: UFLS într-o insulă (calcule.md, T3)", () => {
  it("T3: UFLS stage 1 trips at <= 49.0 Hz, nadir > 47.5 Hz, no blackout, f > 49.0 Hz after 60 s", () => {
    const run = runIsland(50, 250, 60);
    const { state } = run;
    expect(run.stage1).not.toBeNull();
    if (run.stage1 === null) {
      return;
    }
    expect(run.stage1.f).toBeLessThanOrEqual(49.0);
    expect(run.stage1.fBefore).toBeGreaterThan(49.0); // nu a declanșat prea devreme
    // ROCOF inițial 1,56 Hz/s: 50 -> 49,0 Hz în ~0,64 s
    expect(run.stage1.t).toBeGreaterThan(0.5);
    expect(run.stage1.t).toBeLessThan(0.8);
    expect(state.log.some((e) => e.type === "ufls")).toBe(true);
    expect(state.shedFraction).toBeGreaterThanOrEqual(0.05);
    expect(state.pShed).toBeGreaterThan(0);
    expect(run.minF).toBeGreaterThan(47.5);
    expect(state.blackout).toBeNull();
    expect(state.log.some((e) => e.type === "blackout")).toBe(false);
    expect(state.f).toBeGreaterThan(49.0);
  }, 30_000);

  it("T3 (negativ): a small loss (10 MW) with the same settings does not trigger UFLS", () => {
    const run = runIsland(50, 10, 60);
    expect(run.stage1).toBeNull();
    expect(run.state.uflsTripped.some((t) => t)).toBe(false);
    expect(run.state.shedFraction).toBe(0);
    expect(run.state.log.some((e) => e.type === "ufls")).toBe(false);
    expect(run.minF).toBeGreaterThan(49.0);
    expect(run.state.blackout).toBeNull();
  }, 30_000);

  it("T3 (negativ): without the loss event nothing happens (no UFLS, f stays at 50 Hz)", () => {
    const state = island(50, 250);
    simulate(state, CFG, 30);
    expect(state.uflsTripped.some((t) => t)).toBe(false);
    expect(state.f).toBeCloseTo(F0, 6);
  });

  it("T3: more FCR gives a higher nadir for the same loss", () => {
    // Brief-ul cerea "FCR 500 MW nu declanșează UFLS". Cu rampa FCR de 30 s (SO GL) nu e fizic
    // posibil: la 1,56 Hz/s frecvența ajunge la 49,0 Hz în 0,64 s, când FCR a livrat doar câțiva MW.
    // Testăm ce rămâne valid: mai mult FCR înseamnă nadir mai bun (prinde un model care ignoră FCR).
    const small = runIsland(50, 250, 30);
    const large = runIsland(500, 250, 30);
    expect(large.minF).toBeGreaterThan(small.minF);
  }, 30_000);
});

// ---------------------------------------------------------------- T6

const BATTERY_BUS_UNIT: UnitInit = { id: "bus", kind: "ocgt", pMax: 100_000, setpoint: 50_000 };

interface BatteryRun {
  state: GridState;
  /** MWh livrați la borne (Σ max(p,0)·dt). */
  energyOutMWh: number;
  /** MWh absorbiți la borne (Σ max(-p,0)·dt). */
  energyInMWh: number;
  minSoc: number;
  maxSoc: number;
  minP: number;
  maxP: number;
}

function runBattery(
  battery: { capacityMWh: number; soc: number; etaCharge: number; etaDischarge: number },
  setpointMW: number,
  seconds: number,
): BatteryRun {
  const state = createGrid(
    CFG,
    [BATTERY_BUS_UNIT, { id: "bat", kind: "battery", pMax: 50, setpoint: setpointMW, battery }],
    homes(50_000),
  );
  const run: BatteryRun = {
    state,
    energyOutMWh: 0,
    energyInMWh: 0,
    minSoc: battery.soc,
    maxSoc: battery.soc,
    minP: Infinity,
    maxP: -Infinity,
  };
  simulate(state, CFG, seconds, [], (s) => {
    const u = s.units.find((x) => x.id === "bat");
    if (!u || !u.battery) {
      throw new Error("bateria lipsește din stare");
    }
    run.energyOutMWh += (Math.max(u.p, 0) * CFG.dt) / 3600;
    run.energyInMWh += (Math.max(-u.p, 0) * CFG.dt) / 3600;
    run.minSoc = Math.min(run.minSoc, u.battery.soc);
    run.maxSoc = Math.max(run.maxSoc, u.battery.soc);
    run.minP = Math.min(run.minP, u.p);
    run.maxP = Math.max(run.maxP, u.p);
  });
  return run;
}

function batterySoc(state: GridState): number {
  const u = state.units.find((x) => x.id === "bat");
  if (!u || !u.battery) {
    throw new Error("bateria lipsește din stare");
  }
  return u.battery.soc;
}

describe("T6: baterie (calcule.md, T6)", () => {
  const HOUR = 3600;
  const CAP = { capacityMWh: 100, soc: 0.5, etaCharge: 0.92, etaDischarge: 0.9 };

  it("T6: discharging 20 MW for 1 h: energy out = dSOC * capacity * eta_discharge (+-0.1%)", () => {
    const run = runBattery(CAP, 20, HOUR);
    const dSoc = CAP.soc - batterySoc(run.state);
    expect(Math.abs(dSoc * CAP.capacityMWh * CAP.etaDischarge - run.energyOutMWh)).toBeLessThanOrEqual(
      run.energyOutMWh * 0.001,
    );
    // valori calculate de mână, independente de model: 20 MW · 1 h = 20 MWh la borne,
    // SOC = 0,5 - 20 / (100 · 0,9) = 0,27778
    expect(withinPct(run.energyOutMWh, 20, 0.1)).toBe(true);
    expect(batterySoc(run.state)).toBeCloseTo(0.5 - 20 / (100 * 0.9), 4);
    expect(run.minSoc).toBeGreaterThanOrEqual(0);
    expect(run.maxSoc).toBeLessThanOrEqual(1);
    expect(run.state.blackout).toBeNull();
  }, 60_000);

  it("T6: charging 20 MW for 1 h: dSOC = energy in * eta_charge / capacity (+-0.1%)", () => {
    const run = runBattery(CAP, -20, HOUR);
    const dSoc = batterySoc(run.state) - CAP.soc;
    expect(withinPct(run.energyInMWh, 20, 0.1)).toBe(true);
    expect(Math.abs(dSoc - (run.energyInMWh * CAP.etaCharge) / CAP.capacityMWh)).toBeLessThanOrEqual(dSoc * 0.001);
    // de mână: SOC = 0,5 + 20 · 0,92 / 100 = 0,684
    expect(batterySoc(run.state)).toBeCloseTo(0.5 + (20 * 0.92) / 100, 4);
    expect(run.maxSoc).toBeLessThanOrEqual(1);
    expect(run.minSoc).toBeGreaterThanOrEqual(0);
  }, 60_000);

  it("T6: at SOC 0 the discharge power is cut and only the stored energy is delivered", () => {
    // 10 MWh, SOC 0,1, eta 0,9: se pot livra cel mult 0,1 · 10 · 0,9 = 0,9 MWh, deși se cer 50 MW timp de 1 h.
    const small = { capacityMWh: 10, soc: 0.1, etaCharge: 0.92, etaDischarge: 0.9 };
    const run = runBattery(small, 50, HOUR);
    expect(run.minSoc).toBeGreaterThanOrEqual(0);
    expect(batterySoc(run.state)).toBeLessThan(1e-9);
    expect(withinPct(run.energyOutMWh, 0.9, 0.1)).toBe(true);
    // puterea a fost tăiată: la finalul orei bateria nu mai livrează, deși setpoint-ul e tot 50 MW
    const bat = run.state.units.find((x) => x.id === "bat");
    expect(bat?.setpoint).toBe(50);
    expect(Math.abs(bat?.p ?? NaN)).toBeLessThan(1e-6);
    expect(run.minP).toBeGreaterThanOrEqual(0); // nu a trecut în încărcare
    expect(run.maxP).toBeLessThanOrEqual(50);
  }, 60_000);

  it("T6: at SOC 1 the charge power is cut and SOC never exceeds 1", () => {
    // 10 MWh, SOC 0,9, eta_charge 0,92: absorbție maximă 1 / 0,92 = 1,087 MWh la borne.
    const small = { capacityMWh: 10, soc: 0.9, etaCharge: 0.92, etaDischarge: 0.9 };
    const run = runBattery(small, -50, HOUR);
    expect(run.maxSoc).toBeLessThanOrEqual(1);
    expect(batterySoc(run.state)).toBeGreaterThan(1 - 1e-9);
    expect(withinPct(run.energyInMWh, 1 / 0.92, 0.1)).toBe(true);
    const bat = run.state.units.find((x) => x.id === "bat");
    expect(Math.abs(bat?.p ?? NaN)).toBeLessThan(1e-6);
  }, 60_000);
});

// ---------------------------------------------------------------- T7

describe("T7: determinism (calcule.md, T7)", () => {
  function frequencySeries(build: () => GridState, seconds: number): { series: number[]; state: GridState } {
    const state = build();
    const series: number[] = [];
    simulate(state, CFG, seconds, [{ type: "tripUnit", id: "lost" }], (s) => {
      series.push(s.f);
    });
    return { series, state };
  }

  it("T7: the island scenario run twice gives identical frequency series", () => {
    const a = frequencySeries(() => island(50, 250), 60);
    const b = frequencySeries(() => island(50, 250), 60);
    expect(a.series.length).toBe(1200);
    expect(new Set(a.series).size).toBeGreaterThan(100); // seria chiar variază
    expect(a.series).toEqual(b.series);
    expect(a.state.log).toEqual(b.state.log);
  }, 30_000);

  it("T7: the CE scenario with aFRR (PI controller) run twice gives identical series", () => {
    const a = frequencySeries(() => ceSystem(2000), 120);
    const b = frequencySeries(() => ceSystem(2000), 120);
    expect(new Set(a.series).size).toBeGreaterThan(100);
    expect(a.series).toEqual(b.series);
    expect(a.state.afrrIntegralMW).toBe(b.state.afrrIntegralMW);
  }, 30_000);

  it("T7: different inputs give different series (so equality above is not trivial)", () => {
    const a = frequencySeries(() => island(50, 250), 10);
    const b = frequencySeries(() => island(500, 250), 10);
    expect(a.series).not.toEqual(b.series);
  });
});
