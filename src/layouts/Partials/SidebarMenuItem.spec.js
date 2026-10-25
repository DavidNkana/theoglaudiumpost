import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";
import { reactive } from "vue";
import SidebarMenuItem from "@/layouts/Partials/SidebarMenuItem.vue";

// ---- Mocked external boundaries -------------------------------------------

// vue-router: useRouter / useRoute return controllable mocks.
const pushMock = vi.fn();
const route = reactive({ path: "/" });

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: pushMock }),
  useRoute: () => route,
}));

// useAuth composable boundary.
const hasRoleMock = vi.fn(() => true);
const auth = { isAuthenticated: { value: true }, hasRole: hasRoleMock };

vi.mock("@/composables/useAuth", () => ({
  useAuth: () => auth,
}));

// ---- Helpers ---------------------------------------------------------------

function mountItem(props = {}) {
  return mount(SidebarMenuItem, {
    props: {
      label: "Dashboard",
      icon: "bi-house",
      basePath: "/admin",
      children: [
        { label: "Overview", to: "/overview" },
        { label: "Reports", to: "/reports" },
      ],
      ...props,
    },
    global: {
      // The template references `$route.path` directly (the injected route),
      // which is separate from the `useRoute()` mock used in <script setup>.
      // Provide it via global.mocks so both stay in sync with `route`.
      mocks: { $route: route },
      stubs: { RouterLink: RouterLinkStub },
    },
  });
}

