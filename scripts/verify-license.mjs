import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, fail } from "./lib.mjs";

const text = readFileSync(join(ROOT, "LICENSE"), "utf8");
if (!text.startsWith("MIT License")) fail("LICENSE does not start with 'MIT License'");
const holder = text.match(/^Copyright \(c\) (\d{4}) (.+)$/m);
if (!holder) fail("no 'Copyright (c) <year> <holder>' line");
if (Number(holder[1]) < 2026) fail(`copyright year ${holder[1]} is before 2026`);
if (!holder[2].trim()) fail("copyright holder is empty");
if (!text.includes("Permission is hereby granted, free of charge")) fail("MIT permission grant missing");
console.log(`holder: ${holder[2].trim()} (${holder[1]})`);
console.log("license verification passed");
