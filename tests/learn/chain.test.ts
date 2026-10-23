// L12: lanțul pârâu -> priză. Valorile vin din docs/learn/pelton/lectia-12.md (calculate de mână) și din sursele S8, S13, S1.
// `overall` e fracție (0,777 = 77,7 %).
import { describe, expect, it } from "vitest";
import { annualKWh, chainKW } from "../../learn/sim/chain";
import { powerKW } from "../../learn/sim/power";

const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

describe("tabelul din lectia-12.md (valorile sunt rotunjite la 0,01 kW în document)", () => {
  it.each([
    // [debit q, set, brut, net, ax, el, global, kWh/an la 40 %]
    [1.0, "maker", 24.66, 24.23, 21.06, 19.17, 0.777, 67167],
    [1.0, "small", 24.66, 24.23, 18.17, 14.53, 0.589, 50932],
    [0.5, "maker", 12.33, 12.27, 10.92, 9.93, 0.806, 34807],
    [0.5, "small", 12.33, 12.27, 9.2, 7.36, 0.597, 25794],
  ] as const)("q = %f, set %s", (q, set, gross, net, shaft, elec, overall, kwh) => {
    const c = chainKW(q, set);
    near(c.gross, gross, 0.01);
    near(c.net, net, 0.01);
    near(c.shaft, shaft, 0.01);
    near(c.elec, elec, 0.01);
    near(c.overall, overall, 0.001);
    near(annualKWh(c.elec, 0.4), kwh, 10);
  });

  it("la 50 % pierderea din conductă e mică (hf calculat la debitul curent, nu la cel plin)", () => {
    const half = chainKW(0.5, "maker");
    // hf = 0,304 m -> net/brut = (60 − 0,304)/60; cu hf-ul debitului plin (1,062 m) ar ieși 0,9823
    near(half.net / half.gross, (60 - 0.304) / 60, 0.0005);
  });
});

describe("annualKWh: 8760 h × factor", () => {
  it("10 kW la factor 0,5 -> 43 800 kWh", () => {
    expect(annualKWh(10, 0.5)).toBeCloseTo(43800, 6);
  });
  it("factor 1 -> P·8760", () => {
    expect(annualKWh(19.17, 1)).toBeCloseTo(19.17 * 8760, 6);
  });
});

describe("control extern 1: același exemplu, 10 m și 0,3 m³/s, din două surse", () => {
  it("NRCan (S8): e = 0,5 -> 14,7 kW, ≤ 0,5 %", () => {
    expect(Math.abs(powerKW(10, 300, 0.5) - 14.7) / 14.7).toBeLessThanOrEqual(0.005);
  });
  it("Holland (S13): e = 0,6 -> „approximately 18 kW”, ≤ 2 %", () => {
    expect(Math.abs(powerKW(10, 300, 0.6) - 18) / 18).toBeLessThanOrEqual(0.02);
  });
});

describe("control extern 2: S13, turbină 75 % × generator 80 % = 60 %", () => {
  it("globalul setului small e între 0,5 și 0,7 (intervalul NRCan)", () => {
    const o = chainKW(1, "small").overall;
    expect(o).toBeGreaterThan(0.5);
    expect(o).toBeLessThan(0.7);
  });
  it("și e puțin sub 0,75 × 0,80 = 0,60 din cauza frecării în conductă", () => {
    const o = chainKW(1, "small").overall;
    expect(o).toBeLessThan(0.6);
    expect(o).toBeGreaterThan(0.58);
  });
});

describe("control extern 3: S1 ec. 19, factorul de capacitate K = E / (8760·P)", () => {
  it.each([0.1, 0.4, 1])("E/(8760·P_el) redă factorul de încărcare %f", (lf) => {
    const { elec } = chainKW(1, "maker");
    expect(annualKWh(elec, lf) / (8760 * elec)).toBeCloseTo(lf, 9);
  });
});