describe("SidebarMenuItem", () => {
  beforeEach(() => {
    route.path = "/";
    pushMock.mockReset();
    pushMock.mockResolvedValue(undefined);
    hasRoleMock.mockReset();
    hasRoleMock.mockReturnValue(true);
    auth.isAuthenticated.value = true;
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders label, icon, chevron-down and collapsed list when inactive", () => {
    const wrapper = mountItem();

    // label + icon rendered
    expect(wrapper.text()).toContain("Dashboard");
    expect(wrapper.find("i.bi-house").exists()).toBe(true);

    // not active: nav-link should not carry 'active'
    expect(wrapper.find(".nav-link").classes()).not.toContain("active");

    // collapsed: chevron-down, not chevron-up
    expect(wrapper.find("i.bi-chevron-down").exists()).toBe(true);
    expect(wrapper.find("i.bi-chevron-up").exists()).toBe(false);

    // children rendered for v-for (non-empty list)
    const childLinks = wrapper.findAll("ul.list-unstyled li a.nav-link");
    expect(childLinks).toHaveLength(2);
    expect(childLinks[0].text()).toBe("Overview");
    expect(childLinks[1].text()).toBe("Reports");

    // v-show driven by expanded||isActive -> hidden when collapsed+inactive
    const list = wrapper.find("ul.list-unstyled");
    expect(list.attributes("style")).toContain("display: none");
  });

  it("marks item active when route matches basePath (isActive=true)", () => {
    route.path = "/admin/reports";
    const wrapper = mountItem();

    const navLink = wrapper.find(".nav-link");
    expect(navLink.classes()).toContain("active");

    // isActive makes the list visible via v-show even when collapsed
    const list = wrapper.find("ul.list-unstyled");
    expect(list.attributes("style") || "").not.toContain("display: none");
  });

  it("adds my-active-link to the child whose path matches the route", () => {
    route.path = "/admin/overview";
    const wrapper = mountItem();

    const childLinks = wrapper.findAll("ul.list-unstyled li a.nav-link");
    // first child (/admin/overview) matches => my-active-link
    expect(childLinks[0].classes()).toContain("my-active-link");
    // second child (/admin/reports) does not match
    expect(childLinks[1].classes()).not.toContain("my-active-link");
  });

  it("toggles expansion via the header click (chevron flips)", async () => {
    const wrapper = mountItem();

    expect(wrapper.find("i.bi-chevron-down").exists()).toBe(true);

    // click the toggle header div
    await wrapper.find(".nav-link.d-flex").trigger("click");

    expect(wrapper.find("i.bi-chevron-up").exists()).toBe(true);
    expect(wrapper.find(".nav-link.d-flex").classes()).toContain("expanded");
    // list now shown because expanded=true
    const list = wrapper.find("ul.list-unstyled");
    expect(list.attributes("style") || "").not.toContain("display: none");
  });

  it("invokes toggle via the chevron's own click handler", async () => {
    const wrapper = mountItem();
    // The chevron sits inside the header div; both bind @click.prevent="toggle",
    // so a click on the chevron bubbles and toggles twice -> back to collapsed.
    await wrapper.find("i.bi").trigger("click");
    expect(wrapper.find("i.bi-chevron-down").exists()).toBe(true);
    expect(wrapper.find("i.bi-chevron-up").exists()).toBe(false);
  });

  it("navigates to basePath on the label anchor click and stops propagation", async () => {
    const wrapper = mountItem();

    const anchor = wrapper.find(".d-flex.align-items-center a");
    await anchor.trigger("click");
    await flushPromises();

    expect(pushMock).toHaveBeenCalledWith("/admin");
    // success branch of router.push().then()
    expect(console.log).toHaveBeenCalledWith(
      "[SidebarMenuItem] Navigation to /admin successful"
    );

    // header anchor click.prevent.stop -> toggle should NOT have fired
    expect(wrapper.find("i.bi-chevron-down").exists()).toBe(true);
  });

  it("navigates without an event (skips stopPropagation branch)", async () => {
    const wrapper = mountItem();
    // Call the exposed setup binding directly with no event argument to drive
    // the falsy `if (event)` branch in navigateTo.
    wrapper.vm.navigateTo("/admin");
    await flushPromises();
    expect(pushMock).toHaveBeenCalledWith("/admin");
  });

  it("navigates to a child path combining basePath + item.to", async () => {
    const wrapper = mountItem();

    const childLinks = wrapper.findAll("ul.list-unstyled li a.nav-link");
    await childLinks[1].trigger("click");
    await flushPromises();

    expect(pushMock).toHaveBeenCalledWith("/admin/reports");
  });

  it("logs the rejection branch when router.push rejects", async () => {
    const navError = new Error("nav-failed");
    pushMock.mockRejectedValueOnce(navError);

    const wrapper = mountItem();
    await wrapper.find(".d-flex.align-items-center a").trigger("click");
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(
      "[SidebarMenuItem] Navigation error:",
      navError
    );
  });

  it("hits the outer try/catch when router.push throws synchronously", async () => {
    const thrown = new Error("sync-throw");
    pushMock.mockImplementationOnce(() => {
      throw thrown;
    });

    const wrapper = mountItem();
    await wrapper.find(".d-flex.align-items-center a").trigger("click");
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(
      "[SidebarMenuItem] Error during navigation to /admin:",
      thrown
    );
  });

  it("logs 'Not authenticated' branch when isAuthenticated is false", async () => {
    auth.isAuthenticated.value = false;
    const wrapper = mountItem();

    await wrapper.find(".d-flex.align-items-center a").trigger("click");
    await flushPromises();

    expect(console.log).toHaveBeenCalledWith(
      "[SidebarMenuItem] Current authentication state: Not authenticated"
    );
  });

  it("collapses when the watched route navigates away from basePath", async () => {
    route.path = "/admin/reports";
    const wrapper = mountItem();

    // expand it first
    await wrapper.find(".nav-link.d-flex").trigger("click");
    expect(wrapper.find(".nav-link.d-flex").classes()).toContain("expanded");

    // navigate away -> watcher sets expanded=false
    route.path = "/other";
    await flushPromises();

    expect(wrapper.find(".nav-link.d-flex").classes()).not.toContain(
      "expanded"
    );
  });

  it("keeps expansion when the watched route stays within basePath", async () => {
    const wrapper = mountItem();

    await wrapper.find(".nav-link.d-flex").trigger("click");
    expect(wrapper.find(".nav-link.d-flex").classes()).toContain("expanded");

    // route still inside basePath -> watcher leaves expanded alone
    route.path = "/admin/overview";
    await flushPromises();

    expect(wrapper.find(".nav-link.d-flex").classes()).toContain("expanded");
  });

  it("renders no child links when children prop is empty (v-for empty)", () => {
    const wrapper = mountItem({ children: [] });
    expect(wrapper.findAll("ul.list-unstyled li")).toHaveLength(0);
  });

  it("renders without children prop using its default empty array", () => {
    const wrapper = mount(SidebarMenuItem, {
      props: { label: "X", icon: "bi-x", basePath: "/x" },
      global: {
        mocks: { $route: route },
        stubs: { RouterLink: RouterLinkStub },
      },
    });
    expect(wrapper.findAll("ul.list-unstyled li")).toHaveLength(0);
  });
});
