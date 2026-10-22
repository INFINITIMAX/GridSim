// L4: pierderea prin frecare (Darcy–Weisbach + Swamee–Jain).
// Valori de mână din docs/learn/pelton/lectia-04.md; controalele externe vin din ESHA (S2) ex. 2.5 și 2.2.
import { describe, expect, it } from "vitest";
import { NU, ROUGHNESS_MM, frictionLossM, pipeVelocityMs, reynolds, swameeJainF } from "../../learn/sim/friction";

const rel = (actual: number, expected: number) => Math.abs(actual - expected) / expected;

const H_GROSS = 60;

/** Lanțul complet al simulatorului L4: Q [L/s], D [mm], L [m], e [mm] -> mărimile afișate. */
function run(flowLps: number, dMm: number, lengthM: number, eMm: number) {
  const dM = dMm / 1000;
  const v = pipeVelocityMs(flowLps, dMm);
  const re = reynolds(v, dM);
  const f = swameeJainF(eMm, dM, re);
  const hf = frictionLossM(f, lengthM, dM, v);
  return { v, re, f, hf, net: H_GROSS - hf, pct: (hf / H_GROSS) * 100 };
}

describe("constante din documentul lecției (D5, S2 tabelul 2.1)", () => {
  it("ν = 1,31e-6 m²/s; rugozitate PE 0,003 mm, oțel sudat 0,6 mm", () => {
    expect(NU).toBe(1.31e-6);
    expect(ROUGHNESS_MM.pe).toBe(0.003);
    expect(ROUGHNESS_MM.steel).toBe(0.6);
  });
});

describe("valori implicite L4: PE, 40 L/s, 200 mm, 150 m", () => {
  const r = run(40, 200, 150, ROUGHNESS_MM.pe);

  it("V = 1,2732 m/s (prinde mm în loc de m în D)", () => {
    expect(rel(r.v, 1.2732)).toBeLessThan(0.001);
  });
  it("Re = 1,944e5", () => {
    expect(rel(r.re, 1.944e5)).toBeLessThan(0.002);
  });
  it("f = 0,01575 (Swamee–Jain; prinde ln în loc de log10 sau lipsa pătratului)", () => {
    expect(r.f).toBeCloseTo(0.01575, 4);
  });
  it("hf = 0,98 m (prinde lipsa lui 2 din 2g)", () => {
    expect(rel(r.hf, 0.98)).toBeLessThan(0.01);
  });
  it("H netă = 59,0 m și pierderea 1,63 %", () => {
    expect(r.net).toBeCloseTo(59.0, 1);
    expect(rel(r.pct, 1.63)).toBeLessThan(0.01);
  });
});

describe("alte cazuri din L4", () => {
  it("oțel sudat, restul implicit: f = 0,0270, hf = 1,68 m, 2,79 %", () => {
    const r = run(40, 200, 150, ROUGHNESS_MM.steel);
    expect(rel(r.f, 0.027)).toBeLessThan(0.01);
    expect(rel(r.hf, 1.68)).toBeLessThan(0.01);
    expect(rel(r.pct, 2.79)).toBeLessThan(0.01);
  });

  it("PE, D = 100 mm: V = 5,09 m/s, hf = 28,0 m, 46,6 % (avertisment peste 5 %)", () => {
    const r = run(40, 100, 150, ROUGHNESS_MM.pe);
    expect(rel(r.v, 5.09)).toBeLessThan(0.002);
    expect(rel(r.hf, 28.0)).toBeLessThan(0.02);
    expect(rel(r.pct, 46.6)).toBeLessThan(0.02);
    expect(r.pct).toBeGreaterThan(5);
  });
});

describe("controale externe (ESHA, S2)", () => {
  // Ex. 2.5: Colebrook–White, oțel sudat e = 0,6 mm, L = 500 m, V = 4 m/s. Swamee–Jain trebuie să cadă la <= 2 %.
  it.each([
    [0.5, 17.23],
    [0.8, 9.53],
    [1.2, 5.73],
    [1.5, 4.35],
  ])("ex. 2.5, D = %s m: hf ≈ %s m (±2 %%)", (dM, table) => {
    const v = 4;
    const f = swameeJainF(0.6, dM, reynolds(v, dM));
    expect(rel(frictionLossM(f, 500, dM, v), table)).toBeLessThanOrEqual(0.02);
  });

  // Ex. 2.2: Moody, D = 0,9 m, V = 1,886 m/s (eratăm enunțul: se folosește V din soluție, nu Q = 2,3 m³/s), L = 500 m.
  it("ex. 2.2: Re ≈ 1,3e6, f ≈ 0,019 și hf ≈ 1,91 m (±5 %, citire de pe diagramă)", () => {
    const d = 0.9;
    const v = 1.886;
    const re = reynolds(v, d);
    const f = swameeJainF(0.6, d, re);
    expect(rel(re, 1.3e6)).toBeLessThan(0.01);
    expect(rel(f, 0.019)).toBeLessThanOrEqual(0.05);
    expect(rel(frictionLossM(f, 500, d, v), 1.91)).toBeLessThanOrEqual(0.05);
  });
});

describe("proprietăți fizice", () => {
  it("o conductă mai îngustă pierde mult mai mult (D4: înjumătățirea diametrului înmulțește pierderea cu zeci)", () => {
    const wide = run(40, 200, 150, ROUGHNESS_MM.pe).hf;
    const narrow = run(40, 100, 150, ROUGHNESS_MM.pe).hf;
    expect(narrow / wide).toBeGreaterThan(25);
  });

  it("hf este liniar în L la f fix", () => {
    expect(frictionLossM(0.02, 300, 0.2, 1.5)).toBeCloseTo(2 * frictionLossM(0.02, 150, 0.2, 1.5), 9);
  });
});
