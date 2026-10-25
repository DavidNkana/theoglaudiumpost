import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ChartShimmer from "@/components/ChartShimmer.vue";

describe("ChartShimmer", () => {
  it("renders the static shimmer scaffold with header, body and x-axis", () => {
    const wrapper = mount(ChartShimmer);

    expect(wrapper.find(".chart-shimmer-container").exists()).toBe(true);
    expect(wrapper.find(".chart-shimmer-header.shimmer").exists()).toBe(true);
    expect(wrapper.find(".chart-shimmer-body").exists()).toBe(true);
    expect(wrapper.find(".chart-shimmer-x-axis").exists()).toBe(true);
  });

  it("drives the v-for loops for y-labels (5), bars (7) and x-labels (7)", () => {
    const wrapper = mount(ChartShimmer);

    expect(wrapper.findAll(".chart-shimmer-y-label")).toHaveLength(5);
    expect(wrapper.findAll(".chart-shimmer-bar")).toHaveLength(7);
    expect(wrapper.findAll(".chart-shimmer-bar-inner")).toHaveLength(7);
    expect(wrapper.findAll(".chart-shimmer-x-label")).toHaveLength(7);
  });

  it("computes a randomised inline height between 20% and 80% for each bar", () => {
    const wrapper = mount(ChartShimmer);

    const inners = wrapper.findAll(".chart-shimmer-bar-inner");
    expect(inners).toHaveLength(7);
    inners.forEach((inner) => {
      const height = inner.element.style.height;
      const pct = parseFloat(height);
      expect(height.endsWith("%")).toBe(true);
      expect(pct).toBeGreaterThanOrEqual(20);
      expect(pct).toBeLessThanOrEqual(80);
    });
  });
});
