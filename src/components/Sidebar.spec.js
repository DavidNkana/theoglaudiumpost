import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createStore } from "vuex";
import Sidebar from "@/components/Sidebar.vue";

/**
 * OneSignal boundary. Each accessor (User.PushSubscription, Notifications) is a
 * vi.fn so we can assert calls and drive optIn/optOut + addEventListener
 * callbacks. The same singleton object is returned from every useOneSignal()
 * call inside the component.
 */
const oneSignal = {
  User: {
    PushSubscription: {
      optedIn: false,
      optIn: vi.fn().mockResolvedValue("optedIn"),
      optOut: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
    },
  },
  Notifications: {
    addEventListener: vi.fn(),
  },
};
vi.mock("@onesignal/onesignal-vue3", () => ({
  useOneSignal: () => oneSignal,
}));

// SIDEBAR_TOP is only forwarded to the stubbed AdBanner; mock @/utils so the
// real utils module (and its own deps) is not pulled in.
vi.mock("@/utils", () => ({ SIDEBAR_TOP: "sidebar_top" }));

// Child components stubbed so this spec exercises only Sidebar's own logic.
vi.mock("./AdBanner.vue", () => ({
  default: {
    name: "AdBanner",
    props: ["size", "placement", "showClose"],
    template: "<div class='ad-banner-stub' :data-placement='placement' />",
  },
}));
vi.mock("./AdvertiseCTA.vue", () => ({
  default: { name: "AdvertiseCTA", template: "<div class='advertise-cta-stub' />" },
}));
vi.mock("./AdCTAWithTicker.vue", () => ({
  default: {
    name: "AdCTAWithTicker",
    props: ["layout"],
    template: "<div class='ad-cta-stub' :data-layout='layout' />",
  },
}));

function mountSidebar({ drawerOpen = false } = {}) {
  const closeDrawer = vi.fn();
  const store = createStore({
    state: () => ({ drawerOpen }),
    mutations: { closeDrawer },
  });
  const wrapper = mount(Sidebar, {
    attachTo: document.body,
    global: {
      plugins: [store],
      stubs: { RouterLink: { name: "RouterLink", props: ["to"], template: "<a><slot /></a>" } },
    },
  });
  return { wrapper, closeDrawer, store };
}

