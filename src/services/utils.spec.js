import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The only collaborator is the Vuex store, imported as `../store/index`.
// Mock it at the boundary so showLoading/hideLoading can be asserted.
const commit = vi.fn();
vi.mock("@/store/index", () => ({
  default: { commit: (...args) => commit(...args) },
}));

import { utils } from "@/services/utils";

describe("services/utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("toPascalCase", () => {
    it("capitalises each word and lowercases the rest", () => {
      expect(utils.toPascalCase("hello world")).toBe("Hello World");
    });

    it("uppercases the leading character even for a single token", () => {
      expect(utils.toPascalCase("hELLO")).toBe("Hello");
    });
  });

  describe("cutLength", () => {
    it("returns the string unchanged when shorter than the default limit", () => {
      expect(utils.cutLength("short")).toBe("short");
    });

    it("truncates and appends ellipsis when at/over the limit (custom limit branch)", () => {
      expect(utils.cutLength("abcdefghij", 5)).toBe("abcde...");
    });

    it("uses the default limit of 45 when no limit argument is given", () => {
      const long = "x".repeat(50);
      expect(utils.cutLength(long)).toBe("x".repeat(45) + "...");
    });
  });

  describe("roundAmount", () => {
    it("strips a comma from a string amount and rounds to default 2 places", () => {
      expect(utils.roundAmount("1,234.567")).toBe(1234.57);
    });

    it("rounds a numeric amount using the provided decimalPlaces", () => {
      expect(utils.roundAmount(2.345, 1)).toBe(2.3);
    });

    it("rounds a numeric amount with the default decimalPlaces (no arg)", () => {
      // Default decimalPlaces is 2; 2.5 stays 2.5 after toFixed(2) -> Number.
      expect(utils.roundAmount(2.5)).toBe(2.5);
    });
  });

  describe("formatMoney", () => {
    it("formats a positive amount with thousands and decimal separators", () => {
      expect(utils.formatMoney(1234567.891)).toBe(" 1,234,567.89");
    });

    it("formats a negative amount with a leading minus sign", () => {
      expect(utils.formatMoney(-1234.5)).toBe(" -1,234.50");
    });

    it("formats a small amount where the integer part is 3 digits or fewer (j falsy branch)", () => {
      expect(utils.formatMoney(12.5)).toBe(" 12.50");
    });

    it("falls back to 0 when the amount coerces to a falsy number (Number(amount) || 0 branch)", () => {
      // roundAmount(0, 2) -> 0; formatNumber: Number(0) is falsy -> || 0.
      expect(utils.formatMoney(0)).toBe(" 0.00");
    });

    it("honours an explicit decimalCount of 0 (decimalCount falsy branch)", () => {
      // roundAmount(amount, 0) -> 12346, then formatNumber with decimalCount 0
      expect(utils.formatMoney(12345.6, 0)).toBe(" 12,346");
    });

    it("passes through custom decimal and thousands separators (all default-param branches set)", () => {
      expect(utils.formatMoney(1234.5, 2, ",", ".")).toBe(" 1.234,50");
    });
  });

  describe("formatNumber catch path (via formatMoney)", () => {
    it("logs the error and returns undefined when concatenation throws inside the try", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      // roundAmount(1234567, 2) succeeds, but formatNumber then concatenates the
      // `thousands` separator, whose toString throws -> caught -> console.error.
      const boom = new RangeError("boom");
      const badThousands = {
        toString() {
          throw boom;
        },
      };
      const result = utils.formatMoney(1234567, 2, ".", badThousands);
      expect(result).toBeUndefined();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toBe(boom);
      spy.mockRestore();
    });

    it("falls back to 2 decimals when decimalCount is NaN (isNaN ternary true branch)", () => {
      // roundAmount(5, NaN): (5).toFixed(NaN) -> "5", Number -> 5.
      // formatNumber receives NaN -> Math.abs(NaN)=NaN -> isNaN true -> 2 dp.
      expect(utils.formatMoney(5, NaN)).toBe(" 5.00");
    });
  });

  describe("formatQTY", () => {
    it("rounds to a whole number and formats with no decimals", () => {
      expect(utils.formatQTY(1234.9)).toBe(" 1,235");
    });
  });

  describe("removeIf", () => {
    it("filters the array by the predicate", () => {
      expect(utils.removeIf([1, 2, 3, 4], (n) => n % 2 === 0)).toEqual([2, 4]);
    });
  });

  describe("remove", () => {
    it("removes all entries strictly equal to the given object", () => {
      expect(utils.remove([1, 2, 1, 3], 1)).toEqual([2, 3]);
    });
  });

  describe("getNow", () => {
    it("returns the current date as a YYYY-MM-DD string", () => {
      const result = utils.getNow();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const expected = new Date().toISOString().split("T")[0];
      expect(result).toBe(expected);
    });
  });

  describe("showLoading / hideLoading", () => {
    it("showLoading commits setLoadingState with true", () => {
      utils.showLoading();
      expect(commit).toHaveBeenCalledWith("setLoadingState", true);
    });

    it("hideLoading commits setLoadingState with false", () => {
      utils.hideLoading();
      expect(commit).toHaveBeenCalledWith("setLoadingState", false);
    });
  });
});
