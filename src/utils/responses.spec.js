import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// --- Mock external boundary ---
// responses.js imports `store` from '../store/index' but never uses it in any
// executable method. Stub it so the test does not pull in the whole Vuex tree
// (which would drag in feature modules, the real API service, etc.).
vi.mock("../store/index", () => ({ default: {} }));

// The module relies on three runtime globals (`Swal`, `Toast`, `dateTimeManager`)
// that are attached to `window` elsewhere in the app bootstrap. We install spies
// on globalThis so every branch in the module can be exercised in isolation.
const fireMock = vi.fn();
const toastFireMock = vi.fn();
const shortenDisplayMock = vi.fn();

import { responses } from "./responses.js";

describe("utils/responses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fireMock.mockResolvedValue({ isConfirmed: true });
    toastFireMock.mockResolvedValue({ dismiss: undefined });
    shortenDisplayMock.mockReturnValue("18 Jun 2026");

    globalThis.Swal = { fire: fireMock };
    globalThis.Toast = { fire: toastFireMock };
    globalThis.dateTimeManager = { shortenDisplay: shortenDisplayMock };
  });

  afterEach(() => {
    delete globalThis.Swal;
    delete globalThis.Toast;
    delete globalThis.dateTimeManager;
  });

  describe("throwErr", () => {
    it("fires a warning dialog with the default title when no title is passed", async () => {
      const result = await responses.throwErr("Something broke");

      expect(fireMock).toHaveBeenCalledTimes(1);
      expect(fireMock).toHaveBeenCalledWith({
        title: "Oops",
        icon: "warning",
        html: "<span>Something broke</span>",
        showCloseButton: true,
      });
      // Returns the Swal promise resolution unchanged.
      expect(result).toEqual({ isConfirmed: true });
    });

    it("uses the supplied custom title (exercises the default-param branch as overridden)", async () => {
      await responses.throwErr("Boom", "Custom Title");

      expect(fireMock).toHaveBeenCalledWith({
        title: "Custom Title",
        icon: "warning",
        html: "<span>Boom</span>",
        showCloseButton: true,
      });
    });

    it("interpolates the error message into the html span", async () => {
      await responses.throwErr(42);

      expect(fireMock).toHaveBeenCalledWith(
        expect.objectContaining({ html: "<span>42</span>" })
      );
    });
  });

  describe("showSuccess", () => {
    it("fires a success toast with the message and returns the toast promise", async () => {
      const result = await responses.showSuccess("Saved!");

      expect(toastFireMock).toHaveBeenCalledTimes(1);
      expect(toastFireMock).toHaveBeenCalledWith({
        icon: "success",
        title: "Saved!",
      });
      expect(result).toEqual({ dismiss: undefined });
    });
  });

  describe("showInfo", () => {
    it("fires an info toast with the message and returns the toast promise", async () => {
      const result = await responses.showInfo("Heads up");

      expect(toastFireMock).toHaveBeenCalledTimes(1);
      expect(toastFireMock).toHaveBeenCalledWith({
        icon: "info",
        title: "Heads up",
      });
      expect(result).toEqual({ dismiss: undefined });
    });
  });

  describe("showWarning", () => {
    it("fires a warning toast with the message and returns the toast promise", async () => {
      const result = await responses.showWarning("Careful");

      expect(toastFireMock).toHaveBeenCalledTimes(1);
      expect(toastFireMock).toHaveBeenCalledWith({
        icon: "warning",
        title: "Careful",
      });
      expect(result).toEqual({ dismiss: undefined });
    });
  });

  describe("displayDate", () => {
    it("delegates to dateTimeManager.shortenDisplay and returns its result", () => {
      const date = new Date("2026-06-18T00:00:00Z");
      const out = responses.displayDate(date);

      expect(shortenDisplayMock).toHaveBeenCalledTimes(1);
      expect(shortenDisplayMock).toHaveBeenCalledWith(date);
      expect(out).toBe("18 Jun 2026");
    });

    it("passes string dates straight through to the manager", () => {
      shortenDisplayMock.mockReturnValue("today");
      const out = responses.displayDate("2026-06-18");

      expect(shortenDisplayMock).toHaveBeenCalledWith("2026-06-18");
      expect(out).toBe("today");
    });
  });
});
