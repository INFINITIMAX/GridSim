import { fail, run } from "./lib.mjs";

const { code, out } = run("npx", ["tsc", "--noEmit"]);
if (code !== 0) fail(`tsc reported errors:\n${out.slice(0, 4000)}`);
console.log("type verification passed");
