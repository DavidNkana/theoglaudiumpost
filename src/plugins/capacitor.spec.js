import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks for every external dependency of the plugin.
//
// `vi.mock` factories are hoisted above all module-level code, so the mock
// objects they return must be created inside `vi.hoisted` to be available
// when the factories run. `@capacitor/app` exposes App.addListener so we can
// capture each registered handler and invoke it to drive the lifecycle /
// back-button code.
// ---------------------------------------------------------------------------
const {
  listeners,
  mockApp,
  mockSplashScreen,
  mockCapacitor,
  mockStatusBar,
  mockRouter,
  mockSwal,
} = vi.hoisted(() => {
  const listeners = {};
  return {
    listeners,
    mockApp: {
      addListener: vi.fn((event, handler) => {
        listeners[event] = handler;
      }),
      exitApp: vi.fn(),
    },
    mockSplashScreen: {
      hide: vi.fn(() => Promise.resolve()),
    },
    mockCapacitor: {
      isNativePlatform: vi.fn(() => false),
      getPlatform: vi.fn(() => "web"),
    },
    mockStatusBar: {
      setOverlaysWebView: vi.fn(() => Promise.resolve()),
      setBackgroundColor: vi.fn(() => Promise.resolve()),
      setStyle: vi.fn(() => Promise.resolve()),
    },
    mockRouter: {
      back: vi.fn(),
      push: vi.fn(),
      currentRoute: { value: { path: "/", name: "Home" } },
    },
    mockSwal: {
      fire: vi.fn(() => Promise.resolve({ isConfirmed: false })),
    },
  };
});

vi.mock("@capacitor/app", () => ({ App: mockApp }));
vi.mock("@capacitor/splash-screen", () => ({ SplashScreen: mockSplashScreen }));
vi.mock("@capacitor/core", () => ({ Capacitor: mockCapacitor }));
vi.mock("@capacitor/status-bar", () => ({
  StatusBar: mockStatusBar,
  Style: { Light: "LIGHT" },
}));
vi.mock("@/router", () => ({ default: mockRouter }));
vi.mock("sweetalert2", () => ({ default: mockSwal }));

import capacitorPlugin from "./capacitor.js";

// Helper to build a fresh fake Vue app.
const makeApp = () => ({ config: { globalProperties: {} }, use: vi.fn() });

