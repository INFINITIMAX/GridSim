import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, fail, run } from "./lib.mjs";

const cache = run("npm", ["config", "get", "cache"]).out.trim();
if (!/^D:/i.test(cache)) fail(`npm cache resolves to '${cache}', not D:`);
const config = readFileSync(join(ROOT, "playwright.config.ts"), "utf8");
const usesChrome = /channel:\s*["']chrome["']/.test(config);
const browsersOnD = /^D:/i.test(process.env.PLAYWRIGHT_BROWSERS_PATH ?? "");
if (!usesChrome && !browsersOnD) fail("Playwright neither uses the installed Chrome channel nor a D: browsers path");
console.log(`npm cache: ${cache}; playwright: ${usesChrome ? "channel chrome" : process.env.PLAYWRIGHT_BROWSERS_PATH}`);
console.log("env verification passed");
