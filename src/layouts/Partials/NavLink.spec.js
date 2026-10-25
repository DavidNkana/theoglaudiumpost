import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import NavLink from "@/layouts/Partials/NavLink.vue";

// Mock vue-router's useRoute so we can drive the isPostsRoute computed both ways.
let mockRoute;
vi.mock("vue-router", () => ({
  useRoute: () => mockRoute,
}));

function mountNav(path = "/") {
  mockRoute = { path };
  return mount(NavLink, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe("NavLink", () => {
  beforeEach(() => {
    mockRoute = { path: "/" };
  });

  it("renders the Articles toggle and four submenu router-links", () => {
    const wrapper = mountNav("/");
    expect(wrapper.find("a.nav-link").text()).toContain("Articles");
    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links.map((l) => l.props("to"))).toEqual([
      "/admin/articles/drafts",
      "/admin/articles/pending",
      "/admin/articles/approved",
      "/admin/articles/denied",
    ]);
  });

  it("does not mark the toggle active when not on a posts route (isPostsRoute false)", () => {
    const wrapper = mountNav("/dashboard");
    expect(wrapper.find("a.nav-link").classes()).not.toContain("active");
  });

  it("marks the toggle active when on a posts subroute (isPostsRoute true)", () => {
    const wrapper = mountNav("/admin/articles/drafts");
    expect(wrapper.find("a.nav-link").classes()).toContain("active");
  });

  it("starts collapsed: chevron-down icon and submenu hidden when not a posts route", () => {
    const wrapper = mountNav("/dashboard");
    const chevron = wrapper.findAll("i.bi").at(1);
    expect(chevron.classes()).toContain("bi-chevron-down");
    expect(chevron.classes()).not.toContain("bi-chevron-up");

    // v-show hidden -> display:none style on the submenu ul
    const submenu = wrapper.find("ul.list-unstyled");
    expect(submenu.attributes("style")).toContain("display: none");
  });

  it("expands on click (prevent default), flipping the chevron and showing the submenu", async () => {
    const wrapper = mountNav("/dashboard");
    const link = wrapper.find("a.nav-link");

    await link.trigger("click");

    // postsExpanded is now true: chevron flips up
    const chevron = wrapper.findAll("i.bi").at(1);
    expect(chevron.classes()).toContain("bi-chevron-up");
    expect(chevron.classes()).not.toContain("bi-chevron-down");

    // v-show now visible (postsExpanded true branch of the || expression)
    const submenu = wrapper.find("ul.list-unstyled");
    expect(submenu.attributes("style") || "").not.toContain("display: none");
  });

  it("collapses again on a second click", async () => {
    const wrapper = mountNav("/dashboard");
    const link = wrapper.find("a.nav-link");

    await link.trigger("click");
    await link.trigger("click");

    const chevron = wrapper.findAll("i.bi").at(1);
    expect(chevron.classes()).toContain("bi-chevron-down");

    const submenu = wrapper.find("ul.list-unstyled");
    expect(submenu.attributes("style")).toContain("display: none");
  });

  it("keeps the submenu visible via isPostsRoute even while collapsed (postsExpanded false, isPostsRoute true)", () => {
    const wrapper = mountNav("/admin/articles/pending");
    // postsExpanded defaults to false, but isPostsRoute is true -> v-show visible
    const submenu = wrapper.find("ul.list-unstyled");
    expect(submenu.attributes("style") || "").not.toContain("display: none");
    // chevron stays down because postsExpanded is still false
    const chevron = wrapper.findAll("i.bi").at(1);
    expect(chevron.classes()).toContain("bi-chevron-down");
  });
});
