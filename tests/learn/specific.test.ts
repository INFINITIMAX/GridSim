// L9: viteza specifică, diametrul Pelton și alegerea tipului (ESHA §6.2.2–6.2.4).
// Valori de mână și controale externe din docs/learn/pelton/lectia-09.md (afirmația I7 doar în teste).
import { describe, expect, it } from "vitest";
import { fittingTurbines, peltonDiameterM, specificSpeed } from "../../learn/sim/specific";

const rel = (actual: number, expected: number) => Math.abs(actual - expected) / expected;

describe("tabelul din lectia-09.md (H m, Q L/s, rpm, jeturi)", () => {
  it.each([
    [59, 41.9, 750, 1, 0.0217, ["pelton"], 0.42],
    [59, 41.9, 1500, 1, 0.0434, [], null],
    [59, 41.9, 1500, 4, 0.0434, ["pelton"], 0.21],
    [59, 41.9, 1000, 1, 0.0289, [], null],
    [10, 5000, 500, 1, 0.5978, ["kaplan"], null],
  ] as const)("H=%f Q=%f rpm=%f j=%i -> n_QE %f, %j", (h, qLps, rpm, j, nqe, verdict, d1) => {
    const n = specificSpeed(rpm, qLps / 1000, h);
    expect(rel(n, nqe)).toBeLessThan(0.005);
    expect(fittingTurbines(n, h, j)).toEqual(verdict);
    if (d1 !== null) expect(peltonDiameterM(h, rpm)).toBeCloseTo(d1, 2);
  });
});

describe("specificSpeed: forma formulei", () => {
  it("rot/s, nu rpm: 750 rpm = 12,5 rot/s", () => {
    // 12,5·√0,0419 / (9,81·59)^0,75 = 0,02168
    expect(specificSpeed(750, 0.0419, 59)).toBeCloseTo(0.0217, 3);
  });
  it("crește cu √Q: Q x4 -> n_QE x2", () => {
    expect(specificSpeed(750, 4 * 0.0419, 59)).toBeCloseTo(2 * specificSpeed(750, 0.0419, 59), 9);
  });
  it("scade cu H^0,75: H x16 -> n_QE / 8", () => {
    expect(specificSpeed(750, 0.0419, 16 * 59)).toBeCloseTo(specificSpeed(750, 0.0419, 59) / 8, 9);
  });
  it("crește liniar cu turația: rpm x2 -> n_QE x2", () => {
    expect(specificSpeed(1500, 0.0419, 59)).toBeCloseTo(2 * specificSpeed(750, 0.0419, 59), 9);
  });
});

describe("peltonDiameterM: D1 = 0,68·√H / (rpm/60)", () => {
  it("H x4 -> D x2; rpm x2 -> D / 2", () => {
    expect(peltonDiameterM(236, 750)).toBeCloseTo(2 * peltonDiameterM(59, 750), 9);
    expect(peltonDiameterM(59, 1500)).toBeCloseTo(peltonDiameterM(59, 750) / 2, 9);
  });
});

describe("controale externe ESHA (S19 p. 176–177)", () => {
  it("100 m, 0,9 m³/s, 1500 rpm -> n_QE = 0,135 (≤ 1 %) și doar Francis", () => {
    const n = specificSpeed(1500, 0.9, 100);
    expect(rel(n, 0.135)).toBeLessThan(0.01);
    expect(fittingTurbines(n, 100, 1)).toEqual(["francis"]);
  });

  it("400 m, 0,42 m³/s, 1000 rpm -> n_QE = 0,0218 (≤ 1 %), Pelton cu un jet, D1 = 0,815 m (≤ 1 %)", () => {
    const n = specificSpeed(1000, 0.42, 400);
    expect(rel(n, 0.0218)).toBeLessThan(0.01);
    expect(fittingTurbines(n, 400, 1)).toEqual(["pelton"]);
    expect(rel(peltonDiameterM(400, 1000), 0.815)).toBeLessThan(0.01);
  });
});