// `install()` calls the async initCapacitor() but does not await it. Flushing
// the microtask queue lets the async chain settle so its branches execute.
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe("plugins/capacitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(listeners)) delete listeners[k];

    // Reset to safe defaults each test.
    mockCapacitor.isNativePlatform.mockReturnValue(false);
    mockCapacitor.getPlatform.mockReturnValue("web");
    mockSplashScreen.hide.mockResolvedValue(undefined);
    mockStatusBar.setOverlaysWebView.mockResolvedValue(undefined);
    mockStatusBar.setBackgroundColor.mockResolvedValue(undefined);
    mockStatusBar.setStyle.mockResolvedValue(undefined);
    mockSwal.fire.mockResolvedValue({ isConfirmed: false });
    mockRouter.currentRoute.value = { path: "/", name: "Home" };

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exports a Vue plugin object with an install function", () => {
    expect(capacitorPlugin).toBeTypeOf("object");
    expect(capacitorPlugin.install).toBeTypeOf("function");
  });

  it("registers $capacitor global property exposing initCapacitor and isNative", async () => {
    const app = makeApp();
    capacitorPlugin.install(app);
    await flush();

    expect(app.config.globalProperties.$capacitor).toBeTypeOf("object");
    expect(app.config.globalProperties.$capacitor.initCapacitor).toBeTypeOf(
      "function"
    );
    expect(app.config.globalProperties.$capacitor.isNative).toBe(false);
  });

  it("non-native platform: skips native feature initialization", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false);
    const app = makeApp();

    capacitorPlugin.install(app);
    await flush();

    expect(mockSplashScreen.hide).not.toHaveBeenCalled();
    expect(mockApp.addListener).not.toHaveBeenCalled();
  });

  it("native android platform: configures status bar, hides splash, registers listeners", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockCapacitor.getPlatform.mockReturnValue("android");
    const app = makeApp();

    capacitorPlugin.install(app);
    await flush();

    expect(mockStatusBar.setOverlaysWebView).toHaveBeenCalledWith({
      overlay: false,
    });
    expect(mockStatusBar.setBackgroundColor).toHaveBeenCalledWith({
      color: "#000000",
    });
    expect(mockStatusBar.setStyle).toHaveBeenCalledWith({ style: "LIGHT" });
    expect(mockSplashScreen.hide).toHaveBeenCalledWith({
      fadeOutDuration: 500,
    });

    // All four listeners registered.
    expect(listeners.appStateChange).toBeTypeOf("function");
    expect(listeners.resume).toBeTypeOf("function");
    expect(listeners.pause).toBeTypeOf("function");
    expect(listeners.backButton).toBeTypeOf("function");
  });

  it("native non-android platform: skips status bar configuration", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockCapacitor.getPlatform.mockReturnValue("ios");
    const app = makeApp();

    capacitorPlugin.install(app);
    await flush();

    expect(mockStatusBar.setOverlaysWebView).not.toHaveBeenCalled();
    expect(mockSplashScreen.hide).toHaveBeenCalled();
    expect(listeners.backButton).toBeTypeOf("function");
  });

  it("configureStatusBar: swallows setBackgroundColor errors and continues", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockCapacitor.getPlatform.mockReturnValue("android");
    mockStatusBar.setBackgroundColor.mockRejectedValue(
      new Error("not supported")
    );
    const app = makeApp();

    capacitorPlugin.install(app);
    await flush();

    // Despite setBackgroundColor rejecting, setStyle still runs.
    expect(mockStatusBar.setStyle).toHaveBeenCalledWith({ style: "LIGHT" });
  });

  it("configureStatusBar: logs error when setOverlaysWebView rejects", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockCapacitor.getPlatform.mockReturnValue("android");
    mockStatusBar.setOverlaysWebView.mockRejectedValue(new Error("boom"));
    const app = makeApp();

    capacitorPlugin.install(app);
    await flush();

    expect(console.error).toHaveBeenCalledWith(
      "Error configuring status bar:",
      expect.any(Error)
    );
    // Splash hide still proceeds after configureStatusBar resolves.
    expect(mockSplashScreen.hide).toHaveBeenCalled();
  });

  it("initCapacitor: catches and logs errors thrown during native init", async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true);
    mockCapacitor.getPlatform.mockReturnValue("ios");
    mockSplashScreen.hide.mockRejectedValue(new Error("splash failed"));
    const app = makeApp();

    capacitorPlugin.install(app);
    await flush();

    expect(console.error).toHaveBeenCalledWith(
      "Error initializing Capacitor:",
      expect.any(Error)
    );
  });

  describe("app lifecycle listeners", () => {
    beforeEach(async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockCapacitor.getPlatform.mockReturnValue("android");
      capacitorPlugin.install(makeApp());
      await flush();
    });

    it("appStateChange handler: active true branch", () => {
      listeners.appStateChange({ isActive: true });
      expect(console.log).toHaveBeenCalledWith("App moved to foreground");
    });

    it("appStateChange handler: active false branch", () => {
      listeners.appStateChange({ isActive: false });
      expect(console.log).toHaveBeenCalledWith("App moved to background");
    });

    it("resume handler runs", () => {
      expect(() => listeners.resume()).not.toThrow();
      expect(console.log).toHaveBeenCalledWith("App resumed");
    });

    it("pause handler runs", () => {
      expect(() => listeners.pause()).not.toThrow();
      expect(console.log).toHaveBeenCalledWith("App paused");
    });
  });

  describe("back button handler", () => {
    beforeEach(async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockCapacitor.getPlatform.mockReturnValue("android");
      capacitorPlugin.install(makeApp());
      await flush();
    });

    it("canGoBack true: navigates back via router", () => {
      listeners.backButton({ canGoBack: true });
      expect(mockRouter.back).toHaveBeenCalled();
    });

    it("canGoBack false on home (path '/'): shows exit dialog, confirmed exits app", async () => {
      mockRouter.currentRoute.value = { path: "/", name: "SomethingElse" };
      mockSwal.fire.mockResolvedValue({ isConfirmed: true });

      await listeners.backButton({ canGoBack: false });
      await flush();

      expect(mockSwal.fire).toHaveBeenCalled();
      expect(mockApp.exitApp).toHaveBeenCalled();
    });

    it("canGoBack false on home (name 'Home'): cancelled does not exit", async () => {
      mockRouter.currentRoute.value = { path: "/other", name: "Home" };
      mockSwal.fire.mockResolvedValue({ isConfirmed: false });

      await listeners.backButton({ canGoBack: false });
      await flush();

      expect(mockSwal.fire).toHaveBeenCalled();
      expect(mockApp.exitApp).not.toHaveBeenCalled();
    });

    it("canGoBack false not on home: navigates to home instead of exiting", async () => {
      mockRouter.currentRoute.value = { path: "/dashboard", name: "Dashboard" };

      await listeners.backButton({ canGoBack: false });
      await flush();

      expect(mockSwal.fire).not.toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith("/");
    });
  });
});
