import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { ref } from "vue";

/* ------------------------------------------------------------------ */
/* Stats.vue wires four presentational card components to the result   */
/* of getBusinessStats(user.businessId). It is mostly an async         */
/* fetchStats() driven on mount. We mock every external boundary:      */
/*  - the service (@/features/.../BusinessDashboardService)            */
/*  - the useAuth composable (@/composables/useAuth)                   */
/*  - the four heavy child cards (stubbed via global.stubs)            */
/* and drive fetchStats through ALL branches: missing user, missing    */
/* businessId, non-200 status, success, and the catch path.            */
/* ------------------------------------------------------------------ */

const getBusinessStats = vi.fn();
vi.mock("@/features/businesses/BusinessDashboardService", () => ({
  getBusinessStats: (...args) => getBusinessStats(...args),
}));

// Mutable user ref shared with the mocked composable so each test can
// set the auth state before mounting.
const user = ref(null);
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ user }),
}));

import Stats from "./Stats.vue";

// Lightweight stubs for the four card children. They render their props
// so we can assert what Stats forwards to them.
const cardStub = (name) => ({
  name,
  props: ["isLoading", "totalSpend", "totalAds", "totalClicks", "ctr"],
  template: `<div :class="'${name}'" :data-loading="isLoading">{{ totalSpend }}{{ totalAds }}{{ totalClicks }}{{ ctr }}</div>`,
});

const mountStats = () =>
  mount(Stats, {
    global: {
      stubs: {
        TotalSpendCard: cardStub("TotalSpendCard"),
        TotalAdsCard: cardStub("TotalAdsCard"),
        ClicksCard: cardStub("ClicksCard"),
        CTRCard: cardStub("CTRCard"),
      },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  user.value = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("Stats.vue", () => {
  it("fetches stats on mount and forwards them to the card components (success path)", async () => {
    user.value = { businessId: 42 };
    getBusinessStats.mockResolvedValue({
      status: 200,
      data: {
        total_spent: 1500,
        total_ads: 12,
        total_clicks: 3400,
        ctr: 2.5,
      },
    });

    const wrapper = mountStats();
    await flushPromises();

    // Service was called with the user's businessId.
    expect(getBusinessStats).toHaveBeenCalledTimes(1);
    expect(getBusinessStats).toHaveBeenCalledWith(42);

    // The four cards are rendered.
    expect(wrapper.find(".TotalSpendCard").exists()).toBe(true);
    expect(wrapper.find(".TotalAdsCard").exists()).toBe(true);
    expect(wrapper.find(".ClicksCard").exists()).toBe(true);
    expect(wrapper.find(".CTRCard").exists()).toBe(true);

    // Stats data is forwarded to the corresponding cards.
    expect(wrapper.findComponent({ name: "TotalSpendCard" }).props("totalSpend")).toBe(1500);
    expect(wrapper.findComponent({ name: "TotalAdsCard" }).props("totalAds")).toBe(12);
    expect(wrapper.findComponent({ name: "ClicksCard" }).props("totalClicks")).toBe(3400);
    expect(wrapper.findComponent({ name: "CTRCard" }).props("ctr")).toBe(2.5);

    // isLoading is reset to false once the fetch resolves.
    expect(wrapper.findComponent({ name: "TotalSpendCard" }).props("isLoading")).toBe(false);
  });

  it("throws and is caught when the user is missing (no user branch)", async () => {
    user.value = null;

    const wrapper = mountStats();
    await flushPromises();

    // Service is never called because the guard throws first.
    expect(getBusinessStats).not.toHaveBeenCalled();
    // The error was logged by the catch block.
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(console.error.mock.calls[0][0].message).toBe("User Not Found");
    // isLoading is reset to false in the catch.
    expect(wrapper.findComponent({ name: "TotalSpendCard" }).props("isLoading")).toBe(false);
  });

  it("throws and is caught when the user has no businessId (no businessId branch)", async () => {
    user.value = { id: 1 }; // truthy user but missing businessId

    const wrapper = mountStats();
    await flushPromises();

    expect(getBusinessStats).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error.mock.calls[0][0].message).toBe("User Not Found");
    expect(wrapper.findComponent({ name: "TotalSpendCard" }).props("isLoading")).toBe(false);
  });

  it("throws and is caught when the response status is not 200 (non-200 branch)", async () => {
    user.value = { businessId: 7 };
    getBusinessStats.mockResolvedValue({ status: 500, data: {} });

    const wrapper = mountStats();
    await flushPromises();

    expect(getBusinessStats).toHaveBeenCalledWith(7);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error.mock.calls[0][0].message).toBe("Unable to Fetch Stats");

    // stats stays empty, so cards receive undefined values.
    expect(wrapper.findComponent({ name: "TotalSpendCard" }).props("totalSpend")).toBeUndefined();
    expect(wrapper.findComponent({ name: "TotalSpendCard" }).props("isLoading")).toBe(false);
  });

  it("catches a rejected service call (rejected promise branch)", async () => {
    user.value = { businessId: 9 };
    const boom = new Error("network down");
    getBusinessStats.mockRejectedValue(boom);

    const wrapper = mountStats();
    await flushPromises();

    expect(getBusinessStats).toHaveBeenCalledWith(9);
    expect(console.error).toHaveBeenCalledWith(boom);
    expect(wrapper.findComponent({ name: "TotalSpendCard" }).props("isLoading")).toBe(false);
  });
});
