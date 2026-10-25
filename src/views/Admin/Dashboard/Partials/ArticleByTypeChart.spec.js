import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock chart.js so Chart.register() is a no-op and we don't pull the real
// rendering engine into jsdom. ------------------------------------------------
vi.mock("chart.js", () => ({
  Chart: { register: vi.fn() },
  BarElement: {},
  CategoryScale: {},
  LinearScale: {},
  Legend: {},
  Title: {},
  Tooltip: {},
}));

// --- Mock vue-chartjs <Bar> so it renders a trivial element and exposes the
// :data / :options props we assert on. ----------------------------------------
vi.mock("vue-chartjs", () => ({
  Bar: {
    name: "Bar",
    props: ["data", "options"],
    template: '<div class="bar-chart-stub"></div>',
  },
}));

// --- Mock the DashboardService boundary. fetchData() calls getArticlesByType();
// we drive it to resolve with several shapes and to reject to cover every branch.
vi.mock("@/features/dashboard/DashboardService", () => ({
  getArticlesByType: vi.fn(),
}));

import { getArticlesByType } from "@/features/dashboard/DashboardService";
import ArticleByTypeChart from "@/views/Admin/Dashboard/Partials/ArticleByTypeChart.vue";

// Stub DateRangeFilter so we can deterministically drive the @filter-changed
// event (the only trigger for fetchData) without its own dependencies.
const DateRangeFilterStub = {
  name: "DateRangeFilter",
  template: '<div class="date-range-filter-stub"></div>',
  emits: ["filter-changed"],
};

// Stub ChartShimmer to keep the loading branch lightweight and assertable.
const ChartShimmerStub = {
  name: "ChartShimmer",
  template: '<div class="chart-shimmer-stub"></div>',
};

