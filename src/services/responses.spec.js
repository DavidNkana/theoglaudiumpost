import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { responses } from "@/services/responses";

/**
 * Unit tests for src/services/responses.js
 *
 * The source uses two undeclared globals, `Swal` and `Toast`, that are provided
 * by the app bootstrap at runtime. We stub them here so the unit is isolated and
 * we can assert exact call arguments / returned values.
 */

const swalFire = vi.fn();
const toastFire = vi.fn();

beforeEach(() => {
  swalFire.mockReset();
  toastFire.mockReset();
  vi.stubGlobal("Swal", { fire: swalFire });
  vi.stubGlobal("Toast", { fire: toastFire });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("responses.throwErr", () => {
  it("uses the default title when called without a title argument", () => {
    const sentinel = Symbol("swal-result");
    swalFire.mockReturnValue(sentinel);

    const result = responses.throwErr("boom");

    expect(result).toBe(sentinel);
    expect(swalFire).toHaveBeenCalledTimes(1);
    expect(swalFire).toHaveBeenCalledWith({
      title: "An Error Occurred",
      icon: "error",
      html: "<p>boom</p>",
      showCloseButton: true,
    });
  });

  it("uses the provided title when called with a title argument", () => {
    const sentinel = Symbol("swal-result-2");
    swalFire.mockReturnValue(sentinel);

    const result = responses.throwErr("kaboom", "Custom Title");

    expect(result).toBe(sentinel);
    expect(swalFire).toHaveBeenCalledTimes(1);
    expect(swalFire).toHaveBeenCalledWith({
      title: "Custom Title",
      icon: "error",
      html: "<p>kaboom</p>",
      showCloseButton: true,
    });
  });
});

describe("responses.showSuccess", () => {
  it("fires a success toast with the given message and returns the result", () => {
    const sentinel = Symbol("toast-success");
    toastFire.mockReturnValue(sentinel);

    const result = responses.showSuccess("saved");

    expect(result).toBe(sentinel);
    expect(toastFire).toHaveBeenCalledTimes(1);
    expect(toastFire).toHaveBeenCalledWith({
      icon: "success",
      title: "saved",
    });
  });
});

describe("responses.showInfo", () => {
  it("fires an info toast with the given message and returns the result", () => {
    const sentinel = Symbol("toast-info");
    toastFire.mockReturnValue(sentinel);

    const result = responses.showInfo("heads up");

    expect(result).toBe(sentinel);
    expect(toastFire).toHaveBeenCalledTimes(1);
    expect(toastFire).toHaveBeenCalledWith({
      icon: "info",
      title: "heads up",
    });
  });
});

describe("responses.showWarning", () => {
  it("fires a warning toast with the given message and returns the result", () => {
    const sentinel = Symbol("toast-warning");
    toastFire.mockReturnValue(sentinel);

    const result = responses.showWarning("careful");

    expect(result).toBe(sentinel);
    expect(toastFire).toHaveBeenCalledTimes(1);
    expect(toastFire).toHaveBeenCalledWith({
      icon: "warning",
      title: "careful",
    });
  });
});
