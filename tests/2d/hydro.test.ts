// Teste S3 pentru fizica hidrocentralei (2d/hydro.ts). Valorile așteptate vin din calcul de mână
// (P = 9,81 · Q · H_net · η), nu din rularea codului. Vezi docs/handoff/S3-tester-raport.md.
import { describe, expect, it } from "vitest";
import { MAX_TURBINES, annual, operate, powerCurve, stepClog } from "../../2d/hydro";
import type { PlantSetup } from "../../2d/hydro";

type Tech = PlantSetup["technology"];
type Size = PlantSetup["size"];

const TECHS: Tech[] = ["kaplan", "francis", "crossflow"];
const SIZE_IDS: Size[] = ["small", "medium", "large"];
const DESIGN: Record<Size, number> = { small: 1.0, medium: 2.0, large: 3.5 };
// Valorile minLoad sunt scrise de mână din brief, nu citite din cod.
const MIN_LOAD: Record<Tech, number> = { kaplan: 0.2, francis: 0.4, crossflow: 0.15 };
const FLOWS = [-1, 0, 0.1, 0.35, 0.8, 1.5, 3, 5, 7, 7.5, 9, 12];
const CLOGS = [0, 0.3, 1];

/** Baza: medium x1, dam 5, fără canal, cu stavile, fără scară de pești, fără curățitor, Kaplan. */
function setup(over: Partial<PlantSetup> = {}): PlantSetup {
  return {
    technology: "kaplan",
    size: "medium",
    count: 1,
    damHeight: 5,
    canal: false,
    gates: true,
    fishLadder: false,
    autoCleaner: false,
    ...over,
  };
}

/** Toleranță relativă 0,5% (cu un prag absolut minuscul pentru valori 0). */
function near(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * 0.005 + 1e-9);
}

function allSetups(): PlantSetup[] {
  const out: PlantSetup[] = [];
  for (const technology of TECHS)
    for (const size of SIZE_IDS)
      for (let count = 1; count <= MAX_TURBINES; count++)
        for (const damHeight of [3, 5, 8] as const)
          for (const canal of [false, true])
            for (const gates of [false, true])
              for (const fishLadder of [false, true])
                out.push({ technology, size, count, damHeight, canal, gates, fishLadder, autoCleaner: false });
  return out;
}

describe("operate: cazuri de mână", () => {
  interface Row {
    name: string;
    s: PlantSetup;
    flow: number;
    stop: "flood" | "head" | "low-flow" | null;
    running: number;
    used: number;
    spilled: number;
    eco: number;
    net: number;
    kw: number;
  }
  const rows: Row[] = [
    { name: "A baza", s: setup(), flow: 3, stop: null, running: 1, used: 2, spilled: 1, eco: 0, net: 5, kw: 88.29 },
    { name: "B scara de pești", s: setup({ fishLadder: true }), flow: 3, stop: null, running: 1, used: 2, spilled: 0.7, eco: 0.3, net: 5, kw: 88.29 },
    {
      name: "C Francis dam 8 canal scară",
      s: setup({ technology: "francis", damHeight: 8, canal: true, fishLadder: true }),
      flow: 3, stop: null, running: 1, used: 2, spilled: 0.7, eco: 0.3, net: 11.6, kw: 204.67,
    },
    { name: "D Francis dam 5 (cădere prea mică)", s: setup({ technology: "francis" }), flow: 3, stop: "head", running: 0, used: 0, spilled: 3, eco: 0, net: 5, kw: 0 },
    { name: "E fără stavile, debit 9", s: setup({ gates: false, fishLadder: true }), flow: 9, stop: "flood", running: 0, used: 0, spilled: 8.7, eco: 0.3, net: 5, kw: 0 },
    { name: "F grătar înfundat 100%", s: setup(), flow: 3, stop: null, running: 1, used: 2, spilled: 1, eco: 0, net: 4.7, kw: 82.99 },
    { name: "G debit sub prag", s: setup(), flow: 0.35, stop: "low-flow", running: 0, used: 0, spilled: 0.35, eco: 0, net: 5, kw: 0 },
    { name: "H Crossflow la debit mic", s: setup({ technology: "crossflow" }), flow: 0.35, stop: null, running: 1, used: 0.35, spilled: 0, eco: 0, net: 5, kw: 12.99 },
    {
      name: "I Francis x2 dam 8 canal",
      s: setup({ technology: "francis", count: 2, damHeight: 8, canal: true }),
      flow: 3, stop: null, running: 2, used: 3, spilled: 0, eco: 0, net: 11.6, kw: 310.94,
    },
  ];

  it.each(rows)("$name", (r) => {
    const clog = r.name.startsWith("F") ? 1 : 0;
    const op = operate(r.s, r.flow, clog);
    expect(op.stopReason).toBe(r.stop);
    expect(op.running).toBe(r.running);
    near(op.usedFlow, r.used);
    near(op.spilledFlow, r.spilled);
    near(op.ecoFlow, r.eco);
    near(op.netHead, r.net);
    near(op.powerKW, r.kw);
  });

  it("C: installedKW = 204,67 (fără pierderea la grătar)", () => {
    const op = operate(setup({ technology: "francis", damHeight: 8, canal: true, fishLadder: true }), 3, 0);
    near(op.installedKW, 204.67);
  });

  it("C: installedKW nu scade cu grătarul înfundat", () => {
    const s = setup({ technology: "francis", damHeight: 8, canal: true });
    near(operate(s, 3, 1).installedKW, 204.67);
  });
});