describe("Sidebar.vue", () => {
  let logSpy;
  let errorSpy;

  beforeEach(() => {
    oneSignal.User.PushSubscription.optedIn = false;
    oneSignal.User.PushSubscription.optIn.mockClear().mockResolvedValue("optedIn");
    oneSignal.User.PushSubscription.optOut.mockClear().mockResolvedValue(undefined);
    oneSignal.User.PushSubscription.addEventListener.mockClear();
    oneSignal.Notifications.addEventListener.mockClear();

    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders closed by default and the full static chrome", () => {
    const { wrapper } = mountSidebar();

    const root = wrapper.find(".sidebar-drawer");
    expect(root.exists()).toBe(true);
    // drawerOpen false -> no 'open' class (template :class branch false).
    expect(root.classes()).not.toContain("open");

    // Logo + close button + footer social links.
    expect(wrapper.find(".logo-image").attributes("src")).toBe(
      "/logo/laudium-icon-dark.svg",
    );
    expect(wrapper.find("button.btn-close-custom").exists()).toBe(true);
    expect(wrapper.findAll(".social-link").length).toBe(5);
    expect(wrapper.find(".sidebar-contact").attributes("href")).toBe(
      "mailto:info@lauduimbiz.co.za",
    );

    // Stubbed children present with forwarded props.
    expect(wrapper.find(".ad-cta-stub").attributes("data-layout")).toBe("col");
    expect(wrapper.find(".ad-banner-stub").attributes("data-placement")).toBe(
      "sidebar_top",
    );

    // isSubscribed is initialised to a (truthy) function, so the "On" labels show.
    expect(wrapper.find(".action-title").text()).toBe("Notifications On");
    expect(wrapper.find(".action-subtitle").text()).toBe("Tap to disable");
    expect(wrapper.find(".bi-bell-fill").exists()).toBe(true);
    expect(wrapper.find(".action-button").classes()).toContain(
      "action-button-active",
    );
  });

  it("initialises isSubscribed with a lazy OneSignal accessor that reads optedIn", () => {
    // The ref is seeded with `() => useOneSignal().User.PushSubscription.optedIn`.
    // wrapper.vm exposes the unwrapped ref value (the accessor function); invoke
    // it to cover its body and assert it reflects the live OneSignal flag.
    const { wrapper } = mountSidebar();
    const accessor = wrapper.vm.isSubscribed;
    expect(typeof accessor).toBe("function");

    oneSignal.User.PushSubscription.optedIn = false;
    expect(accessor()).toBe(false);
    oneSignal.User.PushSubscription.optedIn = true;
    expect(accessor()).toBe(true);
  });

  it("adds the 'open' class when the store drawer is open", () => {
    const { wrapper } = mountSidebar({ drawerOpen: true });
    expect(wrapper.find(".sidebar-drawer").classes()).toContain("open");
  });

  it("commits closeDrawer when the header close button is clicked", async () => {
    const { wrapper, closeDrawer } = mountSidebar();
    await wrapper.find("button.btn-close-custom").trigger("click");
    expect(closeDrawer).toHaveBeenCalledTimes(1);
  });

  it("opts out and updates the UI when already subscribed", async () => {
    const { wrapper } = mountSidebar();
    // isSubscribed starts truthy -> click takes the optOut branch.
    await wrapper.find("button.action-button").trigger("click");
    await Promise.resolve();
    await wrapper.vm.$nextTick();

    expect(oneSignal.User.PushSubscription.optOut).toHaveBeenCalledTimes(1);
    expect(oneSignal.User.PushSubscription.optIn).not.toHaveBeenCalled();
    // After optOut, isSubscribed becomes false -> labels/icon flip.
    expect(wrapper.find(".action-title").text()).toBe("Enable Notifications");
    expect(wrapper.find(".action-subtitle").text()).toBe("Get latest updates");
    expect(wrapper.find(".bi-bell").exists()).toBe(true);
    expect(wrapper.find(".action-button").classes()).not.toContain(
      "action-button-active",
    );
    // setupEventListeners ran and wired all three listeners.
    expect(oneSignal.Notifications.addEventListener).toHaveBeenCalledWith(
      "foregroundWillDisplay",
      expect.any(Function),
    );
    expect(oneSignal.Notifications.addEventListener).toHaveBeenCalledWith(
      "click",
      expect.any(Function),
    );
    expect(oneSignal.User.PushSubscription.addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });

  it("opts in when not subscribed, then exercises the wired listener callbacks", async () => {
    const { wrapper } = mountSidebar();

    // First click opts OUT (subscribed -> false).
    await wrapper.find("button.action-button").trigger("click");
    await Promise.resolve();
    await wrapper.vm.$nextTick();
    oneSignal.Notifications.addEventListener.mockClear();
    oneSignal.User.PushSubscription.addEventListener.mockClear();

    // Second click now opts IN (else branch).
    await wrapper.find("button.action-button").trigger("click");
    await Promise.resolve();
    await Promise.resolve();
    await wrapper.vm.$nextTick();

    expect(oneSignal.User.PushSubscription.optIn).toHaveBeenCalledTimes(1);
    expect(wrapper.find(".action-title").text()).toBe("Notifications On");

    // Invoke the registered callbacks to cover their bodies.
    const fgCall = oneSignal.Notifications.addEventListener.mock.calls.find(
      (c) => c[0] === "foregroundWillDisplay",
    );
    fgCall[1]({ notification: { title: "x" } });

    const clickCall = oneSignal.Notifications.addEventListener.mock.calls.find(
      (c) => c[0] === "click",
    );
    clickCall[1]({ result: "ok" });

    const changeCb = oneSignal.User.PushSubscription.addEventListener.mock.calls.find(
      (c) => c[0] === "change",
    )[1];
    // optedIn true branch (no state change).
    await changeCb({ current: { optedIn: true } });
    expect(wrapper.find(".action-title").text()).toBe("Notifications On");
    // optedIn false branch -> isSubscribed set false.
    await changeCb({ current: { optedIn: false } });
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".action-title").text()).toBe("Enable Notifications");
  });

  it("logs and recovers when opt-in/out throws (catch branch)", async () => {
    oneSignal.User.PushSubscription.optOut.mockRejectedValueOnce(
      new Error("boom"),
    );
    const { wrapper } = mountSidebar();

    await wrapper.find("button.action-button").trigger("click");
    await Promise.resolve();
    await Promise.resolve();
    await wrapper.vm.$nextTick();

    expect(errorSpy).toHaveBeenCalledWith(
      "Error during opt-in process:",
      expect.any(Error),
    );
  });

  it("logs and recovers when wiring listeners throws (setupEventListeners catch)", async () => {
    oneSignal.Notifications.addEventListener.mockImplementationOnce(() => {
      throw new Error("listener boom");
    });
    const { wrapper } = mountSidebar();

    // Subscribed -> optOut succeeds, then setupEventListeners throws.
    await wrapper.find("button.action-button").trigger("click");
    await Promise.resolve();
    await wrapper.vm.$nextTick();

    expect(errorSpy).toHaveBeenCalledWith(
      "Error setting up event listeners:",
      expect.any(Error),
    );
  });
});
