"""Independent audit of the GridSim 2D hydro model.

Part 1: re-implements the rules of docs/handoff/S3-coder.md and S4-coder.md from scratch (no code shared with the game)
        and compares every case dumped from the game's TypeScript (scripts/dump-hydro.mjs).
        Turbine efficiency: RETScreen Small Hydro Project Analysis, Appendix A, pages HYDRO.37-40 (data/refs/retscreen-hydro.pdf).
Part 2: prints the resulting efficiency curves, for reading.

Run: node scripts/dump-hydro.mjs data/refs/hydro-dump.json && python -I scripts/audit_hydro.py data/refs/hydro-dump.json
"""

import json
import math
import sys

G = 9.81
TECH = {  # min load, head range
    "kaplan": (0.20, 2, 20),
    "francis": (0.40, 10, 300),
    "crossflow": (0.15, 2, 100),
}
GEN = 0.95 * (1 - 0.01)  # generator efficiency x (1 - transformer loss)
SIZE = {"small": 1.0, "medium": 2.0, "large": 3.5}
MONTHLY = [1.8, 2.2, 4.2, 6.5, 6.0, 4.0, 2.4, 1.4, 1.2, 1.6, 2.2, 2.0]
DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


def operate(s, river, clog):
    min_load, hmin, hmax = TECH[s["technology"]]
    qd = SIZE[s["size"]]
    count = min(max(round(s["count"]), 1), 4)
    clog = min(max(clog, 0), 1)
    gross = s["damHeight"] + (4 if s["canal"] else 0)
    canal_loss = 0.4 if s["canal"] else 0
    net = gross - canal_loss - clog * 0.06 * gross
    flow = max(river, 0)
    eco = min(0.3, flow) if s["fishLadder"] else 0
    avail = flow - eco
    rated = gross - canal_loss
    eff = lambda q: max(ret_eff(s["technology"], rated, qd, q), 0)
    installed = count * G * qd * rated * eff(qd) * GEN
    qmin = min_load * qd
    max_run = min(count, math.floor(avail / qmin + 1e-9))
    stop = "flood" if (not s["gates"] and flow > 7) else "head" if not (hmin <= gross <= hmax) else "low-flow" if max_run == 0 else None
    if stop:
        return dict(running=0, usedFlow=0, spilledFlow=avail, ecoFlow=eco, powerKW=0, turbineKW=0, installedKW=installed, netHead=net, stopReason=stop)
    best = None
    for k in range(1, max_run + 1):
        per = min(qd, avail / k)
        t = G * k * per * net * eff(per)
        if best is None or t * GEN > best[1] + 1e-9:
            best = (k, t * GEN, k * per, t)
    k, p, used, t = best
    return dict(running=k, usedFlow=used, spilledFlow=avail - used, ecoFlow=eco, powerKW=p, turbineKW=t, installedKW=installed, netHead=net, stopReason=None)


def part1(dump):
    worst = 0.0
    bad = []
    for c in dump["cases"]:
        mine = operate(c["setup"], c["flow"], c["clog"])
        game = c["op"]
        for key in ("running", "usedFlow", "spilledFlow", "ecoFlow", "powerKW", "turbineKW", "installedKW", "netHead"):
            a, b = mine[key], game[key]
            err = abs(a - b) / max(abs(a), 1e-6) if abs(a) > 1e-9 else abs(b)
            worst = max(worst, err)
            if err > 1e-9:
                bad.append((c["setup"], c["flow"], c["clog"], key, a, b))
        if mine["stopReason"] != game["stopReason"]:
            bad.append((c["setup"], c["flow"], c["clog"], "stopReason", mine["stopReason"], game["stopReason"]))
    for a in dump["annual"]:
        s = a["setup"]
        clog = 0.05 if s["autoCleaner"] else 0.5
        months = [operate(s, q, clog)["powerKW"] * d * 24 / 1000 for q, d in zip(MONTHLY, DAYS)]
        total = sum(months)
        cf = total * 1000 / (operate(s, 3, 0)["installedKW"] * 8760)
        for key, mine, game in (("totalMWh", total, a["year"]["totalMWh"]), ("capacityFactor", cf, a["year"]["capacityFactor"])):
            if abs(mine - game) > 1e-6 * max(mine, 1):
                bad.append((s, "year", "", key, mine, game))
    print(f"PART 1  {len(dump['cases'])} cases + {len(dump['annual'])} years compared, worst relative difference {worst:.2e}")
    print("        MISMATCHES:" if bad else "        no mismatches: the game computes exactly what the rules say")
    for row in bad[:20]:
        print("        ", row)
    return not bad


# ---------- RETScreen Appendix A ----------

def runner_d(qd):
    k = 0.46  # valid for d < 1.8 m, true for all our sizes
    return k * qd ** 0.473


def ret_peak_reaction(kind, h, qd, rm=4.5):
    d = runner_d(qd)
    if kind == "francis":
        nq = 600 * h ** -0.5
        enq = ((nq - 56) / 256) ** 2
        ed = (0.081 + enq) * (1 - 0.789 * d ** -0.2)
        return nq, (0.919 - enq + ed) - 0.0305 + 0.005 * rm
    nq = 800 * h ** -0.5
    enq = ((nq - 170) / 700) ** 2
    ed = (0.095 + enq) * (1 - 0.789 * d ** -0.2)
    return nq, (0.905 - enq + ed) - 0.0305 + 0.005 * rm


def ret_eff(kind, h, qd, q):
    if kind == "crossflow":
        x = (qd - q) / qd
        return 0.79 - 0.15 * x - 1.37 * x ** 14
    nq, ep = ret_peak_reaction(kind, h, qd)
    if kind == "kaplan":
        qp = 0.75 * qd
        return (1 - 3.5 * ((qp - q) / qp) ** 6) * ep
    qp = 0.65 * qd * nq ** 0.05
    if ep <= 0 or 3.94 - 0.0195 * nq <= 0:
        return 0
    if q <= qp:
        return (1 - 1.25 * ((qp - q) / qp) ** (3.94 - 0.0195 * nq)) * ep
    er = (1 - 0.0072 * nq ** 0.4) * ep
    return ep - ((q - qp) / (qd - qp)) ** 2 * (ep - er)


def part2():
    print("\nPART 2  turbine efficiency (medium turbine, design flow 2 m3/s), RETScreen Appendix A")
    loads = [0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.75, 0.85, 1.0]
    print("  " + " " * 24 + "load:  " + "  ".join(f"{L:4.2f}" for L in loads))
    for kind, heads in (("kaplan", [3, 5, 8.6, 11.6]), ("francis", [11.6]), ("crossflow", [5])):
        for h in heads:
            print(f"  {kind:9s} head {h:5.1f} m         " + "  ".join(f"{max(ret_eff(kind, h, 2.0, L * 2.0), 0):4.2f}" for L in loads))


if __name__ == "__main__":
    ok = part1(json.load(open(sys.argv[1], encoding="utf-8")))
    part2()
    sys.exit(0 if ok else 1)
