import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { ROOT, fail, run } from "./lib.mjs";

const LIMIT = 1024 * 1024;
const { code, out } = run("npm", ["run", "build"]);
if (code !== 0) fail(`build failed:\n${out.slice(-4000)}`);
const assets = join(ROOT, "dist", "assets");
const files = readdirSync(assets).filter((name) => /\.(js|css)$/.test(name));
if (!files.length) fail("no JS or CSS assets in dist/assets");
const total = files.reduce((sum, name) => sum + gzipSync(readFileSync(join(assets, name))).length, 0);
console.log(`gzipped JS+CSS: ${(total / 1024).toFixed(1)} KB across ${files.length} files`);
if (total >= LIMIT) fail(`bundle ${total} bytes is not under ${LIMIT}`);
console.log("build verification passed");
