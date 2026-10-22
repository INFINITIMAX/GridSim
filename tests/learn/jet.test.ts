// L6: viteza jetului, debitul prin duză. Puterea merge prin powerKW din L2.
// Valori de mână din docs/learn/pelton/lectia-06.md; controlul extern e S7 ex. 2 (afirmația F6, doar în teste).
import { describe, expect, it } from "vitest";
import { CV, NOZZLE_MM, jetFlowLps, jetSpeedMs } from "../../learn/sim/jet";
import { powerKW } from "../../learn/sim/power";

const rel = (actual: number, expected: number) => Math.abs(actual - expected) / expected;

describe("constante fixe ale simulatorului", () => {
  it("Cv = 0,98 și duza de 40 mm", () => {
    expect(CV).toBe(0.98);
    expect(NOZZLE_MM).toBe(40);
  });
});

describe("jetSpeedMs", () => {
  it("60 m -> 33,62 m/s", () => {
    expect(jetSpeedMs(60, CV)).toBeCloseTo(33.62, 2);
  });
  it("59 m -> 33,34 m/s", () => {
    expect(jetSpeedMs(59, CV)).toBeCloseTo(33.34, 2);
  });
  it("crește cu √H: H x4 -> v x2", () => {
    expect(jetSpeedMs(240, CV)).toBeCloseTo(2 * jetSpeedMs(60, CV), 9);
  });
});

describe("jetFlowLps (H = 59 m, duza implicită)", () => {
  const v = jetSpeedMs(59, CV);

  it("100 % -> 41,9 L/s", () => {
    expect(jetFlowLps(v, NOZZLE_MM, 1)).toBeCloseTo(41.9, 1);
  });
  it("50 % -> 20,95 L/s, la aceeași viteză v = 33,34 m/s (F2: viteza nu depinde de deschidere)", () => {
    expect(v).toBeCloseTo(33.34, 2);
    expect(jetFlowLps(v, NOZZLE_MM, 0.5)).toBeCloseTo(20.95, 1);
  });
  it("diametrul intră la pătrat: duză dublă -> debit x4", () => {
    expect(jetFlowLps(v, 2 * NOZZLE_MM, 1)).toBeCloseTo(4 * jetFlowLps(v, NOZZLE_MM, 1), 9);
  });
});

describe("puterea prin powerKW (e = 0,6)", () => {
  it("H = 59 m, 100 % -> 14,55 kW", () => {
    const q = jetFlowLps(jetSpeedMs(59, CV), NOZZLE_MM, 1);
    expect(rel(powerKW(59, q, 0.6), 14.55)).toBeLessThan(0.005);
  });
});

describe("control extern S7 ex. 2: H netă 227,5 m, Cv = 0,975", () => {
  const v = jetSpeedMs(227.5, 0.975);
  it("v = 65,14 m/s (±0,5 %)", () => {
    expect(rel(v, 65.14)).toBeLessThan(0.005);
  });
  it("jet de d = 0,140 m la v dat -> 1,0 m³/s = 1000 L/s (±0,5 %)", () => {
    expect(rel(jetFlowLps(v, 140, 1), 1000)).toBeLessThan(0.005);
  });
});
