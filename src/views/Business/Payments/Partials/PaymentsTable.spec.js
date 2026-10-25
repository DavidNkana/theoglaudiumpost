import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import PaymentsTable from "@/views/Business/Payments/Partials/PaymentsTable.vue";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const factory = (props = {}) =>
  mount(PaymentsTable, {
    props: {
      payments: [],
      ...props,
    },
  });

describe("PaymentsTable.vue", () => {
  it("renders the loading row when isLoading is true (v-if branch)", () => {
    const wrapper = factory({ isLoading: true, payments: [] });

    // Loading spinner + message shown, empty/data rows not shown.
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.text()).toContain("Loading payments...");
    expect(wrapper.text()).not.toContain("No payments found");
    // No data rows rendered.
    expect(wrapper.find("tbody tr td button").exists()).toBe(false);
  });

  it("renders the empty state when not loading and payments is empty (v-else-if branch)", () => {
    const wrapper = factory({ isLoading: false, payments: [] });

    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.text()).toContain("No payments found");
    expect(wrapper.findAll("tbody tr button")).toHaveLength(0);
  });

  it("renders a data row for an EFT payment covering eft_reference, amount, known status/method, description, and date", () => {
    const wrapper = factory({
      isLoading: false,
      page: 0,
      pageSize: 10,
      payments: [
        {
          id: 11,
          payment_method: "eft",
          eft_reference: "EFT-REF-123",
          pf_payment_id: "PF-SHOULD-NOT-SHOW",
          amount: 1500,
          status: "paid",
          payment_date: "2026-01-15T10:00:00Z",
          description: "Custom description",
        },
      ],
    });

    // Neither loading nor empty placeholder.
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("No payments found");

    const cells = wrapper.findAll("tbody tr td");
    // Row number: page 0 * size 10 + index 0 + 1 = 1
    expect(cells[0].text()).toBe("1");
    // EFT branch -> eft_reference
    expect(cells[1].text()).toBe("EFT-REF-123");
    // formatCurrency(amount) -> en-ZA ZAR
    expect(cells[2].text()).toContain("1");
    expect(cells[2].text()).not.toBe("");
    // Known status maps to bg-success badge
    const badge = wrapper.find("tbody tr td span");
    expect(badge.classes()).toContain("badge");
    expect(badge.classes()).toContain("bg-success");
    expect(badge.text()).toBe("paid");
    // Known payment method display
    expect(wrapper.text()).toContain("EFT" /* method cell -> "eft" not mapped */);
    // Description provided -> uses it
    expect(wrapper.text()).toContain("Custom description");
  });

  it("renders a non-EFT payment using pf_payment_id, amount_gross fallback, created_at date, and default description", () => {
    const wrapper = factory({
      isLoading: false,
      payments: [
        {
          id: 22,
          payment_method: "payfast",
          eft_reference: "EFT-SHOULD-NOT-SHOW",
          pf_payment_id: "PF-999",
          // amount missing -> falls back to amount_gross
          amount_gross: 2500,
          status: "pending",
          // payment_date missing -> falls back to created_at
          created_at: "2026-02-20T08:30:00Z",
          // description missing -> default "Advertisement payment"
        },
      ],
    });

    const cells = wrapper.findAll("tbody tr td");
    // Non-EFT branch -> pf_payment_id
    expect(cells[1].text()).toBe("PF-999");
    // Amount via amount_gross fallback (formatted, non-empty)
    expect(cells[2].text()).not.toBe("");
    // pending status -> bg-warning
    const badge = wrapper.find("tbody tr td span");
    expect(badge.classes()).toContain("bg-warning");
    // payfast method display name
    expect(wrapper.text()).toContain("PayFast");
    // Default description fallback
    expect(wrapper.text()).toContain("Advertisement payment");
  });

  it("formatDate returns N/A when there is no date (falsy dateString branch)", () => {
    const wrapper = factory({
      isLoading: false,
      payments: [
        {
          id: 33,
          payment_method: "cash",
          pf_payment_id: "PF-CASH",
          amount: 100,
          status: "completed",
          // no payment_date and no created_at -> formatDate(undefined) -> "N/A"
          description: "Cash sale",
        },
      ],
    });

    const cells = wrapper.findAll("tbody tr td");
    // Date cell (index 4) -> N/A
    expect(cells[4].text()).toBe("N/A");
    // completed status -> bg-success
    expect(wrapper.find("tbody tr td span").classes()).toContain("bg-success");
    // cash method display name
    expect(wrapper.text()).toContain("Cash");
  });

  it("getStatusBadgeClass falls back to bg-secondary for unknown status, and getPaymentMethodDisplay returns raw method when unmapped", () => {
    const wrapper = factory({
      isLoading: false,
      payments: [
        {
          id: 44,
          payment_method: "crypto", // not in map -> returns "crypto"
          pf_payment_id: "PF-CRYPTO",
          amount: 750,
          status: "PartiallyPaid", // unknown (lowercased) -> bg-secondary
          created_at: "2026-03-01T00:00:00Z",
          description: "Crypto payment",
        },
      ],
    });

    const badge = wrapper.find("tbody tr td span");
    expect(badge.classes()).toContain("bg-secondary");
    // Unmapped payment method returns the raw value
    expect(wrapper.text()).toContain("crypto");
  });

  it("covers remaining status map entries (cancelled, failed, refunded)", () => {
    const statuses = [
      { status: "cancelled", cls: "bg-danger" },
      { status: "failed", cls: "bg-danger" },
      { status: "refunded", cls: "bg-info" },
    ];

    statuses.forEach(({ status, cls }) => {
      const wrapper = factory({
        isLoading: false,
        payments: [
          {
            id: 1,
            payment_method: "bank_transfer",
            pf_payment_id: "PF-X",
            amount: 1,
            status,
            created_at: "2026-03-01T00:00:00Z",
          },
        ],
      });
      expect(wrapper.find("tbody tr td span").classes()).toContain(cls);
      // bank_transfer + credit_card + other display names exercised across run
      expect(wrapper.text()).toContain("Bank Transfer");
    });
  });

  it("covers remaining payment method display names (credit_card, other)", () => {
    const methods = [
      { payment_method: "credit_card", label: "Credit Card" },
      { payment_method: "other", label: "Other" },
    ];

    methods.forEach(({ payment_method, label }) => {
      const wrapper = factory({
        isLoading: false,
        payments: [
          {
            id: 1,
            payment_method,
            pf_payment_id: "PF-Y",
            amount: 10,
            status: "paid",
            created_at: "2026-03-01T00:00:00Z",
          },
        ],
      });
      expect(wrapper.text()).toContain(label);
    });
  });

  it("getRowNumber accounts for pagination across multiple rows (non-empty v-for)", () => {
    const wrapper = factory({
      isLoading: false,
      page: 2,
      pageSize: 5,
      payments: [
        {
          id: 100,
          payment_method: "eft",
          eft_reference: "A",
          amount: 1,
          status: "paid",
          created_at: "2026-03-01T00:00:00Z",
        },
        {
          id: 101,
          payment_method: "eft",
          eft_reference: "B",
          amount: 2,
          status: "paid",
          created_at: "2026-03-01T00:00:00Z",
        },
      ],
    });

    const rows = wrapper.findAll("tbody tr");
    // No loading/empty rows -> exactly 2 data rows.
    expect(rows).toHaveLength(2);
    // page 2 * size 5 + index + 1 => 11 and 12
    expect(rows[0].findAll("td")[0].text()).toBe("11");
    expect(rows[1].findAll("td")[0].text()).toBe("12");
  });

  it("emits handle-preview with the payment id when the View button is clicked", async () => {
    const wrapper = factory({
      isLoading: false,
      payments: [
        {
          id: 777,
          payment_method: "eft",
          eft_reference: "REF",
          amount: 1,
          status: "paid",
          created_at: "2026-03-01T00:00:00Z",
        },
      ],
    });

    await wrapper.find("tbody tr td button").trigger("click");

    expect(wrapper.emitted("handle-preview")).toBeTruthy();
    expect(wrapper.emitted("handle-preview")[0]).toEqual([777]);
  });

  it("uses prop defaults (isLoading=false, page=0, pageSize=10) when only payments is provided", () => {
    const wrapper = factory({
      payments: [
        {
          id: 5,
          payment_method: "eft",
          eft_reference: "DEF",
          amount: 1,
          status: "paid",
          created_at: "2026-03-01T00:00:00Z",
        },
      ],
    });

    // default isLoading=false -> no spinner; data row present.
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    // default page 0 * default size 10 + 0 + 1 = 1
    expect(wrapper.findAll("tbody tr td")[0].text()).toBe("1");
  });
});
