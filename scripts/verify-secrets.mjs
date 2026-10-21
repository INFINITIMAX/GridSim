import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, fail, run } from "./lib.mjs";

const PATTERNS = [
  /AKIA[0-9A-Z]{16}/,
  /\bsk-[A-Za-z0-9_-]{20,}/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/,
  /\bxox[abpr]-[A-Za-z0-9-]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /securityToken=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
  /\b(api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"'\s]{12,}["']/i,
];
const flags = (text) => PATTERNS.some((pattern) => pattern.test(text));

// Positive control: the scanner must catch a planted secret, or an empty result proves nothing.
const planted = ["const api_key = \"", "abcdef0123456789XYZ", "\";"].join("");
if (!flags(planted)) fail("positive control: scanner missed a planted secret");

const ignored = run("git", ["check-ignore", "-q", ".env"]);
if (ignored.code !== 0) fail(".env is not git-ignored");
const tracked = run("git", ["ls-files", "-z"]).out.split("\0").filter(Boolean);
if (!tracked.length) fail("git ls-files returned nothing");
const hits = tracked.filter((file) => !file.endsWith("package-lock.json") && file !== "scripts/verify-secrets.mjs").filter((file) => {
  try { return flags(readFileSync(join(ROOT, file), "utf8")); } catch { return false; }
});
if (hits.length) fail(`possible secrets in: ${hits.join(", ")}`);
console.log(`scanned ${tracked.length} tracked files; positive control caught`);
console.log("secrets verification passed");
