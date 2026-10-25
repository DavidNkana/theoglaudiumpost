import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, RouterLinkStub, flushPromises } from "@vue/test-utils";
import { createStore } from "vuex";
import { reactive } from "vue";
import AppLayout from "@/layouts/AppLayout.vue";

// ---------------------------------------------------------------------------
// External boundary mocks. AppLayout only imports child components + the
// SHOW_ADS config flag; everything is stubbed so the spec exercises only the
// layout's own logic (drawer state, route watcher, body-class cleanup).
// ---------------------------------------------------------------------------

// A single shared reactive route. The component captures this exact object via
// useRoute(), so mutating route.fullPath drives the watch(() => route.fullPath)
// side effect the same way real navigation would.
const route = reactive({ fullPath: "/" });
vi.mock("vue-router", () => ({
  useRoute: () => route,
  useRouter: () => ({}),
}));

vi.mock("@/config/app", () => ({ SHOW_ADS: true }));

// Child components stubbed to lightweight markers.
vi.mock("@/components/Header.vue", () => ({
  default: { name: "Header", template: "<div class='header-stub' />" },
}));
vi.mock("@/components/Sidebar.vue", () => ({
  default: { name: "Sidebar", template: "<div class='sidebar-stub' />" },
}));
vi.mock("@/components/ScrollToTop.vue", () => ({
  default: { name: "ScrollToTop", template: "<div class='scroll-top-stub' />" },
}));
vi.mock("@/components/Footer.vue", () => ({
  default: { name: "Footer", template: "<div class='footer-stub' />" },
}));
vi.mock("@/components/BottomNav.vue", () => ({
  default: { name: "BottomNav", template: "<div class='bottom-nav-stub' />" },
}));
vi.mock("@/components/PopupAd.vue", () => ({
  default: { name: "PopupAd", template: "<div class='popup-ad-stub' />" },
}));
vi.mock("@/components/BottomBannerAd.vue", () => ({
  default: { name: "BottomBannerAd", template: "<div class='bottom-banner-ad-stub' />" },
}));

function mountLayout({ drawerOpen = false } = {}) {
  const closeDrawer = vi.fn((state) => {
    state.drawerOpen = false;
  });
  const store = createStore({
    state: () => ({ drawerOpen }),
    mutations: { closeDrawer },
  });
  const wrapper = mount(AppLayout, {
    global: {
      plugins: [store],
      stubs: {
        RouterLink: RouterLinkStub,
        // router-view has no real router here; stub it to a marker.
        "router-view": { template: "<div class='router-view-stub' />" },
      },
    },
  });
  return { wrapper, store, closeDrawer };
}

describe("AppLayout.vue", () => {
  beforeEach(() => {
    route.fullPath = "/";
    document.body.classList.remove("drawer-open");
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.classList.remove("drawer-open");
  });

  it("renders the static chrome and the router-view content", () => {
    const { wrapper } = mountLayout();

    expect(wrapper.find(".app-container").exists()).toBe(true);
    expect(wrapper.find(".sidebar-stub").exists()).toBe(true);
    expect(wrapper.find(".header-stub").exists()).toBe(true);
    expect(wrapper.find(".router-view-stub").exists()).toBe(true);
    expect(wrapper.find(".popup-ad-stub").exists()).toBe(true);
    expect(wrapper.find(".bottom-banner-ad-stub").exists()).toBe(true);
    expect(wrapper.find(".site-footer-desktop").exists()).toBe(true);
    expect(wrapper.find(".footer-stub").exists()).toBe(true);
    expect(wrapper.find(".bottom-nav-stub").exists()).toBe(true);
    expect(wrapper.find(".scroll-top-stub").exists()).toBe(true);
  });

  it("does NOT render the sidebar backdrop when the drawer is closed (v-if false branch)", () => {
    const { wrapper } = mountLayout({ drawerOpen: false });
    expect(wrapper.find(".sidebar-backdrop").exists()).toBe(false);
  });

  it("renders the sidebar backdrop when the drawer is open (v-if true branch)", () => {
    const { wrapper } = mountLayout({ drawerOpen: true });
    expect(wrapper.find(".sidebar-backdrop").exists()).toBe(true);
  });

  it("commits closeDrawer when the backdrop is clicked", async () => {
    const { wrapper, closeDrawer } = mountLayout({ drawerOpen: true });
    await wrapper.find(".sidebar-backdrop").trigger("click");
    expect(closeDrawer).toHaveBeenCalledTimes(1);
  });

  it("closes the drawer (and hides the backdrop) when the route fullPath changes", async () => {
    const { wrapper, closeDrawer } = mountLayout({ drawerOpen: true });

    // Backdrop visible to start.
    expect(wrapper.find(".sidebar-backdrop").exists()).toBe(true);

    // Drive the watch(() => route.fullPath) side effect.
    route.fullPath = "/news";
    await flushPromises();

    expect(closeDrawer).toHaveBeenCalledTimes(1);
    // The mutation set drawerOpen=false, so the backdrop is gone.
    expect(wrapper.find(".sidebar-backdrop").exists()).toBe(false);
  });

  it("removes the drawer-open body class on unmount (onBeforeUnmount)", () => {
    document.body.classList.add("drawer-open");
    const { wrapper } = mountLayout();

    expect(document.body.classList.contains("drawer-open")).toBe(true);
    wrapper.unmount();
    expect(document.body.classList.contains("drawer-open")).toBe(false);
  });
});
