// L1: ordinea în care trece apa prin cele 7 piese.
import { describe, expect, it } from "vitest";
import { PLANT_ORDER, isCorrectOrder } from "../../learn/sim/order";

// Scris de mână, nu citit din cod: aceasta E lecția 1.
const CORRECT = ["weir", "canal", "forebay", "penstock", "powerhouse", "tailrace", "powerline"];

describe("isCorrectOrder", () => {
  it("PLANT_ORDER este ordinea hidrologică corectă", () => {
    expect([...PLANT_ORDER]).toEqual(CORRECT);
  });

  it("ordinea corectă trece", () => {
    expect(isCorrectOrder(CORRECT)).toBe(true);
  });

  it("orice pereche de piese inversate pică (toate cele 21 de perechi)", () => {
    for (let i = 0; i < CORRECT.length; i++) {
      for (let j = i + 1; j < CORRECT.length; j++) {
        const p = [...CORRECT];
        [p[i], p[j]] = [p[j]!, p[i]!];
        expect(isCorrectOrder(p), `swap ${i}<->${j}`).toBe(false);
      }
    }
  });

  it("ordinea inversată pică", () => {
    expect(isCorrectOrder([...CORRECT].reverse())).toBe(false);
  });

  it("lungime greșită pică (prea scurtă, prea lungă, goală)", () => {
    expect(isCorrectOrder(CORRECT.slice(0, 6))).toBe(false);
    expect(isCorrectOrder([...CORRECT, "powerline"])).toBe(false);
    expect(isCorrectOrder([])).toBe(false);
  });

  it("ID necunoscut pică, chiar la poziția corectă ca lungime", () => {
    const p = [...CORRECT];
    p[3] = "pipe";
    expect(isCorrectOrder(p)).toBe(false);
  });

  it("duplicat în loc de o piesă pică", () => {
    const p = [...CORRECT];
    p[6] = "weir";
    expect(isCorrectOrder(p)).toBe(false);
  });
});