describe("fittingTurbines: limite inclusive (valori scoase din benzile din tabel, nu din cod)", () => {
  // Pelton: 0,005·√j ≤ n_QE ≤ 0,025·√j, cădere 50–1300. Pentru j = 1 și 4, √j e exact (1 și 2).
  it("Pelton j = 1: marginile 0,005 și 0,025 intră, cele din afară nu", () => {
    expect(fittingTurbines(0.005, 100, 1)).toEqual(["pelton"]);
    expect(fittingTurbines(0.025, 100, 1)).toEqual(["pelton"]);
    expect(fittingTurbines(0.004999, 100, 1)).toEqual([]);
    expect(fittingTurbines(0.025001, 100, 1)).toEqual([]);
  });

  it("Pelton j = 4: banda e 0,01–0,05 (×√4 = ×2)", () => {
    expect(fittingTurbines(0.01, 100, 4)).toEqual(["pelton"]);
    expect(fittingTurbines(0.045, 100, 4)).toEqual(["pelton"]);
    expect(fittingTurbines(0.009, 100, 4)).toEqual([]);
    expect(fittingTurbines(0.0501, 400, 4)).toEqual([]);
  });

  it("banda Pelton se lărgește cu √j: 0,03 nu încape la j = 1, dar încape la j = 2 (0,00707–0,03536)", () => {
    expect(fittingTurbines(0.03, 100, 1)).toEqual([]);
    expect(fittingTurbines(0.03, 100, 2)).toEqual(["pelton"]);
  });

  it("Francis: n_QE 0,05 și 0,33 intră; sub și peste nu", () => {
    expect(fittingTurbines(0.05, 100, 1)).toEqual(["francis"]);
    expect(fittingTurbines(0.33, 100, 1)).toEqual(["francis"]);
    expect(fittingTurbines(0.0499, 100, 1)).toEqual([]);
    expect(fittingTurbines(0.34, 100, 1)).toEqual([]);
  });

  it("Kaplan: n_QE 0,19 (cu H = 30, ca să fie și Francis) și 1,55 intră; peste 1,55 nu", () => {
    expect(fittingTurbines(0.19, 30, 1)).toEqual(["francis", "kaplan"]);
    expect(fittingTurbines(1.55, 20, 1)).toEqual(["kaplan"]);
    expect(fittingTurbines(1.56, 20, 1)).toEqual([]);
  });

  it("căderi limită Pelton: 50 și 1300 m intră, 49,9 și 1300,1 nu", () => {
    expect(fittingTurbines(0.01, 50, 1)).toEqual(["pelton"]);
    expect(fittingTurbines(0.01, 1300, 1)).toEqual(["pelton"]);
    expect(fittingTurbines(0.01, 49.9, 1)).toEqual([]);
    expect(fittingTurbines(0.01, 1300.1, 1)).toEqual([]);
  });

  it("căderi limită Francis: 25 și 350 m intră, 24,9 și 350,1 nu", () => {
    expect(fittingTurbines(0.1, 25, 1)).toEqual(["francis"]);
    expect(fittingTurbines(0.1, 350, 1)).toEqual(["francis"]);
    expect(fittingTurbines(0.1, 24.9, 1)).toEqual([]);
    expect(fittingTurbines(0.1, 350.1, 1)).toEqual([]);
  });

  it("căderi limită Kaplan: 2 și 40 m intră, 1,9 și 40,1 nu", () => {
    expect(fittingTurbines(0.5, 2, 1)).toEqual(["kaplan"]);
    expect(fittingTurbines(0.5, 40, 1)).toEqual(["kaplan"]);
    expect(fittingTurbines(0.5, 1.9, 1)).toEqual([]);
    expect(fittingTurbines(0.5, 40.1, 1)).toEqual([]);
  });
});

describe("fittingTurbines: ordine și suprapuneri", () => {
  it("ordinea e pelton, francis, kaplan: n_QE 0,05 la j = 4 și H = 100 -> pelton + francis", () => {
    expect(fittingTurbines(0.05, 100, 4)).toEqual(["pelton", "francis"]);
  });
  it("n_QE 0,25 la H = 30 -> francis, kaplan (în această ordine)", () => {
    expect(fittingTurbines(0.25, 30, 1)).toEqual(["francis", "kaplan"]);
  });
});

describe("fittingTurbines: căderea în afara domeniului", () => {
  it("n_QE bun pentru Pelton, dar H = 20 m -> Pelton nu se potrivește", () => {
    expect(fittingTurbines(0.02, 20, 1)).not.toContain("pelton");
    expect(fittingTurbines(0.02, 20, 1)).toEqual([]);
  });
  it("n_QE bun pentru Francis, dar H = 500 m -> Francis nu se potrivește", () => {
    expect(fittingTurbines(0.1, 500, 1)).toEqual([]);
  });
  it("n_QE bun pentru Kaplan, dar H = 100 m -> Kaplan nu se potrivește", () => {
    expect(fittingTurbines(0.5, 100, 1)).toEqual([]);
  });
});
