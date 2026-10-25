import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// ---------------------------------------------------------------------------
// Boundary mocks
// ---------------------------------------------------------------------------

// sweetalert2 is imported by App.vue but otherwise unused; mock at the boundary
// so the heavy real module is never pulled in.
vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn() },
}));

// The OneSignal Vue 3 SDK. useOneSignal() is re-invoked inside every method, so
// we hand back a single mutable object that each test reconfigures before mount.
let oneSignalMock;
let useOneSignalImpl;
vi.mock("@onesignal/onesignal-vue3", () => ({
  useOneSignal: (...args) => useOneSignalImpl(...args),
}));

import App from "@/App.vue";

// A fully-wired OneSignal double. Tests tweak individual fields/behaviours.
function makeOneSignal() {
  return {
    Notifications: {
      permission: false,
      requestPermission: vi.fn().mockResolvedValue(true),
      addEventListener: vi.fn(),
    },
    User: {
      PushSubscription: {
        optedIn: false,
        optIn: vi.fn(),
        addEventListener: vi.fn(),
      },
    },
  };
}

function mountApp() {
  return mount(App, {
    global: {
      stubs: {
        // router-view is the only child; stub it so no router is required.
        RouterView: true,
      },
    },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  oneSignalMock = makeOneSignal();
  useOneSignalImpl = () => oneSignalMock;
  // Keep console noise out of the test output without losing call history.
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// Advance past the 1000ms init setTimeout and let the async chain settle.
async function runInit() {
  await vi.advanceTimersByTimeAsync(1000);
  await flushPromises();
}

describe("App.vue", () => {
  // -------------------------------------------------------------------------
  // Template
  // -------------------------------------------------------------------------
  it("renders a router-view", () => {
    const wrapper = mountApp();
    expect(wrapper.find("router-view-stub").exists()).toBe(true);
  });

  // -------------------------------------------------------------------------
  // initializeOneSignal (driven via the mount-time setTimeout)
  // -------------------------------------------------------------------------
  it("initializeOneSignal bails when OneSignal is unavailable", async () => {
    useOneSignalImpl = () => null;
    mountApp();
    await runInit();
    // Nothing to assert beyond no throw; the null guard path was executed.
    expect(console.log).toHaveBeenCalledWith(
      "OneSignal is not initialized. Skipping push notification setup."
    );
  });

  it("initializeOneSignal opts in immediately when permission is already set", async () => {
    oneSignalMock.Notifications.permission = "granted";
    oneSignalMock.User.PushSubscription.optedIn = true; // handleOptIn -> already subscribed
    mountApp();
    await runInit();
    expect(oneSignalMock.Notifications.addEventListener).toHaveBeenCalled();
  });

  it("initializeOneSignal requests permission and opts in when granted (true)", async () => {
    oneSignalMock.Notifications.permission = false;
    oneSignalMock.Notifications.requestPermission.mockResolvedValue(true);
    mountApp();
    await runInit();
    expect(oneSignalMock.Notifications.requestPermission).toHaveBeenCalled();
    expect(oneSignalMock.User.PushSubscription.optIn).toHaveBeenCalled();
  });

  it("initializeOneSignal opts in when permission result is the string granted", async () => {
    oneSignalMock.Notifications.permission = false;
    oneSignalMock.Notifications.requestPermission.mockResolvedValue("granted");
    mountApp();
    await runInit();
    expect(oneSignalMock.User.PushSubscription.optIn).toHaveBeenCalled();
  });

  it("initializeOneSignal logs and stops when permission is refused", async () => {
    oneSignalMock.Notifications.permission = false;
    oneSignalMock.Notifications.requestPermission.mockResolvedValue(false);
    mountApp();
    await runInit();
    expect(oneSignalMock.User.PushSubscription.optIn).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("Permission not granted:", false);
  });

  it("initializeOneSignal catches errors from the SDK", async () => {
    oneSignalMock.Notifications.permission = false;
    oneSignalMock.Notifications.requestPermission.mockRejectedValue(
      new Error("boom")
    );
    mountApp();
    await runInit();
    expect(console.error).toHaveBeenCalledWith(
      "Error initializing OneSignal:",
      expect.any(Error)
    );
  });

  // -------------------------------------------------------------------------
  // handleOptIn branches (reached via the already-granted path)
  // -------------------------------------------------------------------------
  it("handleOptIn bails when OneSignal disappears before opt-in", async () => {
    // permission truthy -> handleOptIn called, but OneSignal is null there.
    let call = 0;
    useOneSignalImpl = () => {
      call += 1;
      // First call (initializeOneSignal) sees a valid SDK; second (handleOptIn)
      // sees null to exercise that guard.
      return call === 1 ? oneSignalMock : null;
    };
    oneSignalMock.Notifications.permission = "granted";
    mountApp();
    await runInit();
    expect(console.log).toHaveBeenCalledWith(
      "OneSignal is not initialized. Skipping opt-in process."
    );
  });

  it("handleOptIn sets up listeners directly when already subscribed", async () => {
    oneSignalMock.Notifications.permission = "granted";
    oneSignalMock.User.PushSubscription.optedIn = true;
    mountApp();
    await runInit();
    expect(oneSignalMock.User.PushSubscription.optIn).not.toHaveBeenCalled();
    expect(oneSignalMock.Notifications.addEventListener).toHaveBeenCalled();
  });

  it("handleOptIn opts in then sets up listeners when not subscribed", async () => {
    oneSignalMock.Notifications.permission = "granted";
    oneSignalMock.User.PushSubscription.optedIn = false;
    mountApp();
    await runInit();
    expect(oneSignalMock.User.PushSubscription.optIn).toHaveBeenCalled();
    expect(oneSignalMock.Notifications.addEventListener).toHaveBeenCalled();
  });

  it("handleOptIn catches errors thrown during opt-in", async () => {
    oneSignalMock.Notifications.permission = "granted";
    oneSignalMock.User.PushSubscription.optedIn = false;
    oneSignalMock.User.PushSubscription.optIn.mockImplementation(() => {
      throw new Error("optIn failed");
    });
    mountApp();
    await runInit();
    expect(console.error).toHaveBeenCalledWith(
      "Error during opt-in process:",
      expect.any(Error)
    );
  });

  // -------------------------------------------------------------------------
  // setupEventListeners branches
  // -------------------------------------------------------------------------
  it("setupEventListeners bails when OneSignal is missing", async () => {
    // init + handleOptIn see the SDK; setupEventListeners (3rd call) sees null.
    let call = 0;
    useOneSignalImpl = () => {
      call += 1;
      return call >= 3 ? null : oneSignalMock;
    };
    oneSignalMock.Notifications.permission = "granted";
    oneSignalMock.User.PushSubscription.optedIn = true;
    mountApp();
    await runInit();
    expect(console.log).toHaveBeenCalledWith(
      "OneSignal is not initialized. Skipping event listener setup."
    );
  });

  it("setupEventListeners wires and invokes every notification handler", async () => {
    oneSignalMock.Notifications.permission = "granted";
    oneSignalMock.User.PushSubscription.optedIn = true;
    mountApp();
    await runInit();

    // Pull out the registered callbacks and drive each one.
    const notifCalls = oneSignalMock.Notifications.addEventListener.mock.calls;
    const foreground = notifCalls.find((c) => c[0] === "foregroundWillDisplay")[1];
    const click = notifCalls.find((c) => c[0] === "click")[1];
    foreground({ notification: { title: "t" } });
    click({ notification: { title: "t" } });

    const subCall =
      oneSignalMock.User.PushSubscription.addEventListener.mock.calls.find(
        (c) => c[0] === "change"
      )[1];
    // Both branches of the change handler's optedIn guard.
    await subCall({ current: { optedIn: true } });
    await subCall({ current: { optedIn: false } });

    expect(console.log).toHaveBeenCalledWith("Event listeners setup complete");
  });

  it("setupEventListeners catches errors from the SDK", async () => {
    oneSignalMock.Notifications.permission = "granted";
    oneSignalMock.User.PushSubscription.optedIn = true;
    oneSignalMock.Notifications.addEventListener.mockImplementation(() => {
      throw new Error("listener failed");
    });
    mountApp();
    await runInit();
    expect(console.error).toHaveBeenCalledWith(
      "Error setting up event listeners:",
      expect.any(Error)
    );
  });
});
