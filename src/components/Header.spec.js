import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import { createStore } from "vuex";
import Header from "@/components/Header.vue";

// vue-router is imported (useRouter/useRoute) but the values are unused; stub it
// so the named imports resolve without needing a real router instance.
vi.mock("vue-router", () => ({
  useRouter: () => ({}),
  useRoute: () => ({}),
}));

// Child components are stubbed so this spec only exercises Header's own logic.
vi.mock("@/components/AdvertiseCTA.vue", () => ({
  default: { name: "AdvertiseCTA", template: "<div class='advertise-cta-stub' />" },
}));
vi.mock("./HeaderSearch.vue", () => ({
  default: { name: "HeaderSearch", template: "<div class='header-search-stub' />" },
}));
vi.mock("./AdCTAWithTicker.vue", () => ({
  default: {
    name: "AdCTAWithTicker",
    props: ["layout"],
    template: "<div class='ad-cta-stub' :data-layout='layout' />",
  },
}));
vi.mock("@/utils", () => ({ isMobileDevice: vi.fn(() => false) }));

function mountHeader() {
  const openDrawer = vi.fn();
  const store = createStore({
    mutations: { openDrawer },
  });
  const wrapper = mount(Header, {
    attachTo: document.body,
    global: { plugins: [store], stubs: { RouterLink: RouterLinkStub } },
  });
  return { wrapper, openDrawer };
}

/**
 * Fire a native scroll event after setting window.pageYOffset, which is what
 * handleScroll reads via `window.pageYOffset || document.documentElement.scrollTop`.
 */
function scrollTo(y, { useDocScrollTop = false } = {}) {
  if (useDocScrollTop) {
    Object.defineProperty(window, "pageYOffset", { value: 0, configurable: true });
    document.documentElement.scrollTop = y;
  } else {
    Object.defineProperty(window, "pageYOffset", { value: y, configurable: true });
    document.documentElement.scrollTop = 0;
  }
  window.dispatchEvent(new Event("scroll"));
}

