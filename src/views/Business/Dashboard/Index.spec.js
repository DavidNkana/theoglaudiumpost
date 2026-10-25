import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";

import Index from "./Index.vue";

// Stub every child partial: they pull heavy deps (chart.js/vue-chartjs,
// resource services). The Business Dashboard view is a pure layout — it only
// imports these partials and lays them out, so stubbing keeps the test
// hermetic while still instrumenting the view's own template.
function factory() {
  return mount(Index, {
    global: {
      stubs: {
        Stats: { name: "Stats", template: `<div class="stub-stats" />` },
        SpendChart: {
          name: "SpendChart",
          template: `<div class="stub-spend-chart" />`,
        },
        PlacementSpendChart: {
          name: "PlacementSpendChart",
          template: `<div class="stub-placement-spend-chart" />`,
        },
        ClicksImpressionsChart: {
          name: "ClicksImpressionsChart",
          template: `<div class="stub-clicks-impressions-chart" />`,
        },
        RecentAdsTable: {
          name: "RecentAdsTable",
          template: `<div class="stub-recent-ads-table" />`,
        },
        RecentPaymentsTable: {
          name: "RecentPaymentsTable",
          template: `<div class="stub-recent-payments-table" />`,
        },
        RouterLink: RouterLinkStub,
      },
    },
  });
}

describe("Business/Dashboard/Index.vue", () => {
  it("renders the dashboard heading and welcome copy", () => {
    const wrapper = factory();

    expect(wrapper.find("h1.h3").text()).toBe("Business Dashboard");
    expect(wrapper.find("p.text-muted").text()).toBe(
      "Welcome back, Business User!"
    );

    wrapper.unmount();
  });

  it("renders a New Ad router-link pointing at the advertise route", () => {
    const wrapper = factory();

    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.exists()).toBe(true);
    expect(link.props("to")).toBe("/business/advertise");
    expect(link.text()).toContain("New Ad");
    expect(wrapper.find("a .bi-plus-lg").exists()).toBe(true);

    wrapper.unmount();
  });

  it("mounts every single-instance partial used by the layout", () => {
    const wrapper = factory();

    expect(wrapper.findComponent({ name: "Stats" }).exists()).toBe(true);
    expect(wrapper.findComponent({ name: "SpendChart" }).exists()).toBe(true);
    expect(
      wrapper.findComponent({ name: "PlacementSpendChart" }).exists()
    ).toBe(true);
    expect(
      wrapper.findComponent({ name: "ClicksImpressionsChart" }).exists()
    ).toBe(true);
    expect(wrapper.findComponent({ name: "RecentAdsTable" }).exists()).toBe(
      true
    );
    expect(
      wrapper.findComponent({ name: "RecentPaymentsTable" }).exists()
    ).toBe(true);

    wrapper.unmount();
  });

  it("lays the partials out inside the business-dashboard container", () => {
    const wrapper = factory();

    const root = wrapper.find(".business-dashboard");
    expect(root.exists()).toBe(true);
    // three responsive rows: spend/placement, clicks-impressions, recent tables
    expect(root.findAll(".row.g-3").length).toBe(3);
    expect(root.find(".col-lg-8").exists()).toBe(true);
    expect(root.find(".col-lg-4").exists()).toBe(true);
    expect(root.findAll(".col-lg-6").length).toBe(2);

    wrapper.unmount();
  });
});
