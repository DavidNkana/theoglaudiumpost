import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock the DashboardService boundary --------------------------------------
// fetchTimeline() calls getArticlesTimeline(); we drive it to resolve (with
// representative data covering both label and period fallbacks) and to reject
// to exercise the catch branch.
vi.mock("@/features/dashboard/DashboardService", () => ({
  getArticlesTimeline: vi.fn(),
}));

// --- Mock chart.js so register() is a no-op and no real Chart is constructed.
vi.mock("chart.js", () => {
  const noop = {};
  return {
    Chart: { register: vi.fn() },
    LineElement: noop,
    CategoryScale: noop,
    LinearScale: noop,
    PointElement: noop,
    Title: noop,
    Tooltip: noop,
    Legend: noop,
    Filler: noop,
  };
});

// --- Mock vue-chartjs Bar so we can assert the props passed without canvas.
vi.mock("vue-chartjs", () => ({
  Bar: {
    name: "Bar",
    props: ["data", "options"],
    template: '<div class="bar-chart-stub"></div>',
  },
}));

import { getArticlesTimeline } from "@/features/dashboard/DashboardService";
import ArticlesTimeline from "@/views/Admin/Dashboard/Partials/ArticlesTimeline.vue";

// Stub DateRangeFilter so we can deterministically drive the @filter-changed
// event (the only trigger for fetchTimeline) without its own dependencies.
const DateRangeFilterStub = {
  name: "DateRangeFilter",
  template: '<div class="date-range-filter-stub"></div>',
  emits: ["filter-changed"],
};

// Stub ChartShimmer (loading placeholder) so we can detect it deterministically.
const ChartShimmerStub = {
  name: "ChartShimmer",
  template: '<div class="chart-shimmer-stub"></div>',
};

const mountTimeline = () =>
  mount(ArticlesTimeline, {
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

describe("ArticlesTimeline.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders header and shimmer while loading (isLoading true, no chart)", () => {
    const wrapper = mountTimeline();

    expect(wrapper.find(".card-header h5").text()).toBe("Articles Over Time");

    // isLoading defaults true -> ChartShimmer rendered, Bar (v-if) not rendered.
    expect(wrapper.findComponent(ChartShimmerStub).exists()).toBe(true);
    expect(wrapper.findComponent({ name: "Bar" }).exists()).toBe(false);
    expect(getArticlesTimeline).not.toHaveBeenCalled();
  });

  it("fetches and renders the bar chart on success, mapping label || period", async () => {
    const data = [
      { label: "Week 1", period: "2026-W01", count: 5 },
      { period: "2026-W02", count: 3 }, // no label -> falls back to period
    ];
    getArticlesTimeline.mockResolvedValue({ data });

    const wrapper = mountTimeline();
    wrapper.findComponent(DateRangeFilterStub).vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    // Service called with the emitted date range.
    expect(getArticlesTimeline).toHaveBeenCalledWith({
      startDate: "2026-06-01",
      endDate: "2026-06-08",
    });

    // isLoading false + chartData truthy -> Bar rendered, shimmer gone.
    const bar = wrapper.findComponent({ name: "Bar" });
    expect(bar.exists()).toBe(true);
    expect(wrapper.findComponent(ChartShimmerStub).exists()).toBe(false);

    // Assert the chartData built from both label and period-fallback branches.
    const chartData = bar.props("data");
    expect(chartData.labels).toEqual(["Week 1", "2026-W02"]);
    expect(chartData.datasets[0].label).toBe("Articles Published");
    expect(chartData.datasets[0].data).toEqual([5, 3]);
    expect(chartData.datasets[0].backgroundColor).toBe("#021b05");

    // chartOptions passed through.
    const options = bar.props("options");
    expect(options.responsive).toBe(true);
    expect(options.maintainAspectRatio).toBe(false);
  });

  it("renders an empty dataset for an empty timeline (empty v-for/map)", async () => {
    getArticlesTimeline.mockResolvedValue({ data: [] });

    const wrapper = mountTimeline();
    wrapper.findComponent(DateRangeFilterStub).vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    // chartData is still truthy (object), so Bar renders with empty arrays.
    const bar = wrapper.findComponent({ name: "Bar" });
    expect(bar.exists()).toBe(true);
    expect(bar.props("data").labels).toEqual([]);
    expect(bar.props("data").datasets[0].data).toEqual([]);
    expect(wrapper.findComponent(ChartShimmerStub).exists()).toBe(false);
  });

  it("enters the catch on a rejected request, stops loading and shows no chart", async () => {
    const err = new Error("network down");
    getArticlesTimeline.mockRejectedValue(err);

    const wrapper = mountTimeline();
    wrapper.findComponent(DateRangeFilterStub).vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    // catch -> console.error + isLoading false; chartData stayed null -> no Bar,
    // and isLoading false -> no shimmer either.
    expect(console.error).toHaveBeenCalledWith(
      "Error fetching timeline data:",
      err
    );
    expect(wrapper.findComponent({ name: "Bar" }).exists()).toBe(false);
    expect(wrapper.findComponent(ChartShimmerStub).exists()).toBe(false);
  });

  it("re-shows the shimmer (isLoading true, chartData null) at the start of a fetch", async () => {
    // First resolve to get into a loaded state.
    getArticlesTimeline.mockResolvedValueOnce({
      data: [{ label: "A", count: 1 }],
    });

    const wrapper = mountTimeline();
    wrapper.findComponent(DateRangeFilterStub).vm.$emit("filter-changed", sampleFilter);
    await flushPromises();
    expect(wrapper.findComponent({ name: "Bar" }).exists()).toBe(true);

    // Second fetch never resolves within this tick: fetchTimeline sets
    // isLoading=true and chartData=null synchronously before awaiting.
    let resolveSecond;
    getArticlesTimeline.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSecond = resolve;
      })
    );
    wrapper.findComponent(DateRangeFilterStub).vm.$emit("filter-changed", {
      filter: "month",
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });
    await flushPromises();

    // Mid-fetch: shimmer shown again, chart hidden.
    expect(wrapper.findComponent(ChartShimmerStub).exists()).toBe(true);
    expect(wrapper.findComponent({ name: "Bar" }).exists()).toBe(false);

    // Let it settle so the pending promise resolves cleanly.
    resolveSecond({ data: [{ label: "B", count: 2 }] });
    await flushPromises();
    expect(wrapper.findComponent({ name: "Bar" }).exists()).toBe(true);
  });
});
