import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Unit tests for services/api.js.
 *
 * services/api.js is the module that BUILDS the central axios client: it calls
 * axios.create(), registers a request interceptor and a response interceptor,
 * and exports the instance. To unit-test it in isolation we mock the boundary:
 *
 * - `axios` itself, so axios.create() returns a controllable stub. The stub's
 *   interceptors.request.use / interceptors.response.use capture the handler
 *   functions registered by the module, which the tests then invoke directly to
 *   exercise every branch.
 * - `../config/api.js`, so API_URL is a fixed, asserted value (the create config
 *   is verified).
 *
 * The module reads/registers everything at import time, so each test re-imports
 * fresh via vi.resetModules() + dynamic import to get a clean capture.
 */

const API_URL = "https://api.example.test/v1/";

// Holds the handlers captured from interceptors.*.use during import.
const captured = {
  requestHandler: null,
  responseSuccess: null,
  responseError: null,
};

// The instance returned by the mocked axios.create(). It is ALSO callable as a
// function (the module re-invokes `apiClient(request)` to retry), so we build it
// as a vi.fn and attach the methods/interceptors onto it.
let instanceFn;
const createConfigSpy = vi.fn();

vi.mock("axios", () => {
  return {
    default: {
      create: (config) => {
        createConfigSpy(config);
        return instanceFn;
      },
    },
  };
});

vi.mock("../config/api.js", () => ({
  API_URL,
}));

/** Builds a fresh callable instance stub and re-imports the module. */
async function loadModule() {
  captured.requestHandler = null;
  captured.responseSuccess = null;
  captured.responseError = null;

  instanceFn = vi.fn(); // calling apiClient(request) returns undefined by default
  instanceFn.post = vi.fn();
  instanceFn.interceptors = {
    request: {
      use: vi.fn((handler) => {
        captured.requestHandler = handler;
      }),
    },
    response: {
      use: vi.fn((onSuccess, onError) => {
        captured.responseSuccess = onSuccess;
        captured.responseError = onError;
      }),
    },
  };

  vi.resetModules();
  const mod = await import("@/services/api");
  return mod;
}

