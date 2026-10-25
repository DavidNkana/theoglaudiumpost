import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks for every external boundary the composable imports.
//
// vi.mock factories are hoisted above module-level consts, so all shared mock
// state lives inside a vi.hoisted() block that runs before the factories.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => {
  const routerMock = {
    currentRoute: { value: { path: "/" } },
    push: vi.fn(),
  };
  return {
    routerMock,
    formatDistanceToNowMock: vi.fn(() => "in 1 hour"),
    loginRequestMock: vi.fn(),
    registerMock: vi.fn(),
    jwtDecodeMock: vi.fn(),
    devLogMock: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      debug: vi.fn(),
    },
    // key -> ref, populated as the composable creates its useLocalStorage refs.
    storageRefs: {},
    // captured default-value args passed to useLocalStorage per key.
    storageDefaults: {},
    // captured options arg (incl. serializer) passed to useLocalStorage per key.
    storageOptions: {},
  };
});

const routerMock = h.routerMock;
const loginRequestMock = h.loginRequestMock;
const registerMock = h.registerMock;
const jwtDecodeMock = h.jwtDecodeMock;
const storageRefs = h.storageRefs;
const storageDefaults = h.storageDefaults;
const storageOptions = h.storageOptions;

// @/router — default export with a mutable currentRoute and a push spy.
vi.mock("@/router", () => ({ default: h.routerMock }));
// useAuth now obtains the router via vue-router's useRouter(); return the same mock.
vi.mock("vue-router", () => ({ useRouter: () => h.routerMock }));

// date-fns — formatDistanceToNow is only used for logging.
vi.mock("date-fns", () => ({ formatDistanceToNow: h.formatDistanceToNowMock }));

// @/features/auth/AuthService — login request boundary.
vi.mock("@/features/auth/AuthService", () => ({
  login: (...args) => h.loginRequestMock(...args),
}));

// @/features/businesses/BusinessesService — register boundary.
vi.mock("@/features/businesses/BusinessesService", () => ({
  register: (...args) => h.registerMock(...args),
}));

// @/utils/devLog — silent logger.
vi.mock("@/utils/devLog", () => ({ devLog: h.devLogMock }));

// jwt-decode — controlled decode output.
vi.mock("jwt-decode", () => ({ jwtDecode: (...args) => h.jwtDecodeMock(...args) }));

// @vueuse/core — back useLocalStorage with real refs so reactive writes work,
// while recording which key each ref is bound to and the default factory passed.
vi.mock("@vueuse/core", async () => {
  const { ref } = await import("vue");
  return {
    useLocalStorage: (key, defaultValue, opts) => {
      const r = ref(null);
      h.storageRefs[key] = r;
      h.storageDefaults[key] = defaultValue;
      h.storageOptions[key] = opts;
      return r;
    },
    useStorage: vi.fn(),
  };
});

import router from "@/router";
import { devLog } from "@/utils/devLog";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/composables/useAuth";

