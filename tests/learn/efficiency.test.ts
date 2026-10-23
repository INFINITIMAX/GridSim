// L8: curba de randament RETScreen pentru Pelton, cu vârful ESHA tab. 6.7.
// Valori de mână și controale externe din docs/learn/pelton/lectia-08.md. Puterea merge prin powerKW din L2.
import { describe, expect, it } from "vitest";
import { peakEfficiency, peakFlowRatio, relativeEfficiency, turbineEfficiency } from "../../learn/sim/efficiency";
import { powerKW } from "../../learn/sim/power";

const QD_LPS = 41.9;
const H = 59;

describe("peakEfficiency (ESHA tab. 6.7)", () => {
  it("0,89 pentru un jet", () => {
    expect(peakEfficiency(1)).toBe(0.89);
  });
  it.each([2, 3, 4, 5, 6])("0,90 pentru %i jeturi", (j) => {
    expect(peakEfficiency(j)).toBe(0.9);
  });
});

describe("peakFlowRatio: Qp/Qd = 0,662 + 0,001·j", () => {
  it("j = 1 -> 0,663 (66,3 %)", () => {
    expect(peakFlowRatio(1)).toBeCloseTo(0.663, 6);
  });
  it("j = 2 -> 0,664 (66,4 %)", () => {
    expect(peakFlowRatio(2)).toBeCloseTo(0.664, 6);
  });
});

describe("tabelul din lectia-08.md (η și P la Qd = 41,9 L/s, H = 59 m)", () => {
  it.each([
    [1, 0.5, 0.8897, 10.79],
    [1, 1.0, 0.8695, 21.09],
    [1, 0.2, 0.7522, 3.65],
    [2, 0.5, 0.8998, 10.91],
    [2, 0.2, 0.7765, 3.77],
  ])("j = %i, Q/Qd = %f -> η = %f, P = %f kW", (j, q, eta, p) => {
    const e = turbineEfficiency(q, j);
    expect(e).toBeCloseTo(eta, 3);
    expect(powerKW(H, q * QD_LPS, e)).toBeCloseTo(p, 1);
  });
});

describe("relativeEfficiency (η/ep, j = 1)", () => {
  it.each([
    [0.15, 0.7135],
    [0.2, 0.8452],
    [0.3, 0.964],
    [0.5, 0.9997],
    [1.0, 0.977],
  ])("q = %f -> %f", (q, r) => {
    expect(relativeEfficiency(q, 1)).toBeCloseTo(r, 3);
  });

  it("coeficientul înmulțește puterea, nu e ridicat la ea: la q = 0,2 și j = 1 randamentul relativ e > 0,8 (greșit ar da ~0,344)", () => {
    expect(relativeEfficiency(0.2, 1)).toBeGreaterThan(0.8);
  });

  it("e 1 - 1,335·|…|^6 la j = 1 (coeficient 1,31 + 0,025·j, exponent 5,6 + 0,4·j)", () => {
    const qp = 0.663;
    const q = 0.3;
    expect(relativeEfficiency(q, 1)).toBeCloseTo(1 - 1.335 * Math.abs((qp - q) / qp) ** 6, 9);
  });

  it("e simetrică în jurul lui Qp după |·|: valori egale la distanțe egale de vârf", () => {
    const qp = peakFlowRatio(1);
    expect(relativeEfficiency(qp - 0.2, 1)).toBeCloseTo(relativeEfficiency(qp + 0.2, 1), 9);
  });

  it("peste Qp, la j = 2 (exponent fracționar 6,4): η finit și egal cu valoarea de mână 0,8843 (prinde lipsa lui |·|)", () => {
    // Qp = 0,664; |(0,664 - 1)/0,664|^6,4 = 0,012782; 1 - 1,36 x 0,012782 = 0,98262; x 0,90 = 0,88435
    expect(turbineEfficiency(1, 2)).toBeCloseTo(0.88435, 4);
  });

  it("vârful e la Qp: acolo randamentul relativ e 1", () => {
    expect(relativeEfficiency(peakFlowRatio(1), 1)).toBeCloseTo(1, 9);
  });
});

describe("turbineEfficiency = relativeEfficiency x peakEfficiency", () => {
  it.each([1, 2, 4])("j = %i, q = 0,35", (j) => {
    expect(turbineEfficiency(0.35, j)).toBeCloseTo(relativeEfficiency(0.35, j) * peakEfficiency(j), 12);
  });
});

describe("control extern 1 (S17, S19): de la debitul plin la 60 %, randamentul se schimbă cu 2–3 % (H5)", () => {
  it("(η(0,6) - η(1,0)) / η(0,6) este între 2 % și 3 %", () => {
    const e6 = turbineEfficiency(0.6, 1);
    const e10 = turbineEfficiency(1.0, 1);
    const drop = (e6 - e10) / e6;
    expect(drop).toBeGreaterThanOrEqual(0.02);
    expect(drop).toBeLessThanOrEqual(0.03);
  });
});

describe("control extern 2 (S19 fig. 6.30, Pelton cu o duză, η/ηmax): |Δ| ≤ 8 pp în toate cele 10 puncte", () => {
  const ESHA: Array<[number, number]> = [
    [0.15, 0.65],
    [0.2, 0.79],
    [0.3, 0.89],
    [0.4, 0.935],
    [0.5, 0.963],
    [0.6, 0.977],
    [0.7, 0.988],
    [0.8, 0.996],
    [0.9, 1.0],
    [1.0, 1.0],
  ];
  it.each(ESHA)("Q/Qd = %f (ESHA %f)", (q, esha) => {
    expect(Math.abs(relativeEfficiency(q, 1) - esha)).toBeLessThanOrEqual(0.08);
  });
});
