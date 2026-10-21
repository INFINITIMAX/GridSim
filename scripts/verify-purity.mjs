import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ROOT, fail } from "./lib.mjs";

// src/model must stay pure and deterministic: no three.js, no DOM, no clocks, no randomness.
const FORBIDDEN = [
  [/from\s+["']three/, "imports three"],
  [/\b(window|document|navigator|localStorage|requestAnimationFrame)\b/, "touches the DOM"],
  [/\b(performance\.now|Date\.now|new Date)\b/, "reads a clock"],
  [/\bMath\.random\b/, "uses randomness"],
];
const strip = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const offences = (code) => FORBIDDEN.filter(([pattern]) => pattern.test(strip(code))).map(([, why]) => why);

// Positive control: a planted impure file must be rejected.
if (!offences('import * as THREE from "three";\nconst x = Math.random();').length) fail("positive control: scanner accepted an impure file");

const dir = join(ROOT, "src", "model");
const walk = (path) => statSync(path).isDirectory() ? readdirSync(path).flatMap((name) => walk(join(path, name))) : [path];
const files = walk(dir).filter((file) => file.endsWith(".ts"));
if (!files.length) fail("src/model has no .ts files");
const bad = files.map((file) => [file, offences(readFileSync(file, "utf8"))]).filter(([, why]) => why.length);
if (bad.length) fail(bad.map(([file, why]) => `${file}: ${why.join(", ")}`).join("\n"));
console.log(`checked ${files.length} model files; positive control rejected`);
console.log("purity verification passed");