describe("useAuth composable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    routerMock.currentRoute.value.path = "/";
    localStorage.clear();
    for (const k of Object.keys(storageRefs)) delete storageRefs[k];
    for (const k of Object.keys(storageOptions)) delete storageOptions[k];
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // useLocalStorage default-factory wiring (persistedToken / persistedUser)
  // -------------------------------------------------------------------------
  it("persistedUser/persistedToken default factories read localStorage (both branches)", () => {
    useAuth();

    // The composable created refs for both keys with function default factories.
    expect(storageRefs["auth.user"]).toBeDefined();
    expect(storageRefs["auth.token"]).toBeDefined();

    const userDefault = storageDefaults["auth.user"];
    const tokenDefault = storageDefaults["auth.token"];
    expect(typeof userDefault).toBe("function");
    expect(typeof tokenDefault).toBe("function");

    // persistedUser: no user stored -> undefined branch.
    expect(userDefault()).toBeUndefined();
    // persistedUser: user stored -> JSON.parse branch.
    localStorage.setItem("auth.user", JSON.stringify({ id: 7 }));
    expect(userDefault()).toEqual({ id: 7 });

    // persistedToken: null when absent, value when present.
    expect(tokenDefault()).toBeNull();
    localStorage.setItem("auth.token", "tkn");
    expect(tokenDefault()).toBe("tkn");

    // The auth.user ref is configured with a custom serializer; exercise both
    // read (JSON.parse) and write (JSON.stringify) functions.
    const serializer = storageOptions["auth.user"].serializer;
    expect(serializer.read('{"id":42}')).toEqual({ id: 42 });
    expect(serializer.write({ id: 42 })).toBe('{"id":42}');
  });

  // -------------------------------------------------------------------------
  // isAuthenticated / currentUser computed
  // -------------------------------------------------------------------------
  it("isAuthenticated reflects falsy and truthy user state; user computed mirrors state", () => {
    const auth = useAuth();
    expect(auth.isAuthenticated.value).toBe(false);
    expect(auth.user.value).toBeNull();

    storageRefs["auth.user"].value = { id: 1, name: "A" };
    expect(auth.isAuthenticated.value).toBe(true);
    expect(auth.user.value).toEqual({ id: 1, name: "A" });
  });

  // -------------------------------------------------------------------------
  // hasRole
  // -------------------------------------------------------------------------
  it("hasRole returns false when no user, when role arg missing, and matches case-insensitively", () => {
    const auth = useAuth();

    // No user at all -> user.value?.role?.name is undefined -> false.
    expect(auth.hasRole("admin")).toBe(false);

    // User without role -> roleName undefined -> false.
    storageRefs["auth.user"].value = { id: 1 };
    expect(auth.hasRole("admin")).toBe(false);

    // User with role but missing role argument -> !role -> false.
    storageRefs["auth.user"].value = { role: { name: "Admin" } };
    expect(auth.hasRole(undefined)).toBe(false);
    expect(auth.hasRole("")).toBe(false);

    // Matching role (case-insensitive) -> true.
    expect(auth.hasRole("admin")).toBe(true);
    expect(auth.hasRole("ADMIN")).toBe(true);

    // Non-matching role -> false.
    expect(auth.hasRole("business")).toBe(false);
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------
  it("login() with a token in response saves the token and schedules auto-logout", async () => {
    const auth = useAuth();
    jwtDecodeMock.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
    const response = {
      data: {
        token: "jwt-token",
        refreshToken: "refresh-1",
        user: { id: 9, name: "Saver", role: { name: "admin" } },
      },
    };
    loginRequestMock.mockResolvedValue(response);

    const result = await auth.login("a@b.com", "pw");

    expect(loginRequestMock).toHaveBeenCalledWith({ email: "a@b.com", password: "pw" });
    expect(result).toBe(response);
    // saveToken side effects:
    expect(storageRefs["auth.token"].value).toBe("jwt-token");
    expect(storageRefs["auth.user"].value).toEqual(response.data.user);
    expect(localStorage.getItem("auth.token")).toBe("jwt-token");
    expect(localStorage.getItem("auth.user")).toBe(JSON.stringify(response.data.user));
    expect(localStorage.getItem("auth.refresh_token")).toBe("refresh-1");
  });

  it("login() without a token sets user from response.data.user", async () => {
    const auth = useAuth();
    const response = { data: { user: { id: 3, name: "NoToken" } } };
    loginRequestMock.mockResolvedValue(response);

    const result = await auth.login("c@d.com", "pw2");

    expect(result).toBe(response);
    expect(storageRefs["auth.user"].value).toEqual({ id: 3, name: "NoToken" });
    // token ref untouched / no token persisted.
    expect(localStorage.getItem("auth.token")).toBeNull();
    expect(devLog.info).toHaveBeenCalledWith("User authenticated:", { id: 3, name: "NoToken" });
  });

  // -------------------------------------------------------------------------
  // saveToken try/catch
  // -------------------------------------------------------------------------
  it("saveToken rethrows when setupAutoLogout chain throws (catch branch)", async () => {
    const auth = useAuth();
    // Force an error inside the try block by making jwtDecode throw a non-catchable
    // path. getTokenExpiration swallows errors, so instead force localStorage.setItem
    // to throw to hit the catch + rethrow.
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    loginRequestMock.mockResolvedValue({
      data: { token: "t", refreshToken: "r", user: { id: 1 } },
    });

    await expect(auth.login("e@f.com", "pw")).rejects.toThrow("quota exceeded");
    expect(errSpy).toHaveBeenCalled();

    setItemSpy.mockRestore();
    errSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // setupAutoLogout branches (via saveToken)
  // -------------------------------------------------------------------------
  it("setupAutoLogout: expired token (timeout<=0) triggers immediate logout", async () => {
    routerMock.currentRoute.value.path = "/admin/dashboard";
    const auth = useAuth();
    // exp in the past -> expirationTime < now -> timeout <= 0 -> logout()
    jwtDecodeMock.mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 3600 });
    loginRequestMock.mockResolvedValue({
      data: { token: "expired", refreshToken: "r", user: { id: 5 } },
    });

    await auth.login("i@j.com", "pw");

    // logout() ran: refs cleared and redirected to /admin/login.
    expect(storageRefs["auth.token"].value).toBeNull();
    expect(storageRefs["auth.user"].value).toBeNull();
    expect(router.push).toHaveBeenCalledWith("/admin/login");
  });

  it("setupAutoLogout: expirationTime 0 (decode failure) triggers immediate logout", async () => {
    const auth = useAuth();
    // jwtDecode throws -> getTokenExpiration returns 0 -> !expirationTime -> logout.
    jwtDecodeMock.mockImplementation(() => {
      throw new Error("bad token");
    });
    loginRequestMock.mockResolvedValue({
      data: { token: "garbage", refreshToken: "r", user: { id: 6 } },
    });

    await auth.login("k@l.com", "pw");

    expect(router.push).toHaveBeenCalledWith("/admin/login");
    expect(formatDistanceToNow).toHaveBeenCalled();
  });

  it("setupAutoLogout: future token schedules a timer and re-arms on fire", async () => {
    const auth = useAuth();
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    // Distant expiry: after advancing the capped delay, timeout is still
    // positive so the fired callback reschedules instead of logging out.
    jwtDecodeMock.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 10 ** 9 });
    loginRequestMock.mockResolvedValue({
      data: { token: "future", refreshToken: "r", user: { id: 7 } },
    });

    await auth.login("m@n.com", "pw");

    // A timer was scheduled with a positive delay (min(timeout, MAX)).
    expect(setTimeoutSpy).toHaveBeenCalled();
    const delay = setTimeoutSpy.mock.calls.at(-1)[1];
    expect(delay).toBeGreaterThan(0);

    // Firing it re-invokes setupAutoLogout (still valid token -> reschedules).
    setTimeoutSpy.mockClear();
    vi.advanceTimersByTime(delay);
    expect(setTimeoutSpy).toHaveBeenCalled();
    // It rescheduled rather than logging out.
    expect(router.push).not.toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
  });

  it("setupAutoLogout: caps the delay at MAX_BROWSER_TIMEOUT_MS for very distant expiry", async () => {
    const auth = useAuth();
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    // exp far in the future so timeout > MAX -> Math.min picks MAX.
    jwtDecodeMock.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 10 ** 9 });
    loginRequestMock.mockResolvedValue({
      data: { token: "distant", refreshToken: "r", user: { id: 8 } },
    });

    await auth.login("o@p.com", "pw");

    const delay = setTimeoutSpy.mock.calls.at(-1)[1];
    expect(delay).toBe(2_147_483_647);
    setTimeoutSpy.mockRestore();
  });

  it("setupAutoLogout: early-return (if (!token.value)) when the rescheduled timer fires after logout", async () => {
    const auth = useAuth();
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    jwtDecodeMock.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
    loginRequestMock.mockResolvedValue({
      data: { token: "future", refreshToken: "r", user: { id: 1 } },
    });

    // First save schedules the recursive timer.
    await auth.login("q@r.com", "pw");
    const delay = setTimeoutSpy.mock.calls.at(-1)[1];

    // Now clear the token (as a logout elsewhere would). The next timer fire will
    // re-enter setupAutoLogout and hit `if (!token.value) return;`.
    storageRefs["auth.token"].value = null;
    setTimeoutSpy.mockClear();

    vi.advanceTimersByTime(delay);

    // Early return: no new timer scheduled, no logout redirect triggered.
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // businessRegisteration
  // -------------------------------------------------------------------------
  it("businessRegisteration: status 201 registers then logs in", async () => {
    const auth = useAuth();
    registerMock.mockResolvedValue({ status: 201, data: {} });
    const loginResponse = { data: { user: { id: 2 } } };
    loginRequestMock.mockResolvedValue(loginResponse);

    const payload = { email: "biz@x.com", password: "pw", name: "Biz" };
    const result = await auth.businessRegisteration(payload);

    expect(registerMock).toHaveBeenCalledWith(payload);
    // It chained into login(payload.email, payload.password).
    expect(loginRequestMock).toHaveBeenCalledWith({ email: "biz@x.com", password: "pw" });
    expect(result).toBe(loginResponse);
  });

  it("businessRegisteration: non-201 status throws with response.data", async () => {
    const auth = useAuth();
    registerMock.mockResolvedValue({ status: 400, data: "bad payload" });

    await expect(auth.businessRegisteration({ email: "z@z.com", password: "p" })).rejects.toThrow(
      "bad payload"
    );
    expect(loginRequestMock).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // logout redirect branches
  // -------------------------------------------------------------------------
  it("logout: clears all auth storage and redirects to /business/login on business path", () => {
    routerMock.currentRoute.value.path = "/business/profile";
    localStorage.setItem("auth.token", "x");
    localStorage.setItem("auth.user", "y");
    localStorage.setItem("auth.refresh_token", "z");
    localStorage.setItem("auth.expiration", "w");
    const auth = useAuth();
    storageRefs["auth.token"].value = "x";
    storageRefs["auth.user"].value = { id: 1 };

    auth.logout();

    expect(storageRefs["auth.token"].value).toBeNull();
    expect(storageRefs["auth.user"].value).toBeNull();
    expect(localStorage.getItem("auth.token")).toBeNull();
    expect(localStorage.getItem("auth.user")).toBeNull();
    expect(localStorage.getItem("auth.refresh_token")).toBeNull();
    expect(localStorage.getItem("auth.expiration")).toBeNull();
    expect(router.push).toHaveBeenCalledWith("/business/login");
  });

  it("logout: redirects to /admin/login on the bare /business path boundary and non-business paths", () => {
    const auth = useAuth();

    // Exact "/business" (no trailing slash) matches the regex -> business login.
    routerMock.currentRoute.value.path = "/business";
    auth.logout();
    expect(router.push).toHaveBeenLastCalledWith("/business/login");

    // Non-business path -> admin login (else branch).
    routerMock.currentRoute.value.path = "/admin/something";
    auth.logout();
    expect(router.push).toHaveBeenLastCalledWith("/admin/login");

    // A path that merely contains 'business' but doesn't match the anchored
    // regex -> else branch.
    routerMock.currentRoute.value.path = "/x/business";
    auth.logout();
    expect(router.push).toHaveBeenLastCalledWith("/admin/login");
  });
});
