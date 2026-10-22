import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: { input: { main: resolve(__dirname, "index.html"), learn: resolve(__dirname, "learn/index.html") } },
  },
});
