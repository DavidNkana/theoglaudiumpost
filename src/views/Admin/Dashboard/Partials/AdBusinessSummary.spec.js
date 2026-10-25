import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock the DashboardService boundary --------------------------------------
// fetchData() calls getBusinessAdSummary(); we drive it to resolve (200 with
// data, 200 with no data, non-200) and to reject to cover every branch.
vi.mock("@/features/dashboard/DashboardService", () => ({
  getBusinessAdSummary: vi.fn(),
}));

import { getBusinessAdSummary } from "@/features/dashboard/DashboardService";
import AdBusinessSummary from "@/views/Admin/Dashboard/Partials/AdBusinessSummary.vue";

// Stub DateRangeFilter so we can deterministically drive the @filter-changed
// event (which is the only trigger for fetchData) without its own dependencies.
const DateRangeFilterStub = {
  name: "DateRangeFilter",
  template: '<div class="date-range-filter-stub"></div>',
  emits: ["filter-changed"],
};

const mountSummary = () =>
  mount(AdBusinessSummary, {
    global: {
      stubs: { DateRangeFilter: DateRangeFilterStub },
    },
  });

const sampleFilter = {
  filter: "week",
  startDate: "2026-06-01",
  endDate: "2026-06-08",
};

describe("AdBusinessSummary.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders the header and shows the shimmer tbody while loading (isLoading true)", () => {
    const wrapper = mountSummary();

    // Header + table headings render.
    expect(wrapper.find(".card-header h5").text()).toBe("Ads Summary");
    const ths = wrapper.findAll("thead th").map((th) => th.text());
    expect(ths).toEqual(["Business", "Ads", "Spent (ZAR)"]);

    // isLoading defaults to true -> v-else shimmer tbody with 5 rows.
    const shimmerRows = wrapper.findAll("tbody tr");
    expect(shimmerRows).toHaveLength(5);
    expect(wrapper.findAll(".shimmer")).toHaveLength(15);
    // Data tbody (v-if !isLoading) is not rendered.
    expect(getBusinessAdSummary).not.toHaveBeenCalled();
  });

  it("fetches and renders ad rows on a 200 response with data (success, non-empty v-for)", async () => {
    const data = [
      { business_name: "Acme Co", ads_count: 3, total_spent: 1500 },
      { business_name: "Globex", ads_count: 1, total_spent: 250 },
    ];
    getBusinessAdSummary.mockResolvedValue({ status: 200, data });

    const wrapper = mountSummary();
    wrapper.findComponent(DateRangeFilterStub).vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    // Service called with size 7 + the emitted date range.
    expect(getBusinessAdSummary).toHaveBeenCalledWith({
      size: 7,
      startDate: "2026-06-01",
      endDate: "2026-06-08",
    });

    // isLoading false -> data tbody renders one row per ad.
    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(2);
    const firstCells = rows[0].findAll("td").map((td) => td.text());
    expect(firstCells).toEqual(["Acme Co", "3", "1500"]);
    expect(rows[1].findAll("td")[0].text()).toBe("Globex");
    // No shimmer once loaded.
    expect(wrapper.find(".shimmer").exists()).toBe(false);
  });

  it("falls back to an empty list when 200 response has no data (response.data || [])", async () => {
    getBusinessAdSummary.mockResolvedValue({ status: 200, data: undefined });

    const wrapper = mountSummary();
    wrapper.findComponent(DateRangeFilterStub).vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    // Loaded with empty adData -> data tbody present but zero rows.
    expect(wrapper.find("tbody").exists()).toBe(true);
    expect(wrapper.findAll("tbody tr")).toHaveLength(0);
    expect(wrapper.find(".shimmer").exists()).toBe(false);
  });

  it("enters the catch on a non-200 response (thrown Error) and clears the list", async () => {
    getBusinessAdSummary.mockResolvedValue({ status: 500, data: [{ business_name: "X" }] });

    const wrapper = mountSummary();
    wrapper.findComponent(DateRangeFilterStub).vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    // Throw -> catch -> isLoading false, adData reset to [].
    expect(console.error).toHaveBeenCalledWith(expect.any(Error));
    expect(console.error.mock.calls[0][0].message).toBe(
      "Unable to fetch business recent ads"
    );
    expect(wrapper.findAll("tbody tr")).toHaveLength(0);
    expect(wrapper.find(".shimmer").exists()).toBe(false);
  });

  it("enters the catch on a rejected request (error path) and renders no rows", async () => {
    const err = new Error("network down");
    getBusinessAdSummary.mockRejectedValue(err);

    const wrapper = mountSummary();
    wrapper.findComponent(DateRangeFilterStub).vm.$emit("filter-changed", sampleFilter);
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(err);
    expect(wrapper.findAll("tbody tr")).toHaveLength(0);
    expect(wrapper.find(".shimmer").exists()).toBe(false);
  });
});
