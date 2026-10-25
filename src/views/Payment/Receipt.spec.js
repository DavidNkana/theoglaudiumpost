import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// --- Mock the payment service boundaries ---
const { getPaymentStatus, getReceiptPdf } = vi.hoisted(() => ({
  getPaymentStatus: vi.fn(),
  getReceiptPdf: vi.fn(),
}));

vi.mock("@/features/payments/PayfastService", () => ({
  getPaymentStatus,
}));

vi.mock("@/features/payments/PaymentsService", () => ({
  getReceiptPdf,
}));

// --- Mock vue-router ---
const { routerPush, routeRef } = vi.hoisted(() => ({
  routerPush: vi.fn(),
  routeRef: { params: { id: "PAY-123" } },
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: routerPush }),
  useRoute: () => routeRef,
}));

import Receipt from "./Receipt.vue";

// A complete, "happy path" payment object that exercises every truthy branch.
const fullPayment = {
  payment_id: "PAY-123",
  created_at: "2024-01-15T10:30:00Z",
  status: "completed",
  payment_method: "VISA",
  customer_name: "Jane Doe",
  customer_email: "jane@example.com",
  customer_id: "CUST-7",
  transaction_id: "TXN-99",
  pf_payment_id: "PF-77",
  ad_title: "Big Banner",
  item_name: "Banner Ad",
  item_description: "Front page banner",
  duration: 30,
  start_date: "2024-02-01T00:00:00Z",
  amount: "1500.50",
};

