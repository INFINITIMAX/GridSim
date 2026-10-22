// L5: viteza undei, timp critic, Joukowsky, Allievi, alegerea ramurii.
// Valori de mână din docs/learn/pelton/lectia-05.md; controale externe ESHA (S2) ex. 5.7, 5.8, 5.9.
import { describe, expect, it } from "vitest";
import { PIPES, allieviM, criticalTimeS, joukowskyM, surgeM, waveSpeedMs } from "../../learn/sim/hammer";

const rel = (actual: number, expected: number) => Math.abs(actual - expected) / expected;

// Fixe din L4: Q = 40 L/s, D = 200 mm, H0 = 60 m. V0 scris independent de friction.ts.
const V0 = 0.04 / (Math.PI * 0.2 ** 2 / 4);
const H0 = 60;
const L = 150;
const steel = () => waveSpeedMs(PIPES.steel.e, PIPES.steel.dOverT);
const pvc = () => waveSpeedMs(PIPES.pvc.e, PIPES.pvc.dOverT);

describe("waveSpeedMs (S2 ex. 5.7, ±1 %)", () => {
  it("oțel 400/4 mm -> 1024 m/s", () => {
    expect(rel(steel(), 1024)).toBeLessThanOrEqual(0.01);
  });
  it("PVC 400/14 mm -> 305 m/s (exact 303,4; S2 rotunjește)", () => {
    expect(rel(pvc(), 305)).toBeLessThanOrEqual(0.01);
  });
  it("PVC are unda mult mai lentă decât oțelul (E7, ~3 ori)", () => {
    expect(steel() / pvc()).toBeGreaterThan(3);
    expect(steel() / pvc()).toBeLessThan(4);
  });
});

describe("S2 ex. 5.9: D = 1,0 m, t = 5 mm oțel, L = 173 m, V0 = 3,82, H0 = 84,935, închidere 3 s", () => {
  const c = waveSpeedMs(2.1e11, 1.0 / 0.005);
  it("c = 836,7 m/s", () => {
    expect(rel(c, 836.7)).toBeLessThanOrEqual(0.01);
  });
  it("Tc = 0,41 s", () => {
    expect(rel(criticalTimeS(173, c), 0.41)).toBeLessThanOrEqual(0.01);
  });
  it("ΔH Allievi = 25,65 m (N = 0,070 intern)", () => {
    expect(rel(allieviM(84.935, 173, 3.82, 3), 25.65)).toBeLessThanOrEqual(0.01);
  });
});

describe("S2 ex. 5.8: Joukowsky cu V = 4 m/s", () => {
  it("1024 · 4 / g ≈ 417 m (±1 %)", () => {
    expect(rel(joukowskyM(1024, 4), 417)).toBeLessThanOrEqual(0.01);
  });
});

describe("valori implicite L5 (150 m, 40 L/s, 200 mm, H0 = 60 m)", () => {
  it("oțel: Tc = 0,293 s", () => {
    expect(criticalTimeS(L, steel())).toBeCloseTo(0.293, 3);
  });
  it("PVC: Tc = 0,989 s", () => {
    expect(criticalTimeS(L, pvc())).toBeCloseTo(0.989, 3);
  });
  it("oțel, t = 0,2 s: sudden, Joukowsky 133,0 m", () => {
    const r = surgeM(steel(), L, V0, H0, 0.2);
    expect(r.sudden).toBe(true);
    expect(rel(r.dH, 133.0)).toBeLessThan(0.005);
  });
  it("PVC: Joukowsky 39,4 m", () => {
    expect(rel(joukowskyM(pvc(), V0), 39.4)).toBeLessThan(0.005);
  });
  it.each([
    ["steel", steel, 5, 4.02],
    ["pvc", pvc, 5, 4.02],
    ["steel", steel, 2, 10.56],
    ["pvc", pvc, 2, 10.56],
    ["steel", steel, 0.5, 53.6],
  ])("%s, t = %s s: gradual, ΔH = %s m", (_name, cFn, t, expected) => {
    const r = surgeM(cFn(), L, V0, H0, t);
    expect(r.sudden).toBe(false);
    expect(rel(r.dH, expected)).toBeLessThan(0.005);
  });
  it("t = 5 s nu depășește 0,3·H0 (fără avertisment), t = 0,5 s da", () => {
    expect(surgeM(steel(), L, V0, H0, 5).dH).toBeLessThan(0.3 * H0);
    expect(surgeM(steel(), L, V0, H0, 0.5).dH).toBeGreaterThan(0.3 * H0);
  });
});

describe("granița t = Tc", () => {
  const c = 1000;
  const tc = criticalTimeS(L, c); // 0,3 s
  const jouk = joukowskyM(c, V0);

  it("exact t = Tc este încă „sudden” (comparație <=) și dă Joukowsky", () => {
    const r = surgeM(c, L, V0, H0, tc);
    expect(r.sudden).toBe(true);
    expect(r.dH).toBeCloseTo(jouk, 9);
  });
  it("puțin peste Tc este „gradual” și sare sub Joukowsky", () => {
    const r = surgeM(c, L, V0, H0, tc * (1 + 1e-6));
    expect(r.sudden).toBe(false);
    expect(r.dH).toBeLessThan(jouk * 0.95);
    expect(rel(r.dH, 108.9)).toBeLessThan(0.01); // Allievi de mână: N = 1,17
  });
  it("puțin sub Tc este „sudden”", () => {
    expect(surgeM(c, L, V0, H0, tc * (1 - 1e-6)).sudden).toBe(true);
  });
});

describe("plafonul Joukowsky", () => {
  const c = 1000;
  const jouk = joukowskyM(c, V0);

  it("controlul testului: Allievi brut depășește Joukowsky aici (H0 mic, t abia peste Tc)", () => {
    expect(allieviM(1, L, V0, 0.31)).toBeGreaterThan(jouk);
  });
  it("surgeM îl taie la valoarea Joukowsky, în ramura „gradual”", () => {
    const r = surgeM(c, L, V0, 1, 0.31);
    expect(r.sudden).toBe(false);
    expect(r.dH).toBeCloseTo(jouk, 9);
  });
  it("pe o grilă de timpi, ΔH nu depășește niciodată Joukowsky", () => {
    for (const h0 of [1, 10, 60, 200]) {
      for (const t of [0.05, 0.3, 0.31, 0.5, 1, 2, 5, 10, 20]) {
        expect(surgeM(c, L, V0, h0, t).dH, `H0=${h0}, t=${t}`).toBeLessThanOrEqual(jouk + 1e-9);
      }
    }
  });
  it("închiderea mai lentă dă vârf mai mic (E4)", () => {
    const a = surgeM(steel(), L, V0, H0, 1).dH;
    const b = surgeM(steel(), L, V0, H0, 10).dH;
    expect(b).toBeLessThan(a);
  });
});
