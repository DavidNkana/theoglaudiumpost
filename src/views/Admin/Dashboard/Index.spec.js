import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";

import Index from "./Index.vue";

// Stub every child partial: they pull heavy deps (chart.js/vue-chartjs,
// resource services). The Dashboard view is a pure layout — it only imports
// these partials and lays them out, so stubbing keeps the test hermetic while
// still instrumenting the view's own template.
function factory() {
  return mount(Index, {
    global: {
      stubs: {
        Stats: { name: "Stats", template: `<div class="stub-stats" />` },
        RecentArticles: {
          name: "RecentArticles",
          template: `<div class="stub-recent-articles" />`,
        },
        RecentAds: {
          name: "RecentAds",
          template: `<div class="stub-recent-ads" />`,
        },
        ArticleByTypeChart: {
          name: "ArticleByTypeChart",
          template: `<div class="stub-article-by-type" />`,
        },
        CategoryArticlesChart: {
          name: "CategoryArticlesChart",
          template: `<div class="stub-category-articles" />`,
        },
        ArticlesTimeline: {
          name: "ArticlesTimeline",
          template: `<div class="stub-articles-timeline" />`,
        },
        AdsPlacementAnalytics: {
          name: "AdsPlacementAnalytics",
          template: `<div class="stub-ads-placement-analytics" />`,
        },
        AdBusinessSummary: {
          name: "AdBusinessSummary",
          template: `<div class="stub-ad-business-summary" />`,
        },
        RouterLink: RouterLinkStub,
      },
    },
  });
}

describe("Admin/Dashboard/Index.vue", () => {
  it("renders the dashboard heading and welcome copy", () => {
    const wrapper = factory();

    expect(wrapper.find("h1.h3").text()).toBe("Dashboard");
    expect(wrapper.find("p.text-muted").text()).toBe("Welcome back, Admin User!");

    wrapper.unmount();
  });

  it("renders a New Article router-link pointing at the prompt route", () => {
    const wrapper = factory();

    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.exists()).toBe(true);
    expect(link.props("to")).toBe("/admin/articles/prompt");
    expect(link.text()).toContain("New Article");
    expect(wrapper.find("a .bi-plus-lg").exists()).toBe(true);

    wrapper.unmount();
  });

  it("mounts the four single-instance partials used by the layout", () => {
    const wrapper = factory();

    expect(wrapper.findComponent({ name: "Stats" }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: "ArticlesTimeline" }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: "AdBusinessSummary" }).exists()).toBe(true);
    expect(
      wrapper.findComponent({ name: "AdsPlacementAnalytics" }).exists()
    ).toBe(true);
    expect(wrapper.findComponent({ name: "RecentArticles" }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: "RecentAds" }).exists()).toBe(true);

    wrapper.unmount();
  });

  it("lays the partials out inside the admin-dashboard container", () => {
    const wrapper = factory();

    const root = wrapper.find(".admin-dashboard");
    expect(root.exists()).toBe(true);
    // two responsive rows: timeline/summary row and recent-activity row
    expect(root.findAll(".row.g-3").length).toBe(2);
    expect(root.findAll(".col-lg-8").length).toBe(2);
    expect(root.findAll(".col-lg-4").length).toBe(2);

    wrapper.unmount();
  });
});
