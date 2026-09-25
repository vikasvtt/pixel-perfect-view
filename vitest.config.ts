import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Standalone test config (the app's Vite config is not used for tests).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "node",
    restoreMocks: true,
  },
});
