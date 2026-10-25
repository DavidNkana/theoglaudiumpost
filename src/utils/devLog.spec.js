import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// utils/devLog.js captures `const isDev = IS_DEV` at IMPORT time, where IS_DEV
// comes from "@/config/env". To exercise both the dev (logging enabled) and
// production (logging disabled) branches of the internal `log` helper, we mock
// "@/config/env" and re-import the module fresh with `vi.resetModules()` so its
// import-time `isDev` constant is recomputed against the mocked IS_DEV value.

const MOD = "@/utils/devLog";

/**
 * Re-import utils/devLog.js fresh with IS_DEV mocked to the given value.
 *
 * @param {boolean} isDevValue - value exported as IS_DEV from "@/config/env"
 * @returns {Promise<{ devLog: object }>}
 */
async function importWithIsDev(isDevValue) {
  vi.resetModules();
  vi.doMock("@/config/env", () => ({ IS_DEV: isDevValue }));
  return import(MOD);
}

describe("utils/devLog", () => {
  let logSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/config/env");
    logSpy.mockRestore();
  });

  // ---- development: logging enabled (the `!isDev` === false branch) -------

  describe("when IS_DEV is true (development)", () => {
    it("info logs with the blue style and forwards every arg", async () => {
      const { devLog } = await importWithIsDev(true);
      devLog.info("hello", 1, { a: 2 });
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        "%c[INFO]",
        "color: #2c7be5; font-weight: bold;",
        "hello",
        1,
        { a: 2 }
      );
    });

    it("warn logs with the orange style", async () => {
      const { devLog } = await importWithIsDev(true);
      devLog.warn("careful");
      expect(logSpy).toHaveBeenCalledWith(
        "%c[WARN]",
        "color: #f0ad4e; font-weight: bold;",
        "careful"
      );
    });

    it("error logs with the red style", async () => {
      const { devLog } = await importWithIsDev(true);
      devLog.error("boom");
      expect(logSpy).toHaveBeenCalledWith(
        "%c[ERROR]",
        "color: #d9534f; font-weight: bold;",
        "boom"
      );
    });

    it("success logs with the green style", async () => {
      const { devLog } = await importWithIsDev(true);
      devLog.success("done");
      expect(logSpy).toHaveBeenCalledWith(
        "%c[SUCCESS]",
        "color: #5cb85c; font-weight: bold;",
        "done"
      );
    });

    it("debug logs with the gray style", async () => {
      const { devLog } = await importWithIsDev(true);
      devLog.debug("trace");
      expect(logSpy).toHaveBeenCalledWith(
        "%c[DEBUG]",
        "color: #6c757d; font-weight: bold;",
        "trace"
      );
    });

    it("works with no extra args (the ...args spread is empty)", async () => {
      const { devLog } = await importWithIsDev(true);
      devLog.info();
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(
        "%c[INFO]",
        "color: #2c7be5; font-weight: bold;"
      );
    });
  });

  // ---- production: logging disabled (the `!isDev` === true branch) --------

  describe("when IS_DEV is false (production)", () => {
    it("info is a no-op and never touches console.log", async () => {
      const { devLog } = await importWithIsDev(false);
      devLog.info("hidden");
      expect(logSpy).not.toHaveBeenCalled();
    });

    it("every level is a no-op", async () => {
      const { devLog } = await importWithIsDev(false);
      devLog.info("a");
      devLog.warn("b");
      devLog.error("c");
      devLog.success("d");
      devLog.debug("e");
      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