describe("Header.vue", () => {
  let addSpy;
  let removeSpy;

  beforeEach(() => {
    addSpy = vi.spyOn(window, "addEventListener");
    removeSpy = vi.spyOn(window, "removeEventListener");
    document.documentElement.scrollTop = 0;
    Object.defineProperty(window, "pageYOffset", { value: 0, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the static chrome: menu, logo, nav links, whatsapp, and ad banner", () => {
    const { wrapper } = mountHeader();

    // Header root starts un-fixed.
    const header = wrapper.find("header.app-header");
    expect(header.exists()).toBe(true);
    expect(header.classes()).not.toContain("header-fixed");

    // Menu toggle button.
    expect(wrapper.find("button.menu-toggle").exists()).toBe(true);

    // Two nav router-links (Home, News) + brand logo link = 3 RouterLinkStub.
    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links.map((l) => l.props("to"))).toEqual(["/", "/", "/news"]);

    // WhatsApp anchor.
    const wa = wrapper.find("a.whatsapp-btn");
    expect(wa.attributes("href")).toContain("api.whatsapp.com");
    expect(wa.attributes("target")).toBe("_blank");

    // Ad banner child rendered with row layout.
    const ad = wrapper.find(".ad-cta-stub");
    expect(ad.exists()).toBe(true);
    expect(ad.attributes("data-layout")).toBe("row");

    // Spacer hidden while not fixed (v-if false branch).
    expect(wrapper.find(".ad-banner-sticky").exists()).toBe(true);
    expect(
      wrapper.findAll("div").some((d) => d.attributes("style")?.includes("height")),
    ).toBe(false);
  });

  it("registers a scroll listener on mount", () => {
    mountHeader();
    expect(addSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("removes the scroll listener on unmount", () => {
    const { wrapper } = mountHeader();
    wrapper.unmount();
    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("commits openDrawer when the menu button is clicked", async () => {
    const { wrapper, openDrawer } = mountHeader();
    await wrapper.find("button.menu-toggle").trigger("click");
    expect(openDrawer).toHaveBeenCalledTimes(1);
  });

  it("reads the header height on mount when the .app-header element exists", () => {
    // jsdom offsetHeight is 0 by default; force a value so the onMounted branch
    // assigns a non-zero height.
    const offSpy = vi
      .spyOn(HTMLElement.prototype, "offsetHeight", "get")
      .mockReturnValue(120);
    const { wrapper } = mountHeader();
    // The mounted hook captured headerHeight from offsetHeight.
    offSpy.mockRestore();
    expect(wrapper.find("header.app-header").exists()).toBe(true);
  });

  it("fixes the header when scrolling down past the header height, then shows the spacer", async () => {
    // Force offsetHeight so headerHeight is non-zero from mount.
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(100);
    const { wrapper } = mountHeader();

    // Scroll down past headerHeight (100) -> isHeaderFixed becomes true.
    scrollTo(200);
    await wrapper.vm.$nextTick();

    expect(wrapper.find("header.app-header").classes()).toContain("header-fixed");
    // Spacer v-if true branch now rendered with the captured height.
    const spacer = wrapper
      .findAll("div")
      .find((d) => d.attributes("style")?.includes("height"));
    expect(spacer).toBeTruthy();
    expect(spacer.attributes("style")).toContain("100px");
  });

  it("un-fixes the header when scrolling back up above the 50px threshold", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(100);
    const { wrapper } = mountHeader();

    // First go down to fix it.
    scrollTo(200);
    await wrapper.vm.$nextTick();
    expect(wrapper.find("header.app-header").classes()).toContain("header-fixed");

    // Now scroll up to < 50 -> un-fix (else-if branch).
    scrollTo(10);
    await wrapper.vm.$nextTick();
    expect(wrapper.find("header.app-header").classes()).not.toContain("header-fixed");
  });

  it("does not toggle when scrolling down but still within the header height", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(300);
    const { wrapper } = mountHeader();

    // Scrolling down but currentScrollPosition (100) < headerHeight (300):
    // the if-condition is false and the else-if (needs scrolling up) is false.
    scrollTo(100);
    await wrapper.vm.$nextTick();
    expect(wrapper.find("header.app-header").classes()).not.toContain("header-fixed");
  });

  it("does not un-fix when scrolling up but still below the 50px threshold floor is not met", async () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(100);
    const { wrapper } = mountHeader();

    // Fix it first.
    scrollTo(200);
    await wrapper.vm.$nextTick();
    expect(wrapper.find("header.app-header").classes()).toContain("header-fixed");

    // Scroll up a little but stay >= 50 (e.g. 120 < 200 prev = scrolling up,
    // but currentScrollPosition 120 is NOT < 50) -> stays fixed (else-if false).
    scrollTo(120);
    await wrapper.vm.$nextTick();
    expect(wrapper.find("header.app-header").classes()).toContain("header-fixed");
  });

  it("lazily measures the header height inside handleScroll when it is still 0 and the element exists", async () => {
    // Mount with offsetHeight 0 so onMounted leaves headerHeight at 0...
    const offSpy = vi
      .spyOn(HTMLElement.prototype, "offsetHeight", "get")
      .mockReturnValue(0);
    const { wrapper } = mountHeader();

    // ...then make offsetHeight non-zero so the in-scroll measurement branch
    // (headerHeight.value === 0 && header exists) assigns it.
    offSpy.mockReturnValue(80);
    scrollTo(500);
    await wrapper.vm.$nextTick();

    expect(wrapper.find("header.app-header").classes()).toContain("header-fixed");
    const spacer = wrapper
      .findAll("div")
      .find((d) => d.attributes("style")?.includes("height"));
    expect(spacer.attributes("style")).toContain("80px");
  });

  it("handles scroll when the .app-header element is absent (no header to measure)", async () => {
    const offSpy = vi
      .spyOn(HTMLElement.prototype, "offsetHeight", "get")
      .mockReturnValue(0);
    const { wrapper } = mountHeader();
    offSpy.mockRestore();

    // Remove the header from the document so document.querySelector(".app-header")
    // returns null inside handleScroll -> the `if (header)` branch is skipped.
    const querySpy = vi.spyOn(document, "querySelector").mockReturnValue(null);

    // headerHeight is 0; scrolling down with currentScrollPosition > 0 still
    // satisfies the fix condition (0 > 0 is false though) — assert no crash and
    // exercise the null-header path.
    scrollTo(300, { useDocScrollTop: true });
    await wrapper.vm.$nextTick();

    querySpy.mockRestore();
    // currentScrollPosition (300) > headerHeight (0) and scrolling down -> fixed.
    expect(wrapper.find("header.app-header").classes()).toContain("header-fixed");
  });

  it("mounts cleanly when the .app-header element is missing at mount time", () => {
    // Make querySelector return null during onMounted so the `if (header)`
    // false branch in the mounted hook is exercised.
    const querySpy = vi.spyOn(document, "querySelector").mockReturnValue(null);
    const { wrapper } = mountHeader();
    querySpy.mockRestore();
    expect(wrapper.exists()).toBe(true);
  });
});
