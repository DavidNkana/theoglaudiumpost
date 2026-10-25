import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock the DashboardService boundary --------------------------------------
// fetchAdData() calls getAdByPlacementCTR(); we drive it to resolve (with data
// containing both impressions>0 and impressions==0 rows) and to reject so every
// branch (ctr ternary, success render, catch + empty reset) is exercised.
vi.mock("@/features/dashboard/DashboardService", () => ({
  getAdByPlacementCTR: vi.fn(),
}));

// Replace the chart.js wrappers/registry at the module boundary so jsdom never
// touches a real canvas. Pie is a light stub that surfaces its :data prop.
vi.mock("vue-chartjs", () => ({
  Pie: {
    name: "Pie",
    props: ["data", "options"],
    template: '<div class="pie-stub"></div>',
  },
}));

vi.mock("chart.js", () => ({
  Chart: { register: vi.fn() },
  BarElement: {},
  CategoryScale: {},
  LinearScale: {},
  Legend: {},
  Title: {},
  Tooltip: {},
  ArcElement: {},
}));

import { getAdByPlacementCTR } from "@/features/dashboard/DashboardService";
import { Pie as PieStub } from "vue-chartjs";
import AdsPlacementAnalytics from "@/views/Admin/Dashboard/Partials/AdsPlacementAnalytics.vue";

// Stub DateRangeFilter so the only fetch trigger (@filter-changed) is driven
// deterministically without its own onMounted date logic.
const DateRangeFilterStub = {
  name: "DateRangeFilter",
  template: '<div class="date-range-filter-stub"></div>',
  emits: ["filter-changed"],
};

const ChartShimmerStub = {
  name: "ChartShimmer",
  template: '<div class="chart-shimmer-stub"></div>',
};

const mountView = () =>
  mount(AdsPlacementAnalytics, {
    global: {
      stubs: {
        DateRangeFilter: DateRangeFilterStub,
        ChartShimmer: ChartShimmerStub,
      },
    },
  });

const sampleFilter = {
  filter: "week",
  startDate: "2026-06-01",
  endDate: "2026-06-08",
};

describe("AdsPlacementAnalytics.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Deterministic palette for the random hsl() backgroundColor map.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders headers and the loading state (isLoading true) before any filter event", () => {
    const wrapper = mountView();

    // Card headers render in both states.
    const headers = wrapper.findAll(".card-header h5").map((h) => h.text());
    expect(headers).toEqual(["Ad Placement Summary", "Click-Through Rates (CTR)"]);

    // isLoading defaults to true -> table v-if hidden (no thead), shimmer shown.
    expect(wrapper.find(".table-responsive").exists()).toBe(false);
    expect(wrapper.find("thead").exists()).toBe(false);
    // v-for i in 5 shimmer placeholders.
    expect(wrapper.findAll(".shimmer")).toHaveLength(5);
    // Pie hidden, ChartShimmer shown.
    expect(wrapper.find(".pie-stub").exists()).toBe(false);
    expect(wrapper.find(".chart-shimmer-stub").exists()).toBe(true);

    // No fetch yet (onMounted does not fetch).
    expect(getAdByPlacementCTR).not.toHaveBeenCalled();
  });

  it("fetches and renders rows on success, covering both ctr branches (impressions>0 and ==0)", async () => {
    const data = [
      { ad_name: "a1", placement: "home_banner", impressions: 200, clicks: 50 },
      { ad_name: "a2", placement: "sidebar_top", impressions: 0, clicks: 7 },
    ];
    getAdByPlacementCTR.mockResolvedValue({ data });

    const wrapper = mountView();
    wrapper
      .findComponent(DateRangeFilterStub)
      .vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    // Service called with the emitted date range.
    expect(getAdByPlacementCTR).toHaveBeenCalledWith({
      startDate: "2026-06-01",
      endDate: "2026-06-08",
    });

    // isLoading false -> table renders with its column headings, shimmer gone.
    expect(wrapper.find(".table-responsive").exists()).toBe(true);
    const ths = wrapper.findAll("thead th").map((th) => th.text());
    expect(ths).toEqual(["Ad Name", "Impressions", "Clicks", "CTR (%)"]);
    expect(wrapper.find(".shimmer").exists()).toBe(false);
    expect(wrapper.find(".chart-shimmer-stub").exists()).toBe(false);
    expect(wrapper.find(".pie-stub").exists()).toBe(true);

    // One row per ad; formatAdLocation drives the label, ctr ternary both ways.
    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(2);

    // impressions > 0 -> ctr = 50/200*100 = 25.00
    const r0 = rows[0].findAll("td").map((td) => td.text());
    expect(r0).toEqual(["Home Banner", "200", "50", "25.00%"]);

    // impressions == 0 -> ctr = 0 -> 0.00
    const r1 = rows[1].findAll("td").map((td) => td.text());
    expect(r1).toEqual(["Sidebar Top", "0", "7", "0.00%"]);

    // pieChartData computed reflects mapped placements / ctr values / colors.
    const pieData = wrapper.findComponent(PieStub).props("data");
    expect(pieData.labels).toEqual(["Home Banner", "Sidebar Top"]);
    expect(pieData.datasets[0].label).toBe("CTR (%)");
    expect(pieData.datasets[0].data).toEqual([25, 0]);
    // Math.random mocked to 0.5 -> hsl(180, 70%, 60%) for each entry.
    expect(pieData.datasets[0].backgroundColor).toEqual([
      "hsl(180, 70%, 60%)",
      "hsl(180, 70%, 60%)",
    ]);
  });

  it("renders an empty table and empty pie data when the success payload is empty (empty v-for / empty map)", async () => {
    getAdByPlacementCTR.mockResolvedValue({ data: [] });

    const wrapper = mountView();
    wrapper
      .findComponent(DateRangeFilterStub)
      .vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    // Loaded with empty adData -> table present, zero rows.
    expect(wrapper.find(".table-responsive").exists()).toBe(true);
    expect(wrapper.findAll("tbody tr")).toHaveLength(0);

    const pieData = wrapper.findComponent(PieStub).props("data");
    expect(pieData.labels).toEqual([]);
    expect(pieData.datasets[0].data).toEqual([]);
    expect(pieData.datasets[0].backgroundColor).toEqual([]);
  });

  it("enters the catch on a rejected request, logs the error and resets to an empty list", async () => {
    const err = new Error("network down");
    getAdByPlacementCTR.mockRejectedValue(err);

    const wrapper = mountView();
    wrapper
      .findComponent(DateRangeFilterStub)
      .vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    // catch -> console.error(error), isLoading false, adData reset to [].
    expect(console.error).toHaveBeenCalledWith(err);
    expect(wrapper.find(".table-responsive").exists()).toBe(true);
    expect(wrapper.findAll("tbody tr")).toHaveLength(0);
    expect(wrapper.find(".shimmer").exists()).toBe(false);
    expect(wrapper.find(".chart-shimmer-stub").exists()).toBe(false);
  });
});