describe("stepClog", () => {
  it("90 s la debitul mediu (3 m3/s) dau 0,5", () => {
    near(stepClog(0, 3, false, 90), 0.5);
  });
  it("crește până la plafonul 1", () => {
    expect(stepClog(0, 6, false, 90)).toBe(1);
  });
  it("cu curățitor automat rămâne ≤ 0,05", () => {
    expect(stepClog(0.9, 3, true, 10)).toBeLessThanOrEqual(0.05);
  });
  it("fără debit nu se înfundă", () => {
    expect(stepClog(0, 0, false, 100)).toBe(0);
  });
});

describe("annual", () => {
  it("ianuarie cu curățitor: ≈ 58,85 MWh (clog 0,05, debit 1,8)", () => {
    const a = annual(setup({ autoCleaner: true }));
    expect(a.monthsMWh).toHaveLength(12);
    near(a.monthsMWh[0]!, 58.85);
  });

  it("ianuarie fără curățitor (clog mediu 0,5): ≈ 57,26 MWh", () => {
    // net = 5 - 0,5·0,06·5 = 4,85; P = 9,81·1,8·4,85·0,89865 = 76,96 kW; ·744/1000
    const a = annual(setup());
    near(a.monthsMWh[0]!, 57.26);
  });

  it("totalMWh = suma lunilor", () => {
    const a = annual(setup({ autoCleaner: true, count: 2 }));
    expect(a.totalMWh).toBeCloseTo(
      a.monthsMWh.reduce((s, v) => s + v, 0),
      9,
    );
    expect(a.totalMWh).toBeGreaterThan(0);
  });

  it("capacityFactor = totalMWh·1000 / (installedKW·8760)", () => {
    const s = setup({ autoCleaner: true, count: 2 });
    const a = annual(s);
    const installed = operate(s, 3, 0).installedKW;
    expect(a.capacityFactor).toBeCloseTo((a.totalMWh * 1000) / (installed * 8760), 9);
  });

  it("capacityFactor e între 0 și 1 pe grila de setup-uri", () => {
    for (const s of allSetups()) {
      for (const autoCleaner of [false, true]) {
        const cf = annual({ ...s, autoCleaner }).capacityFactor;
        expect(cf, JSON.stringify(s)).toBeGreaterThanOrEqual(0);
        expect(cf, JSON.stringify(s)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("o configurație cu căderea interzisă produce 0 MWh și factor 0", () => {
    const a = annual(setup({ technology: "francis" }));
    expect(a.totalMWh).toBe(0);
    expect(a.capacityFactor).toBe(0);
  });
});

describe("operate: proprietăți", () => {
  it("1. conservarea apei: folosit + deversat + eco = debit (≥ 0)", () => {
    for (const s of allSetups()) {
      for (const flow of FLOWS) {
        const op = operate(s, flow, 0);
        expect(op.usedFlow + op.spilledFlow + op.ecoFlow, `${JSON.stringify(s)} @${flow}`).toBeCloseTo(Math.max(flow, 0), 9);
        expect(op.spilledFlow).toBeGreaterThanOrEqual(-1e-9);
      }
    }
  });

  it("2. o turbină în plus nu scade puterea", () => {
    for (const s of allSetups()) {
      if (s.count >= MAX_TURBINES) continue;
      for (const flow of FLOWS) {
        const fewer = operate(s, flow, 0).powerKW;
        const more = operate({ ...s, count: s.count + 1 }, flow, 0).powerKW;
        expect(more, `${JSON.stringify(s)} @${flow}`).toBeGreaterThanOrEqual(fewer - 1e-9);
      }
    }
  });

  describe("3. ordinea motivelor de oprire", () => {
    // Cele trei motive nu pot fi îndeplinite simultan: flood cere debit > 7, iar low-flow cere
    // debit disponibil < minLoad·designFlow ≤ 1,4. Testăm deci perechile posibile.
    it("flood bate head", () => {
      const op = operate(setup({ technology: "francis", gates: false }), 9, 0);
      expect(op.stopReason).toBe("flood");
    });
    it("cu stavile, același caz dă head", () => {
      const op = operate(setup({ technology: "francis", gates: true }), 9, 0);
      expect(op.stopReason).toBe("head");
    });
    it("head bate low-flow", () => {
      const op = operate(setup({ technology: "francis" }), 0.35, 0);
      expect(op.stopReason).toBe("head");
    });
    it("fără head, același debit mic dă low-flow", () => {
      const op = operate(setup(), 0.35, 0);
      expect(op.stopReason).toBe("low-flow");
    });
  });

  it("4. barajul mai înalt nu scade puterea (când rulează la ambele înălțimi)", () => {
    for (const technology of TECHS)
      for (const size of SIZE_IDS)
        for (const canal of [false, true])
          for (const flow of FLOWS) {
            const ops = ([3, 5, 8] as const).map((damHeight) => operate(setup({ technology, size, canal, damHeight }), flow, 0));
            for (let i = 1; i < ops.length; i++) {
              if (ops[i - 1]!.stopReason === null && ops[i]!.stopReason === null) {
                expect(ops[i]!.powerKW, `${technology} ${size} canal=${canal} @${flow}`).toBeGreaterThanOrEqual(ops[i - 1]!.powerKW - 1e-9);
              }
            }
          }
  });

  it("5. grătarul mai înfundat nu crește puterea", () => {
    for (const s of allSetups()) {
      for (const flow of FLOWS) {
        let prev = Infinity;
        for (const clog of CLOGS) {
          const p = operate(s, flow, clog).powerKW;
          expect(p, `${JSON.stringify(s)} @${flow} clog ${clog}`).toBeLessThanOrEqual(prev + 1e-9);
          prev = p;
        }
      }
    }
  });

  it("6. pragul de pornire pe tehnologie: sub minLoad nu pornește, peste minLoad pornește", () => {
    for (const technology of TECHS) {
      // Francis are nevoie de 10 m: dam 8 + canal
      const base = technology === "francis" ? { damHeight: 8 as const, canal: true } : {};
      for (const size of SIZE_IDS) {
        const s = setup({ technology, size, ...base });
        const off = operate(s, (MIN_LOAD[technology] - 0.01) * DESIGN[size], 0);
        expect(off.running, `${technology} ${size} sub prag`).toBe(0);
        expect(off.stopReason).toBe("low-flow");
        expect(off.powerKW).toBe(0);
        const on = operate(s, (MIN_LOAD[technology] + 0.01) * DESIGN[size], 0);
        expect(on.running, `${technology} ${size} peste prag`).toBe(1);
        expect(on.stopReason).toBeNull();
        expect(on.powerKW).toBeGreaterThan(0);
      }
    }
  });

  describe("7. intervalul de cădere (Francis, 10 m minim)", () => {
    it("dam 5 + canal (gross 9) -> head", () => {
      expect(operate(setup({ technology: "francis", damHeight: 5, canal: true }), 3, 0).stopReason).toBe("head");
    });
    it("dam 8 fără canal (gross 8) -> head", () => {
      expect(operate(setup({ technology: "francis", damHeight: 8, canal: false }), 3, 0).stopReason).toBe("head");
    });
    it("dam 8 + canal (gross 12) -> rulează", () => {
      const op = operate(setup({ technology: "francis", damHeight: 8, canal: true }), 3, 0);
      expect(op.stopReason).toBeNull();
      expect(op.running).toBe(1);
    });
  });
});

describe("powerCurve", () => {
  const s = setup({ size: "large" });

  it("are steps + 1 puncte, de la 0 la maxFlow, echidistante", () => {
    const c = powerCurve(s, 0, 20, 20);
    expect(c).toHaveLength(21);
    expect(c[0]!.flow).toBe(0);
    expect(c[20]!.flow).toBeCloseTo(20, 9);
    expect(c[7]!.flow).toBeCloseTo(7, 9);
  });

  it("valorile coincid cu operate pentru același debit și clog", () => {
    const c = powerCurve(s, 0.3, 12, 12);
    for (const p of c) expect(p.powerKW).toBeCloseTo(operate(s, p.flow, 0.3).powerKW, 9);
  });

  it("large Kaplan la 12 m3/s: 9,81·3,5·5·0,9 = 154,51 kW", () => {
    const c = powerCurve(s, 0, 12, 12);
    near(c[c.length - 1]!.powerKW, 154.51);
  });
});
