import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PaymentsTable from "@/views/Admin/Ads/Payments/Partials/PaymentsTable.vue";

// Fixed date so the formatDate assertion is deterministic.
const FIXED_DATE = "2025-03-09T14:05:00Z";

function makePayment(overrides = {}) {
  return {
    id: 1,
    payment_method: "payfast",
    eft_reference: "EFT-REF-001",
    pf_payment_id: "PF-12345",
    amount_gross: 150.5,
    status: "paid",
    created_at: FIXED_DATE,
    customer_name: "Jane Doe",
    ...overrides,
  };
}

function mountTable(props = {}) {
  return mount(PaymentsTable, {
    props: {
      payments: [],
      ...props,
    },
  });
}

describe("PaymentsTable", () => {
  it("renders the loading row when isLoading is true", () => {
    const wrapper = mountTable({
      payments: [],
      isLoading: true,
    });
    // Loading branch: spinner + loading text present
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.text()).toContain("Loading payments...");
    // The empty-state branch (v-else-if) must NOT render while loading.
    expect(wrapper.text()).not.toContain("No payments found");
  });

  it("renders the empty-state row when not loading and payments is empty", () => {
    const wrapper = mountTable({ payments: [], isLoading: false });
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.text()).toContain("No payments found");
  });

  it("renders a data row for a payfast payment (ternary false branch) with paid status", () => {
    const wrapper = mountTable({
      payments: [makePayment()],
      isLoading: false,
      page: 0,
      pageSize: 10,
    });
    // The empty-state should not show when there is data.
    expect(wrapper.text()).not.toContain("No payments found");

    const cells = wrapper.findAll("tbody tr td");
    // Row number = page*pageSize + index + 1 = 0*10 + 0 + 1 = 1
    expect(cells[0].text()).toBe("1");
    // Reference: payment_method != "eft" -> pf_payment_id
    expect(cells[1].text()).toBe("PF-12345");
    // Amount: formatted ZAR currency
    expect(cells[2].text()).toBe(
      new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
      }).format(150.5)
    );
    // Status badge: paid -> bg-success
    const badge = wrapper.find("tbody span");
    expect(badge.classes()).toContain("badge");
    expect(badge.classes()).toContain("bg-success");
    expect(badge.text()).toBe("paid");
    // Payment date formatted
    expect(cells[4].text()).toBe(
      new Date(FIXED_DATE).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    );
    // Payment method display: payfast -> "PayFast"
    expect(cells[5].text()).toBe("PayFast");
    // Customer name
    expect(cells[6].text()).toBe("Jane Doe");
  });

  it("uses eft_reference when payment_method is 'eft' (ternary true branch)", () => {
    const wrapper = mountTable({
      payments: [makePayment({ payment_method: "eft" })],
      isLoading: false,
    });
    const cells = wrapper.findAll("tbody tr td");
    expect(cells[1].text()).toBe("EFT-REF-001");
    // payment_method "eft" is not in the display map -> falls back to raw method
    expect(cells[5].text()).toBe("eft");
  });

  it("renders 'N/A' when created_at is missing (formatDate falsy branch)", () => {
    const wrapper = mountTable({
      payments: [makePayment({ created_at: null })],
      isLoading: false,
    });
    const cells = wrapper.findAll("tbody tr td");
    expect(cells[4].text()).toBe("N/A");
  });

  it("falls back to bg-secondary for an unknown status (getStatusBadgeClass || branch)", () => {
    const wrapper = mountTable({
      payments: [makePayment({ status: "unknown-status" })],
      isLoading: false,
    });
    const badge = wrapper.find("tbody span");
    expect(badge.classes()).toContain("badge");
    expect(badge.classes()).toContain("bg-secondary");
    expect(badge.text()).toBe("unknown-status");
  });

  it("maps every known status and payment method to its display class/name", () => {
    const payments = [
      makePayment({ id: 1, status: "paid", payment_method: "bank_transfer" }),
      makePayment({ id: 2, status: "pending", payment_method: "credit_card" }),
      makePayment({ id: 3, status: "cancelled", payment_method: "payfast" }),
      makePayment({ id: 4, status: "refunded", payment_method: "cash" }),
      makePayment({ id: 5, status: "paid", payment_method: "other" }),
    ];
    const wrapper = mountTable({ payments, isLoading: false });

    const badgeClasses = wrapper
      .findAll("tbody span")
      .map((b) => b.classes().join(" "));
    expect(badgeClasses[0]).toContain("bg-success");
    expect(badgeClasses[1]).toContain("bg-warning");
    expect(badgeClasses[2]).toContain("bg-danger");
    expect(badgeClasses[3]).toContain("bg-info");
    expect(badgeClasses[4]).toContain("bg-success");

    // Payment method display names (every key in the map).
    const methodCells = wrapper
      .findAll("tbody tr")
      .map((tr) => tr.findAll("td")[5].text());
    expect(methodCells).toEqual([
      "Bank Transfer",
      "Credit Card",
      "PayFast",
      "Cash",
      "Other",
    ]);
  });

  it("computes row numbers using page and pageSize", () => {
    const wrapper = mountTable({
      payments: [makePayment({ id: 10 }), makePayment({ id: 11 })],
      isLoading: false,
      page: 2,
      pageSize: 5,
    });
    const rows = wrapper.findAll("tbody tr");
    // page*pageSize + index + 1 = 2*5 + 0 + 1 = 11, then 12
    expect(rows[0].findAll("td")[0].text()).toBe("11");
    expect(rows[1].findAll("td")[0].text()).toBe("12");
  });

  it("uses prop defaults for page/pageSize when omitted", () => {
    const wrapper = mountTable({
      payments: [makePayment()],
      isLoading: false,
    });
    // Defaults page=0, pageSize=10 -> row number 1
    expect(wrapper.find("tbody tr td").text()).toBe("1");
  });

  it("emits handle-edit with the payment id when Edit is clicked", async () => {
    const wrapper = mountTable({
      payments: [makePayment({ id: 42 })],
      isLoading: false,
    });
    await wrapper.find("button.btn-outline-primary").trigger("click");
    expect(wrapper.emitted("handle-edit")).toBeTruthy();
    expect(wrapper.emitted("handle-edit")[0]).toEqual([42]);
  });

  it("emits handle-delete with the payment id when Delete is clicked", async () => {
    const wrapper = mountTable({
      payments: [makePayment({ id: 77 })],
      isLoading: false,
    });
    await wrapper.find("button.btn-outline-danger").trigger("click");
    expect(wrapper.emitted("handle-delete")).toBeTruthy();
    expect(wrapper.emitted("handle-delete")[0]).toEqual([77]);
  });
});
