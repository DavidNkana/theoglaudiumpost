import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// --- Mock the AdsService boundary --------------------------------------------
// fetchData() (run from onMounted) calls getAds({ size: 7 }). We drive it to
// resolve (200 with ads, 200 with null ads -> nullish fallback, non-200 -> throw)
// and to reject to cover every branch of the try/catch.
vi.mock("@/features/ads/AdsService", () => ({
  getAds: vi.fn(),
}));

// --- Mock the @/utils boundary -----------------------------------------------
// The component imports formatAdLocation, getAdLocationBadgeClass and
// getStatusBadgeClass. We stub them so the spec is isolated from utils, while
// returning realistic values we can assert against.
vi.mock("@/utils", () => ({
  formatAdLocation: vi.fn((loc) =>
    !loc
      ? ""
      : loc
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
  ),
  getAdLocationBadgeClass: vi.fn((loc) =>
    loc === "home_banner" ? "badge bg-primary" : "badge bg-dark"
  ),
  getStatusBadgeClass: vi.fn(() => "badge bg-secondary"),
}));

import { getAds } from "@/features/ads/AdsService";
import { formatAdLocation, getAdLocationBadgeClass } from "@/utils";
import RecentAds from "@/views/Admin/Dashboard/Partials/RecentAds.vue";

const mountRecentAds = () =>
  mount(RecentAds, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

describe("RecentAds.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders the header and the 'View all' router-link", async () => {
    // Resolve with empty ads so onMounted's fetchData settles deterministically.
    getAds.mockResolvedValue({ status: 200, data: { ads: [] } });

    const wrapper = mountRecentAds();
    await flushPromises();

    expect(wrapper.find(".card-header h5").text()).toBe("Recent Ads");
    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.exists()).toBe(true);
    expect(link.props("to")).toBe("/admin/Ads");
    expect(link.text()).toBe("View all");
  });

  it("shows the shimmer loading list (v-else) while the request is in flight (isLoading true)", async () => {
    // Never-resolving promise keeps isLoading true so the v-else branch renders.
    getAds.mockReturnValue(new Promise(() => {}));

    const wrapper = mountRecentAds();
    // fetchData() (onMounted) sets isLoading=true synchronously before awaiting;
    // wait a tick for that reactive update to flush into the DOM.
    await wrapper.vm.$nextTick();

    // v-else branch: 5 shimmer skeleton rows, data list (v-if) absent.
    const rows = wrapper.findAll("ul.list-group li");
    expect(rows).toHaveLength(5);
    // Each skeleton row renders its index (i from 1..5).
    expect(rows.map((r) => r.find("span").text())).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    // Two shimmer text bars + one shimmer badge per row.
    expect(wrapper.findAll(".shimmer")).toHaveLength(15);
    expect(wrapper.findAll(".shimmer-badge")).toHaveLength(5);
  });

  it("fetches and renders ad rows on a 200 response with data (v-if branch, non-empty v-for, all nested values present)", async () => {
    const ads = [
      {
        id: 1,
        title: "Summer Sale",
        campaign: { business: { name: "Acme Co" } },
        placement: { location: "home_banner" },
      },
      {
        id: 2,
        title: "Winter Promo",
        campaign: { business: { name: "Globex" } },
        placement: { location: "sidebar_top" },
      },
    ];
    getAds.mockResolvedValue({ status: 200, data: { ads } });

    const wrapper = mountRecentAds();
    await flushPromises();

    // Service called with the fixed size param.
    expect(getAds).toHaveBeenCalledWith({ size: 7 });

    // v-if (!isLoading) branch: one row per ad, no shimmer.
    const rows = wrapper.findAll("ul.list-group li");
    expect(rows).toHaveLength(2);
    expect(wrapper.find(".shimmer").exists()).toBe(false);

    // Row 1: index+1, title, business name, formatted/badged location.
    const r0 = rows[0];
    expect(r0.find(".d-flex.align-items-center span").text()).toBe("1");
    expect(r0.find(".fw-bold").text()).toBe("Summer Sale");
    expect(r0.findAll(".form-check-label")[1].text()).toBe("Acme Co");
    const badge0 = r0.find("span.text-uppercase");
    expect(badge0.text()).toBe("Home Banner");
    expect(badge0.classes()).toContain("badge");
    expect(badge0.classes()).toContain("bg-primary");

    // Row 2 index is 2.
    expect(
      rows[1].find(".d-flex.align-items-center span").text()
    ).toBe("2");
    expect(rows[1].find(".fw-bold").text()).toBe("Winter Promo");

    // Util boundaries invoked with the ad's location.
    expect(getAdLocationBadgeClass).toHaveBeenCalledWith("home_banner");
    expect(formatAdLocation).toHaveBeenCalledWith("home_banner");
  });

  it("uses the '-' fallbacks when campaign/business and placement are missing (nullish branches)", async () => {
    const ads = [
      {
        id: 3,
        title: "Orphan Ad",
        // no campaign -> business name "-" fallback
        // no placement -> location "-" fallback into formatAdLocation
      },
    ];
    getAds.mockResolvedValue({ status: 200, data: { ads } });

    const wrapper = mountRecentAds();
    await flushPromises();

    const row = wrapper.find("ul.list-group li");
    // ad?.campaign?.business?.name ?? "-"
    expect(row.findAll(".form-check-label")[1].text()).toBe("-");
    // formatAdLocation(ad.placement?.location ?? "-") -> "-" stays "-"
    expect(row.find("span.text-uppercase").text()).toBe("-");
    // getAdLocationBadgeClass(ad.placement?.location) called with undefined.
    expect(getAdLocationBadgeClass).toHaveBeenCalledWith(undefined);
    expect(formatAdLocation).toHaveBeenCalledWith("-");
  });

  it("falls back to an empty list when a 200 response has null ads (response.data.ads ?? [])", async () => {
    getAds.mockResolvedValue({ status: 200, data: { ads: null } });

    const wrapper = mountRecentAds();
    await flushPromises();

    // v-if branch rendered (not loading) but zero rows from the empty v-for.
    expect(wrapper.find("ul.list-group").exists()).toBe(true);
    expect(wrapper.findAll("ul.list-group li")).toHaveLength(0);
    expect(wrapper.find(".shimmer").exists()).toBe(false);
  });

  it("enters the catch on a non-200 response (thrown Error) and stops loading", async () => {
    getAds.mockResolvedValue({ status: 500, data: { ads: [{ id: 9 }] } });

    const wrapper = mountRecentAds();
    await flushPromises();

    // throw -> catch -> console.error, isLoading false, ads untouched ({}).
    expect(console.error).toHaveBeenCalledWith(expect.any(Error));
    expect(console.error.mock.calls[0][0].message).toBe(
      "Unable to Fetch Recent ads"
    );
    // isLoading false -> v-if branch; ads stays the initial {} -> no rows.
    expect(wrapper.findAll("ul.list-group li")).toHaveLength(0);
    expect(wrapper.find(".shimmer").exists()).toBe(false);
  });

  it("enters the catch on a rejected request (error path) and renders no rows", async () => {
    const err = new Error("network down");
    getAds.mockRejectedValue(err);

    const wrapper = mountRecentAds();
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(err);
    expect(wrapper.findAll("ul.list-group li")).toHaveLength(0);
    expect(wrapper.find(".shimmer").exists()).toBe(false);
  });
});
