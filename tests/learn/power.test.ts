// L2: P = Q * H * g * e. Valorile așteptate sunt calculate de mână (docs/learn/pelton/lectia-02.md), nu din cod.
import { describe, expect, it } from "vitest";
import { powerKW } from "../../learn/sim/power";

/** Diferența relativă față de valoarea de mână, în fracțiuni (0.005 = 0,5%). */
const rel = (actual: number, expected: number) => Math.abs(actual - expected) / expected;

describe("powerKW: valori de mână (±0,5%)", () => {
  it("60 m, 40 L/s, e 0,6 -> 14,13 kW", () => {
    expect(rel(powerKW(60, 40, 0.6), 14.13)).toBeLessThan(0.005);
  });
  it("10 m, 300 L/s, e 0,5 -> 14,72 kW (exemplul NRCan)", () => {
    expect(rel(powerKW(10, 300, 0.5), 14.72)).toBeLessThan(0.005);
  });
  it("100 m x 20 L/s = 10 m x 200 L/s = 19,62 kW la e = 1", () => {
    const a = powerKW(100, 20, 1);
    const b = powerKW(10, 200, 1);
    expect(rel(a, 19.62)).toBeLessThan(0.005);
    expect(rel(b, 19.62)).toBeLessThan(0.005);
    expect(a).toBeCloseTo(b, 9);
  });
});

describe("powerKW: proprietăți", () => {
  const base = powerKW(25, 80, 0.55);
  it("dublezi căderea -> se dublează puterea", () => {
    expect(powerKW(50, 80, 0.55)).toBeCloseTo(2 * base, 9);
  });
  it("dublezi debitul -> se dublează puterea", () => {
    expect(powerKW(25, 160, 0.55)).toBeCloseTo(2 * base, 9);
  });
  it("dublezi randamentul -> se dublează puterea", () => {
    expect(powerKW(25, 80, 1.1)).toBeCloseTo(2 * base, 9);
  });
  it("debit zero sau cădere zero -> putere zero", () => {
    expect(powerKW(25, 0, 0.55)).toBe(0);
    expect(powerKW(0, 80, 0.55)).toBe(0);
  });
});
