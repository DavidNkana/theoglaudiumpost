import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { mount, RouterLinkStub } from "@vue/test-utils";

// ---- Mock vue-router's useRouter (used in onBeforeMount) ----
const routerPush = vi.fn();
const routerMock = {
  push: (...args) => routerPush(...args),
  currentRoute: { value: { path: "/business/dashboard", query: {} } },
};
const routeMock = { path: "/business/dashboard", query: {} };

vi.mock("vue-router", () => ({
  useRouter: () => routerMock,
  useRoute: () => routeMock,
  RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
  RouterView: { name: "RouterView", template: "<div><slot /></div>" },
}));

// ---- Mock the useAuth composable ----
const logout = vi.fn();
const hasRole = vi.fn();
const isAuthenticated = ref(true);
const user = ref({ id: 1, name: "Admin User" });

vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ logout, isAuthenticated, user, hasRole }),
}));

import BusinessLayout from "@/layouts/BusinessLayout.vue";

function mountLayout() {
  return mount(BusinessLayout, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        // <router-view /> -> trivial stub so it does not pull route deps
        RouterView: true,
      },
    },
  });
}

describe("BusinessLayout", () => {
  beforeEach(() => {
    routerPush.mockClear();
    logout.mockClear();
    hasRole.mockReset();
    isAuthenticated.value = true;
    user.value = { id: 1, name: "Admin User" };
  });

  it("renders the layout shell without redirecting an authenticated advertiser", () => {
    // both conditions false -> the guard does NOT push
    isAuthenticated.value = true;
    hasRole.mockReturnValue(true);

    const wrapper = mountLayout();

    expect(wrapper.find(".admin-layout").exists()).toBe(true);
    expect(wrapper.text()).toContain("Administrator Panel");
    expect(wrapper.text()).toContain("Admin User");
    expect(hasRole).toHaveBeenCalledWith("advertiser");
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("redirects to register when the user is not authenticated (left side of ||)", () => {
    isAuthenticated.value = false;
    // hasRole should not even be consulted because of short-circuit
    hasRole.mockReturnValue(true);

    mountLayout();

    expect(routerPush).toHaveBeenCalledWith("/business/register");
    expect(hasRole).not.toHaveBeenCalled();
  });

  it("redirects to register when authenticated but lacking the advertiser role (right side of ||)", () => {
    isAuthenticated.value = true;
    hasRole.mockReturnValue(false);

    mountLayout();

    expect(hasRole).toHaveBeenCalledWith("advertiser");
    expect(routerPush).toHaveBeenCalledWith("/business/register");
  });

  it("toggles the sidebar 'show' class when the mobile toggler is clicked", async () => {
    hasRole.mockReturnValue(true);
    const wrapper = mountLayout();

    const sidebar = wrapper.find(".admin-sidebar");
    // closed initially
    expect(sidebar.classes()).not.toContain("show");

    await wrapper.find("button.navbar-toggler").trigger("click");
    expect(wrapper.find(".admin-sidebar").classes()).toContain("show");

    // toggle back off to exercise the other side of the boolean flip
    await wrapper.find("button.navbar-toggler").trigger("click");
    expect(wrapper.find(".admin-sidebar").classes()).not.toContain("show");
  });

  it("calls logout from the dropdown Logout link (@click.prevent)", async () => {
    hasRole.mockReturnValue(true);
    const wrapper = mountLayout();

    await wrapper.find("a.dropdown-item").trigger("click");
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("calls logout from the sidebar Sign Out button", async () => {
    hasRole.mockReturnValue(true);
    const wrapper = mountLayout();

    await wrapper.find("button.btn-outline-secondary").trigger("click");
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("links the brand and sidebar nav to the expected business routes", () => {
    hasRole.mockReturnValue(true);
    const wrapper = mountLayout();

    const targets = wrapper
      .findAllComponents(RouterLinkStub)
      .map((l) => l.props("to"));
    expect(targets).toEqual([
      "/business/dashboard",
      "/business/dashboard",
      "/business/ads",
      "/business/payments",
    ]);
  });
});
