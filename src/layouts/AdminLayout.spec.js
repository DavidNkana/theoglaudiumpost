import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, RouterLinkStub, flushPromises } from "@vue/test-utils";

/**
 * Unit tests for src/layouts/AdminLayout.vue
 *
 * Strategy
 * - Mock every external boundary the SFC imports:
 *   - "vue-router" (useRouter) — drives navigateTo() + the onBeforeMount
 *     redirect. router.push returns a controllable promise so we can exercise
 *     both the resolve and the reject branches of navigateTo(). RouterLink/
 *     RouterView/useRoute are also re-exported so the mock is a drop-in.
 *   - "@/composables/useAuth" — exposes mutable refs/spies so we can flip
 *     isAuthenticated and hasRole('superadmin') to hit every template branch.
 *   - "./Partials/SidebarMenuItem.vue" — stubbed (it pulls vue-router); we only
 *     assert on its presence, not its internals.
 * - $route is injected through global.mocks so the template's $route.path
 *   expressions (active-class branches) are controllable per test.
 * - Every v-if/v-else, every active-class ternary edge, every method, every
 *   lifecycle branch, and the navigateTo try/catch (resolve + reject + throw)
 *   are driven to 100% line/branch/function/statement coverage.
 */

// --- Mutable mock state (hoisted so vi.mock factories can reference it) -------

const h = vi.hoisted(() => {
  const { ref } = require("vue");
  return {
    pushMock: vi.fn(() => Promise.resolve()),
    currentRoute: { value: { path: "/admin/dashboard" } },
    logoutMock: vi.fn(),
    isAuthenticated: ref(true),
    user: ref({ id: 1, name: "Admin", role: { name: "admin" } }),
    state: { superadmin: false },
    hasRoleMock: vi.fn(),
  };
});

const {
  pushMock,
  currentRoute,
  logoutMock,
  isAuthenticated,
  user,
  state,
  hasRoleMock,
} = h;

hasRoleMock.mockImplementation((role) =>
  role === "superadmin" ? state.superadmin : false
);

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: (...args) => h.pushMock(...args),
    currentRoute: h.currentRoute,
  }),
  useRoute: () => h.currentRoute.value,
  // Re-export the component-level helpers so anything resolving them from
  // "vue-router" still works; the template's <router-link>/<router-view>
  // are rendered via the global stubs below.
  RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
  RouterView: { name: "RouterView", template: "<div><slot /></div>" },
}));

vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({
    logout: h.logoutMock,
    isAuthenticated: h.isAuthenticated,
    user: h.user,
    hasRole: h.hasRoleMock,
  }),
}));

vi.mock("./Partials/SidebarMenuItem.vue", () => ({
  default: {
    name: "SidebarMenuItem",
    props: ["label", "icon", "basePath", "children"],
    template: "<li class='sidebar-menu-item-stub'></li>",
  },
}));

import AdminLayout from "@/layouts/AdminLayout.vue";

// --- Helpers -----------------------------------------------------------------

function mountLayout({ routePath = "/admin/dashboard" } = {}) {
  currentRoute.value = { path: routePath };
  return mount(AdminLayout, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        "router-view": { template: "<div class='router-view-stub'></div>" },
      },
      mocks: {
        $route: { path: routePath },
      },
    },
  });
}

