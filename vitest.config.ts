import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["tests/model/**/*.test.ts", "tests/game/**/*.test.ts", "tests/2d/**/*.test.ts"], environment: "node" },
});
