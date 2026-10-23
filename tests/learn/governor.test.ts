// L11: regulatorul de sarcină. Valorile vin din docs/learn/pelton/lectia-11.md (soluție analitică, calcule de mână, ESHA ec. 6.34 și tab. 6.6).
import { describe, expect, it } from "vitest";
import { TM_S, ballastKW, frequencyTrace, turbinePowerPU, waterStartS } from "../../learn/sim/governor";

/** Soluția analitică fără ELC, consum 0: w(t) = 2 − e^(−t/t_m), f = 50·w. */
const analytic = (t: number, tm = TM_S) => 50 * (2 - Math.exp(-t / tm));

describe("turbinePowerPU: w·(2 − w)", () => {
  it("w = 1 -> 1 (puterea nominală)", () => {
    expect(turbinePowerPU(1)).toBeCloseTo(1, 12);
  });
  it("w = 2 -> 0 (turația de ambalare)", () => {
    expect(turbinePowerPU(2)).toBeCloseTo(0, 12);
  });
  it("w = 0,5 -> 0,75", () => {
    expect(turbinePowerPU(0.5)).toBeCloseTo(0.75, 12);
  });
});

describe("TM_S", () => {
  it("timpul de pornire e 2 s", () => {
    expect(TM_S).toBe(2);
  });
});

describe("frequencyTrace: forma", () => {
  it("101 valori (0..10 s din 0,1 în 0,1) și pornește de la 50 Hz", () => {
    for (const [load, elc] of [[0, false], [0.5, false], [0, true]] as const) {
      const tr = frequencyTrace(load, elc, TM_S);
      expect(tr).toHaveLength(101);
      expect(tr[0]).toBeCloseTo(50, 9);
    }
  });
});

describe("frequencyTrace fără ELC, consum 0: față de soluția analitică (≤ 0,01 Hz)", () => {
  const tr = frequencyTrace(0, false, TM_S);
  it.each([1, 2, 10])("f(%i s)", (t) => {
    expect(Math.abs(tr[t * 10]! - analytic(t))).toBeLessThanOrEqual(0.01);
  });
  it("valorile de mână din lectia-11.md: 69,7 / 81,6 / 99,7 Hz", () => {
    expect(tr[10]!).toBeCloseTo(69.7, 1);
    expect(tr[20]!).toBeCloseTo(81.6, 1);
    expect(tr[100]!).toBeCloseTo(99.7, 1);
  });
  it("tinde spre 100 Hz fără să o depășească", () => {
    for (const f of tr) expect(f).toBeLessThanOrEqual(100);
  });
  it("tot traseul urmează soluția analitică, nu doar punctele alese", () => {
    tr.forEach((f, i) => expect(Math.abs(f - analytic(i / 10))).toBeLessThanOrEqual(0.01));
  });
});

describe("frequencyTrace fără ELC, consum 50 %", () => {
  const tr = frequencyTrace(0.5, false, TM_S);
  it("f(1 s) = 60,9 Hz și f(10 s) = 84,7 Hz", () => {
    expect(tr[10]!).toBeCloseTo(60.9, 1);
    expect(tr[100]!).toBeCloseTo(84.7, 1);
  });
  it("crește strict, spre echilibrul 50·(1 + √0,5) = 85,36 Hz, fără să-l depășească", () => {
    const eq = 50 * (1 + Math.sqrt(0.5));
    for (let i = 1; i < tr.length; i++) expect(tr[i]!).toBeGreaterThan(tr[i - 1]!);
    for (const f of tr) expect(f).toBeLessThan(eq);
  });
});

describe("frequencyTrace cu ELC: frecvența rămâne 50 Hz", () => {
  it.each([0, 0.25, 0.5, 1])("consum %f", (load) => {
    for (const f of frequencyTrace(load, true, TM_S)) expect(f).toBeCloseTo(50, 6);
  });
});

describe("frequencyTrace: t_m", () => {
  it("un t_m mai mare încetinește creșterea (f(1 s) mai mic)", () => {
    const slow = frequencyTrace(0, false, 4)[10]!;
    const base = frequencyTrace(0, false, 2)[10]!;
    expect(slow).toBeLessThan(base);
    expect(Math.abs(slow - analytic(1, 4))).toBeLessThanOrEqual(0.01);
  });
});

describe("ballastKW", () => {
  it("cu ELC: p0·(1 − consum)", () => {
    expect(ballastKW(14.55, 0, true)).toBeCloseTo(14.55, 9);
    expect(ballastKW(14.55, 0.5, true)).toBeCloseTo(7.275, 9);
    expect(ballastKW(14.55, 1, true)).toBeCloseTo(0, 9);
  });
  it("fără ELC: 0, la orice consum", () => {
    expect(ballastKW(14.55, 0, false)).toBe(0);
    expect(ballastKW(14.55, 0.5, false)).toBe(0);
  });
});

describe("waterStartS (ESHA ec. 6.34) și regula t_m / t_w > 4", () => {
  const tw = waterStartS(150, 1.2732, 60);
  it("L = 150 m, V = 1,2732 m/s, H = 60 m -> 0,324 s", () => {
    expect(Math.abs(tw - 0.324) / 0.324).toBeLessThan(0.005);
  });
  it("t_m / t_w > 4 (≈ 6,2)", () => {
    expect(TM_S / tw).toBeGreaterThan(4);
    expect(TM_S / tw).toBeCloseTo(6.2, 1);
  });
  it("proporțional cu L și V, invers cu H", () => {
    expect(waterStartS(300, 1.2732, 60)).toBeCloseTo(2 * tw, 9);
    expect(waterStartS(150, 1.2732, 120)).toBeCloseTo(tw / 2, 9);
  });
});

describe("control extern: ESHA tab. 6.6, turația de ambalare 1,8–1,9 × nominală", () => {
  it("raportul dintre turația finală a modelului (w ≈ 2) și 1,85 e în [1,05; 1,12]", () => {
    const tr = frequencyTrace(0, false, TM_S);
    const wFinal = tr[tr.length - 1]! / 50;
    const ratio = wFinal / 1.85;
    expect(ratio).toBeGreaterThanOrEqual(1.05);
    expect(ratio).toBeLessThanOrEqual(1.12);
  });
});
