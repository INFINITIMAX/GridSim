import { defineConfig } from "@playwright/test";

// Uses the installed Chrome (channel) so no browser download lands on C:.
export default defineConfig({
  testDir: "tests/e2e",
  use: { channel: "chrome", baseURL: "http://localhost:4173" },
  webServer: { command: "npm run preview -- --port 4173 --strictPort", port: 4173, reuseExistingServer: true },
});
