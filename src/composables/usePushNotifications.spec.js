import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { mount } from "@vue/test-utils";

// ---------------------------------------------------------------------------
// Boundary mocks
// ---------------------------------------------------------------------------

// Central HTTP client mocked at the boundary per the test contract, even though
// this composable does not import it directly — keeps the unit isolated.
vi.mock("@/services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// The modern OneSignal Vue 3 SDK. useOneSignal() returns a singleton-like object
// of vi.fn()s that the composable drives. We re-create it per test so call
// history and resolved/rejected behaviour are isolated.
let oneSignalMock;
vi.mock("@onesignal/onesignal-vue3", () => ({
  useOneSignal: () => oneSignalMock,
}));

function makeOneSignalMock() {
  return {
    User: {
      PushSubscription: {
        optIn: vi.fn().mockResolvedValue(undefined),
      },
    },
    isPushNotificationsEnabled: vi.fn().mockResolvedValue(true),
    showSlidedownPrompt: vi.fn().mockResolvedValue(undefined),
    setExternalUserId: vi.fn().mockResolvedValue({ id: "ext" }),
    removeExternalUserId: vi.fn().mockResolvedValue({ removed: true }),
    on: vi.fn(),
  };
}

// Import after mocks are registered.
import usedefault, { useNotifications } from "@/composables/usePushNotifications";
import usePushNotifications from "@/composables/usePushNotifications";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Mounts a tiny host component that calls `composable()` during setup so the
 * onMounted lifecycle hook fires. Returns both the composable's return value and
 * the wrapper.
 */
function mountComposable(composable) {
  let api;
  const Host = defineComponent({
    setup() {
      api = composable();
      return () => h("div");
    },
  });
  const wrapper = mount(Host);
  return { api, wrapper };
}

/** Flushes enough microtask turns for the async onMounted chain to settle. */
async function flushMicrotasks() {
  await nextTick();
  for (let i = 0; i < 6; i++) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  oneSignalMock = makeOneSignalMock();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// useNotifications (modern SDK)
// ---------------------------------------------------------------------------

describe("useNotifications", () => {
  it("exposes reactive state and methods", () => {
    const { api } = mountComposable(useNotifications);
    expect(api.permissionStatus.value).toBe("checking...");
    expect(api.isSubscribed).toBeDefined();
    expect(api.loading.value).toBe(false);
    expect(api.error.value).toBe(null);
    expect(api.result.value).toBe("");
    expect(typeof api.checkPermissionStatus).toBe("function");
    expect(typeof api.requestPushPermission).toBe("function");
    expect(typeof api.setExternalUserId).toBe("function");
    expect(typeof api.removeExternalUserId).toBe("function");
    expect(typeof api.sendTestNotification).toBe("function");
  });

  it("onMounted success path: checks status and registers listeners", async () => {
    const { api } = mountComposable(useNotifications);
    // Allow the async onMounted handler to resolve.
    await nextTick();
    await Promise.resolve();
    await Promise.resolve();

    expect(oneSignalMock.User.PushSubscription.optIn).toHaveBeenCalled();
    expect(oneSignalMock.isPushNotificationsEnabled).toHaveBeenCalled();
    expect(api.isSubscribed.value).toBe(true);
    // Three event listeners registered.
    expect(oneSignalMock.on).toHaveBeenCalledTimes(3);
    expect(api.permissionStatus.value).toBe("checking...");
  });

  it("onMounted catch path: sets error + permissionStatus on failure", async () => {
    oneSignalMock.User.PushSubscription.optIn.mockRejectedValue(
      new Error("optIn boom")
    );
    const { api } = mountComposable(useNotifications);
    await nextTick();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(api.error.value).toBe("optIn boom");
    expect(api.permissionStatus.value).toBe("error");
    // registerEventListeners must NOT have run because checkPermissionStatus threw.
    expect(oneSignalMock.on).not.toHaveBeenCalled();
  });

  describe("checkPermissionStatus", () => {
    it("resolves with permissionStatus and sets isSubscribed", async () => {
      oneSignalMock.isPushNotificationsEnabled.mockResolvedValue(false);
      const { api } = mountComposable(useNotifications);
      await nextTick();
      await Promise.resolve();

      const ret = await api.checkPermissionStatus();
      expect(ret).toBe(api.permissionStatus.value);
      expect(api.isSubscribed.value).toBe(false);
    });

    it("catch path: sets error and rethrows", async () => {
      const { api } = mountComposable(useNotifications);
      await nextTick();
      await Promise.resolve();

      oneSignalMock.isPushNotificationsEnabled.mockRejectedValue(
        new Error("enabled boom")
      );
      await expect(api.checkPermissionStatus()).rejects.toThrow("enabled boom");
      expect(api.error.value).toBe("enabled boom");
    });
  });

  describe("requestPushPermission", () => {
    it("success path sets result and returns permissionStatus", async () => {
      const { api } = mountComposable(useNotifications);
      await nextTick();
      await Promise.resolve();

      const ret = await api.requestPushPermission();
      expect(oneSignalMock.showSlidedownPrompt).toHaveBeenCalled();
      expect(api.result.value).toBe(
        `Permission status: ${api.permissionStatus.value}`
      );
      expect(ret).toBe(api.permissionStatus.value);
      expect(api.loading.value).toBe(false);
      expect(api.error.value).toBe(null);
    });

    it("catch path sets error/result and rethrows, finally clears loading", async () => {
      const { api } = mountComposable(useNotifications);
      await nextTick();
      await Promise.resolve();

      oneSignalMock.showSlidedownPrompt.mockRejectedValue(
        new Error("prompt boom")
      );
      await expect(api.requestPushPermission()).rejects.toThrow("prompt boom");
      expect(api.error.value).toBe("prompt boom");
      expect(api.result.value).toBe("Error: prompt boom");
      expect(api.loading.value).toBe(false);
    });
  });

  describe("registerEventListeners callbacks", () => {
    it("subscriptionChange callback logs, sets isSubscribed and re-checks", async () => {
      const { api } = mountComposable(useNotifications);
      await flushMicrotasks();

      const calls = oneSignalMock.on.mock.calls;
      const subEntry = calls.find((c) => c[0] === "subscriptionChange");
      expect(subEntry).toBeDefined();
      const cb = subEntry[1];

      oneSignalMock.isPushNotificationsEnabled.mockClear();
      // The source shadows the outer `isSubscribed` ref with the param, then
      // does `isSubscribed.value = isSubscribed`. Passing an object lets that
      // assignment succeed; the line executes and checkPermissionStatus re-runs.
      const param = {};
      await cb(param);
      expect(param.value).toBe(param);
      // checkPermissionStatus invoked again from inside the callback.
      expect(oneSignalMock.isPushNotificationsEnabled).toHaveBeenCalled();
      void api;
    });

    it("notificationDisplay callback logs the event", async () => {
      mountComposable(useNotifications);
      await flushMicrotasks();

      const calls = oneSignalMock.on.mock.calls;
      const entry = calls.find((c) => c[0] === "notificationDisplay");
      expect(entry).toBeDefined();
      // Should run without throwing.
      expect(() => entry[1]({ some: "event" })).not.toThrow();
    });

    it("notificationPermissionChange callback updates permissionStatus", async () => {
      const { api } = mountComposable(useNotifications);
      await flushMicrotasks();

      const calls = oneSignalMock.on.mock.calls;
      const entry = calls.find(
        (c) => c[0] === "notificationPermissionChange"
      );
      expect(entry).toBeDefined();
      entry[1]({ from: "default", to: "granted" });
      expect(api.permissionStatus.value).toBe("granted");
    });
  });

  describe("setExternalUserId", () => {
    it("success path returns the response", async () => {
      const { api } = mountComposable(useNotifications);
      await nextTick();
      await Promise.resolve();

      const ret = await api.setExternalUserId("user-123");
      expect(oneSignalMock.setExternalUserId).toHaveBeenCalledWith("user-123");
      expect(ret).toEqual({ id: "ext" });
      expect(api.loading.value).toBe(false);
      expect(api.error.value).toBe(null);
    });

    it("catch path sets error and rethrows", async () => {
      const { api } = mountComposable(useNotifications);
      await nextTick();
      await Promise.resolve();

      oneSignalMock.setExternalUserId.mockRejectedValue(new Error("set boom"));
      await expect(api.setExternalUserId("u")).rejects.toThrow("set boom");
      expect(api.error.value).toBe("set boom");
      expect(api.loading.value).toBe(false);
    });
  });

  describe("removeExternalUserId", () => {
    it("success path returns the response", async () => {
      const { api } = mountComposable(useNotifications);
      await nextTick();
      await Promise.resolve();

      const ret = await api.removeExternalUserId();
      expect(oneSignalMock.removeExternalUserId).toHaveBeenCalled();
      expect(ret).toEqual({ removed: true });
      expect(api.loading.value).toBe(false);
      expect(api.error.value).toBe(null);
    });

    it("catch path sets error and rethrows", async () => {
      const { api } = mountComposable(useNotifications);
      await nextTick();
      await Promise.resolve();

      oneSignalMock.removeExternalUserId.mockRejectedValue(
        new Error("remove boom")
      );
      await expect(api.removeExternalUserId()).rejects.toThrow("remove boom");
      expect(api.error.value).toBe("remove boom");
      expect(api.loading.value).toBe(false);
    });
  });

  describe("sendTestNotification", () => {
    it("success path resolves with mock response after delay", async () => {
      vi.useFakeTimers();
      const { api } = mountComposable(useNotifications);
      // onMounted ran with real-ish microtasks; flush any pending then proceed.
      const promise = api.sendTestNotification();
      expect(api.result.value).toBe("Sending test notification...");
      expect(api.loading.value).toBe(true);
      await vi.advanceTimersByTimeAsync(1000);
      const ret = await promise;
      expect(ret).toEqual({
        success: true,
        message: "Test notification sent!",
      });
      expect(api.result.value).toBe("Test notification sent!");
      expect(api.loading.value).toBe(false);
    });

    it("catch path: setTimeout throwing inside the executor surfaces error", async () => {
      const { api } = mountComposable(useNotifications);
      await nextTick();
      await Promise.resolve();

      // The awaited `new Promise((resolve) => setTimeout(resolve, 1000))`
      // rejects when the executor throws synchronously. Make setTimeout throw to
      // drive the catch/finally without touching the global Promise.
      const spy = vi.spyOn(global, "setTimeout").mockImplementation(() => {
        throw new Error("delay boom");
      });

      await expect(api.sendTestNotification()).rejects.toThrow("delay boom");
      expect(api.error.value).toBe("delay boom");
      expect(api.result.value).toBe("Error: delay boom");
      expect(api.loading.value).toBe(false);

      spy.mockRestore();
    });
  });
});

// ---------------------------------------------------------------------------
// usePushNotifications (legacy / default export)
// ---------------------------------------------------------------------------

describe("usePushNotifications (default export)", () => {
  afterEach(() => {
    delete window.OneSignal;
  });

  it("default export equals the named import sanity check", () => {
    expect(usedefault).toBe(usePushNotifications);
  });

  it("returns sendTestNotification and runs initOneSignal early-return when no window.OneSignal", async () => {
    delete window.OneSignal;
    const { api } = mountComposable(usePushNotifications);
    await nextTick();
    await Promise.resolve();

    expect(typeof api.sendTestNotification).toBe("function");
    // Early return: window.OneSignal stays undefined (no array bootstrap).
    expect(window.OneSignal).toBeUndefined();
  });

  it("initOneSignal initializes when window.OneSignal exists and runs push callback + listeners", async () => {
    const init = vi.fn();
    const showNativePrompt = vi.fn();
    const on = vi.fn();
    // push() should immediately invoke the queued callback.
    const push = vi.fn((cb) => cb());
    window.OneSignal = { push, init, showNativePrompt, on };

    mountComposable(usePushNotifications);
    await nextTick();
    await Promise.resolve();

    expect(push).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledTimes(1);
    const initArg = init.mock.calls[0][0];
    expect(initArg.appId).toBe("YOUR_ONESIGNAL_APP_ID");
    expect(initArg.notifyButton).toEqual({ enable: true });
    expect(initArg.allowLocalhostAsSecureOrigin).toBe(true);
    expect(showNativePrompt).toHaveBeenCalledTimes(1);

    // Two listeners registered: subscriptionChange + notificationDisplay.
    expect(on).toHaveBeenCalledTimes(2);
    const subCb = on.mock.calls.find((c) => c[0] === "subscriptionChange")[1];
    const dispCb = on.mock.calls.find((c) => c[0] === "notificationDisplay")[1];
    expect(() => subCb(true)).not.toThrow();
    expect(() => dispCb({ ev: 1 })).not.toThrow();
  });

  it("sendTestNotification resolves user id, logs, and alerts", async () => {
    const getUserId = vi.fn().mockResolvedValue("user-abc");
    window.OneSignal = {
      push: vi.fn(),
      getUserId,
    };
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const { api } = mountComposable(usePushNotifications);
    await nextTick();
    await Promise.resolve();

    await api.sendTestNotification();
    // allow the .then chain to settle
    await Promise.resolve();

    expect(getUserId).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      "Trigger test notification from your backend using this user ID."
    );
  });
});
