// Teste S5 pentru 2d/explain.ts (breakdown + SECTION_INFO). Funcții pure, fără DOM.
// Valorile așteptate vin din calcul de mână, nu din constantele din cod.
// Calcul de mână, cazul 2 (Kaplan medium x1, baraj 5, canal, scară de pești, grătar 50% înfundat, râu 3 m³/s):
//   gross = 5 + 4 = 9; canal = 0,4; rack = 0,5 · 0,06 · 9 = 0,27; net = 9 − 0,4 − 0,27 = 8,33
//   eco = 0,3; disponibil 2,7; 1 turbină ia 2 (designFlow), deversat 0,7; used = 3 − 0,3 − 0,7 = 2
//   ratedHead = 8,6 -> nq = 272,8; enq = 0,02157; ep = 0,8914; Q = Qd > Qp=1,5 -> factor 0,9952 -> eta ≈ 0,8871
//   P_turbină = 9,81 · 2 · 8,33 · 0,8871 ≈ 144,99 kW; P_rețea = · 0,9405 ≈ 136,36 kW
import { describe, expect, it } from "vitest";
import { MAX_TURBINES, operate } from "../../2d/hydro";
import type { PlantSetup } from "../../2d/hydro";
import { SECTION_INFO, breakdown } from "../../2d/explain";
import type { SectionId } from "../../2d/explain";

/** Baza: Kaplan medium x1, baraj 5, fără canal, cu stavile, fără scară de pești, fără curățitor. */
function setup(over: Partial<PlantSetup> = {}): PlantSetup {
  return {
    technology: "kaplan",
    size: "medium",
    count: 1,
    damHeight: 5,
    canal: false,
    gates: true,
    fishLadder: false,
    autoCleaner: false,
    ...over,
  };
}

/** Toleranță relativă 0,5%. */
function near(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * 0.005 + 1e-9);
}

function bd(s: PlantSetup, river: number, clog: number) {
  return breakdown(s, river, operate(s, river, clog));
}

describe("breakdown: cazul din brief", () => {
  const b = bd(setup(), 3, 0);

  it("apa: 3 / 0 / 1 / 2", () => {
    expect(b.water.river).toBe(3);
    expect(b.water.eco).toBe(0);
    expect(b.water.spilled).toBeCloseTo(1, 9);
    expect(b.water.used).toBeCloseTo(2, 9);
  });

  it("căderea: 5 / 0 / 0 / 5", () => {
    expect(b.head.gross).toBe(5);
    expect(b.head.canal).toBe(0);
    expect(b.head.rack).toBe(0);
    expect(b.head.net).toBe(5);
  });

  it("turbina: 1 în funcțiune, 2 m³/s fiecare, încărcare 1, randament ≈ 0,8438", () => {
    expect(b.turbine.running).toBe(1);
    expect(b.turbine.flowEach).toBeCloseTo(2, 9);
    expect(b.turbine.designFlow).toBe(2);
    expect(b.turbine.load).toBeCloseTo(1, 9);
    near(b.turbine.efficiency, 0.8438);
  });

  it("lanțul: generator 0,95, transformator 0,99", () => {
    expect(b.chain.generator).toBeCloseTo(0.95, 12);
    expect(b.chain.transformerKeep).toBeCloseTo(0.99, 12);
  });

  it("puterea ≈ 77,85 kW și nu e oprită", () => {
    near(b.powerKW, 77.85);
    near(b.turbineKW, 82.78);
    expect(b.stopReason).toBeNull();
  });
});

describe("breakdown: canal, scară de pești, grătar 50% înfundat", () => {
  const b = bd(setup({ canal: true, fishLadder: true }), 3, 0.5);

  it("apa: 3 / 0,3 / 0,7 / 2", () => {
    expect(b.water.river).toBe(3);
    expect(b.water.eco).toBeCloseTo(0.3, 9);
    expect(b.water.spilled).toBeCloseTo(0.7, 9);
    expect(b.water.used).toBeCloseTo(2, 9);
  });

  it("căderea: 9 / 0,4 / 0,27 / 8,33", () => {
    expect(b.head.gross).toBeCloseTo(9, 9);
    expect(b.head.canal).toBeCloseTo(0.4, 9);
    expect(b.head.rack).toBeCloseTo(0.27, 9);
    expect(b.head.net).toBeCloseTo(8.33, 9);
  });

  it("turbina: o turbină plină, randament ≈ 0,887", () => {
    expect(b.turbine.running).toBe(1);
    expect(b.turbine.load).toBeCloseTo(1, 9);
    near(b.turbine.efficiency, 0.8871);
  });

  it("puterea ≈ 136,4 kW", () => {
    near(b.powerKW, 136.36);
  });

  it("debit negativ: river e 0, nu negativ", () => {
    const n = bd(setup(), -2, 0);
    expect(n.water.river).toBe(0);
  });
});

describe("breakdown: oprit", () => {
  it("flood fără stavile: stopReason flood, nimic nu trece prin turbine", () => {
    const b = bd(setup({ gates: false }), 9, 0);
    expect(b.stopReason).toBe("flood");
    expect(b.powerKW).toBe(0);
    expect(b.turbine.running).toBe(0);
    expect(b.water.used).toBe(0);
    expect(b.water.spilled).toBeCloseTo(9, 9);
  });

  it("Francis la baraj 5 (cădere sub 10 m): stopReason head", () => {
    expect(bd(setup({ technology: "francis" }), 3, 0).stopReason).toBe("head");
  });

  it("debit prea mic (0,1 m³/s, Kaplan medium, minim 0,4): stopReason low-flow", () => {
    expect(bd(setup(), 0.1, 0).stopReason).toBe("low-flow");
  });
});

