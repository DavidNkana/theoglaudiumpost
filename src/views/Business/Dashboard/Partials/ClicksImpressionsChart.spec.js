import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { ref } from "vue";

/* ------------------------------------------------------------------ */
/* ClicksImpressionsChart fetches business performance data on mount  */
/* and renders a vue-chartjs <Line> chart (or a spinner while         */
/* loading). Every external boundary is mocked: the chart lib, the    */
/* dashboard service, and the useAuth composable. We drive every      */
/* branch of fetchData (no user, no businessId, non-200 status,       */
/* success with data, success with falsy data), the loading vs        */
/* loaded template branches, and the chartData computed against both  */
/* empty and non-empty performanceData.                               */
/* ------------------------------------------------------------------ */

// Hoisted shared state — vi.mock factories are hoisted above normal
// top-level declarations, so anything referenced inside them must live
// in a vi.hoisted() block to avoid "cannot access before initialization".
const h = vi.hoisted(() => ({
  registerSpy: vi.fn(),
  getBusinessPerformanceData: vi.fn(),
}));
const { getBusinessPerformanceData } = h;

// --- chart.js: stub register so module side-effects don't blow up ---
vi.mock("chart.js", () => ({
  Chart: { register: h.registerSpy },
  LineElement: {},
  PointElement: {},
  CategoryScale: {},
  LinearScale: {},
  Legend: {},
  Title: {},
  Tooltip: {},
}));

// --- vue-chartjs: replace <Line> with a lightweight stub that
//     exposes the data/options props it receives for assertions. ---
vi.mock("vue-chartjs", () => ({
  Line: {
    name: "Line",
    props: ["data", "options"],
    template: '<div class="line-chart-stub" />',
  },
}));

// --- dashboard service ---
vi.mock("@/features/businesses/BusinessDashboardService", () => ({
  getBusinessPerformanceData: (...args) => h.getBusinessPerformanceData(...args),
}));

// --- useAuth composable: user ref is swapped per-test ---
const userRef = ref({ businessId: 42 });
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ user: userRef }),
}));

import ClicksImpressionsChart from "./ClicksImpressionsChart.vue";

const SAMPLE = [
  { date: "2026-01-01", total_impressions: 100, total_clicks: 10 },
  { date: "2026-01-02", total_impressions: 250, total_clicks: 30 },
];

beforeEach(() => {
  vi.clearAllMocks();
  userRef.value = { businessId: 42 };
});

describe("ClicksImpressionsChart.vue", () => {
  it("renders the spinner while the fetch is pending (v-else branch)", async () => {
    // Keep the service promise unresolved so isLoading stays true.
    let resolveFetch;
    getBusinessPerformanceData.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const wrapper = mount(ClicksImpressionsChart);
    await flushPromises();

    // Loading branch: spinner shown, chart hidden.
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.find(".visually-hidden").text()).toBe("Loading...");
    expect(wrapper.findComponent({ name: "Line" }).exists()).toBe(false);

    // Resolve so the pending promise doesn't dangle.
    resolveFetch({ status: 200, data: SAMPLE });
    await flushPromises();
  });

  it("renders the chart with mapped data on a successful fetch (v-if branch)", async () => {
    getBusinessPerformanceData.mockResolvedValue({ status: 200, data: SAMPLE });

    const wrapper = mount(ClicksImpressionsChart);
    await flushPromises();

    // Service was called with the user's businessId.
    expect(getBusinessPerformanceData).toHaveBeenCalledWith(42);

    // Loaded branch: chart shown, spinner gone.
    const line = wrapper.findComponent({ name: "Line" });
    expect(line.exists()).toBe(true);
    expect(wrapper.find(".spinner-border").exists()).toBe(false);

    // chartData computed maps performanceData into labels/datasets.
    const data = line.props("data");
    expect(data.labels).toEqual(["2026-01-01", "2026-01-02"]);
    expect(data.datasets[0].label).toBe("Impressions");
    expect(data.datasets[0].data).toEqual([100, 250]);
    expect(data.datasets[1].label).toBe("Clicks");
    expect(data.datasets[1].data).toEqual([10, 30]);

    // chartOptions passed through with the title text.
    const options = line.props("options");
    expect(options.plugins.title.text).toBe("Ad Performance Over Time");
  });

  it("falls back to [] when the response has no data (response.data || [])", async () => {
    // data is undefined -> the `|| []` branch is taken.
    getBusinessPerformanceData.mockResolvedValue({ status: 200, data: undefined });

    const wrapper = mount(ClicksImpressionsChart);
    await flushPromises();

    const line = wrapper.findComponent({ name: "Line" });
    expect(line.exists()).toBe(true);
    // Empty performanceData -> empty labels and dataset arrays (v-for empty path).
    const data = line.props("data");
    expect(data.labels).toEqual([]);
    expect(data.datasets[0].data).toEqual([]);
    expect(data.datasets[1].data).toEqual([]);
  });

  it("handles a non-200 status by throwing and falling back to [] (catch path)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getBusinessPerformanceData.mockResolvedValue({ status: 500, data: SAMPLE });

    const wrapper = mount(ClicksImpressionsChart);
    await flushPromises();

    // Error was logged; performanceData reset to []; loading finished.
    expect(errSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(errSpy.mock.calls[0][0].message).toBe(
      "Unable to fetch business performance data"
    );
    const line = wrapper.findComponent({ name: "Line" });
    expect(line.exists()).toBe(true);
    expect(line.props("data").labels).toEqual([]);

    errSpy.mockRestore();
  });

  it("handles a rejected service call (catch path)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getBusinessPerformanceData.mockRejectedValue(new Error("network down"));

    const wrapper = mount(ClicksImpressionsChart);
    await flushPromises();

    expect(errSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(errSpy.mock.calls[0][0].message).toBe("network down");
    // Loaded (not loading) branch with empty fallback data.
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.findComponent({ name: "Line" }).props("data").labels).toEqual(
      []
    );

    errSpy.mockRestore();
  });

  it("throws 'User Not Found' when there is no user (catch path)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    userRef.value = null; // !user.value -> throw before any service call

    const wrapper = mount(ClicksImpressionsChart);
    await flushPromises();

    expect(getBusinessPerformanceData).not.toHaveBeenCalled();
    expect(errSpy.mock.calls[0][0].message).toBe("User Not Found");
    expect(wrapper.findComponent({ name: "Line" }).exists()).toBe(true);

    errSpy.mockRestore();
  });

  it("throws 'User Not Found' when the user has no businessId (catch path)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    userRef.value = { businessId: null }; // user exists, businessId falsy

    const wrapper = mount(ClicksImpressionsChart);
    await flushPromises();

    expect(getBusinessPerformanceData).not.toHaveBeenCalled();
    expect(errSpy.mock.calls[0][0].message).toBe("User Not Found");
    expect(wrapper.findComponent({ name: "Line" }).exists()).toBe(true);

    errSpy.mockRestore();
  });
});
