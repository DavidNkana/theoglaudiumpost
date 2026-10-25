import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// config/env.js is the single source of truth for environment access. It reads
// `import.meta.env` (Vite) and `process.env` (Node) at IMPORT time and derives
// module-level constants (MODE, IS_DEV, BASE_URL) from them.
//
// Levers used to drive every branch:
//
//  - Vite side (`import.meta.env`): `vi.stubEnv(key, value)`. Vitest wires this
//    into every module's `import.meta.env`, including dynamically re-imported
//    ones. Values are always coerced to strings.
//
//  - Node side (`process.env`): the module captures `nodeEnv = process.env` at
//    import time. To inject genuine `null` / boolean values (the real proxy and
//    vi.stubEnv both string-coerce), we swap the whole `process.env` for a plain
//    object for the duration of a fresh import, then restore it. We never use
//    vi.stubEnv in the same test, since swapping process.env destroys the store
//    that backs the import.meta.env proxy.
//
//  - NODE_ENV (a string): set directly on the real process.env around an import.
//
// `vi.resetModules()` forces the module to re-run its import-time code.

const MOD = "@/config/env";

/** Re-import config/env.js fresh against the current env. */
async function freshImport() {
  vi.resetModules();
  return import(MOD);
}

/**
 * Re-import config/env.js with process.env swapped for a plain object, so that
 * `nodeEnv` captures genuine (non-string-coerced) values. Restores the real
 * process.env afterward.
 *
 * @param {object} nodeEnv - plain object placed at process.env during import
 */
async function importWithNodeEnv(nodeEnv) {
  const nodeDesc = Object.getOwnPropertyDescriptor(process, "env");
  Object.defineProperty(process, "env", {
    value: nodeEnv,
    configurable: true,
    writable: true,
  });
  vi.resetModules();
  try {
    return await import(MOD);
  } finally {
    Object.defineProperty(process, "env", nodeDesc);
  }
}