const mountChart = () =>
  mount(ArticleByTypeChart, {
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

const setWidth = (width) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
};

describe("ArticleByTypeChart.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    setWidth(1024); // default desktop width
  });

  afterEach(() => {
    setWidth(1024);
  });

  it("renders the header and shows the shimmer while loading (isLoading true)", () => {
    const wrapper = mountChart();

    // Header renders.
    expect(wrapper.find(".card-header h5").text()).toBe(
      "Overall Article Type Summary"
    );

    // isLoading defaults to true -> v-else branch: ChartShimmer, no Bar chart.
    expect(wrapper.find(".chart-shimmer-stub").exists()).toBe(true);
    expect(wrapper.find(".bar-chart-stub").exists()).toBe(false);
    // No fetch happens until DateRangeFilter emits.
    expect(getArticlesByType).not.toHaveBeenCalled();
  });

  it("fetches and renders the Bar chart with mapped datasets on success (top-level array, desktop width)", async () => {
    // Desktop width >= 768, >= 992, < 1200 exercises one set of ternary edges.
    setWidth(1100);

    const data = [
      { type: "news", article_count: 10, published_count: 6 },
      { type: "blog", count: 4, published_count: 2 },
    ];
    getArticlesByType.mockResolvedValue({ data });

    const wrapper = mountChart();
    wrapper
      .findComponent(DateRangeFilterStub)
      .vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    // Service called with the emitted date range.
    expect(getArticlesByType).toHaveBeenCalledWith({
      startDate: "2026-06-01",
      endDate: "2026-06-08",
    });

    // isLoading false -> v-if branch: Bar chart rendered, shimmer gone.
    expect(wrapper.find(".bar-chart-stub").exists()).toBe(true);
    expect(wrapper.find(".chart-shimmer-stub").exists()).toBe(false);

    // Assert the mapped chartData passed to <Bar>.
    const bar = wrapper.findComponent({ name: "Bar" });
    const chartData = bar.props("data");
    expect(chartData.labels).toEqual(["NEWS", "BLOG"]);
    expect(chartData.datasets).toHaveLength(2);
    expect(chartData.datasets[0]).toMatchObject({
      label: "Total Articles",
      backgroundColor: "#3b82f6",
      data: [10, 4], // second row uses `count` fallback
    });
    expect(chartData.datasets[1]).toMatchObject({
      label: "Published Articles",
      backgroundColor: "#10b981",
      data: [6, 2],
    });

    // chartOptions computed produced desktop-tier values.
    const options = bar.props("options");
    expect(options.plugins.legend.position).toBe("top");
    expect(options.plugins.title.display).toBe(true);
    expect(options.plugins.title.font.size).toBe(16); // >= 992
    expect(options.scales.y.grid.display).toBe(true); // >= 768
    expect(options.elements.bar.borderRadius).toBe(4);
  });

  it("handles a wrapped { data: [...] } payload and falls back to 'Unknown'/0 for missing fields", async () => {
    // raw is not an array but raw.data is -> exercises the nested-array branch.
    const payload = {
      data: {
        data: [
          {}, // no type, no counts -> Unknown / 0 / 0
          { type: 42, article_count: 5 }, // numeric type -> "42", published missing -> 0
        ],
      },
    };
    getArticlesByType.mockResolvedValue(payload);

    const wrapper = mountChart();
    wrapper
      .findComponent(DateRangeFilterStub)
      .vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    const bar = wrapper.findComponent({ name: "Bar" });
    const chartData = bar.props("data");
    expect(chartData.labels).toEqual(["UNKNOWN", "42"]);
    expect(chartData.datasets[0].data).toEqual([0, 5]);
    expect(chartData.datasets[1].data).toEqual([0, 0]);
  });

  it("falls back to an empty chart when payload is neither array nor wrapped-array (mobile width)", async () => {
    // Mobile width < 768 exercises the opposite side of every ternary, including
    // < 992 title font and the layout/elements mobile branches.
    setWidth(500);

    // raw is a truthy object without a `data` array -> safeArray = [].
    getArticlesByType.mockResolvedValue({ data: { foo: "bar" } });

    const wrapper = mountChart();
    wrapper
      .findComponent(DateRangeFilterStub)
      .vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    const bar = wrapper.findComponent({ name: "Bar" });
    const chartData = bar.props("data");
    expect(chartData.labels).toEqual([]);
    expect(chartData.datasets[0].data).toEqual([]);
    expect(chartData.datasets[1].data).toEqual([]);

    // chartOptions computed produced mobile-tier values.
    const options = bar.props("options");
    expect(options.plugins.legend.position).toBe("bottom");
    expect(options.plugins.legend.labels.boxWidth).toBe(12);
    expect(options.plugins.legend.labels.padding).toBe(10);
    expect(options.plugins.legend.labels.font.size).toBe(11);
    expect(options.plugins.title.display).toBe(false);
    expect(options.plugins.title.font.size).toBe(14); // < 992
    expect(options.scales.y.ticks.font.size).toBe(10);
    expect(options.scales.y.grid.display).toBe(false);
    expect(options.scales.x.ticks.maxRotation).toBe(45);
    expect(options.scales.x.ticks.minRotation).toBe(45);
    expect(options.elements.bar.borderRadius).toBe(2);
    expect(options.layout.padding.top).toBe(5);
    expect(options.layout.padding.bottom).toBe(5);
  });

  it("uses [] when response.data is null/undefined (response?.data ?? [] branch)", async () => {
    getArticlesByType.mockResolvedValue({ data: null });

    const wrapper = mountChart();
    wrapper
      .findComponent(DateRangeFilterStub)
      .vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    const bar = wrapper.findComponent({ name: "Bar" });
    expect(bar.props("data").labels).toEqual([]);
    // Loaded successfully -> chart visible, no shimmer, no error.
    expect(wrapper.find(".bar-chart-stub").exists()).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("enters the catch on a rejected request and resets to an empty chart", async () => {
    const err = new Error("network down");
    getArticlesByType.mockRejectedValue(err);

    const wrapper = mountChart();
    wrapper
      .findComponent(DateRangeFilterStub)
      .vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(
      "Failed to load articles by type:",
      err
    );

    // catch -> chartData reset, finally -> isLoading false -> chart shown empty.
    const bar = wrapper.findComponent({ name: "Bar" });
    expect(bar.props("data")).toEqual({ labels: [], datasets: [] });
    expect(wrapper.find(".chart-shimmer-stub").exists()).toBe(false);
  });
});