const mountReceipt = () =>
  mount(Receipt, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  routeRef.params = { id: "PAY-123" };
  // Silence the component's intentional console.error calls.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Receipt.vue", () => {
  describe("loading state", () => {
    it("shows the spinner while the fetch promise is pending", () => {
      // Never-resolving promise keeps loading=true.
      getPaymentStatus.mockReturnValue(new Promise(() => {}));
      const wrapper = mountReceipt();

      expect(wrapper.find(".spinner-border").exists()).toBe(true);
      expect(wrapper.text()).toContain("Loading payment details...");
      // Action buttons are disabled while loading.
      const buttons = wrapper.findAll("button.btn");
      expect(buttons[0].attributes("disabled")).toBeDefined();
      expect(buttons[1].attributes("disabled")).toBeDefined();
    });
  });

  describe("error state", () => {
    it("renders the error alert when payment id is missing", async () => {
      routeRef.params = {};
      const wrapper = mountReceipt();
      await flushPromises();

      const alert = wrapper.find(".alert-danger");
      expect(alert.exists()).toBe(true);
      expect(alert.text()).toContain("Payment ID is required");
      // getPaymentStatus must NOT be called when the id is absent.
      expect(getPaymentStatus).not.toHaveBeenCalled();
    });

    it("maps a 404 response to a 'Payment not found' error", async () => {
      getPaymentStatus.mockResolvedValue({ status: 404 });
      const wrapper = mountReceipt();
      await flushPromises();

      expect(wrapper.find(".alert-danger").text()).toContain(
        "Payment not found"
      );
    });

    it("maps a 403 response to an 'Access denied' error", async () => {
      getPaymentStatus.mockResolvedValue({ status: 403 });
      const wrapper = mountReceipt();
      await flushPromises();

      expect(wrapper.find(".alert-danger").text()).toContain("Access denied");
    });

    it("maps any other non-200 response to a generic error", async () => {
      getPaymentStatus.mockResolvedValue({ status: 500 });
      const wrapper = mountReceipt();
      await flushPromises();

      expect(wrapper.find(".alert-danger").text()).toContain(
        "Failed to load payment details"
      );
    });

    it("surfaces a rejected promise message and logs it", async () => {
      getPaymentStatus.mockRejectedValue(new Error("Network down"));
      const wrapper = mountReceipt();
      await flushPromises();

      expect(wrapper.find(".alert-danger").text()).toContain("Network down");
      expect(console.error).toHaveBeenCalledWith(
        "Error fetching payment details:",
        expect.any(Error)
      );
    });

    it("retries the fetch when the Retry button is clicked", async () => {
      getPaymentStatus.mockResolvedValueOnce({ status: 500 });
      const wrapper = mountReceipt();
      await flushPromises();
      expect(wrapper.find(".alert-danger").exists()).toBe(true);

      // Second attempt succeeds -> error clears, invoice shows.
      getPaymentStatus.mockResolvedValueOnce({ status: 200, data: fullPayment });
      await wrapper.find(".alert-danger button").trigger("click");
      await flushPromises();

      expect(wrapper.find(".alert-danger").exists()).toBe(false);
      expect(wrapper.find("#invoice-content").exists()).toBe(true);
      expect(getPaymentStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe("success state — full payment", () => {
    let wrapper;
    beforeEach(async () => {
      getPaymentStatus.mockResolvedValue({ status: 200, data: fullPayment });
      wrapper = mountReceipt();
      await flushPromises();
    });

    it("renders the invoice content with formatted fields", () => {
      const html = wrapper.find("#invoice-content");
      expect(html.exists()).toBe(true);
      expect(html.text()).toContain("INV-PAY-123");
      // status -> bg-success badge + label
      const badge = wrapper.find("span.badge.bg-success");
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toBe("completed");
      // payment method override
      expect(html.text()).toContain("VISA");
      // customer details present (no N/A fallbacks)
      expect(html.text()).toContain("Jane Doe");
      expect(html.text()).toContain("jane@example.com");
      expect(html.text()).toContain("CUST-7");
    });

    it("calls getPaymentStatus with the route id", () => {
      expect(getPaymentStatus).toHaveBeenCalledWith("PAY-123");
    });

    it("renders the optional transaction and PayFast id columns", () => {
      const text = wrapper.find("#invoice-content").text();
      expect(text).toContain("TXN-99");
      expect(text).toContain("PF-77");
    });

    it("renders line2 of the company address", () => {
      expect(wrapper.text()).toContain("Suite 100");
    });

    it("prefers ad_title and renders duration with the 'days' suffix", () => {
      const text = wrapper.find("#invoice-content").text();
      expect(text).toContain("Big Banner");
      expect(text).toContain("Front page banner");
      const durationBadge = wrapper.find(".badge.bg-info");
      expect(durationBadge.text()).toContain("30");
      expect(durationBadge.text()).toContain("days");
    });

    it("formats currency as Zambian Kwacha for the amount", () => {
      // Intl en-ZM renders ZMW as the "K" symbol; the parsed 1500.50 must show.
      expect(wrapper.text()).toMatch(/K\s?1,500\.50/);
    });

    it("formats the start_date instead of showing 'Immediate'", () => {
      // start_date present -> formatDate output (year visible).
      expect(wrapper.text()).toContain("2024");
      expect(wrapper.text()).not.toContain("Immediate");
    });
  });

  describe("success state — minimal payment (fallback branches)", () => {
    let wrapper;
    const minimalPayment = {
      payment_id: "PAY-MIN",
      created_at: null,
      // no status, payment_method, customer_*, transaction_id, pf_payment_id
      // no ad_title -> falls to item_name
      item_name: "Item From Name",
      // no item_description -> default copy
      // no duration -> "N/A", no "days" suffix
      // no start_date -> "Immediate"
      amount: 0, // falsy -> formatCurrency returns "ZMW 0.00"
    };

    beforeEach(async () => {
      getPaymentStatus.mockResolvedValue({ status: 200, data: minimalPayment });
      wrapper = mountReceipt();
      await flushPromises();
    });

    it("falls back to default status label and secondary badge", () => {
      const badge = wrapper.find("span.badge.bg-secondary");
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toBe("Completed");
    });

    it("falls back to the default payment method", () => {
      expect(wrapper.text()).toContain("PayFast");
    });

    it("renders N/A for all missing customer fields", () => {
      const text = wrapper.find("#invoice-content").text();
      expect(text).toContain("N/A");
    });

    it("omits the optional transaction and PayFast id columns", () => {
      const text = wrapper.find("#invoice-content").text();
      expect(text).not.toContain("Transaction ID");
      expect(text).not.toContain("PayFast ID");
    });

    it("falls back to item_name and default description", () => {
      const text = wrapper.find("#invoice-content").text();
      expect(text).toContain("Item From Name");
      expect(text).toContain("Digital advertising campaign purchase");
    });

    it("shows N/A duration without a 'days' suffix", () => {
      const durationBadge = wrapper.find(".badge.bg-info");
      expect(durationBadge.text()).toContain("N/A");
      expect(durationBadge.find("span").exists()).toBe(false);
    });

    it("shows 'Immediate' when there is no start date", () => {
      expect(wrapper.text()).toContain("Immediate");
    });

    it("shows N/A for invoice date when created_at is null", () => {
      // formatDate(null) -> "N/A"
      expect(wrapper.text()).toContain("N/A");
    });

    it("renders ZMW 0.00 for a zero amount", () => {
      expect(wrapper.text()).toContain("ZMW 0.00");
    });
  });

  describe("getStatusBadgeClass branches", () => {
    const cases = [
      ["success", "bg-success"],
      ["paid", "bg-success"],
      ["pending", "bg-warning"],
      ["failed", "bg-danger"],
      ["cancelled", "bg-danger"],
      ["unknown-status", "bg-secondary"],
    ];

    it.each(cases)(
      "maps status '%s' to badge class '%s'",
      async (status, expectedClass) => {
        getPaymentStatus.mockResolvedValue({
          status: 200,
          data: { ...fullPayment, status },
        });
        const wrapper = mountReceipt();
        await flushPromises();

        const badge = wrapper.find(`span.badge.${expectedClass}`);
        expect(badge.exists()).toBe(true);
      }
    );
  });

  describe("printInvoice", () => {
    it("calls window.print when the Print button is clicked", async () => {
      getPaymentStatus.mockResolvedValue({ status: 200, data: fullPayment });
      const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
      const wrapper = mountReceipt();
      await flushPromises();

      // First btn in the header group is "Print Invoice".
      await wrapper.findAll("button.btn")[0].trigger("click");
      expect(printSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("downloadPDF", () => {
    const setupBlobEnv = () => {
      const createObjectURL = vi.fn(() => "blob:url");
      const revokeObjectURL = vi.fn();
      window.URL.createObjectURL = createObjectURL;
      window.URL.revokeObjectURL = revokeObjectURL;
      return { createObjectURL, revokeObjectURL };
    };

    it("does nothing when there are no payment details", async () => {
      // Force the "no details" branch: fetch fails so paymentDetails stays null,
      // but the buttons still render, so we can invoke downloadPDF directly.
      getPaymentStatus.mockResolvedValue({ status: 500 });
      const wrapper = mountReceipt();
      await flushPromises();

      // Click the Download button (second btn) — early return, no service call.
      await wrapper.findAll("button.btn")[1].trigger("click");
      await flushPromises();
      expect(getReceiptPdf).not.toHaveBeenCalled();
    });

    it("downloads the PDF blob through an anchor click on success", async () => {
      getPaymentStatus.mockResolvedValue({ status: 200, data: fullPayment });
      const { createObjectURL, revokeObjectURL } = setupBlobEnv();
      const blob = new Blob(["pdf"], { type: "application/pdf" });
      getReceiptPdf.mockResolvedValue({ data: blob });

      const clickSpy = vi.fn();
      const appendSpy = vi.spyOn(document.body, "appendChild");
      const removeSpy = vi.spyOn(document.body, "removeChild");
      const realCreate = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag) => {
        const el = realCreate(tag);
        if (tag === "a") el.click = clickSpy;
        return el;
      });

      const wrapper = mountReceipt();
      await flushPromises();

      await wrapper.findAll("button.btn")[1].trigger("click");
      await flushPromises();

      expect(getReceiptPdf).toHaveBeenCalledWith("PAY-123");
      expect(createObjectURL).toHaveBeenCalledWith(blob);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:url");
    });

    it("alerts the user and logs when the PDF download rejects", async () => {
      getPaymentStatus.mockResolvedValue({ status: 200, data: fullPayment });
      getReceiptPdf.mockRejectedValue(new Error("pdf boom"));
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      const wrapper = mountReceipt();
      await flushPromises();

      await wrapper.findAll("button.btn")[1].trigger("click");
      await flushPromises();

      expect(alertSpy).toHaveBeenCalledWith(
        "Unable to download PDF. Please try again later."
      );
      expect(console.error).toHaveBeenCalledWith(
        "Error downloading PDF:",
        expect.any(Error)
      );
    });
  });

  describe("breadcrumb links", () => {
    it("renders router-links to the dashboard and payments routes", async () => {
      getPaymentStatus.mockResolvedValue({ status: 200, data: fullPayment });
      const wrapper = mountReceipt();
      await flushPromises();

      const targets = wrapper
        .findAllComponents(RouterLinkStub)
        .map((l) => l.props("to"));
      expect(targets).toEqual(["/dashboard", "/payments"]);
    });
  });
});