describe("config/env", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // ---- readEnv -----------------------------------------------------------

  it("readEnv returns the Vite env value when present (Vite preferred over Node)", async () => {
    vi.stubEnv("VITE_SAMPLE", "vite-value");
    const { readEnv } = await freshImport();
    expect(readEnv("VITE_SAMPLE")).toBe("vite-value");
  });

  it("readEnv falls back to the Node env value when the Vite key is undefined", async () => {
    // viteEnv[key] is undefined here, so the expression falls through to nodeEnv[key].
    const { readEnv } = await importWithNodeEnv({ ONLY_NODE: "node-value" });
    expect(readEnv("ONLY_NODE")).toBe("node-value");
  });

  it("readEnv returns the explicit fallback when the key is absent everywhere", async () => {
    const { readEnv } = await freshImport();
    expect(readEnv("ENV_SPEC_ABSENT", "fb")).toBe("fb");
  });

  it("readEnv returns undefined (the default fallback) when called without a fallback", async () => {
    const { readEnv } = await freshImport();
    expect(readEnv("ENV_SPEC_ABSENT")).toBeUndefined();
  });

  it("readEnv treats an explicit null value as absent and returns the fallback", async () => {
    // Genuine null via a plain-object node env hits the `|| value === null` side.
    const { readEnv } = await importWithNodeEnv({ NULL_KEY: null });
    expect(readEnv("NULL_KEY", "fallback-for-null")).toBe("fallback-for-null");
  });

  // ---- readBoolEnv -------------------------------------------------------

  it('readBoolEnv returns true for the string "true"', async () => {
    vi.stubEnv("VITE_FLAG", "true");
    const { readBoolEnv } = await freshImport();
    expect(readBoolEnv("VITE_FLAG")).toBe(true);
  });

  it("readBoolEnv returns true for a genuine boolean true value", async () => {
    // Real boolean via node env hits the `value === true` side of the OR.
    const { readBoolEnv } = await importWithNodeEnv({ NODE_FLAG: true });
    expect(readBoolEnv("NODE_FLAG")).toBe(true);
  });

  it('readBoolEnv returns false for a non-"true" string value', async () => {
    vi.stubEnv("VITE_FLAG", "nope");
    const { readBoolEnv } = await freshImport();
    expect(readBoolEnv("VITE_FLAG")).toBe(false);
  });

  it("readBoolEnv returns the default fallback (false) when the key is unset", async () => {
    const { readBoolEnv } = await freshImport();
    expect(readBoolEnv("ENV_SPEC_ABSENT")).toBe(false);
  });

  it("readBoolEnv returns the explicit fallback when the key is unset", async () => {
    const { readBoolEnv } = await freshImport();
    expect(readBoolEnv("ENV_SPEC_ABSENT", true)).toBe(true);
  });

  // ---- MODE / IS_DEV -----------------------------------------------------

  it("MODE uses viteEnv.MODE and IS_DEV is true in development", async () => {
    vi.stubEnv("MODE", "development");
    const mod = await freshImport();
    expect(mod.MODE).toBe("development");
    expect(mod.IS_DEV).toBe(true);
  });

  it("MODE uses viteEnv.MODE for a non-development mode and IS_DEV is false", async () => {
    vi.stubEnv("MODE", "production");
    const mod = await freshImport();
    expect(mod.MODE).toBe("production");
    expect(mod.IS_DEV).toBe(false);
  });

  it("MODE falls back to nodeEnv.NODE_ENV when viteEnv.MODE is empty", async () => {
    // Empty string is falsy, so `viteEnv.MODE || ...` falls through to NODE_ENV.
    vi.stubEnv("MODE", "");
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "staging";
    try {
      const mod = await freshImport();
      expect(mod.MODE).toBe("staging");
      expect(mod.IS_DEV).toBe(false);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('MODE falls back to "production" when neither viteEnv.MODE nor nodeEnv.NODE_ENV is set', async () => {
    vi.stubEnv("MODE", "");
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "";
    try {
      const mod = await freshImport();
      expect(mod.MODE).toBe("production");
      expect(mod.IS_DEV).toBe(false);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  // ---- BASE_URL ----------------------------------------------------------

  it("BASE_URL uses viteEnv.BASE_URL when present", async () => {
    vi.stubEnv("BASE_URL", "/app/");
    const mod = await freshImport();
    expect(mod.BASE_URL).toBe("/app/");
  });

  it('BASE_URL falls back to "/" when viteEnv.BASE_URL is empty', async () => {
    vi.stubEnv("BASE_URL", "");
    const mod = await freshImport();
    expect(mod.BASE_URL).toBe("/");
  });

  // ---- import-time nodeEnv `: {}` fallback ------------------------------

  it("falls back to an empty nodeEnv map when process.env is falsy at import time", async () => {
    // Drives the `: {}` (false) side of the nodeEnv ternary. A falsy-but-safe
    // process.env value ("") keeps Vitest's import.meta.env proxy working while
    // making `process.env` falsy for the module's own guard.
    const nodeDesc = Object.getOwnPropertyDescriptor(process, "env");
    Object.defineProperty(process, "env", {
      value: "",
      configurable: true,
      writable: true,
    });
    let mod;
    try {
      mod = await freshImport();
    } finally {
      Object.defineProperty(process, "env", nodeDesc);
    }
    // nodeEnv collapsed to {} -> readEnv yields its fallback, MODE -> production.
    expect(mod.readEnv("ENV_SPEC_ABSENT", "df")).toBe("df");
    expect(mod.MODE).toBe("production");
  });

  // ---- currentOrigin -----------------------------------------------------

  it("currentOrigin returns window.location.origin in a browser context", async () => {
    vi.stubGlobal("window", { location: { origin: "https://laudium.test" } });
    const { currentOrigin } = await freshImport();
    expect(currentOrigin()).toBe("https://laudium.test");
  });

  it('currentOrigin returns "" when window is undefined (non-browser)', async () => {
    vi.stubGlobal("window", undefined);
    const { currentOrigin } = await freshImport();
    expect(currentOrigin()).toBe("");
  });

  it('currentOrigin returns "" when window exists but window.location is absent', async () => {
    vi.stubGlobal("window", {});
    const { currentOrigin } = await freshImport();
    expect(currentOrigin()).toBe("");
  });
});
