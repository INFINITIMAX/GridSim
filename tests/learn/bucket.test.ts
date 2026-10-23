// L7: cupa Pelton. Valori de mână din docs/learn/pelton/lectia-07.md (g = 9,81, rho = 1000).
// Controlul extern e S7 ex. 1 (afirmația G9, doar în teste).
import { describe, expect, it } from "vitest";
import { DEFLECTION_DEG, K_IDEAL, bucketEfficiency, exitSpeedMs, jetPowerKW } from "../../learn/sim/bucket";
import { CV, NOZZLE_MM, jetFlowLps, jetSpeedMs } from "../../learn/sim/jet";
import { powerKW } from "../../learn/sim/power";

const rel = (actual: number, expected: number) => Math.abs(actual - expected) / expected;
const V1 = jetSpeedMs(59, CV); // 33,343 m/s

describe("constante", () => {
  it("deviație 165° și cupă ideală k = 1", () => {
    expect(DEFLECTION_DEG).toBe(165);
    expect(K_IDEAL).toBe(1);
  });
});

describe("bucketEfficiency (θ = 165°, k = 1)", () => {
  it.each([
    [0.25, 0.7372],
    [0.5, 0.983],
    [0.75, 0.7372],
  ])("r = %f -> ηh = %f", (r, eta) => {
    expect(bucketEfficiency(r, 165, 1)).toBeCloseTo(eta, 3);
  });

  it("r = 1 (cupa aleargă cât jetul) -> 0; r = 0 (cupa stă) -> 0 (G8)", () => {
    expect(bucketEfficiency(1, 165, 1)).toBeCloseTo(0, 10);
    expect(bucketEfficiency(0, 165, 1)).toBeCloseTo(0, 10);
  });

  it("r = 0,5: θ = 90° (placă plată) -> 0,5; θ = 180° -> 1 (prinde φ = θ în loc de 180 - θ și gradele folosite ca radiani)", () => {
    expect(bucketEfficiency(0.5, 90, 1)).toBeCloseTo(0.5, 6);
    expect(bucketEfficiency(0.5, 180, 1)).toBeCloseTo(1, 6);
  });

  it("maximul la θ = 165°: niciun r din grila 0..1 (pas 0,01) nu depășește valoarea de la 0,5 (G4)", () => {
    const peak = bucketEfficiency(0.5, 165, 1);
    for (let i = 0; i <= 100; i++) {
      expect(bucketEfficiency(i / 100, 165, 1)).toBeLessThanOrEqual(peak + 1e-12);
    }
  });

  it("k scade randamentul: cupa cu frecare dă mai puțin decât cea ideală", () => {
    expect(bucketEfficiency(0.5, 165, 0.86)).toBeLessThan(bucketEfficiency(0.5, 165, 1));
  });
});

describe("exitSpeedMs (v₁ = 33,343 m/s, θ = 165°, k = 1)", () => {
  it("r = 0,25 -> 17,09 m/s", () => {
    expect(exitSpeedMs(V1, 0.25, 165, 1)).toBeCloseTo(17.09, 1);
  });
  it("r = 0,5 -> 4,35 m/s", () => {
    expect(exitSpeedMs(V1, 0.5, 165, 1)).toBeCloseTo(4.35, 1);
  });
  it("r = 1 -> apa iese cu viteza cupei v₁ (w = 0, deci v₂ = u)", () => {
    expect(exitSpeedMs(V1, 1, 165, 1)).toBeCloseTo(V1, 6);
  });

  it("controlul energetic ηh = 1 - v₂²/v₁² (k = 1), în mai multe puncte", () => {
    for (const [r, theta] of [
      [0.1, 165],
      [0.25, 165],
      [0.5, 165],
      [0.8, 165],
      [0.3, 90],
      [0.6, 120],
    ] as const) {
      const v2 = exitSpeedMs(V1, r, theta, 1);
      expect(bucketEfficiency(r, theta, 1)).toBeCloseTo(1 - (v2 * v2) / (V1 * V1), 9);
    }
  });
});

describe("jetPowerKW", () => {
  it("41,9 L/s la 33,343 m/s -> 23,29 kW", () => {
    expect(rel(jetPowerKW(41.9, 33.343), 23.29)).toBeLessThan(0.005);
  });
  it("control: ½ρQv₁² = ρgQH·Cv² (aceeași putere, prin powerKW)", () => {
    const q = jetFlowLps(V1, NOZZLE_MM, 1);
    expect(rel(jetPowerKW(q, V1), powerKW(59, q, CV * CV))).toBeLessThan(1e-6);
  });
  it("crește cu v₁² (v x2 -> P x4)", () => {
    expect(jetPowerKW(41.9, 2 * V1)).toBeCloseTo(4 * jetPowerKW(41.9, V1), 6);
  });
});

describe("puterea pe cupe, la H = 59 m", () => {
  it("r = 0,5 -> 22,89 kW", () => {
    const p = bucketEfficiency(0.5, 165, 1) * jetPowerKW(41.9, 33.343);
    expect(rel(p, 22.89)).toBeLessThan(0.005);
  });
});

describe("control extern S7 ex. 1: H = 420 m, Cv = 0,97, u/√(2gH) = 0,46, θ = 165°, k = 0,86, N = 480 rpm", () => {
  const v1 = jetSpeedMs(420, 0.97);
  const u = 0.46 * Math.sqrt(2 * 9.81 * 420);

  it("v₁ = 88,05 m/s (≤ 1 %)", () => {
    expect(rel(v1, 88.05)).toBeLessThan(0.01);
  });
  it("u = 41,76 m/s (≤ 1 %)", () => {
    expect(rel(u, 41.76)).toBeLessThan(0.01);
  });
  it("ηh = 0,913 (≤ 1 %)", () => {
    expect(rel(bucketEfficiency(u / v1, 165, 0.86), 0.913)).toBeLessThan(0.01);
  });
  it("D = 60u/(πN) = 1,66 m (≤ 1 %)", () => {
    expect(rel((60 * u) / (Math.PI * 480), 1.66)).toBeLessThan(0.01);
  });
});