describe("services/api", () => {
  let originalLocation;
  let storage;

  beforeEach(() => {
    createConfigSpy.mockClear();

    // Deterministic localStorage stand-in.
    storage = {};
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(
      (k) => (k in storage ? storage[k] : null),
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((k, v) => {
      storage[k] = String(v);
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation((k) => {
      delete storage[k];
    });

    vi.spyOn(console, "error").mockImplementation(() => {});

    originalLocation = window.location;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore window.location if a test replaced it.
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    vi.resetModules();
  });

  // Helper to swap window.location with a writable mock.
  function setLocation({ pathname = "/", href = "" } = {}) {
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { pathname, href, origin: "https://app.example.test" },
    });
  }

  it("creates the axios client with the configured base URL and headers", async () => {
    const mod = await loadModule();

    expect(createConfigSpy).toHaveBeenCalledTimes(1);
    expect(createConfigSpy).toHaveBeenCalledWith({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "ngrok-skip-browser-warning": true,
      },
      withCredentials: true,
    });

    // The default export is the created instance.
    expect(mod.default).toBe(instanceFn);

    // Both interceptors were registered.
    expect(typeof captured.requestHandler).toBe("function");
    expect(typeof captured.responseSuccess).toBe("function");
    expect(typeof captured.responseError).toBe("function");
  });

  describe("request interceptor", () => {
    it("adds the Authorization header when a token is present", async () => {
      await loadModule();
      storage["auth.token"] = "abc123";

      const config = { headers: {} };
      const result = captured.requestHandler(config);

      expect(result).toBe(config);
      expect(result.headers.Authorization).toBe("Bearer abc123");
    });

    it("leaves headers untouched when no token is present", async () => {
      await loadModule();
      // no token in storage -> getItem returns null (falsy)

      const config = { headers: {} };
      const result = captured.requestHandler(config);

      expect(result).toBe(config);
      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe("response interceptor — success", () => {
    it("passes successful responses straight through", async () => {
      await loadModule();
      const response = { data: { ok: true } };
      expect(captured.responseSuccess(response)).toBe(response);
    });
  });

  describe("response interceptor — error", () => {
    it("rejects immediately when status is not 401", async () => {
      await loadModule();
      storage["auth.refresh_token"] = "refresh-1";

      const error = { config: {}, response: { status: 500 } };
      await expect(captured.responseError(error)).rejects.toBe(error);
      expect(instanceFn.post).not.toHaveBeenCalled();
    });

    it("rejects immediately when there is no refresh token (401)", async () => {
      await loadModule();
      // no refresh token in storage

      const error = { config: {}, response: { status: 401 } };
      await expect(captured.responseError(error)).rejects.toBe(error);
      expect(instanceFn.post).not.toHaveBeenCalled();
    });

    it("rejects immediately when the request was already retried", async () => {
      await loadModule();
      storage["auth.refresh_token"] = "refresh-1";

      const error = { config: { _retry: true }, response: { status: 401 } };
      await expect(captured.responseError(error)).rejects.toBe(error);
      expect(instanceFn.post).not.toHaveBeenCalled();
    });

    it("handles a missing error.response via optional chaining", async () => {
      await loadModule();
      storage["auth.refresh_token"] = "refresh-1";

      // error.response is undefined -> error.response?.status === 401 is false
      const error = { config: {} };
      await expect(captured.responseError(error)).rejects.toBe(error);
      expect(instanceFn.post).not.toHaveBeenCalled();
    });

    it("refreshes the token, stores it, retries the request, and returns the retry result", async () => {
      await loadModule();
      storage["auth.refresh_token"] = "refresh-1";

      const refreshData = { token: "new-token", refreshToken: "new-refresh" };
      instanceFn.post.mockResolvedValueOnce({ data: refreshData });
      const retryResult = { data: { retried: true } };
      instanceFn.mockReturnValueOnce(retryResult);

      const request = { headers: {} };
      const error = { config: request, response: { status: 401 } };

      const result = await captured.responseError(error);

      expect(instanceFn.post).toHaveBeenCalledWith("/auth/refresh-token", {
        refreshToken: "refresh-1",
      });
      // Tokens persisted.
      expect(storage["auth.token"]).toBe("new-token");
      expect(storage["auth.refresh_token"]).toBe("new-refresh");
      // Authorization header updated and _retry flag set on the original request.
      expect(request.headers.Authorization).toBe("Bearer new-token");
      expect(request._retry).toBe(true);
      // The retried request is invoked and its result returned.
      expect(instanceFn).toHaveBeenCalledWith(request);
      expect(result).toBe(retryResult);
    });

    it("retries even when the refresh endpoint returns no data (falsy res)", async () => {
      await loadModule();
      storage["auth.refresh_token"] = "refresh-1";

      // res resolves falsy -> the `if (res)` block is skipped.
      instanceFn.post.mockResolvedValueOnce({ data: null });
      const retryResult = { data: { retried: true } };
      instanceFn.mockReturnValueOnce(retryResult);

      const request = { headers: {} };
      const error = { config: request, response: { status: 401 } };

      const result = await captured.responseError(error);

      expect(instanceFn.post).toHaveBeenCalledWith("/auth/refresh-token", {
        refreshToken: "refresh-1",
      });
      // No tokens stored because res was falsy.
      expect(storage["auth.token"]).toBeUndefined();
      // Authorization header NOT updated.
      expect(request.headers.Authorization).toBeUndefined();
      // Request still retried.
      expect(instanceFn).toHaveBeenCalledWith(request);
      expect(result).toBe(retryResult);
    });

    it("on refresh failure: clears auth, redirects to /admin/login, and rejects", async () => {
      await loadModule();
      storage["auth.token"] = "old";
      storage["auth.user"] = "u";
      storage["auth.refresh_token"] = "refresh-1";
      setLocation({ pathname: "/admin/dashboard" });

      const boom = new Error("refresh failed");
      instanceFn.post.mockRejectedValueOnce(boom);

      const request = { headers: {} };
      const error = { config: request, response: { status: 401 } };

      await expect(captured.responseError(error)).rejects.toBe(error);

      expect(console.error).toHaveBeenCalledWith("Token refresh failed:", boom);
      expect(storage["auth.token"]).toBeUndefined();
      expect(storage["auth.user"]).toBeUndefined();
      expect(storage["auth.refresh_token"]).toBeUndefined();
      expect(window.location.href).toBe("/admin/login");
    });

    it("on refresh failure: redirects to /business/login when on a /business route", async () => {
      await loadModule();
      storage["auth.refresh_token"] = "refresh-1";
      setLocation({ pathname: "/business/profile" });

      instanceFn.post.mockRejectedValueOnce(new Error("nope"));

      const request = { headers: {} };
      const error = { config: request, response: { status: 401 } };

      await expect(captured.responseError(error)).rejects.toBe(error);
      expect(window.location.href).toBe("/business/login");
    });

    it("on refresh failure: does not redirect when on an unrelated route", async () => {
      await loadModule();
      storage["auth.refresh_token"] = "refresh-1";
      setLocation({ pathname: "/public/home", href: "ORIGINAL" });

      instanceFn.post.mockRejectedValueOnce(new Error("nope"));

      const request = { headers: {} };
      const error = { config: request, response: { status: 401 } };

      await expect(captured.responseError(error)).rejects.toBe(error);
      // href untouched: neither /admin nor /business matched.
      expect(window.location.href).toBe("ORIGINAL");
    });
  });
});
