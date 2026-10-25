/**
 * Unit tests for config/app.js.
 *
 * env.js is mocked at the module boundary so the values app.js reads at import
 * time are fully controlled. MODE-dependent constants (SENTRY_ENABLED) and the
 * origin-dependent helper (isPushAllowedOrigin) are exercised across both
 * branches via vi.resetModules() + dynamic re-import with a fresh env mock.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mutable controls the env.js mock reads from. Reset per-test before importing.
const envState = {
  boolEnv: {},
  env: {},
  MODE: "production",
  origin: "",
};

vi.mock("@/config/env.js", () => ({
  readEnv: vi.fn((key, fallback) =>
    Object.prototype.hasOwnProperty.call(envState.env, key)
      ? envState.env[key]
      : fallback
  ),
  readBoolEnv: vi.fn((key, fallback) =>
    Object.prototype.hasOwnProperty.call(envState.boolEnv, key)
      ? envState.boolEnv[key]
      : fallback
  ),
  // MODE is read as a live binding; getter keeps it in sync with envState.
  get MODE() {
    return envState.MODE;
  },
  currentOrigin: vi.fn(() => envState.origin),
}));

// app.js imports from "./env.js"; under the @ alias that resolves to the same
// module id as "@/config/env.js", so the mock above covers both.
vi.mock("./env.js", () => ({
  readEnv: vi.fn((key, fallback) =>
    Object.prototype.hasOwnProperty.call(envState.env, key)
      ? envState.env[key]
      : fallback
  ),
  readBoolEnv: vi.fn((key, fallback) =>
    Object.prototype.hasOwnProperty.call(envState.boolEnv, key)
      ? envState.boolEnv[key]
      : fallback
  ),
  get MODE() {
    return envState.MODE;
  },
  currentOrigin: vi.fn(() => envState.origin),
}));

function resetEnv() {
  envState.boolEnv = {};
  envState.env = {};
  envState.MODE = "production";
  envState.origin = "";
}

beforeEach(() => {
  vi.resetModules();
  resetEnv();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("config/app.js constants", () => {
  it("SHOW_ADS reflects readBoolEnv('VITE_SHOW_ADS', false) — true case", async () => {
    envState.boolEnv.VITE_SHOW_ADS = true;
    const mod = await import("@/config/app");
    expect(mod.SHOW_ADS).toBe(true);
  });

  it("SHOW_ADS falls back to false when unset", async () => {
    const mod = await import("@/config/app");
    expect(mod.SHOW_ADS).toBe(false);
  });

  it("reads SENTRY_DSN, ONESIGNAL_APP_ID, YOUTUBE_API_KEY, YOUTUBE_DEFAULT_CHANNEL_ID from env", async () => {
    envState.env.VITE_SENTRY_DNS = "https://sentry.example/123";
    envState.env.VITE_ONE_SIGNAL_APP_ID = "os-app-id";
    envState.env.VITE_YOUTUBE_API_KEY = "yt-key";
    envState.env.VITE_YOUTUBE_DEFAULT_CHANNEL_ID = "channel-123";

    const mod = await import("@/config/app");

    expect(mod.SENTRY_DSN).toBe("https://sentry.example/123");
    expect(mod.ONESIGNAL_APP_ID).toBe("os-app-id");
    expect(mod.YOUTUBE_API_KEY).toBe("yt-key");
    expect(mod.YOUTUBE_DEFAULT_CHANNEL_ID).toBe("channel-123");
  });

  it("uses empty-string fallbacks when those env vars are unset", async () => {
    const mod = await import("@/config/app");
    expect(mod.SENTRY_DSN).toBe("");
    expect(mod.ONESIGNAL_APP_ID).toBe("");
    expect(mod.YOUTUBE_API_KEY).toBe("");
    expect(mod.YOUTUBE_DEFAULT_CHANNEL_ID).toBe("");
  });

  it("exposes the static SENTRY_TRACE_TARGETS and PRODUCTION_ORIGINS", async () => {
    const mod = await import("@/config/app");
    expect(mod.SENTRY_TRACE_TARGETS).toEqual([
      "localhost",
      "https://laudium.abc.co.zm/",
    ]);
    expect(mod.PRODUCTION_ORIGINS).toEqual([
      "https://laudiumpost.co.za",
      "https://www.laudiumpost.co.za",
    ]);
  });

  it("SENTRY_ENABLED is false in development MODE", async () => {
    envState.MODE = "development";
    const mod = await import("@/config/app");
    expect(mod.SENTRY_ENABLED).toBe(false);
  });

  it("SENTRY_ENABLED is true outside development MODE", async () => {
    envState.MODE = "production";
    const mod = await import("@/config/app");
    expect(mod.SENTRY_ENABLED).toBe(true);
  });
});

describe("isPushAllowedOrigin", () => {
  it("returns true for a production origin (regardless of MODE)", async () => {
    envState.origin = "https://laudiumpost.co.za";
    envState.MODE = "production";
    const mod = await import("@/config/app");
    expect(mod.isPushAllowedOrigin()).toBe(true);
  });

  it("returns false for a localhost origin even in development MODE (push is production-only)", async () => {
    envState.origin = "http://localhost:5173";
    envState.MODE = "development";
    const mod = await import("@/config/app");
    expect(mod.isPushAllowedOrigin()).toBe(false);
  });

  it("returns false for an unknown origin in development MODE", async () => {
    envState.origin = "https://evil.example";
    envState.MODE = "development";
    const mod = await import("@/config/app");
    expect(mod.isPushAllowedOrigin()).toBe(false);
  });

  it("returns false for an empty origin", async () => {
    envState.origin = "";
    envState.MODE = "production";
    const mod = await import("@/config/app");
    expect(mod.isPushAllowedOrigin()).toBe(false);
  });
});
