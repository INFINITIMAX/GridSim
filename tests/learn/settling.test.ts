// L3: viteza de depunere (Zanke), lungimea bazinului, regula B < L/8.
// Valori de mână din docs/learn/pelton/lectia-03.md; a doua sursă pentru vD: Ruby & Zanke (S10), implementată aici, independent.
import { describe, expect, it } from "vitest";
import { trapLengthM, widthTooLarge, zankeVdMmS } from "../../learn/sim/settling";

const rel = (actual: number, expected: number) => Math.abs(actual - expected) / expected;

/** Ruby & Zanke, apă 20 °C: ws = nu/d * (sqrt(10.36^2 + 1.049 * D*^3) - 10.36), D*^3 = Delta*g*d^3/nu^2. Întoarce mm/s. */
function rubyZankeMmS(dMm: number): number {
  const nu = 1e-6; // m²/s
  const delta = 1.65;
  const g = 9.81;
  const d = dMm / 1000; // m
  const dStar3 = (delta * g * d ** 3) / nu ** 2;
  const ws = (nu / d) * (Math.sqrt(10.36 ** 2 + 1.049 * dStar3) - 10.36);
  return ws * 1000;
}

describe("zankeVdMmS", () => {
  it("0,2 mm -> 27,9 mm/s (±0,5%)", () => {
    expect(rel(zankeVdMmS(0.2), 27.9)).toBeLessThan(0.005);
  });

  // Diferențe calculate de mână în raport (nu citite din rularea codului).
  it.each([0.1, 0.2, 0.3, 0.5])("%s mm: în ±10% de formula Ruby & Zanke", (d) => {
    expect(rel(zankeVdMmS(d), rubyZankeMmS(d))).toBeLessThan(0.1);
  });

  it("crește strict monoton cu diametrul", () => {
    const ds = [0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 1];
    const vs = ds.map(zankeVdMmS);
    for (let i = 1; i < vs.length; i++) expect(vs[i]!).toBeGreaterThan(vs[i - 1]!);
  });
});

describe("trapLengthM", () => {
  it("40 L/s, vD 27,9 mm/s, B 0,4 m -> 3,58 m (±0,5%)", () => {
    expect(rel(trapLengthM(40, 27.9, 0.4), 3.58)).toBeLessThan(0.005);
  });
  it("40 L/s, vD 27,9 mm/s, B 0,5 m -> 2,87 m (±0,5%)", () => {
    expect(rel(trapLengthM(40, 27.9, 0.5), 2.87)).toBeLessThan(0.005);
  });
  it("L este invers proporțional cu B: dublezi B -> L la jumătate", () => {
    expect(trapLengthM(40, 27.9, 0.8)).toBeCloseTo(trapLengthM(40, 27.9, 0.4) / 2, 9);
  });
  it("L crește cu Q și scade cu vD", () => {
    const base = trapLengthM(40, 27.9, 0.4);
    expect(trapLengthM(80, 27.9, 0.4)).toBeCloseTo(2 * base, 9);
    expect(trapLengthM(40, 55.8, 0.4)).toBeCloseTo(base / 2, 9);
  });
});

describe("widthTooLarge (B > L/8)", () => {
  it("B 0,5 m la L 2,87 m -> prea lat", () => {
    expect(widthTooLarge(0.5, 2.87)).toBe(true);
  });
  it("B 0,4 m la L 3,58 m -> în regulă", () => {
    expect(widthTooLarge(0.4, 3.58)).toBe(false);
  });
  it("exact B = L/8 nu depășește pragul (comparație strictă)", () => {
    expect(widthTooLarge(0.5, 4)).toBe(false);
    expect(widthTooLarge(0.5001, 4)).toBe(true);
  });
});
