import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  mode: "test",
  env: {},
}));

/**
 * Imports the module fresh with a given mode and environment.
 *
 * The config reads the environment when it is first evaluated, so each case
 * needs its own module instance.
 */
const importConfig = async ({ mode = "test", env = {} } = {}) => {
  vi.resetModules();
  vi.doMock("@/config/env.js", () => ({
    readEnv: (key, fallback) =>
      env[key] !== undefined ? env[key] : fallback,
    MODE: mode,
  }));

  return import("@/config/supabase.js");
};

describe("config/supabase.js", () => {
  beforeEach(() => {
    state.mode = "test";
    state.env = {};
    vi.resetModules();
    vi.doUnmock("@/config/env.js");
  });

  it("reads the project URL and key from the environment", async () => {
    const module = await importConfig({
      env: {
        VITE_SUPABASE_URL: "https://project.supabase.co",
        VITE_SUPABASE_ANON_KEY: "anon-key",
      },
    });

    expect(module.SUPABASE_URL).toBe("https://project.supabase.co");
    expect(module.SUPABASE_ANON_KEY).toBe("anon-key");
  });

  it("falls back to an empty value when nothing is configured", async () => {
    const module = await importConfig();

    expect(module.SUPABASE_URL).toBe("");
    expect(module.SUPABASE_ANON_KEY).toBe("");
  });

  it("fails a production build without a Supabase connection", async () => {
    await expect(importConfig({ mode: "production" })).rejects.toThrow(
      /VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required/,
    );
  });

  it("allows a production build when the connection is configured", async () => {
    const module = await importConfig({
      mode: "production",
      env: {
        VITE_SUPABASE_URL: "https://project.supabase.co",
        VITE_SUPABASE_ANON_KEY: "anon-key",
      },
    });

    expect(module.SUPABASE_URL).toBe("https://project.supabase.co");
  });
});
