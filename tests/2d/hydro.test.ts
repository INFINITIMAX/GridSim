// Teste S3+S4 pentru fizica hidrocentralei (2d/hydro.ts). Valorile așteptate vin din calcul de mână
// (P_turbină = 9,81 · Q · H_net · η_RETScreen; P_rețea = P_turbină · 0,95 · 0,99), nu din rularea codului.
// Vezi docs/handoff/S3-tester-raport.md și S4-tester-raport.md (calculele complete).
import { describe, expect, it } from "vitest";
import { MAX_TURBINES, annual, operate, peakEfficiency, powerCurve, stepClog, technologyById, turbineEfficiency } from "../../2d/hydro";
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
  // Calcul de mână (toGrid = 0,95·0,99 = 0,9405):
  // Kaplan h=5, Qd=2: eta(Qd)=0,843838 -> A,B: 9,81·2·5·0,843838 = 82,78 kW turbină; ·0,9405 = 77,855 kW.
  // F (clog 1): net 4,7, eta ramâne (depinde de ratedHead=5): 9,81·2·4,7·0,843838=77,81; ·0,9405 = 73,184.
  // C Francis h=11,6, Qd=2, Q=Qd: er=0,690243 -> 9,81·2·11,6·0,690243=157,09; ·0,9405 = 147,747.
  // H Crossflow Q=0,35, Qd=2: x=0,825; eta=0,79-0,15·0,825-1,37·0,825^14=0,57355 -> 9,81·0,35·5·0,57355=9,846; ·0,9405 = 9,261.
  // I Francis x2: k=1 (Q=2): 157,09 kW turbină; k=2 (Q=1,5 fiecare, eta=0,433069): 9,81·3·11,6·0,433069=147,85.
  //   157,09 > 147,85 deci o singură turbină pe plin bate două la 75%: running 1, used 2, spilled 1, kw 147,747.
  const rows: Row[] = [
    { name: "A baza", s: setup(), flow: 3, stop: null, running: 1, used: 2, spilled: 1, eco: 0, net: 5, kw: 77.855 },
    { name: "B scara de pești", s: setup({ fishLadder: true }), flow: 3, stop: null, running: 1, used: 2, spilled: 0.7, eco: 0.3, net: 5, kw: 77.855 },
    {
      name: "C Francis dam 8 canal scară",
      s: setup({ technology: "francis", damHeight: 8, canal: true, fishLadder: true }),
      flow: 3, stop: null, running: 1, used: 2, spilled: 0.7, eco: 0.3, net: 11.6, kw: 147.747,
    },
    { name: "D Francis dam 5 (cădere prea mică)", s: setup({ technology: "francis" }), flow: 3, stop: "head", running: 0, used: 0, spilled: 3, eco: 0, net: 5, kw: 0 },
    { name: "E fără stavile, debit 9", s: setup({ gates: false, fishLadder: true }), flow: 9, stop: "flood", running: 0, used: 0, spilled: 8.7, eco: 0.3, net: 5, kw: 0 },
    { name: "F grătar înfundat 100%", s: setup(), flow: 3, stop: null, running: 1, used: 2, spilled: 1, eco: 0, net: 4.7, kw: 73.184 },
    { name: "G debit sub prag", s: setup(), flow: 0.35, stop: "low-flow", running: 0, used: 0, spilled: 0.35, eco: 0, net: 5, kw: 0 },
    { name: "H Crossflow la debit mic", s: setup({ technology: "crossflow" }), flow: 0.35, stop: null, running: 1, used: 0.35, spilled: 0, eco: 0, net: 5, kw: 9.261 },
    {
      name: "I Francis x2 dam 8 canal (o turbină pe plin bate două la 75%)",
      s: setup({ technology: "francis", count: 2, damHeight: 8, canal: true }),
      flow: 3, stop: null, running: 1, used: 2, spilled: 1, eco: 0, net: 11.6, kw: 147.747,
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

  it("C: installedKW = 147,747 (fără pierderea la grătar)", () => {
    const op = operate(setup({ technology: "francis", damHeight: 8, canal: true, fishLadder: true }), 3, 0);
    near(op.installedKW, 147.747);
  });

  it("C: installedKW nu scade cu grătarul înfundat", () => {
    const s = setup({ technology: "francis", damHeight: 8, canal: true });
    near(operate(s, 3, 1).installedKW, 147.747);
  });

  it("A: randamentul raportat = eta(Qd) Kaplan h=5 = 0,843838", () => {
    near(operate(setup(), 3, 0).efficiency, 0.843838);
  });
});

