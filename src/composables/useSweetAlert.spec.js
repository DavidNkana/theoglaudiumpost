import { describe, it, expect, beforeEach, vi } from "vitest";

// --- Mock external boundary: sweetalert2 (default export `Swal`) ---
// `Swal.mixin` must return an object exposing `fire` (used by the toast helper),
// and `Swal.fire` is used directly by success/error/confirm.
// `vi.hoisted` keeps these mocks initialized before the hoisted `vi.mock` factory runs.
const { toastFireMock, mixinMock, fireMock } = vi.hoisted(() => {
  const toastFireMock = vi.fn();
  return {
    toastFireMock,
    mixinMock: vi.fn(() => ({ fire: toastFireMock })),
    fireMock: vi.fn(),
  };
});

vi.mock("sweetalert2", () => ({
  default: {
    mixin: mixinMock,
    fire: fireMock,
  },
}));

// The composable also imports the SweetAlert2 stylesheet purely for side effects.
// Stub it so jsdom/vitest does not try to parse real CSS.
vi.mock("sweetalert2/dist/sweetalert2.min.css", () => ({}));

import { useSweetAlert } from "./useSweetAlert.js";

describe("useSweetAlert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-arm default resolved values so each helper returns a thenable.
    fireMock.mockResolvedValue({ isConfirmed: true });
    toastFireMock.mockResolvedValue({ dismiss: undefined });
  });

  it("configures the toast mixin once with the expected preset on creation", () => {
    const api = useSweetAlert();

    // mixin is invoked during composable setup with the toast preset.
    expect(mixinMock).toHaveBeenCalledTimes(1);
    expect(mixinMock).toHaveBeenCalledWith({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });

    // The composable exposes exactly the documented surface.
    expect(Object.keys(api).sort()).toEqual(
      ["confirm", "error", "showToast", "success"].sort()
    );
    expect(typeof api.success).toBe("function");
    expect(typeof api.error).toBe("function");
    expect(typeof api.confirm).toBe("function");
    expect(typeof api.showToast).toBe("function");
  });

  describe("success", () => {
    it("uses default title/text/options when called with no arguments", async () => {
      const { success } = useSweetAlert();

      const result = await success();

      expect(fireMock).toHaveBeenCalledTimes(1);
      expect(fireMock).toHaveBeenCalledWith({
        icon: "success",
        title: "Success!",
        text: "",
      });
      // Returns the underlying Swal.fire promise result.
      expect(result).toEqual({ isConfirmed: true });
    });

    it("forwards explicit title, text and merges extra options", async () => {
      const { success } = useSweetAlert();

      await success("Saved", "Your data is stored", {
        confirmButtonText: "Great",
      });

      expect(fireMock).toHaveBeenCalledWith({
        icon: "success",
        title: "Saved",
        text: "Your data is stored",
        confirmButtonText: "Great",
      });
    });

    it("allows options to override the spread-default keys", async () => {
      const { success } = useSweetAlert();

      // The `...options` spread comes last, so an `icon` in options wins.
      await success("T", "X", { icon: "info", title: "overridden" });

      expect(fireMock).toHaveBeenCalledWith({
        icon: "info",
        title: "overridden",
        text: "X",
      });
    });
  });

  describe("error", () => {
    it("uses default title/text/options when called with no arguments", async () => {
      const { error } = useSweetAlert();

      const result = await error();

      expect(fireMock).toHaveBeenCalledTimes(1);
      expect(fireMock).toHaveBeenCalledWith({
        icon: "error",
        title: "Oops!",
        text: "",
      });
      expect(result).toEqual({ isConfirmed: true });
    });

    it("forwards explicit arguments and merges options", async () => {
      const { error } = useSweetAlert();

      await error("Failed", "Something broke", { footer: "retry" });

      expect(fireMock).toHaveBeenCalledWith({
        icon: "error",
        title: "Failed",
        text: "Something broke",
        footer: "retry",
      });
    });

    it("propagates rejection from the underlying Swal.fire", async () => {
      const { error } = useSweetAlert();
      const boom = new Error("swal-failure");
      fireMock.mockRejectedValueOnce(boom);

      await expect(error("X")).rejects.toThrow("swal-failure");
    });
  });

  describe("confirm", () => {
    it("uses default title/text/options and the warning preset", async () => {
      const { confirm } = useSweetAlert();

      const result = await confirm();

      expect(fireMock).toHaveBeenCalledTimes(1);
      expect(fireMock).toHaveBeenCalledWith({
        title: "Are you sure?",
        text: "",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "Cancel",
      });
      expect(result).toEqual({ isConfirmed: true });
    });

    it("forwards explicit arguments and lets options override defaults", async () => {
      const { confirm } = useSweetAlert();

      await confirm("Delete item?", "This cannot be undone", {
        confirmButtonText: "Delete",
        cancelButtonText: "Keep",
      });

      expect(fireMock).toHaveBeenCalledWith({
        title: "Delete item?",
        text: "This cannot be undone",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete",
        cancelButtonText: "Keep",
      });
    });

    it("resolves with the cancellation result from Swal", async () => {
      const { confirm } = useSweetAlert();
      fireMock.mockResolvedValueOnce({ isConfirmed: false, dismiss: "cancel" });

      const result = await confirm("Sure?");

      expect(result).toEqual({ isConfirmed: false, dismiss: "cancel" });
    });
  });

  describe("showToast", () => {
    it("uses default icon/message when called with no arguments", async () => {
      const { showToast } = useSweetAlert();

      await showToast();

      expect(toastFireMock).toHaveBeenCalledTimes(1);
      expect(toastFireMock).toHaveBeenCalledWith({
        icon: "success",
        title: "",
      });
      // The direct Swal.fire must NOT be used for toasts.
      expect(fireMock).not.toHaveBeenCalled();
    });

    it("forwards explicit icon and message through the mixin instance", async () => {
      const { showToast } = useSweetAlert();

      const result = await showToast("error", "It failed");

      expect(toastFireMock).toHaveBeenCalledWith({
        icon: "error",
        title: "It failed",
      });
      expect(result).toEqual({ dismiss: undefined });
    });

    it("propagates rejection from the toast mixin fire", async () => {
      const { showToast } = useSweetAlert();
      toastFireMock.mockRejectedValueOnce(new Error("toast-failure"));

      await expect(showToast("info", "msg")).rejects.toThrow("toast-failure");
    });
  });
});