beforeEach(() => {
  pushMock.mockReset();
  pushMock.mockImplementation(() => Promise.resolve());
  logoutMock.mockReset();
  hasRoleMock.mockClear();
  isAuthenticated.value = true;
  user.value = { id: 1, name: "Admin", role: { name: "admin" } };
  currentRoute.value = { path: "/admin/dashboard" };
  state.superadmin = false;
  hasRoleMock.mockImplementation((role) =>
    role === "superadmin" ? state.superadmin : false
  );
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- Tests -------------------------------------------------------------------

describe("AdminLayout.vue", () => {
  it("renders the static shell, footer year, and non-superadmin sidebar links", () => {
    state.superadmin = false;
    const wrapper = mountLayout();

    expect(wrapper.find(".admin-layout").exists()).toBe(true);
    // Footer renders the current year (drives `new Date().getFullYear()`).
    expect(wrapper.find(".main-footer").text()).toContain(
      String(new Date().getFullYear())
    );
    // Non-superadmin: plain router-link "Ads" + "Announcements" appear,
    // no SidebarMenuItem, no "Manage AI Prompts".
    const linkTargets = wrapper
      .findAllComponents(RouterLinkStub)
      .map((l) => l.props("to"));
    expect(linkTargets).toContain("/admin/ads");
    expect(linkTargets).toContain("/admin/announcements");
    expect(linkTargets).not.toContain("/admin/articles/prompts");
    expect(wrapper.find(".sidebar-menu-item-stub").exists()).toBe(false);
  });

  it("renders superadmin sidebar (SidebarMenuItem + Manage AI Prompts) when hasRole('superadmin')", () => {
    state.superadmin = true;
    const wrapper = mountLayout();

    // Superadmin: SidebarMenuItem stubs render (Ads + Announcements menus).
    expect(wrapper.findAll(".sidebar-menu-item-stub").length).toBeGreaterThan(0);
    // "Manage AI Prompts" router-link appears.
    const linkTargets = wrapper
      .findAllComponents(RouterLinkStub)
      .map((l) => l.props("to"));
    expect(linkTargets).toContain("/admin/articles/prompts");
    // Plain non-superadmin Ads/Announcements links are gone.
    expect(linkTargets).not.toContain("/admin/ads");
    expect(linkTargets).not.toContain("/admin/announcements");
  });

  it("toggles the sidebar open/closed, swapping the toggler icon and backdrop", async () => {
    const wrapper = mountLayout();

    // Closed initially: toggler-icon span shown, x-icon hidden, no backdrop.
    expect(wrapper.find(".navbar-toggler-icon").exists()).toBe(true);
    expect(wrapper.find(".fs-2 .bi-x-lg").exists()).toBe(false);
    expect(wrapper.find(".sidebar-backdrop").exists()).toBe(false);
    expect(wrapper.find(".admin-sidebar").classes()).not.toContain("show");

    // Open via the toggler button.
    await wrapper.find("button.navbar-toggler").trigger("click");
    expect(wrapper.find(".navbar-toggler-icon").exists()).toBe(false);
    expect(wrapper.find(".fs-2 .bi-x-lg").exists()).toBe(true);
    expect(wrapper.find(".sidebar-backdrop").exists()).toBe(true);
    expect(wrapper.find(".admin-sidebar").classes()).toContain("show");

    // Close again via the backdrop (covers backdrop @click -> toggleSidebar).
    await wrapper.find(".sidebar-backdrop").trigger("click");
    expect(wrapper.find(".sidebar-backdrop").exists()).toBe(false);
    expect(wrapper.find(".navbar-toggler-icon").exists()).toBe(true);
  });

  it("applies active classes for the dashboard route (=== and startsWith true edges)", () => {
    const wrapper = mountLayout({ routePath: "/admin/dashboard" });
    const links = wrapper.findAll(".admin-sidebar .nav-link");
    // First link (Dashboard) is active on exact match.
    expect(links[0].classes()).toContain("active");
  });

  it("applies active classes for articles/source-articles/businesses (startsWith true)", () => {
    const wrapper = mountLayout({ routePath: "/admin/articles/123" });
    const dashboard = wrapper.findAll(".admin-sidebar .nav-link")[0];
    const articles = wrapper.findAll(".admin-sidebar .nav-link")[1];
    // Dashboard not active (=== false), Articles active (startsWith true).
    expect(dashboard.classes()).not.toContain("active");
    expect(articles.classes()).toContain("active");

    const sources = mountLayout({ routePath: "/admin/source-articles/x" });
    expect(sources.findAll(".admin-sidebar .nav-link")[2].classes()).toContain(
      "active"
    );

    const biz = mountLayout({ routePath: "/admin/businesses/9" });
    // Find the Businesses anchor by its label text.
    const bizLink = biz
      .findAll(".admin-sidebar a.nav-link")
      .find((a) => a.text().includes("Businesses"));
    expect(bizLink.classes()).toContain("active");
  });

  it("does not mark links active for an unrelated route (startsWith/=== false edges)", () => {
    const wrapper = mountLayout({ routePath: "/admin/other" });
    wrapper.findAll(".admin-sidebar .nav-link").forEach((link) => {
      expect(link.classes()).not.toContain("active");
    });
  });

  it("navigateTo pushes the route and logs success on resolve", async () => {
    pushMock.mockResolvedValueOnce(undefined);
    const wrapper = mountLayout();

    await wrapper.find(".admin-sidebar .nav-link").trigger("click");
    expect(pushMock).toHaveBeenCalledWith("/admin/dashboard");
    await flushPromises();
    expect(console.log).toHaveBeenCalledWith(
      "Navigation to /admin/dashboard successful"
    );
  });

  it("navigateTo fires for the Source Articles, Businesses and Users handlers", async () => {
    const wrapper = mountLayout();
    const anchors = wrapper.findAll(".admin-sidebar a.nav-link");
    const sourceLink = anchors.find((a) => a.text().includes("Source Articles"));
    const bizLink = anchors.find((a) => a.text().includes("Businesses"));
    const usersLink = anchors.find((a) => a.text().includes("Users"));

    await sourceLink.trigger("click");
    expect(pushMock).toHaveBeenCalledWith("/admin/source-articles");

    await bizLink.trigger("click");
    expect(pushMock).toHaveBeenCalledWith("/admin/businesses");

    await usersLink.trigger("click");
    expect(pushMock).toHaveBeenCalledWith("/admin/users");
  });

  it("navigateTo logs a navigation error when router.push rejects", async () => {
    const err = new Error("nav-failed");
    pushMock.mockRejectedValueOnce(err);
    const wrapper = mountLayout();

    await wrapper.findAll(".admin-sidebar .nav-link")[1].trigger("click"); // Articles
    expect(pushMock).toHaveBeenCalledWith("/admin/articles");
    await flushPromises();
    expect(console.error).toHaveBeenCalledWith("Navigation error:", err);
  });

  it("navigateTo catches a synchronous throw from router.push", async () => {
    const err = new Error("sync-throw");
    pushMock.mockImplementationOnce(() => {
      throw err;
    });
    const wrapper = mountLayout();

    await wrapper.find(".admin-sidebar .nav-link").trigger("click");
    expect(console.error).toHaveBeenCalledWith(
      "Error during navigation to /admin/dashboard:",
      err
    );
  });

  it("logs the 'Not authenticated' state inside navigateTo when unauthenticated", async () => {
    isAuthenticated.value = false;
    const wrapper = mountLayout();
    await wrapper.find(".admin-sidebar .nav-link").trigger("click");
    // Covers the ternary's false branch in the auth-state log line.
    expect(console.log).toHaveBeenCalledWith(
      "Current authentication state: Not authenticated"
    );
  });

  it("handleLogout calls logout from useAuth", async () => {
    const wrapper = mountLayout();
    await wrapper.find("button.btn-outline-danger").trigger("click");
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it("redirects to login on mount when not authenticated (onBeforeMount true branch)", () => {
    isAuthenticated.value = false;
    mountLayout();
    expect(pushMock).toHaveBeenCalledWith("/admin/login");
  });

  it("does not redirect on mount when authenticated (onBeforeMount false branch)", () => {
    isAuthenticated.value = true;
    mountLayout();
    expect(pushMock).not.toHaveBeenCalledWith("/admin/login");
  });
});
