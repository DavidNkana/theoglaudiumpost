import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// Mock chart.js so registration is a no-op and no canvas work happens.
const { registerSpy } = vi.hoisted(() => ({ registerSpy: vi.fn() }));
vi.mock("chart.js", () => ({
  Chart: { register: registerSpy },
  BarElement: { id: "BarElement" },
  CategoryScale: { id: "CategoryScale" },
  LinearScale: { id: "LinearScale" },
  Legend: { id: "Legend" },
  Title: { id: "Title" },
  Tooltip: { id: "Tooltip" },
  ArcElement: { id: "ArcElement" },
}));

// Mock vue-chartjs Bar/Pie with light components that expose the bound data
// prop via a data attribute so we can assert the computed chart data.
vi.mock("vue-chartjs", () => ({
  Bar: {
    name: "Bar",
    props: ["data", "options"],
    template:
      '<div class="bar-chart" :data-labels="data.labels.join(\',\')" :data-impressions="data.datasets[0].data.join(\',\')" :data-clicks="data.datasets[1].data.join(\',\')"></div>',
  },
  Pie: {
    name: "Pie",
    props: ["data", "options"],
    template:
      '<div class="pie-chart" :data-labels="data.labels.join(\',\')" :data-ctr="data.datasets[0].data.join(\',\')" :data-colors="data.datasets[0].backgroundColor.length"></div>',
  },
}));

import AdsAnalytics from "./AdsAnalytics.vue";

describe("AdsAnalytics.vue", () => {
  beforeEach(() => {
    // Deterministic random so the hsl color branch is stable.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  it("registers chart.js components when the component sets up", () => {
    // In <script setup>, the Chart.register(...) call runs inside setup(),
    // i.e. when the component is mounted.
    registerSpy.mockClear();
    mount(AdsAnalytics);
    expect(registerSpy).toHaveBeenCalledTimes(1);
    // Registers all 7 chart elements passed in the source.
    expect(registerSpy.mock.calls[0]).toHaveLength(7);
  });

  it("renders the three analytics cards with headers", () => {
    const wrapper = mount(AdsAnalytics);
    const headers = wrapper.findAll(".card-header h5").map((h) => h.text());
    expect(headers).toEqual([
      "Click-Through Rates (CTR)",
      "Ad Impressions & Clicks",
      "Ad Summary",
    ]);
  });

  it("fetches ad data on mount and renders the summary table rows (v-for non-empty)", async () => {
    const wrapper = mount(AdsAnalytics);
    await flushPromises();

    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(3);

    // Ad 1: impressions > 0 -> ctr = 50/1000*100 = 5.00
    const firstCells = rows[0].findAll("td").map((c) => c.text());
    expect(firstCells).toEqual(["Ad 1", "1000", "50", "5.00%"]);

    // Ad 2: ctr = 60/800*100 = 7.50
    const secondCells = rows[1].findAll("td").map((c) => c.text());
    expect(secondCells).toEqual(["Ad 2", "800", "60", "7.50%"]);

    // Ad 3: impressions == 0 -> ctr ternary false branch -> 0
    const thirdCells = rows[2].findAll("td").map((c) => c.text());
    expect(thirdCells).toEqual(["Ad 3", "0", "0", "0.00%"]);
  });

  it("passes computed barChartData (impressions & clicks) to the Bar chart", async () => {
    const wrapper = mount(AdsAnalytics);
    await flushPromises();

    const bar = wrapper.find(".bar-chart");
    expect(bar.attributes("data-labels")).toBe("Ad 1,Ad 2,Ad 3");
    expect(bar.attributes("data-impressions")).toBe("1000,800,0");
    expect(bar.attributes("data-clicks")).toBe("50,60,0");
  });

  it("passes computed pieChartData (ctr + per-ad colors) to the Pie chart", async () => {
    const wrapper = mount(AdsAnalytics);
    await flushPromises();

    const pie = wrapper.find(".pie-chart");
    expect(pie.attributes("data-labels")).toBe("Ad 1,Ad 2,Ad 3");
    expect(pie.attributes("data-ctr")).toBe("5,7.5,0");
    // backgroundColor maps one color per ad -> Math.random branch exercised.
    expect(pie.attributes("data-colors")).toBe("3");
  });

  it("renders charts before data resolves (initial empty state)", () => {
    // Synchronous render before onMounted's promise flushes: adData is [].
    const wrapper = mount(AdsAnalytics);
    expect(wrapper.find(".pie-chart").attributes("data-labels")).toBe("");
    expect(wrapper.find(".bar-chart").attributes("data-labels")).toBe("");
    expect(wrapper.findAll("tbody tr")).toHaveLength(0);
  });
});