describe("breakdown: consistență pe o grilă", () => {
  const TECHS: PlantSetup["technology"][] = ["kaplan", "francis", "crossflow"];
  const SIZES: PlantSetup["size"][] = ["small", "medium", "large"];
  const FLOWS = [-1, 0, 0.1, 0.35, 0.8, 1.5, 3, 5, 7, 7.5, 9, 12];
  const CLOGS = [0, 0.3, 1];

  const cases: { s: PlantSetup; flow: number; clog: number }[] = [];
  for (const technology of TECHS)
    for (const size of SIZES)
      for (let count = 1; count <= MAX_TURBINES; count++)
        for (const damHeight of [3, 5, 8] as const)
          for (const canal of [false, true])
            for (const gates of [false, true])
              for (const fishLadder of [false, true])
                for (const flow of FLOWS)
                  for (const clog of CLOGS) cases.push({ s: { technology, size, count, damHeight, canal, gates, fishLadder, autoCleaner: false }, flow, clog });

  it("used = river − eco − spilled, pe toată grila", () => {
    for (const { s, flow, clog } of cases) {
      const b = bd(s, flow, clog);
      expect(Math.abs(b.water.used - (b.water.river - b.water.eco - b.water.spilled)), JSON.stringify({ s, flow, clog })).toBeLessThanOrEqual(1e-9);
    }
  });

  it("net = gross − canal − rack, pe toată grila", () => {
    for (const { s, flow, clog } of cases) {
      const b = bd(s, flow, clog);
      expect(Math.abs(b.head.net - (b.head.gross - b.head.canal - b.head.rack)), JSON.stringify({ s, flow, clog })).toBeLessThanOrEqual(1e-9);
    }
  });

  it("9,81 · used · net · eta · generator · transformator = powerKW, pentru cazurile care rulează", () => {
    let checked = 0;
    for (const { s, flow, clog } of cases) {
      const b = bd(s, flow, clog);
      if (b.stopReason !== null) continue;
      checked++;
      const product = 9.81 * b.water.used * b.head.net * b.turbine.efficiency * b.chain.generator * b.chain.transformerKeep;
      expect(Math.abs(product - b.powerKW), JSON.stringify({ s, flow, clog })).toBeLessThanOrEqual(1e-9 * Math.max(1, b.powerKW));
    }
    // Garda: grila trebuie să conțină cazuri care chiar rulează, altfel testul ar trece gol.
    expect(checked).toBeGreaterThan(1000);
  });

  it("pentru cazurile oprite, powerKW e 0", () => {
    for (const { s, flow, clog } of cases) {
      const b = bd(s, flow, clog);
      if (b.stopReason !== null) expect(b.powerKW).toBe(0);
    }
  });
});

describe("SECTION_INFO", () => {
  const IDS: SectionId[] = ["dam", "canal", "turbines", "rack", "gates", "fish", "river", "water", "year", "curve"];
  const WITH_SIMPLIFIED: SectionId[] = ["fish", "gates", "rack", "canal", "year"];

  it("are exact cele 10 chei, fiecare cu text nevid", () => {
    expect(Object.keys(SECTION_INFO).sort()).toEqual([...IDS].sort());
    for (const id of IDS) expect(SECTION_INFO[id].trim().length, id).toBeGreaterThan(20);
  });

  it("fish, gates, rack, canal, year au un paragraf separat care începe cu „Simplified:”", () => {
    for (const id of WITH_SIMPLIFIED) {
      const paragraphs = SECTION_INFO[id].split("\n\n");
      expect(paragraphs.length, id).toBeGreaterThanOrEqual(2);
      expect(paragraphs.some((p) => p.startsWith("Simplified:")), id).toBe(true);
      // Primul paragraf explică, nu e „Simplified:”.
      expect(paragraphs[0]!.startsWith("Simplified:"), id).toBe(false);
    }
  });

  it("celelalte secțiuni nu pretind simplificări", () => {
    for (const id of IDS.filter((i) => !WITH_SIMPLIFIED.includes(i))) expect(SECTION_INFO[id], id).not.toContain("Simplified:");
  });

  it("gates: 7 m³/s, de două ori", () => {
    expect(SECTION_INFO.gates.split("7 m³/s").length - 1).toBe(2);
  });

  it("fish: 0.3 m³/s, 10% și legea apelor", () => {
    expect(SECTION_INFO.fish).toContain("0.3 m³/s");
    expect(SECTION_INFO.fish).toContain("10%");
    expect(SECTION_INFO.fish).toContain("107/1996");
  });

  it("rack: 6% (fără zecimale de float) și 3 minutes", () => {
    expect(SECTION_INFO.rack).toContain("6%");
    expect(SECTION_INFO.rack).not.toMatch(/6\.0+\d/);
    expect(SECTION_INFO.rack).toContain("3 minutes");
  });

  it("canal: 4 m de cădere în plus și 0.4 m pierdere", () => {
    expect(SECTION_INFO.canal).toContain("4 m of extra head");
    expect(SECTION_INFO.canal).toContain("0.4 m");
  });

  it("niciun text nu conține NaN, undefined sau [object", () => {
    for (const id of IDS) expect(SECTION_INFO[id], id).not.toMatch(/NaN|undefined|\[object/);
  });
});
