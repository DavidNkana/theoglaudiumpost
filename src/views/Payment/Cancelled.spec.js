import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// --- Hoisted mock state -----------------------------------------------------
// Hoisted so the vi.mock factories (lifted to top of file) can reference these
// without "cannot access before initialization" errors.
const h = vi.hoisted(() => ({
  getPaymentStatus: vi.fn(),
  routerPush: vi.fn(),
  routeParams: { value: {} },
}));

// --- Mock the payments service boundary -------------------------------------
vi.mock("@/features/payments/PayfastService", () => ({
  getPaymentStatus: (...args) => h.getPaymentStatus(...args),
}));

// --- Mock vue-router --------------------------------------------------------
vi.mock("vue-router", () => ({
  useRouter: () => ({ push: h.routerPush }),
  useRoute: () => ({ params: h.routeParams.value }),
}));

import Cancelled from "@/views/Payment/Cancelled.vue";

const mountCancelled = () =>
  mount(Cancelled, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

beforeEach(() => {
  h.getPaymentStatus.mockReset();
  h.routerPush.mockReset();
  h.routeParams.value = { id: "ORDER-1" };
  // Silence the console.error in the catch path without losing the call record.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Cancelled.vue", () => {
  it("shows the loading state synchronously before async resolution", () => {
    // Never-resolving promise keeps loading=true.
    h.getPaymentStatus.mockReturnValue(new Promise(() => {}));
    const wrapper = mountCancelled();

    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.text()).toContain("Processing your payment...");
    expect(wrapper.text()).toContain("Please wait while we verify your payment.");
    // Cancelled / error blocks not rendered yet.
    expect(wrapper.find(".bi-check-circle-fill").exists()).toBe(false);
    expect(wrapper.find(".bi-exclamation-circle-fill").exists()).toBe(false);
  });

  it("renders the error state when the order id is missing", async () => {
    h.routeParams.value = {}; // no id => !orderId branch
    const wrapper = mountCancelled();
    await flushPromises();

    // Service must NOT be called when there is no order id.
    expect(h.getPaymentStatus).not.toHaveBeenCalled();

    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.find(".bi-exclamation-circle-fill.text-danger").exists()).toBe(
      true
    );
    expect(wrapper.find("h2.text-danger").text()).toBe("Payment Error");
    expect(wrapper.find("p.lead").text()).toBe(
      "Invalid payment reference. Please contact support."
    );
    // Error state only has the single dashboard button.
    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].text()).toBe("Go to Dashboard");
  });

  it("redirects to the success page when status is complete", async () => {
    h.getPaymentStatus.mockResolvedValue({
      status: 200,
      data: { status: "COMPLETE" },
    });
    const wrapper = mountCancelled();
    await flushPromises();

    expect(h.getPaymentStatus).toHaveBeenCalledWith("ORDER-1");
    expect(h.routerPush).toHaveBeenCalledWith("/payment/success/ORDER-1");
  });

  it("renders the cancelled state when status is cancelled", async () => {
    h.getPaymentStatus.mockResolvedValue({
      status: 200,
      data: { status: "Cancelled", ref: "abc" },
    });
    const wrapper = mountCancelled();
    await flushPromises();

    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.find(".bi-check-circle-fill.text-success").exists()).toBe(true);
    expect(wrapper.find("h2.text-success").text()).toBe("Payment Cancelled!");
    expect(wrapper.find("p.lead").text()).toBe(
      "Looks like you didn’t complete the payment."
    );

    // Cancelled state shows both action buttons.
    const buttons = wrapper.findAll("button");
    expect(buttons.map((b) => b.text())).toEqual([
      "Go to Dashboard",
      "View My Ads",
    ]);

    // No redirect, no error state.
    expect(h.routerPush).not.toHaveBeenCalled();
    expect(wrapper.find(".bi-exclamation-circle-fill").exists()).toBe(false);
  });

  it("navigates via the cancelled-state action buttons", async () => {
    h.getPaymentStatus.mockResolvedValue({
      status: 200,
      data: { status: "cancelled" },
    });
    const wrapper = mountCancelled();
    await flushPromises();

    const [dashboardBtn, adsBtn] = wrapper.findAll("button");

    await dashboardBtn.trigger("click");
    expect(h.routerPush).toHaveBeenCalledWith("/business/dashboard");

    await adsBtn.trigger("click");
    expect(h.routerPush).toHaveBeenCalledWith("/business/ads");
  });

  it("renders the pending state for any other status (else branch)", async () => {
    h.getPaymentStatus.mockResolvedValue({
      status: 200,
      data: { status: "PENDING" },
    });
    const wrapper = mountCancelled();
    await flushPromises();

    // pending => status "pending" => not 'cancelled', falls to v-else (error block)
    expect(wrapper.find(".bi-exclamation-circle-fill.text-danger").exists()).toBe(
      true
    );
    expect(wrapper.find("h2.text-danger").text()).toBe("Payment Error");
    expect(wrapper.find("p.lead").text()).toBe(
      "Your payment is being processed. We'll notify you once it's complete."
    );
    expect(h.routerPush).not.toHaveBeenCalled();
  });

  it("renders the error state when the response is not 200 (thrown + caught)", async () => {
    h.getPaymentStatus.mockResolvedValue({
      status: 404,
      data: { status: "whatever" },
    });
    const wrapper = mountCancelled();
    await flushPromises();

    expect(console.error).toHaveBeenCalled();
    expect(wrapper.find(".bi-exclamation-circle-fill.text-danger").exists()).toBe(
      true
    );
    expect(wrapper.find("p.lead").text()).toBe(
      "There was an error processing your payment. Please contact support."
    );
  });

  it("renders the error state when the service rejects (catch branch)", async () => {
    h.getPaymentStatus.mockRejectedValue(new Error("network down"));
    const wrapper = mountCancelled();
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(
      "Error checking payment status:",
      expect.any(Error)
    );
    expect(wrapper.find("h2.text-danger").text()).toBe("Payment Error");
    expect(wrapper.find("p.lead").text()).toBe(
      "There was an error processing your payment. Please contact support."
    );

    // Error state's single dashboard button still navigates.
    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(1);
    await buttons[0].trigger("click");
    expect(h.routerPush).toHaveBeenCalledWith("/business/dashboard");
  });

  it("falls through to the error block when status is nullish (optional-chaining branch)", async () => {
    h.getPaymentStatus.mockResolvedValue({
      status: 200,
      data: { status: "cancelled" },
    });
    const wrapper = mountCancelled();
    await flushPromises();

    // Sanity: starts in the cancelled state.
    expect(wrapper.find(".bi-check-circle-fill").exists()).toBe(true);

    // Force the optional-chaining short-circuit: status?.toLowerCase() === undefined
    // exercises the nullish (?.) branch in the v-else-if condition.
    wrapper.vm.paymentStatus.status = undefined;
    await flushPromises();

    expect(wrapper.find(".bi-check-circle-fill").exists()).toBe(false);
    expect(wrapper.find(".bi-exclamation-circle-fill.text-danger").exists()).toBe(
      true
    );
  });
});
