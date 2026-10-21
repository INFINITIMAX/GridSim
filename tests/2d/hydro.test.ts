// Teste S2 pentru fizica hidrocentralei (2d/hydro.ts). Valorile așteptate vin din calcule de mână
// (P = 9,81 · Q · H · η, H = 5 m), nu din rularea codului. Vezi docs/handoff/S2-tester-raport.md.
import { describe, expect, it } from "vitest";
import { MAX_TURBINES, RIVER_MAX, TURBINES, operate, powerCurve } from "../../2d/hydro";
import type { PlantSetup } from "../../2d/hydro";

type Id = PlantSetup["turbine"];
const IDS: Id[] = ["small", "medium", "large"];
const DESIGN: Record<Id, number> = { small: 1.0, medium: 2.0, large: 3.5 };
const FLOWS = [0, 0.1, 0.25, 0.3, 0.5, 0.8, 1, 1.5, 2, 3, 4.5, 6, 9, 12];

/** Toleranță relativă 0,5% (cu un prag absolut minuscul pentru valori 0). */
function near(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * 0.005 + 1e-9);
}

describe("operate: cazuri de mână (H = 5 m)", () => {
  // [turbină, număr, debit, running, per turbină, folosit, deversat, eta, kW]
  const cases: ReadonlyArray<[Id, number, number, number, number, number, number, number, number]> = [
    ["medium", 1, 3, 1, 2, 2, 1, 0.85, 83.39],
    // k=2 (1,5 m³/s, load 0,75) bate k=1 (2 m³/s, 83,39 kW): alege k care maximizează puterea
    ["medium", 2, 3, 2, 1.5, 3, 0, 0.83672, 123.12],
    // 2 turbine ar putea porni (0,4 > 0,3), dar o turbină plină face mai mult (31,08 kW vs 2·0,4 la eta 0,728)
    ["small", 4, 0.8, 1, 0.8, 0.8, 0, 0.792, 31.08],
    ["small", 1, 0.2, 0, 0, 0, 0.2, 0, 0],
    ["large", 4, 9, 3, 3, 9, 0, 0.87551, 386.49],
    // debit exact cât o turbină plină: a doua nu ajută (load 0,5 pe fiecare)
    ["medium", 2, 2, 1, 2, 2, 0, 0.85, 83.39],
  ];
  it.each(cases)("%s x%i la %f m3/s", (turbine, count, flow, running, per, used, spilled, eta, kw) => {
    const op = operate({ turbine, count }, flow);
    expect(op.running).toBe(running);
    near(op.flowPerTurbine, per);
    near(op.usedFlow, used);
    expect(op.spilledFlow).toBeCloseTo(spilled, 6);
    near(op.efficiency, eta);
    near(op.powerKW, kw);
  });
});

