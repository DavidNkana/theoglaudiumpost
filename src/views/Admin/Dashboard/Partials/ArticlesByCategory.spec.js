import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock the DashboardService boundary --------------------------------------
// fetchCategoryData() calls getArticlesByCategory(); we drive it to resolve
// (with data, with nullish data) and to reject to cover every branch.
vi.mock("@/features/dashboard/DashboardService", () => ({
  getArticlesByCategory: vi.fn(),
}));

// --- Mock chart.js so Chart.register is a no-op (avoids canvas/heavy deps) ----
vi.mock("chart.js", () => ({
  Chart: { register: vi.fn() },
  ArcElement: {},
  Tooltip: {},
  Legend: {},
  Title: {},
}));

// --- Mock vue-chartjs Pie as a trivial stub that surfaces its data prop -------
vi.mock("vue-chartjs", () => ({
  Pie: {
    name: "Pie",
    props: ["data", "options"],
    template: '<div class="pie-stub"></div>',
  },
}));

import { getArticlesByCategory } from "@/features/dashboard/DashboardService";
import ArticlesByCategory from "@/views/Admin/Dashboard/Partials/ArticlesByCategory.vue";

// Stub DateRangeFilter so we can deterministically drive the @filter-changed
// event (the only trigger for fetchCategoryData) without its own dependencies.
const DateRangeFilterStub = {
  name: "DateRangeFilter",
  template: '<div class="date-range-filter-stub"></div>',
  emits: ["filter-changed"],
};

// Stub ChartShimmer (loading state) with a marker we can assert on.
const ChartShimmerStub = {
  name: "ChartShimmer",
  template: '<div class="chart-shimmer-stub"></div>',
};

const mountChart = () =>
  mount(ArticlesByCategory, {
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

describe("ArticlesByCategory.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Deterministic colors for the labels.map(() => hsl(random...)) branch.
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  it("renders the header and shows the shimmer while loading (isLoading true)", () => {
    const wrapper = mountChart();

    // Header renders.
    expect(wrapper.find(".card-header h5").text()).toBe(
      "Overall Articles by Type"
    );

    // isLoading defaults to true -> v-else shimmer renders, Pie does not.
    expect(wrapper.findComponent(ChartShimmerStub).exists()).toBe(true);
    expect(wrapper.find(".pie-stub").exists()).toBe(false);
    // No fetch until the filter emits.
    expect(getArticlesByCategory).not.toHaveBeenCalled();
  });

  it("fetches and renders the Pie chart on success with data (non-empty map branch)", async () => {
    const data = [
      { category_name: "News", article_count: 12 },
      { category_name: "Sport", article_count: 5 },
    ];
    getArticlesByCategory.mockResolvedValue({ data });

    const wrapper = mountChart();
    wrapper
      .findComponent(DateRangeFilterStub)
      .vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    // Service called with the emitted date range only.
    expect(getArticlesByCategory).toHaveBeenCalledWith({
      startDate: "2026-06-01",
      endDate: "2026-06-08",
    });

    // isLoading false -> Pie renders, shimmer does not.
    const pie = wrapper.findComponent({ name: "Pie" });
    expect(pie.exists()).toBe(true);
    expect(wrapper.findComponent(ChartShimmerStub).exists()).toBe(false);

    // chartData computed from the response data is passed to the Pie.
    const chartData = pie.props("data");
    expect(chartData.labels).toEqual(["News", "Sport"]);
    expect(chartData.datasets[0].label).toBe("Articles per Category");
    expect(chartData.datasets[0].data).toEqual([12, 5]);
    // Math.random mocked to 0.5 -> floor(0.5*360)=180 for every slice.
    expect(chartData.datasets[0].backgroundColor).toEqual([
      "hsl(180, 70%, 60%)",
      "hsl(180, 70%, 60%)",
    ]);

    // Options forwarded to the Pie.
    expect(pie.props("options").plugins.title.text).toBe("Articles by Category");
  });

  it("falls back to an empty dataset when response.data is nullish (?? [] + empty map branch)", async () => {
    getArticlesByCategory.mockResolvedValue({ data: null });

    const wrapper = mountChart();
    wrapper
      .findComponent(DateRangeFilterStub)
      .vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    const pie = wrapper.findComponent({ name: "Pie" });
    expect(pie.exists()).toBe(true);
    const chartData = pie.props("data");
    expect(chartData.labels).toEqual([]);
    expect(chartData.datasets[0].data).toEqual([]);
    expect(chartData.datasets[0].backgroundColor).toEqual([]);
    expect(wrapper.findComponent(ChartShimmerStub).exists()).toBe(false);
  });

  it("enters the catch on a rejected request and stops loading (error path)", async () => {
    const err = new Error("network down");
    getArticlesByCategory.mockRejectedValue(err);

    const wrapper = mountChart();
    wrapper
      .findComponent(DateRangeFilterStub)
      .vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    // catch -> console.error + isLoading false (Pie shown with default data).
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching category data:",
      err
    );
    expect(wrapper.findComponent({ name: "Pie" }).exists()).toBe(true);
    expect(wrapper.findComponent(ChartShimmerStub).exists()).toBe(false);
  });
});
