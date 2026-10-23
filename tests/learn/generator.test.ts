// L10: n = 120·f / p. Valorile așteptate vin din docs/learn/pelton/lectia-10.md (calculate de mână) și din ESHA tab. 6.5 / §6.4.1.
import { describe, expect, it } from "vitest";
import { frequencyHz, ratioFor50Hz, syncSpeedRpm } from "../../learn/sim/generator";

describe("tabelul din lectia-10.md (turbină, poli, raport -> n_gen, f, raport necesar)", () => {
  it.each([
    // [turbină rpm, poli, raport, n_gen, f Hz, raport necesar pentru 50 Hz]
    [750, 4, 2.0, 1500, 50.0, 2.0],
    [750, 8, 1.0, 750, 50.0, 1.0],
    [750, 4, 1.0, 750, 25.0, 2.0],
    [750, 6, 2.0, 1500, 75.0, 4 / 3],
    [1500, 4, 1.0, 1500, 50.0, 1.0],
  ])("turbină %i rpm, %i poli, raport %f", (turbine, poles, ratio, nGen, f, need) => {
    expect(frequencyHz(poles, turbine * ratio)).toBeCloseTo(f, 6);
    expect(turbine * ratio).toBe(nGen);
    expect(ratioFor50Hz(poles, turbine)).toBeCloseTo(need, 6);
  });
});

describe("syncSpeedRpm: turațiile sincrone din lectia-10.md (Specs), 50 Hz", () => {
  it.each([
    [2, 3000],
    [4, 1500],
    [6, 1000],
    [8, 750],
    [10, 600],
    [12, 500],
  ])("%i poli -> %i rpm", (poles, rpm) => {
    expect(syncSpeedRpm(poles, 50)).toBeCloseTo(rpm, 6);
  });

  it("frequencyHz și syncSpeedRpm sunt inverse una alteia", () => {
    expect(frequencyHz(6, syncSpeedRpm(6, 50))).toBeCloseTo(50, 9);
    expect(frequencyHz(10, syncSpeedRpm(10, 60))).toBeCloseTo(60, 9);
  });
});

describe("control extern 1: ESHA tab. 6.5, |n − n_ESHA| < 1 rpm", () => {
  // Valorile din sursă, scrise ca acolo (ESHA trunchiază la întreg; 26 poli: 230,8 -> „231”).
  it.each([
    [2, 3000],
    [4, 1500],
    [6, 1000],
    [8, 750],
    [10, 600],
    [12, 500],
    [14, 428],
    [16, 375],
    [18, 333],
    [20, 300],
    [22, 272],
    [24, 250],
    [26, 231],
    [28, 214],
  ])("50 Hz, %i poli -> ESHA %i rpm", (poles, esha) => {
    expect(Math.abs(syncSpeedRpm(poles, 50) - esha)).toBeLessThan(1);
  });

  // Doar rândurile de 60 Hz fără erată (14 și 26 de poli au valori greșite în sursă și sunt excluse).
  it.each([
    [2, 3600],
    [4, 1800],
    [6, 1200],
    [8, 900],
    [10, 720],
    [12, 600],
    [20, 360],
    [24, 300],
  ])("60 Hz, %i poli -> ESHA %i rpm", (poles, esha) => {
    expect(Math.abs(syncSpeedRpm(poles, 60) - esha)).toBeLessThan(1);
  });

  it("erata: 14 poli la 60 Hz dau 514,3 rpm, nu 540; 26 poli dau 276,9, nu 377", () => {
    expect(syncSpeedRpm(14, 60)).toBeCloseTo(514.3, 1);
    expect(syncSpeedRpm(26, 60)).toBeCloseTo(276.9, 1);
  });
});

describe("control extern 2: ESHA §6.4.1, Kaplan 214 rpm cu alternator de 28 de poli", () => {
  it("120·50/28 = 214,3 rpm, la ≤ 0,5 % de 214", () => {
    expect(Math.abs(syncSpeedRpm(28, 50) - 214) / 214).toBeLessThanOrEqual(0.005);
  });
  it("cuplat direct la 214 rpm, frecvența iese 50 Hz ±0,5 %", () => {
    expect(Math.abs(frequencyHz(28, 214) - 50) / 50).toBeLessThanOrEqual(0.005);
  });
});
