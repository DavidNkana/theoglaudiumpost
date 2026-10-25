import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { ref } from "vue";

/* ------------------------------------------------------------------ */
/* PlacementChart fetches business placement data on mount and renders */
/* a vue-chartjs <Bar> chart (or a spinner while loading). Every       */
/* external boundary is mocked: chart.js (register side-effect),       */
/* vue-chartjs (<Bar> stub), the dashboard service, the formatAdLocation*/
/* util, and the useAuth composable. We drive every branch of          */
/* fetchData (no user, no businessId, non-200 status, success with     */
/* data, success with falsy data, rejected call), the loading vs       */
/* loaded template branches, and the chartData computed ternary        */
/* (impressions > 0 vs == 0) over empty and non-empty placementData.   */
/* ------------------------------------------------------------------ */

// Hoisted shared state — vi.mock factories are hoisted above normal
// top-level declarations, so anything referenced inside them must live
// in a vi.hoisted() block to avoid "cannot access before initialization".
const h = vi.hoisted(() => ({
  registerSpy: vi.fn(),
  getBusinessPlacementData: vi.fn(),
}));
const { getBusinessPlacementData } = h;

// --- chart.js: stub register so module side-effects don't blow up ---
vi.mock("chart.js", () => ({
  Chart: { register: h.registerSpy },
  BarElement: {},
  CategoryScale: {},
  LinearScale: {},
  Legend: {},
  Title: {},
  Tooltip: {},
}));

// --- vue-chartjs: replace <Bar> with a lightweight stub that exposes
//     the data/options props it receives for assertions. ---
vi.mock("vue-chartjs", () => ({
  Bar: {
    name: "Bar",
    props: ["data", "options"],
    template: '<div class="bar-chart-stub" />',
  },
}));

// --- formatAdLocation util: deterministic stub for label assertions ---
vi.mock("@/utils", () => ({
  formatAdLocation: (loc) => `FMT:${loc}`,
}));

// --- dashboard service ---
vi.mock("@/features/businesses/BusinessDashboardService", () => ({
  getBusinessPlacementData: (...args) => h.getBusinessPlacementData(...args),
}));

// --- useAuth composable: user ref is swapped per-test ---
const userRef = ref({ businessId: 42 });
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ user: userRef }),
}));

import PlacementChart from "./PlacementChart.vue";

const SAMPLE = [
  { placement: "home_banner", impressions: 100, clicks: 10 }, // CTR 10.0
  { placement: "sidebar", impressions: 0, clicks: 5 }, // impressions == 0 -> 0
];

beforeEach(() => {
  vi.clearAllMocks();
  userRef.value = { businessId: 42 };
});

describe("PlacementChart.vue", () => {
  it("renders the spinner while the fetch is pending (v-else branch)", async () => {
    // Keep the service promise unresolved so isLoading stays true.
    let resolveFetch;
    getBusinessPlacementData.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const wrapper = mount(PlacementChart);
    await flushPromises();

    // Loading branch: spinner shown, chart hidden.
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.find(".visually-hidden").text()).toBe("Loading...");
    expect(wrapper.findComponent({ name: "Bar" }).exists()).toBe(false);

    // Resolve so the pending promise doesn't dangle.
    resolveFetch({ status: 200, data: SAMPLE });
    await flushPromises();
  });

  it("renders the chart and maps data on a successful fetch (v-if + both ternary branches)", async () => {
    getBusinessPlacementData.mockResolvedValue({ status: 200, data: SAMPLE });

    const wrapper = mount(PlacementChart);
    await flushPromises();

    // Service was called with the user's businessId.
    expect(getBusinessPlacementData).toHaveBeenCalledWith(42);

    // Loaded branch: chart shown, spinner gone.
    const bar = wrapper.findComponent({ name: "Bar" });
    expect(bar.exists()).toBe(true);
    expect(wrapper.find(".spinner-border").exists()).toBe(false);

    // chartData computed: labels via formatAdLocation, CTR via ternary.
    const data = bar.props("data");
    expect(data.labels).toEqual(["FMT:home_banner", "FMT:sidebar"]);
    expect(data.datasets[0].label).toBe("CTR (%)");
    expect(data.datasets[0].backgroundColor).toBe("#198754");
    // first item: impressions>0 -> (10/100)*100 = "10.0"; second: impressions==0 -> 0
    expect(data.datasets[0].data).toEqual(["10.0", 0]);

    // chartOptions passed through with the title text + tick callback.
    const options = bar.props("options");
    expect(options.plugins.title.text).toBe("CTR by Placement");
    expect(options.scales.y.ticks.callback(50)).toBe("50%");
  });

  it("falls back to [] when the response has no data (response.data || [])", async () => {
    // data is undefined -> the `|| []` branch is taken.
    getBusinessPlacementData.mockResolvedValue({ status: 200, data: undefined });

    const wrapper = mount(PlacementChart);
    await flushPromises();

    const bar = wrapper.findComponent({ name: "Bar" });
    expect(bar.exists()).toBe(true);
    // Empty placementData -> empty labels and dataset arrays (v-for empty path).
    const data = bar.props("data");
    expect(data.labels).toEqual([]);
    expect(data.datasets[0].data).toEqual([]);
  });

  it("handles a non-200 status by throwing and falling back to [] (catch path)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getBusinessPlacementData.mockResolvedValue({ status: 500, data: SAMPLE });

    const wrapper = mount(PlacementChart);
    await flushPromises();

    // Error was logged; placementData reset to []; loading finished.
    expect(errSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(errSpy.mock.calls[0][0].message).toBe(
      "Unable to fetch business placement data"
    );
    const bar = wrapper.findComponent({ name: "Bar" });
    expect(bar.exists()).toBe(true);
    expect(bar.props("data").labels).toEqual([]);

    errSpy.mockRestore();
  });

  it("handles a rejected service call (catch path)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getBusinessPlacementData.mockRejectedValue(new Error("network down"));

    const wrapper = mount(PlacementChart);
    await flushPromises();

    expect(errSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(errSpy.mock.calls[0][0].message).toBe("network down");
    // Loaded (not loading) branch with empty fallback data.
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(
      wrapper.findComponent({ name: "Bar" }).props("data").labels
    ).toEqual([]);

    errSpy.mockRestore();
  });

  it("throws 'User Not Found' when there is no user (catch path)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    userRef.value = null; // !user.value -> throw before any service call

    const wrapper = mount(PlacementChart);
    await flushPromises();

    expect(getBusinessPlacementData).not.toHaveBeenCalled();
    expect(errSpy.mock.calls[0][0].message).toBe("User Not Found");
    expect(wrapper.findComponent({ name: "Bar" }).exists()).toBe(true);

    errSpy.mockRestore();
  });

  it("throws 'User Not Found' when the user has no businessId (catch path)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    userRef.value = { businessId: null }; // user exists, businessId falsy

    const wrapper = mount(PlacementChart);
    await flushPromises();

    expect(getBusinessPlacementData).not.toHaveBeenCalled();
    expect(errSpy.mock.calls[0][0].message).toBe("User Not Found");
    expect(wrapper.findComponent({ name: "Bar" }).exists()).toBe(true);

    errSpy.mockRestore();
  });
});
