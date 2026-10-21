// Dump what the game's hydro code computes for a grid of cases, as JSON, for scripts/audit_hydro.py.
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const dir = mkdtempSync(join(tmpdir(), "gridsim-hydro-"));
const out = join(dir, "hydro.mjs");
await build({ entryPoints: ["2d/hydro.ts"], bundle: true, format: "esm", outfile: out, logLevel: "silent" });
const h = await import(pathToFileURL(out).href);

const cases = [];
for (const technology of ["kaplan", "francis", "crossflow"])
  for (const size of ["small", "medium", "large"])
    for (const count of [1, 2, 4])
      for (const damHeight of [3, 5, 8])
        for (const canal of [false, true])
          for (const fishLadder of [false, true])
            for (const gates of [false, true])
              for (const clog of [0, 0.5, 1])
                for (const flow of [0, 0.3, 0.8, 1.5, 3, 5, 7, 7.5, 9, 12]) {
                  const setup = { technology, size, count, damHeight, canal, gates, fishLadder, autoCleaner: false };
                  cases.push({ setup, flow, clog, op: h.operate(setup, flow, clog) });
                }
const annual = [];
for (const technology of ["kaplan", "francis", "crossflow"])
  for (const autoCleaner of [false, true]) {
    const setup = { technology, size: "medium", count: 2, damHeight: 8, canal: true, gates: true, fishLadder: true, autoCleaner };
    annual.push({ setup, year: h.annual(setup) });
  }
writeFileSync(process.argv[2] ?? "hydro-dump.json", JSON.stringify({ cases, annual }));
console.log(`dumped ${cases.length} cases`);