describe("lanțul de puteri: turbină -> generator -> transformator", () => {
  it("A: turbineKW = 82,78 și powerKW = turbineKW · 0,95 · 0,99", () => {
    const op = operate(setup(), 3, 0);
    near(op.turbineKW, 82.7805); // 9,81·2·5·0,843838
    near(op.powerKW, op.turbineKW * 0.95 * 0.99);
  });

  it("energyPerDayMWh se calculează din powerKW (rețea), nu din turbină", () => {
    const op = operate(setup(), 3, 0);
    near(op.energyPerDayMWh, (77.855 * 24) / 1000);
  });

  it("caz oprit (head): turbineKW = 0 și powerKW = 0", () => {
    const op = operate(setup({ technology: "francis" }), 3, 0);
    expect(op.stopReason).toBe("head");
    expect(op.turbineKW).toBe(0);
    expect(op.powerKW).toBe(0);
  });

  it("caz oprit (low-flow): turbineKW = 0", () => {
    expect(operate(setup(), 0.35, 0).turbineKW).toBe(0);
  });
});

describe("turbineEfficiency / peakEfficiency (RETScreen Anexa A, valori de mână)", () => {
  // d = 0,46·Qd^0,473; Qd=2 -> d=0,638476; 1-0,789·d^-0,2 = 0,136923. Rm=4,5 -> -0,0305+0,0225 = -0,008.
  const kaplan = technologyById("kaplan");
  const francis = technologyById("francis");
  const crossflow = technologyById("crossflow");

  // Kaplan h=5: nq=357,77; enq=(187,77/700)²=0,07196; ed=(0,095+0,07196)·0,136923=0,02286;
  // ep=0,905-0,07196+0,02286-0,008=0,84790; Qp=1,5.
  describe("Kaplan h=5, Qd=2", () => {
    it("la Qp = 1,5: eq = ep = 0,8479", () => near(turbineEfficiency(kaplan, 5, 2, 1.5), 0.8479));
    it("la Qd = 2: x=-1/3, 1-3,5·(1/3)^6=0,995199 -> 0,84384 (formula e aceeași peste Qp)", () => near(turbineEfficiency(kaplan, 5, 2, 2), 0.84384));
    it("la Q = 0,4 (20%): x=0,73333, x^6=0,155528, 1-3,5·x^6=0,455652 -> 0,38635; sub 0,5", () => {
      const e = turbineEfficiency(kaplan, 5, 2, 0.4);
      near(e, 0.38635);
      expect(e).toBeLessThan(0.5);
    });
    it("peakEfficiency = eficiența la Qp = 0,8479", () => {
      near(peakEfficiency(kaplan, 5, 2), 0.8479);
      near(peakEfficiency(kaplan, 5, 2), turbineEfficiency(kaplan, 5, 2, 1.5));
    });
  });

  // Francis h=11,6: nq=176,159; enq=(120,159/256)²=0,22031; ed=(0,081+0,22031)·0,136923=0,04126;
  // ep=0,919-0,22031+0,04126-0,008=0,73195; Qp=0,65·2·nq^0,05=1,3·1,295075=1,68360;
  // er=(1-0,0072·nq^0,4)·ep=(1-0,0072·7,91336)·ep=0,943024·ep=0,69024.
  describe("Francis h=11,6, Qd=2", () => {
    it("la Qp = 1,6836: eq = ep = 0,73195", () => near(turbineEfficiency(francis, 11.6, 2, 1.683598), 0.73195));
    it("la Q = 1,5 (sub Qp): (0,109051)^0,504907=0,326655; 1-1,25·0,326655=0,591681 -> 0,43307", () =>
      near(turbineEfficiency(francis, 11.6, 2, 1.5), 0.43307));
    it("la Qd = 2 (peste Qp): raportul = 1 -> eq = er = 0,69024", () => near(turbineEfficiency(francis, 11.6, 2, 2), 0.69024));
    it("la Q = 1,8 (peste Qp): ((1,8-1,6836)/0,3164)²=0,13535 -> 0,73195-0,13535·0,04171 = 0,72630", () =>
      near(turbineEfficiency(francis, 11.6, 2, 1.8), 0.7263));
    it("vârful e la Qp: mai mare decât la 1,5 și la Qd", () => {
      const peak = turbineEfficiency(francis, 11.6, 2, 1.683598);
      expect(peak).toBeGreaterThan(turbineEfficiency(francis, 11.6, 2, 1.5));
      expect(peak).toBeGreaterThan(turbineEfficiency(francis, 11.6, 2, 2));
    });
    it("peakEfficiency = eficiența la Qp = 0,73195", () => near(peakEfficiency(francis, 11.6, 2), 0.73195));
  });

  describe("Crossflow Qd=2", () => {
    it("la Qd: x=0 -> 0,79", () => near(turbineEfficiency(crossflow, 5, 2, 2), 0.79));
    it("la Q = 0,3: x=0,85; 0,79-0,1275-1,37·0,85^14(=0,10277) = 0,52171", () => near(turbineEfficiency(crossflow, 5, 2, 0.3), 0.52171));
    it("peakEfficiency = 0,79 (la Qd)", () => near(peakEfficiency(crossflow, 5, 2), 0.79));
    it("nu depinde de cădere", () => near(turbineEfficiency(crossflow, 11.6, 2, 0.3), 0.52171));
  });

  describe("limitarea la 0", () => {
    // Francis h=3, Qd=1: nq=346,41; enq=1,28693; ed=0,10729; ep=0,919-1,28693+0,10729-0,008=-0,2686 (negativ);
    // Qp=0,87075. Peste Qp (ramura er): Q=0,9 -> eq = ep - 0,0512·(ep-er) < 0; la Qd eq=er=-0,2485 < 0 -> ambele 0.
    // Sub ~8,8 m formula iese din domeniu (exponent 3,94-0,0195·nq negativ, ep negativ); garda din cod dă 0 pe ambele ramuri.
    it("Francis h=3 la Q=0,1 (sub Qp, exponent negativ): exact 0, nu o valoare pozitivă falsă", () => {
      expect(turbineEfficiency(francis, 3, 1, 0.1)).toBe(0);
    });
    it("Francis h=3 la Q=0,9 (peste Qp): exact 0, nu negativ", () => {
      expect(turbineEfficiency(francis, 3, 1, 0.9)).toBe(0);
    });
    it("Francis h=3 la Qd: exact 0, nu negativ", () => {
      expect(turbineEfficiency(francis, 3, 1, 1)).toBe(0);
    });
    it("Kaplan la 0 debit nu dă negativ (1-3,5 < 0)", () => {
      expect(turbineEfficiency(kaplan, 5, 2, 0)).toBe(0);
    });
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
  it("ianuarie cu curățitor: ≈ 52,214 MWh (clog 0,05, debit 1,8)", () => {
    // net = 4,985; eta(Q=1,8) = (1-3,5·0,2^6)·0,847909 = 0,847719; turbină 9,81·1,8·4,985·0,847719 = 74,62 kW;
    // rețea ·0,9405 = 70,18 kW; ·744/1000 = 52,214 MWh
    const a = annual(setup({ autoCleaner: true }));
    expect(a.monthsMWh).toHaveLength(12);
    near(a.monthsMWh[0]!, 52.214);
  });

  it("ianuarie fără curățitor (clog mediu 0,5): ≈ 50,800 MWh", () => {
    // net = 5 - 0,5·0,06·5 = 4,85; turbină 9,81·1,8·4,85·0,847719 = 72,60 kW; ·0,9405 = 68,28 kW; ·744/1000
    const a = annual(setup());
    near(a.monthsMWh[0]!, 50.8);
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

  it("large Kaplan la 12 m3/s: 9,81·3,5·5·0,851233·0,9405 = 137,44 kW", () => {
    // Qd=3,5: d=0,83195, 1-0,789·d^-0,2=0,181425, ed=0,16696·0,181425=0,03029, ep=0,905-0,07196+0,03029-0,008=0,85533;
    // Q=Qd: factor 0,995199 -> eta=0,851233; turbină 146,135 kW; ·0,9405 = 137,44
    const c = powerCurve(s, 0, 12, 12);
    near(c[c.length - 1]!.powerKW, 137.44);
  });
});
