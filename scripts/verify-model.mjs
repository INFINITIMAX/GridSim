import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { ROOT, fail, run } from "./lib.mjs";

// Every named model test T1-T7 must exist and pass; a missing name fails even if the suite is green.
const dir = join(ROOT, "node_modules", ".cache");
mkdirSync(dir, { recursive: true });
const report = join(dir, "vitest-model.json");
rmSync(report, { force: true });
const { code, out } = run("npx", ["vitest", "run", "--reporter=json", `--outputFile=${report}`]);
let data;
try { data = JSON.parse(readFileSync(report, "utf8")); } catch { fail(`no vitest JSON report (exit ${code}):\n${out.slice(-3000)}`); }
const tests = data.testResults.flatMap((file) => file.assertionResults);
const failed = tests.filter((test) => test.status === "failed");
if (failed.length || code !== 0) fail(`failing tests: ${failed.map((test) => test.fullName).join("; ") || `vitest exit ${code}`}`);
const missing = ["T1", "T2", "T3", "T4", "T5", "T6", "T7"].filter((id) => !tests.some((test) => new RegExp(`\\b${id}\\b`).test(test.fullName) && test.status === "passed"));
if (missing.length) fail(`no passing test named ${missing.join(", ")}`);
console.log(`${tests.length} tests passed, T1-T7 present`);
console.log("model verification passed");