describe("operate: proprietăți", () => {
  it("conservarea apei: folosit + deversat = debit", () => {
    for (const turbine of IDS) {
      for (let count = 1; count <= MAX_TURBINES; count++) {
        for (const flow of FLOWS) {
          const op = operate({ turbine, count }, flow);
          expect(op.usedFlow + op.spilledFlow).toBeCloseTo(flow, 9);
          expect(op.spilledFlow).toBeGreaterThanOrEqual(-1e-9);
        }
      }
    }
  });

  it("puterea nu depășește maxPowerKW; la debit mare cu toate turbinele pline = maxPowerKW", () => {
    for (const turbine of IDS) {
      for (let count = 1; count <= MAX_TURBINES; count++) {
        for (const flow of FLOWS) {
          const op = operate({ turbine, count }, flow);
          expect(op.powerKW).toBeLessThanOrEqual(op.maxPowerKW + 1e-9);
        }
        // debit peste capacitatea instalată: toate la load 1
        const full = operate({ turbine, count }, count * DESIGN[turbine] + 5);
        expect(full.running).toBe(count);
        expect(full.load).toBeCloseTo(1, 9);
        expect(full.powerKW).toBeCloseTo(full.maxPowerKW, 6);
      }
    }
  });

  it("o turbină în plus nu scade niciodată puterea (același tip, același debit)", () => {
    for (const turbine of IDS) {
      for (const flow of FLOWS) {
        for (let count = 1; count < MAX_TURBINES; count++) {
          const fewer = operate({ turbine, count }, flow).powerKW;
          const more = operate({ turbine, count: count + 1 }, flow).powerKW;
          expect(more, `${turbine} ${count}->${count + 1} la ${flow}`).toBeGreaterThanOrEqual(fewer - 1e-9);
        }
      }
    }
  });

  it("pragul de pornire: la 0,29·designFlow o turbină nu pornește, la 0,31·designFlow pornește", () => {
    for (const t of TURBINES) {
      const off = operate({ turbine: t.id, count: 1 }, 0.29 * t.designFlow);
      expect(off.running).toBe(0);
      expect(off.powerKW).toBe(0);
      expect(off.spilledFlow).toBeCloseTo(0.29 * t.designFlow, 9);
      const on = operate({ turbine: t.id, count: 1 }, 0.31 * t.designFlow);
      expect(on.running).toBe(1);
      expect(on.powerKW).toBeGreaterThan(0);
    }
  });

  it("o fracțiune infimă sub minLoad·designFlow turbina tot pornește (toleranța de rotunjire)", () => {
    for (const t of TURBINES) {
      expect(operate({ turbine: t.id, count: 1 }, t.minLoad * t.designFlow * (1 - 1e-12)).running).toBe(1);
    }
  });

  it("energyPerDayMWh = powerKW · 24 / 1000", () => {
    for (const turbine of IDS) {
      for (const flow of FLOWS) {
        const op = operate({ turbine, count: 2 }, flow);
        expect(op.energyPerDayMWh).toBeCloseTo((op.powerKW * 24) / 1000, 9);
      }
    }
    // și o valoare de mână: 83,385 kW · 24 / 1000 = 2,00124 MWh
    near(operate({ turbine: "medium", count: 1 }, 3).energyPerDayMWh, 2.00124);
  });
});

describe("operate: intrări în afara limitelor", () => {
  it("count 0 se comportă ca 1", () => {
    expect(operate({ turbine: "medium", count: 0 }, 3)).toEqual(operate({ turbine: "medium", count: 1 }, 3));
  });

  it("count 9 se comportă ca 4", () => {
    expect(operate({ turbine: "large", count: 9 }, 9)).toEqual(operate({ turbine: "large", count: 4 }, 9));
  });

  it("debit -1 se comportă ca 0", () => {
    const neg = operate({ turbine: "small", count: 2 }, -1);
    expect(neg).toEqual(operate({ turbine: "small", count: 2 }, 0));
    expect(neg.spilledFlow).toBeGreaterThanOrEqual(0);
    expect(neg.powerKW).toBe(0);
  });
});

describe("powerCurve", () => {
  const setup: PlantSetup = { turbine: "large", count: 1 };

  it("are steps + 1 puncte, de la 0 la maxFlow, echidistante", () => {
    const c = powerCurve(setup, 10, 20);
    expect(c).toHaveLength(21);
    expect(c[0]!.flow).toBe(0);
    expect(c[20]!.flow).toBeCloseTo(10, 9);
    expect(c[7]!.flow).toBeCloseTo(3.5, 9);
  });

  it("implicit: 121 puncte până la RIVER_MAX", () => {
    const c = powerCurve(setup);
    expect(c).toHaveLength(121);
    expect(c[120]!.flow).toBeCloseTo(RIVER_MAX, 9);
  });

  it("e nedescrescătoare pentru o singură turbină", () => {
    for (const turbine of IDS) {
      const c = powerCurve({ turbine, count: 1 });
      for (let i = 1; i < c.length; i++) {
        expect(c[i]!.powerKW).toBeGreaterThanOrEqual(c[i - 1]!.powerKW - 1e-9);
      }
    }
  });

  it("large x1 la 12 m3/s: ultimul punct = maxPowerKW (9,81·3,5·5·0,88 = 151,08 kW)", () => {
    const c = powerCurve(setup, 12, 120);
    const last = c[c.length - 1]!;
    expect(last.flow).toBeCloseTo(12, 9);
    near(last.powerKW, 151.08);
    expect(last.powerKW).toBeCloseTo(operate(setup, 12).maxPowerKW, 6);
  });
});
