// Gate L3: the production build emits the /learn/ page next to the main page.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, fail, run } from "./lib.mjs";

const { code, out } = run("npx", ["vite", "build"]);
if (code !== 0) fail(`vite build failed:\n${out.slice(-4000)}`);
for (const page of ["index.html", "learn/index.html"]) {
  const file = resolve(ROOT, "dist", page);
  if (!existsSync(file)) fail(`missing dist/${page}`);
  if (!/<script[^>]+src="[^"]*assets\/[^"]+\.js"/.test(readFileSync(file, "utf8"))) fail(`dist/${page} does not load a bundled script`);
}
console.log("learn build verification passed");
