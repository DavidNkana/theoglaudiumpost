import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

/**
 * Vitest configuration.
 *
 * Coverage gate is the AGENTS Multi-Stack Quality Gate Contract standard:
 * 100% line / branch / function / statement, enforced PER FILE over all owned
 * executable source. The gate fails loud on any uncovered code — it is not
 * scoped down to "files that happen to have tests". Generated code is the only
 * permitted exclusion and is listed in docs/hod/coverage-exceptions.md.
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // vue3-masonry-css ships a broken `main` (./dist/index.cjs does not exist);
      // point at its real ESM entry so istanbul can instrument MasonryGrid.vue.
      "vue3-masonry-css": fileURLToPath(
        new URL("./node_modules/vue3-masonry-css/dist/vue3-masonry.es.js", import.meta.url)
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{js,ts}"],
    coverage: {
      // istanbul is the accurate branch instrumenter; V8 phantom-reports the
      // completion edge of try/catch/finally blocks (see docs/hod/quality-gates.md).
      provider: "istanbul",
      reporter: ["text-summary", "text", "html", "lcov"],
      // All owned executable source is in scope for the gate.
      include: ["src/**/*.{js,ts,vue}"],
      exclude: [
        "src/**/*.{test,spec}.{js,ts}",
        "src/main.js", // bootstrap/composition root, covered by E2E (Playwright)
      ],
      // 100% per-file — the real standard. Fails until every owned file is covered.
      thresholds: {
        perFile: true,
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
