import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Unit tests for config/api.js.
 *
 * The module reads env/config at IMPORT time via the single env source
 * (config/env.js): `readEnv(key, fallback)` and the `MODE` constant. Both are
 * mocked at the boundary so each MODE branch of the API_URL ternary can be
 * exercised deterministically with vi.resetModules() + dynamic import().
 */

const API_BASE_URL = "/api/v1/";

// Mock the env boundary. `MODE` is read from a mutable holder so each test can
// flip it before re-importing the module under test.
const envState = {
  MODE: "production",
  // readEnv returns the fallback by default so the resolved URLs are
  // predictable unless a test overrides specific keys.
  values: {},
};

vi.mock("./env.js", () => ({
  get MODE() {
    return envState.MODE;
  },
  readEnv: vi.fn((key, fallback) =>
    Object.prototype.hasOwnProperty.call(envState.values, key)
      ? envState.values[key]
      : fallback,
  ),
}));

import { readEnv } from "./env.js";

async function loadModule(mode, values = {}) {
  envState.MODE = mode;
  envState.values = values;
  vi.resetModules();
  return import("@/config/api");
}

describe("config/api", () => {
  beforeEach(() => {
    readEnv.mockClear();
    envState.MODE = "production";
    envState.values = {};
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("exposes the same-origin API_BASE_URL constant", async () => {
    const mod = await loadModule("test");
    expect(mod.API_BASE_URL).toBe(API_BASE_URL);
    expect(mod.API_BASE_URL).not.toContain("/laudium/api/");
  });

  it("reads the three env keys with the correct fallback chain", async () => {
    await loadModule("test");

    // devBaseUrl falls back to API_BASE_URL
    expect(readEnv).toHaveBeenNthCalledWith(
      1,
      "VITE_DEV_API_BASE_URL",
      API_BASE_URL,
    );
    // testBaseUrl falls back to devBaseUrl (which here equals API_BASE_URL)
    expect(readEnv).toHaveBeenNthCalledWith(
      2,
      "VITE_TEST_API_BASE_URL",
      API_BASE_URL,
    );
    // prodBaseUrl has no fallback: production must identify its backend.
    expect(readEnv).toHaveBeenNthCalledWith(
      3,
      "VITE_PROD_API_BASE_URL",
      "",
    );
  });

  it("development MODE → API_URL resolves to the dev base url branch", async () => {
    const mod = await loadModule("development", {
      VITE_DEV_API_BASE_URL: "https://dev.example/",
      VITE_TEST_API_BASE_URL: "https://test.example/",
      VITE_PROD_API_BASE_URL: "https://prod.example/",
    });
    expect(mod.API_URL).toBe("https://dev.example/");
    expect(mod.default.API_URL).toBe("https://dev.example/");
  });

  it("test MODE → API_URL resolves to the test base url branch", async () => {
    const mod = await loadModule("test", {
      VITE_DEV_API_BASE_URL: "https://dev.example/",
      VITE_TEST_API_BASE_URL: "https://test.example/",
      VITE_PROD_API_BASE_URL: "https://prod.example/",
    });
    expect(mod.API_URL).toBe("https://test.example/");
    expect(mod.default.API_URL).toBe("https://test.example/");
  });

  it("production MODE → API_URL resolves to the prod base url branch", async () => {
    const mod = await loadModule("production", {
      VITE_DEV_API_BASE_URL: "https://dev.example/",
      VITE_TEST_API_BASE_URL: "https://test.example/",
      VITE_PROD_API_BASE_URL: "https://prod.example/",
    });
    expect(mod.API_URL).toBe("https://prod.example/");
    expect(mod.default.API_URL).toBe("https://prod.example/");
  });

  it("production MODE fails clearly when the backend URL is missing", async () => {
    await expect(loadModule("production")).rejects.toThrow(
      "VITE_PROD_API_BASE_URL is required",
    );
  });

  it("test MODE with VITE_TEST unset falls back through devBaseUrl", async () => {
    // Only the dev key is set; testBaseUrl should inherit devBaseUrl's value.
    const mod = await loadModule("test", {
      VITE_DEV_API_BASE_URL: "https://dev-only.example/",
    });
    expect(mod.API_URL).toBe("https://dev-only.example/");
  });

  it("default export bundles both constants", async () => {
    const mod = await loadModule("test");
    expect(mod.default).toEqual({
      API_BASE_URL: mod.API_BASE_URL,
      API_URL: mod.API_URL,
    });
  });
});
