import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// --- Mock the PayfastService boundary ---------------------------------------
vi.mock("@/features/payments/PayfastService", () => ({
  getPaymentStatus: vi.fn(),
}));

// --- Mock vue-router (useRoute / useRouter) ---------------------------------
const pushMock = vi.fn();
const routeMock = { params: {}, query: {} };
vi.mock("vue-router", () => ({
  useRoute: () => routeMock,
  useRouter: () => ({ push: pushMock }),
}));

import { getPaymentStatus } from "@/features/payments/PayfastService";
import Success from "@/views/Payment/Success.vue";

const globalConfig = {
  stubs: {
    RouterLink: RouterLinkStub,
  },
};

function mountSuccess() {
  return mount(Success, { global: globalConfig });
}

describe("Payment/Success.vue", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    pushMock.mockReset();
    getPaymentStatus.mockReset();
    routeMock.params = {};
    routeMock.query = {};
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // -- Loading state -----------------------------------------------------------
  it("renders the loading state before the payment status resolves", () => {
    routeMock.params = { id: "order-1" };
    // Return a never-resolving promise so the component stays in loading state.
    getPaymentStatus.mockReturnValue(new Promise(() => {}));

    const wrapper = mountSuccess();

    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.text()).toContain("Processing your payment...");
    expect(wrapper.text()).toContain(
      "Please wait while we verify your payment."
    );
    // Only the loading block is rendered.
    expect(wrapper.find(".bi-check-circle-fill").exists()).toBe(false);
  });

  // -- Missing order id (early-return error branch) ----------------------------
  it("shows the error state when no order id is present in the route", async () => {
    routeMock.params = {}; // no id

    const wrapper = mountSuccess();
    await flushPromises();

    expect(getPaymentStatus).not.toHaveBeenCalled();
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.find(".bi-exclamation-circle-fill").exists()).toBe(true);
    expect(wrapper.find("h2.text-danger").text()).toBe("Payment Error");
    expect(wrapper.text()).toContain(
      "Invalid payment reference. Please contact support."
    );
  });

  // -- Success branch: status 200 + complete -----------------------------------
  it("shows the success state when the payment is complete", async () => {
    routeMock.params = { id: "order-2" };
    getPaymentStatus.mockResolvedValue({
      status: 200,
      data: { status: "COMPLETE", amount: 100 },
    });

    const wrapper = mountSuccess();
    await flushPromises();

    expect(getPaymentStatus).toHaveBeenCalledWith("order-2");
    expect(wrapper.find(".bi-check-circle-fill").exists()).toBe(true);
    expect(wrapper.find("h2.text-success").text()).toBe("Payment Successful!");
    expect(wrapper.text()).toContain(
      "Thank you for your payment. Your advertisement has been"
    );

    // Both success buttons present and wired.
    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(2);

    await buttons[0].trigger("click"); // Go to Dashboard
    expect(pushMock).toHaveBeenCalledWith("/business/dashboard");

    await buttons[1].trigger("click"); // View My Ads
    expect(pushMock).toHaveBeenCalledWith("/business/ads");
  });

  // -- Pending branch: status 200 but not complete -----------------------------
  it("shows the pending state when status is 200 but payment is not complete", async () => {
    routeMock.params = { id: "order-3" };
    getPaymentStatus.mockResolvedValue({
      status: 200,
      data: { status: "PENDING" },
    });

    const wrapper = mountSuccess();
    await flushPromises();

    expect(wrapper.find(".bi-hourglass-split").exists()).toBe(true);
    expect(wrapper.find("h2.text-warning").text()).toBe("Payment Processing");
    expect(wrapper.text()).toContain(
      "Your payment is being processed. We'll notify you once it's complete."
    );

    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(1);
    await buttons[0].trigger("click");
    expect(pushMock).toHaveBeenCalledWith("/business/dashboard");
  });

  // -- Pending branch: non-200 status (left side of && false) ------------------
  it("shows the pending state when the response status is not 200", async () => {
    routeMock.params = { id: "order-4" };
    getPaymentStatus.mockResolvedValue({
      status: 202,
      data: { status: "complete" },
    });

    const wrapper = mountSuccess();
    await flushPromises();

    expect(wrapper.find(".bi-hourglass-split").exists()).toBe(true);
    expect(wrapper.find("h2.text-warning").text()).toBe("Payment Processing");
  });

  // -- Catch branch: rejected service call -------------------------------------
  it("shows the error state and logs when the service call rejects", async () => {
    routeMock.params = { id: "order-5" };
    const err = new Error("network down");
    getPaymentStatus.mockRejectedValue(err);

    const wrapper = mountSuccess();
    await flushPromises();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error checking payment status:",
      err
    );
    expect(wrapper.find(".bi-exclamation-circle-fill").exists()).toBe(true);
    expect(wrapper.find("h2.text-danger").text()).toBe("Payment Error");
    expect(wrapper.text()).toContain(
      "There was an error processing your payment. Please contact support."
    );

    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(1);
    await buttons[0].trigger("click");
    expect(pushMock).toHaveBeenCalledWith("/business/dashboard");
  });
});
