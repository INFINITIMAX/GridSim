// Shared helpers for verify-*.mjs gate scripts: each script prints its success marker only after every assertion passes.
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

// npm/npx are .cmd shims on Windows and need a shell; the arguments here are fixed strings, so one command line is safe.
export function run(command, args, options = {}) {
  const line = [command, ...args].join(" ");
  const result = spawnSync(line, { cwd: ROOT, encoding: "utf8", shell: true, maxBuffer: 64 * 1024 * 1024, ...options });
  return { code: result.status ?? 1, out: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}
