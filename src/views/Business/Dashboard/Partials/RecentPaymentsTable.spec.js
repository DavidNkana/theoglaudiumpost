import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

/* ------------------------------------------------------------------ */
/* RecentPaymentsTable imports two boundaries:                         */
/*   - getBusinessRecentPayments (@/features/businesses/...Service)    */
/*   - useAuth (@/composables/useAuth)                                 */
/* Both are mocked. `user` is a Vue ref-like object we mutate per test */
/* to drive every branch of fetchData(). The <router-link> is stubbed  */
/* with RouterLinkStub. console.log/error are silenced.                */
/* ------------------------------------------------------------------ */

const getBusinessRecentPayments = vi.fn();
vi.mock("@/features/businesses/BusinessDashboardService", () => ({
  getBusinessRecentPayments: (...args) => getBusinessRecentPayments(...args),
}));

import { ref } from "vue";

// Shared reactive user ref, mutated per test before mount.
const user = ref({ businessId: "biz-1" });
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ user }),
}));

import RecentPaymentsTable from "./RecentPaymentsTable.vue";

const mountTable = () =>
  mount(RecentPaymentsTable, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  user.value = { businessId: "biz-1" };
});

describe("RecentPaymentsTable.vue", () => {
  it("renders the loading shimmer state (v-else) before the fetch resolves", async () => {
    // Never-resolving promise keeps isLoading=true so the v-else branch renders.
    getBusinessRecentPayments.mockReturnValue(new Promise(() => {}));

    const wrapper = mountTable();
    // onMounted has run and flipped isLoading true synchronously.
    await wrapper.vm.$nextTick();

    // Static header + "View all" router-link always present.
    expect(wrapper.find(".card-title").text()).toBe("Recent Payments");
    expect(wrapper.findComponent(RouterLinkStub).props("to")).toBe(
      "/business/payments"
    );

    // v-else branch: exactly 5 shimmer rows, no data rows.
    const shimmerRows = wrapper.findAll("tbody tr");
    expect(shimmerRows.length).toBe(5);
    expect(wrapper.findAll(".shimmer").length).toBeGreaterThan(0);
    expect(wrapper.find(".shimmer-badge").exists()).toBe(true);
  });

  it("renders rows on success and covers every status badge class + empty amount-less data", async () => {
    const payments = [
      {
        id: 1,
        payment_id: "PAY-001",
        amount_gross: 1234567,
        status: "Completed",
        created_at: "2026-01-02T10:00:00Z",
        payment_method: "card",
      },
      {
        id: 2,
        payment_id: "PAY-002",
        amount_gross: 500,
        status: "Pending",
        created_at: "2026-02-03T11:00:00Z",
        payment_method: "eft",
      },
      {
        id: 3,
        payment_id: "PAY-003",
        amount_gross: 99,
        status: "Failed",
        created_at: "2026-03-04T12:00:00Z",
        payment_method: "snapscan",
      },
      {
        id: 4,
        payment_id: "PAY-004",
        amount_gross: 42,
        status: "Refunded", // default branch -> bg-secondary
        created_at: "2026-04-05T13:00:00Z",
        payment_method: "cash",
      },
    ];
    getBusinessRecentPayments.mockResolvedValue({ status: 200, data: payments });

    const wrapper = mountTable();
    await flushPromises();

    // Service called with the businessId from the mocked auth user.
    expect(getBusinessRecentPayments).toHaveBeenCalledWith("biz-1");

    // v-if (loaded) branch: 4 data rows, no shimmer.
    const rows = wrapper.findAll("tbody tr");
    expect(rows.length).toBe(4);
    expect(wrapper.find(".shimmer").exists()).toBe(false);

    // Reference, formatted amount, status text, split date, method.
    const firstCells = rows[0].findAll("td");
    expect(firstCells[0].text()).toBe("PAY-001");
    expect(firstCells[1].text()).toBe("R" + (1234567).toLocaleString());
    expect(firstCells[2].text()).toBe("Completed");
    expect(firstCells[3].text()).toBe("2026-01-02");
    expect(firstCells[4].text()).toBe("card");

    // Each getStatusBadgeClass switch arm.
    const badges = wrapper.findAll("tbody tr .badge");
    expect(badges[0].classes()).toContain("bg-success"); // completed
    expect(badges[1].classes()).toContain("bg-warning"); // pending
    expect(badges[2].classes()).toContain("bg-danger"); // failed
    expect(badges[3].classes()).toContain("bg-secondary"); // default
  });

  it("renders zero data rows when the v-for source is empty (success, no data)", async () => {
    // response.data is undefined -> `response.data || []` empty-array branch.
    getBusinessRecentPayments.mockResolvedValue({ status: 200, data: undefined });

    const wrapper = mountTable();
    await flushPromises();

    // v-if branch active (not loading) but the v-for produces no rows.
    expect(wrapper.find("tbody").exists()).toBe(true);
    expect(wrapper.findAll("tbody tr").length).toBe(0);
    expect(wrapper.find(".shimmer").exists()).toBe(false);
  });

  it("falls back to empty rows when the service rejects (catch branch)", async () => {
    const err = new Error("boom");
    getBusinessRecentPayments.mockRejectedValue(err);

    const wrapper = mountTable();
    await flushPromises();

    // catch resets isLoading and recentPayments=[]; loaded branch, no rows.
    expect(console.error).toHaveBeenCalledWith(err);
    expect(wrapper.findAll("tbody tr").length).toBe(0);
    expect(wrapper.find(".shimmer").exists()).toBe(false);
  });

  it("throws/handles a non-200 response status (status !== 200 branch)", async () => {
    getBusinessRecentPayments.mockResolvedValue({ status: 500, data: [{ id: 9 }] });

    const wrapper = mountTable();
    await flushPromises();

    // The thrown "Unable to fetch..." is caught -> empty rows.
    expect(console.error).toHaveBeenCalled();
    expect(wrapper.findAll("tbody tr").length).toBe(0);
  });

  it("throws when the auth user is null (first half of the !user condition)", async () => {
    user.value = null;

    const wrapper = mountTable();
    await flushPromises();

    // Service is never called because the guard throws first.
    expect(getBusinessRecentPayments).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
    expect(wrapper.findAll("tbody tr").length).toBe(0);
  });

  it("throws when the user has no businessId (second half of the guard)", async () => {
    user.value = { name: "no-business" };

    const wrapper = mountTable();
    await flushPromises();

    expect(getBusinessRecentPayments).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
    expect(wrapper.findAll("tbody tr").length).toBe(0);
  });
});
