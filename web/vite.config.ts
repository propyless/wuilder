import { defineConfig } from "vitest/config";

// For GitHub Pages project sites, set e.g. base: '/your-repo-name/' via VITE_BASE
export default defineConfig({
  base: process.env.VITE_BASE || "/",
  publicDir: "public",
  test: {
    globals: true,
  },
});
