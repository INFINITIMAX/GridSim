import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { ROOT, fail } from "./lib.mjs";

// Bundle the model so its real CATALOG object is checked, not a regex over source text.
const dir = join(ROOT, "node_modules", ".cache");
mkdirSync(dir, { recursive: true });
const out = join(dir, "verify-sources.mjs");
await build({ entryPoints: [join(ROOT, "src", "model", "index.ts")], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error" });
const { CATALOG } = await import(pathToFileURL(out).href);
rmSync(out, { force: true });
if (!CATALOG || typeof CATALOG !== "object") fail("src/model does not export CATALOG");
const notes = readFileSync(join(ROOT, "docs", "calcule.md"), "utf8");
const kinds = ["nuclear", "coal", "ccgt", "ocgt", "hydro", "solar", "wind", "battery"];
const problems = [];
for (const kind of kinds) {
  const spec = CATALOG[kind];
  if (!spec) { problems.push(`${kind}: missing from CATALOG`); continue; }
  if (!/^https:\/\/\S+$/.test(spec.source ?? "")) problems.push(`${kind}: source is not an https URL`);
  else if (!notes.includes(spec.source)) problems.push(`${kind}: ${spec.source} does not appear in docs/calcule.md`);
}
if (problems.length) fail(problems.join("\n"));
console.log(`${kinds.length} generator types cite sources found in docs/calcule.md`);
console.log("source verification passed");
