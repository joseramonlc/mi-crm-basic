import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // node para las suites puras; query y cliente declaran su entorno por
    // archivo con `@vitest-environment` (edge-runtime / jsdom) — los globs por
    // entorno de configuraciones antiguas ya no existen en Vitest 4.
    environment: "node",
    server: { deps: { inline: ["convex-test"] } },
  },
});
