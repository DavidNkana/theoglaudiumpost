import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

/* ------------------------------------------------------------------ */
/* RecentAdsTable fetches the 7 most recent business ads on mount and  */
/* renders them in a table, or a 5-row shimmer skeleton while loading. */
/* Every external boundary is mocked: the @/utils badge/format helpers */
/* and the businesses service. We drive every branch of fetchData      */
/* (success with data, success with falsy data -> `|| []`, non-200 ->  */
/* throw, rejected promise), the loading (v-else) vs loaded (v-if)     */
/* template branches, the v-for over recentAds (empty and non-empty),  */
/* and the `ad.placement?.location` optional-chaining (with and        */
/* without a placement object).                                        */
/* ------------------------------------------------------------------ */

const h = vi.hoisted(() => ({
  getAds: vi.fn(),
  formatAdLocation: vi.fn(),
  getAdLocationBadgeClass: vi.fn(),
  getStatusBadgeClass: vi.fn(),
}));

vi.mock("@/utils", () => ({
  formatAdLocation: (...args) => h.formatAdLocation(...args),
  getAdLocationBadgeClass: (...args) => h.getAdLocationBadgeClass(...args),
  getStatusBadgeClass: (...args) => h.getStatusBadgeClass(...args),
}));

vi.mock("@/features/businesses/BusinessesService", () => ({
  getAds: (...args) => h.getAds(...args),
}));

import RecentAdsTable from "./RecentAdsTable.vue";

const AD_WITH_PLACEMENT = {
  id: 1,
  title: "Spring Sale",
  placement: { location: "home_top" },
  status: "active",
  impressions: 12345,
  clicks: 678,
  placement_date: "2026-03-01T09:30:00Z",
};

const AD_WITHOUT_PLACEMENT = {
  id: 2,
  title: "Winter Promo",
  placement: null,
  status: "paused",
  impressions: 1000,
  clicks: 50,
  placement_date: "2026-01-15T00:00:00Z",
};

const mountTable = () =>
  mount(RecentAdsTable, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });

beforeEach(() => {
  vi.clearAllMocks();
  h.formatAdLocation.mockImplementation((loc) => `loc:${loc}`);
  h.getAdLocationBadgeClass.mockImplementation((loc) => `badge-loc-${loc}`);
  h.getStatusBadgeClass.mockImplementation((status) => `badge-status-${status}`);
});

describe("RecentAdsTable.vue", () => {
  it("renders the 5-row shimmer skeleton while the fetch is pending (v-else branch)", async () => {
    // Keep the service promise unresolved so isLoading stays true.
    let resolveFetch;
    h.getAds.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const wrapper = mountTable();
    // Let the onMounted-triggered reactive isLoading update flush to the DOM,
    // but NOT the still-pending service promise -> stays in the loading branch.
    await wrapper.vm.$nextTick();

    // Loading branch: 5 shimmer rows, each with 6 cells.
    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(5);
    expect(wrapper.findAll(".shimmer").length).toBeGreaterThan(0);
    // No real ad cell content while loading.
    expect(wrapper.text()).not.toContain("Spring Sale");

    // Resolve so the pending promise doesn't dangle.
    resolveFetch({ status: 200, data: [] });
    await flushPromises();
  });

  it("renders an empty tbody when the fetch returns no ads (v-for empty path)", async () => {
    h.getAds.mockResolvedValue({ status: 200, data: [] });

    const wrapper = mountTable();
    await flushPromises();

    // Service called with size: 7.
    expect(h.getAds).toHaveBeenCalledWith({ size: 7 });

    // Loaded branch (v-if), but zero ad rows.
    expect(wrapper.findAll(".shimmer").length).toBe(0);
    expect(wrapper.findAll("tbody tr")).toHaveLength(0);
  });

  it("renders ad rows on a successful fetch, covering placement present and absent", async () => {
    h.getAds.mockResolvedValue({
      status: 200,
      data: [AD_WITH_PLACEMENT, AD_WITHOUT_PLACEMENT],
    });

    const wrapper = mountTable();
    await flushPromises();

    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(2);

    // Row 1 — ad with a placement object: optional chaining resolves location.
    const cells1 = rows[0].findAll("td");
    expect(cells1[0].text()).toBe("Spring Sale");
    expect(cells1[1].text()).toBe("loc:home_top");
    expect(cells1[1].find("span.badge").classes()).toContain("badge-loc-home_top");
    expect(cells1[2].text()).toBe("active");
    expect(cells1[2].find("span.badge").classes()).toContain(
      "badge-status-active"
    );
    expect(cells1[3].text()).toBe((12345).toLocaleString());
    expect(cells1[4].text()).toBe((678).toLocaleString());
    expect(cells1[5].text()).toBe("2026-03-01");

    // Row 2 — placement is null: `ad.placement?.location` is undefined.
    const cells2 = rows[1].findAll("td");
    expect(cells2[0].text()).toBe("Winter Promo");
    expect(cells2[1].text()).toBe("loc:undefined");
    expect(cells2[5].text()).toBe("2026-01-15");

    // Helpers were invoked with the optional-chained location values.
    expect(h.getAdLocationBadgeClass).toHaveBeenCalledWith("home_top");
    expect(h.getAdLocationBadgeClass).toHaveBeenCalledWith(undefined);
    expect(h.formatAdLocation).toHaveBeenCalledWith("home_top");
    expect(h.formatAdLocation).toHaveBeenCalledWith(undefined);
    expect(h.getStatusBadgeClass).toHaveBeenCalledWith("active");
    expect(h.getStatusBadgeClass).toHaveBeenCalledWith("paused");

    // No shimmer once loaded.
    expect(wrapper.findAll(".shimmer").length).toBe(0);
  });

  it("falls back to [] when the response has no data (response.data || [] branch)", async () => {
    // data is undefined -> the `|| []` branch is taken.
    h.getAds.mockResolvedValue({ status: 200, data: undefined });

    const wrapper = mountTable();
    await flushPromises();

    expect(wrapper.findAll("tbody tr")).toHaveLength(0);
    expect(wrapper.findAll(".shimmer").length).toBe(0);
  });

  it("handles a non-200 status by throwing and falling back to [] (catch path)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.getAds.mockResolvedValue({ status: 500, data: [AD_WITH_PLACEMENT] });

    const wrapper = mountTable();
    await flushPromises();

    // Error logged with the thrown message; loading finished; empty fallback.
    expect(errSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(errSpy.mock.calls[0][0].message).toBe(
      "Unable to fetch business recent ads"
    );
    expect(wrapper.findAll(".shimmer").length).toBe(0);
    expect(wrapper.findAll("tbody tr")).toHaveLength(0);

    errSpy.mockRestore();
  });

  it("handles a rejected service call (catch path)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    h.getAds.mockRejectedValue(new Error("network down"));

    const wrapper = mountTable();
    await flushPromises();

    expect(errSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(errSpy.mock.calls[0][0].message).toBe("network down");
    // Loaded (not loading) branch with empty fallback data.
    expect(wrapper.findAll(".shimmer").length).toBe(0);
    expect(wrapper.findAll("tbody tr")).toHaveLength(0);

    errSpy.mockRestore();
  });

  it("renders the static header with a 'View all' router-link", async () => {
    h.getAds.mockResolvedValue({ status: 200, data: [] });

    const wrapper = mountTable();
    await flushPromises();

    expect(wrapper.find(".card-title").text()).toBe("Recent Ads");
    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.props("to")).toBe("/business/ads");
    expect(link.text()).toBe("View all");
  });
});
