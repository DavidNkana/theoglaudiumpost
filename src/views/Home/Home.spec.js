import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

/* ------------------------------------------------------------------ */
/* Mock every external boundary the component imports.                 */
/*                                                                     */
/* Home.vue is a static composition view: it imports several child     */
/* components and ad-placement constants from "@/utils", declares a    */
/* module-level breakingNews array, and renders a fixed layout with no */
/* conditionals or async logic. We stub all child components so we can  */
/* assert the rendered structure without pulling in their (heavy)       */
/* service/router dependencies.                                         */
/* ------------------------------------------------------------------ */

vi.mock("@/utils", () => ({
  HOME_BANNER: "home_banner",
  IN_ARTICLE_BOTTOM: "in_article_bottom",
  IN_ARTICLE_MID: "in_article_mid",
  IN_ARTICLE_TOP: "in_article_top",
  SIDEBAR_TOP: "sidebar_top",
  SIDEBAR_MID: "sidebar_mid",
  SIDEBAR_BOTTOM: "sidebar_bottom",
}));

// Stub every child component the view composes. Each stub is a trivial
// render-nothing component so the boundary services they would import are
// never loaded. Stubs are defined inline inside each factory because
// vi.mock is hoisted above any top-level declarations.
vi.mock("@/components/FeaturedStorySlider.vue", () => ({
  default: { name: "FeaturedStorySlider", template: "<div />" },
}));
vi.mock("@/components/BreakingNewsTicker.vue", () => ({
  default: { name: "BreakingNewsTicker", props: ["news"], template: "<div />" },
}));
vi.mock("@/components/AdBanner.vue", () => ({
  default: {
    name: "AdBanner",
    props: ["size", "placement"],
    template:
      '<div class="ad-banner-stub" :data-size="size" :data-placement="placement" />',
  },
}));
vi.mock("./Partials/FeaturedVideos.vue", () => ({
  default: { name: "FeaturedVideos", template: '<div class="featured-videos-stub" />' },
}));
vi.mock("@/views/News/Partials/LatestNews.vue", () => ({
  default: {
    name: "LatestNews",
    props: ["page", "viewAll", "showTitle"],
    template: '<div class="latest-news-stub" :data-page="page" />',
  },
}));
vi.mock("../Community/Partials/RecentUpdates.vue", () => ({
  default: {
    name: "RecentUpdates",
    props: ["page", "title"],
    template: '<div class="recent-updates-stub" :data-title="title" />',
  },
}));

import Home from "@/views/Home/Home.vue";

describe("Home.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the home-page layout shell with main content and sidebar columns", async () => {
    const wrapper = mount(Home);
    await flushPromises();

    expect(wrapper.find(".home-page").exists()).toBe(true);
    expect(wrapper.find("section.content-wrapper").exists()).toBe(true);
    expect(wrapper.find(".col-lg-8").exists()).toBe(true);
    expect(wrapper.find(".sidebar-column.col-lg-4").exists()).toBe(true);
    expect(wrapper.find(".sidebar-sticky-content").exists()).toBe(true);
  });

  it("renders three AdBanners wired to the correct placements and sizes", async () => {
    const wrapper = mount(Home);
    await flushPromises();

    const banners = wrapper.findAll(".ad-banner-stub");
    expect(banners).toHaveLength(3);

    // Top banner: large / HOME_BANNER
    expect(banners[0].attributes("data-size")).toBe("large");
    expect(banners[0].attributes("data-placement")).toBe("home_banner");

    // In-content bottom banner: large / IN_ARTICLE_BOTTOM
    expect(banners[1].attributes("data-size")).toBe("large");
    expect(banners[1].attributes("data-placement")).toBe("in_article_bottom");

    // Sidebar banner: medium / SIDEBAR_TOP
    expect(banners[2].attributes("data-size")).toBe("medium");
    expect(banners[2].attributes("data-placement")).toBe("sidebar_top");
  });

  it("renders the LatestNews section configured for the home page", async () => {
    const wrapper = mount(Home);
    await flushPromises();

    const latest = wrapper.find(".latest-news-stub");
    expect(latest.exists()).toBe(true);
    expect(latest.attributes("data-page")).toBe("home");
  });

  it("renders the RecentUpdates sidebar with the Community Updates title", async () => {
    const wrapper = mount(Home);
    await flushPromises();

    const updates = wrapper.find(".recent-updates-stub");
    expect(updates.exists()).toBe(true);
    expect(updates.attributes("data-title")).toBe("Community Updates");
  });

  it("renders the FeaturedVideos section", async () => {
    const wrapper = mount(Home);
    await flushPromises();

    expect(wrapper.find(".featured-videos-stub").exists()).toBe(true);
  });
});
