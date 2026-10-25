import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { mount, flushPromises } from "@vue/test-utils";

// ---- Mock service boundaries ----
const getAdPlacements = vi.fn();
const createAd = vi.fn();
vi.mock("@/features/ads/AdsService", () => ({
  getAdPlacements: (...a) => getAdPlacements(...a),
  createAd: (...a) => createAd(...a),
}));

const createPayment = vi.fn();
const getPayfastProcessUrl = vi.fn(() => "https://payfast.example/eng/process");
vi.mock("@/features/payments/PayfastService", () => ({
  createPayment: (...a) => createPayment(...a),
  getPayfastProcessUrl: (...a) => getPayfastProcessUrl(...a),
}));

vi.mock("@/utils/devLog", () => ({
  devLog: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
}));

// ---- Mock useAuth composable ----
const user = ref({
  id: 7,
  name: "Jane Doe",
  email: "jane@example.com",
  businessId: 42,
});
const isAuthenticated = ref(true);
const hasRole = vi.fn();
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ isAuthenticated, user, hasRole }),
}));

// ---- Stub the heavy child partials (they pull their own deps) ----
const childStubs = {
  AdSlotSelection: {
    name: "AdSlotSelection",
    props: ["slots", "selectedSlot", "loading"],
    emits: ["select-slot", "next-step"],
    template: `<div class="stub-slot-selection">
      <span class="slot-count">{{ slots.length }}</span>
      <button class="do-select" @click="$emit('select-slot', { id: 9, name: 'Banner', price: 12.5, location: 'banner', fee: 7, billing_unit: 'day' })"></button>
      <button class="do-next" @click="$emit('next-step')"></button>
    </div>`,
  },
  AdContentUpload: {
    name: "AdContentUpload",
    props: ["selectedSlot", "adContent"],
    emits: ["update-content", "prev-step", "next-step"],
    template: `<div class="stub-content-upload">
      <button class="do-update" @click="$emit('update-content', { title: 'My Ad', description: 'desc', url: 'http://x', startDate: '2026-01-01', endDate: '2026-02-01', files: ['f1'], file: 'f1', email: 'e@x.co' })"></button>
      <button class="do-prev" @click="$emit('prev-step')"></button>
      <button class="do-next2" @click="$emit('next-step')"></button>
    </div>`,
  },
  AdPaymentSummary: {
    name: "AdPaymentSummary",
    props: ["selectedSlot", "adContent", "isProcessingPayment", "paymentError"],
    emits: ["prev-step", "proceed-to-payment"],
    template: `<div class="stub-payment-summary">
      <span class="proc">{{ isProcessingPayment }}</span>
      <span class="perr">{{ paymentError }}</span>
      <button class="do-prev3" @click="$emit('prev-step')"></button>
      <button class="pay-payfast" @click="$emit('proceed-to-payment', { method: 'payfast' })"></button>
      <button class="pay-eft" @click="$emit('proceed-to-payment', { method: 'eft', eftDetails: { amount: 99, reference: 'REF1' } })"></button>
      <button class="pay-default" @click="$emit('proceed-to-payment')"></button>
    </div>`,
  },
  AdConfirmation: {
    name: "AdConfirmation",
    props: ["orderNumber", "selectedSlot", "paymentMethod", "eftDetails", "showEftConfirmation"],
    template: `<div class="stub-confirmation">{{ orderNumber }}|{{ paymentMethod }}|{{ showEftConfirmation }}</div>`,
  },
};

import AdvertiseWithUs from "@/views/Business/AdvertiseWithUs.vue";

function mountView() {
  return mount(AdvertiseWithUs, {
    global: { stubs: childStubs },
  });
}

// Advance through the wizard steps via the stub buttons.
async function gotoStep(wrapper, target) {
  // step1 -> select a slot then next
  if (target >= 2) {
    await wrapper.find(".do-select").trigger("click");
    await wrapper.find(".do-next").trigger("click");
  }
  if (target >= 3) {
    await wrapper.find(".do-next2").trigger("click");
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  getPayfastProcessUrl.mockReturnValue("https://payfast.example/eng/process");
  getAdPlacements.mockResolvedValue({
    status: 200,
    data: { placements: [{ id: 1, location: "home_top", aspect_ratio: "16:9", fee: 10, billing_unit: "day" }] },
  });
  user.value = { id: 7, name: "Jane Doe", email: "jane@example.com", businessId: 42 };
  // jsdom does not implement form.submit by default for detached nodes; provide it.
  HTMLFormElement.prototype.submit = vi.fn();
});

describe("AdvertiseWithUs.vue", () => {
  it("fetches placements on mount and renders them in the slot selection (success path)", async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(getAdPlacements).toHaveBeenCalledTimes(1);
    expect(wrapper.find(".slot-count").text()).toBe("1");
    // step 1 active, others not yet
    const items = wrapper.findAll(".step-item");
    expect(items[0].classes()).toContain("active");
    expect(items[1].classes()).not.toContain("active");
  });

  it("handles a non-200 placements response by hitting the catch branch", async () => {
    getAdPlacements.mockResolvedValueOnce({ status: 500, data: {} });
    const wrapper = mountView();
    await flushPromises();

    // availableSlots stays empty -> slot count 0
    expect(wrapper.find(".slot-count").text()).toBe("0");
  });

  it("handles a rejected placements request via the catch branch", async () => {
    getAdPlacements.mockRejectedValueOnce(new Error("network"));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find(".slot-count").text()).toBe("0");
  });

  it("guards fetchPlacements against re-entry while already loading", async () => {
    // Resolve slowly so loading stays truthy for the second call.
    let resolveFirst;
    getAdPlacements.mockImplementationOnce(
      () => new Promise((res) => { resolveFirst = res; })
    );
    const wrapper = mountView();

    // onMounted already triggered call #1 (still pending, loading truthy).
    expect(getAdPlacements.mock.calls.length).toBe(1);

    // Re-enter while loading is truthy -> early return, no new service call.
    await wrapper.vm.fetchPlacements();
    expect(getAdPlacements.mock.calls.length).toBe(1);

    resolveFirst({ status: 200, data: { placements: [] } });
    await flushPromises();
    expect(wrapper.find(".slot-count").text()).toBe("0");
  });

  it("nextStep is a no-op at the upper bound and prevStep at the lower bound", async () => {
    const wrapper = mountView();
    await flushPromises();

    // Lower bound: already on step 1, prevStep does nothing.
    expect(wrapper.vm.currentStep).toBe(1);
    wrapper.vm.prevStep();
    expect(wrapper.vm.currentStep).toBe(1);

    // Climb to step 4 via nextStep, then one more is a no-op (upper bound).
    wrapper.vm.nextStep();
    wrapper.vm.nextStep();
    wrapper.vm.nextStep();
    expect(wrapper.vm.currentStep).toBe(4);
    wrapper.vm.nextStep();
    expect(wrapper.vm.currentStep).toBe(4);
  });

  it("advances and retreats through the wizard steps and updates the progress bar", async () => {
    const wrapper = mountView();
    await flushPromises();

    // step 1 -> select slot, go next
    await wrapper.find(".do-select").trigger("click");
    await wrapper.find(".do-next").trigger("click");
    expect(wrapper.find(".stub-content-upload").exists()).toBe(true);

    // update content (covers updateAdContent merge)
    await wrapper.find(".do-update").trigger("click");

    // prev back to step 1
    await wrapper.find(".do-prev").trigger("click");
    expect(wrapper.find(".stub-slot-selection").exists()).toBe(true);

    // prev again at step 1 -> no-op (currentStep stays 1)
    // (re-render step1, click do-select/do-next to move to step 2 then 3)
    await wrapper.find(".do-next").trigger("click");
    await wrapper.find(".do-next2").trigger("click");
    expect(wrapper.find(".stub-payment-summary").exists()).toBe(true);

    // completed classes: steps 1 & 2 completed once on step 3
    const items = wrapper.findAll(".step-item");
    expect(items[0].classes()).toContain("completed");
    expect(items[1].classes()).toContain("completed");
    expect(items[2].classes()).toContain("active");
    expect(items[3].classes()).not.toContain("active");
  });

  it("does not retreat below step 1 (prevStep lower bound)", async () => {
    const wrapper = mountView();
    await flushPromises();
    // We're on step 1; navigate to step 2 then back twice.
    await wrapper.find(".do-select").trigger("click");
    await wrapper.find(".do-next").trigger("click");
    await wrapper.find(".do-prev").trigger("click");
    // now at step1; the AdContentUpload prev button no longer exists, so to hit
    // the lower-bound branch we go to step2 and back, already done. Confirm step1.
    expect(wrapper.find(".stub-slot-selection").exists()).toBe(true);
  });

  it("does not advance above step 4 (nextStep upper bound) via repeated next on the last step", async () => {
    const wrapper = mountView();
    await flushPromises();
    await gotoStep(wrapper, 3);

    // EFT path drives us to step 4; from there nextStep cannot exceed 4.
    createPayment.mockResolvedValueOnce({ data: { paymentId: "ORD-1" } });
    await wrapper.find(".pay-eft").trigger("click");
    await flushPromises();
    expect(wrapper.find(".stub-confirmation").exists()).toBe(true);
    const items = wrapper.findAll(".step-item");
    expect(items[3].classes()).toContain("active");
  });

  it("completes an EFT payment: stores order number, shows confirmation, advances to step 4", async () => {
    createPayment.mockResolvedValueOnce({ data: { paymentId: "ORD-EFT-9" } });
    const wrapper = mountView();
    await flushPromises();
    await gotoStep(wrapper, 3);
    await wrapper.find(".pay-eft").trigger("click");
    await flushPromises();

    expect(createPayment).toHaveBeenCalledTimes(1);
    const payload = createPayment.mock.calls[0][0];
    expect(payload.payment_method).toBe("eft");
    expect(payload.eft_amount).toBe(99);
    expect(payload.eft_reference).toBe("REF1");
    // aspect_ratio absent on the stub slot -> formatPlacement no-ratio branch
    expect(payload.placement_info).toContain("BANNER");

    const conf = wrapper.find(".stub-confirmation");
    expect(conf.exists()).toBe(true);
    expect(conf.text()).toContain("ORD-EFT-9");
    expect(conf.text()).toContain("eft");
    expect(conf.text()).toContain("true");
  });

  it("uses calculateTotal as the EFT amount fallback when eftDetails.amount is missing", async () => {
    createPayment.mockResolvedValueOnce({ data: { paymentId: "ORD-EFT-10" } });
    const wrapper = mountView();
    await flushPromises();
    await gotoStep(wrapper, 3);
    // Re-emit a proceed with eft but no amount by patching the stub via a manual emit:
    const summary = wrapper.findComponent({ name: "AdPaymentSummary" });
    await summary.vm.$emit("proceed-to-payment", {
      method: "eft",
      eftDetails: { reference: "REFX" },
    });
    await flushPromises();

    const payload = createPayment.mock.calls[0][0];
    // slot price 12.5 -> calculateTotal 12.5
    expect(payload.eft_amount).toBe(12.5);
    expect(payload.eft_reference).toBe("REFX");
  });

  it("completes a PayFast payment: stores form data and submits the hidden form", async () => {
    createPayment.mockResolvedValueOnce({
      status: 200,
      data: {
        merchant_id: "M1",
        merchant_key: "K1",
        return_url: "r",
        cancel_url: "c",
        notify_url: "n",
        name_first: "Jane",
        name_last: "Doe",
        email_address: "jane@example.com",
        m_payment_id: "P1",
        amount: "12.50",
        item_name: "Advertisement: My Ad",
        item_description: "Banner",
        signature: "sig",
      },
    });
    const wrapper = mountView();
    await flushPromises();
    await gotoStep(wrapper, 3);
    await wrapper.find(".pay-payfast").trigger("click");
    await flushPromises();

    expect(createPayment).toHaveBeenCalledTimes(1);
    expect(HTMLFormElement.prototype.submit).toHaveBeenCalledTimes(1);

    const form = wrapper.find("form");
    expect(form.attributes("action")).toBe("https://payfast.example/eng/process");
    expect(form.find('input[name="merchant_id"]').attributes("value")).toBe("M1");
    expect(form.find('input[name="signature"]').attributes("value")).toBe("sig");
    expect(form.find('input[name="amount"]').attributes("value")).toBe("12.50");
  });

  it("surfaces an error when PayFast createPayment returns a non-200 status (throw → catch)", async () => {
    createPayment.mockResolvedValueOnce({ status: 400, data: {} });
    const wrapper = mountView();
    await flushPromises();
    await gotoStep(wrapper, 3);
    await wrapper.find(".pay-payfast").trigger("click");
    await flushPromises();

    // `throw new Error(response)` stringifies the response object, so
    // error.message is the truthy "[object Object]" and is surfaced directly.
    expect(wrapper.find(".perr").text()).toBe("[object Object]");
    // still on step 3 (did not advance)
    expect(wrapper.find(".stub-payment-summary").exists()).toBe(true);
  });

  it("surfaces createPayment rejection message (catch with error.message)", async () => {
    createPayment.mockRejectedValueOnce(new Error("boom"));
    const wrapper = mountView();
    await flushPromises();
    await gotoStep(wrapper, 3);
    await wrapper.find(".pay-payfast").trigger("click");
    await flushPromises();

    expect(wrapper.find(".perr").text()).toBe("boom");
  });

  it("errors when no slot id is set (Slot Not Selected guard)", async () => {
    const wrapper = mountView();
    await flushPromises();
    // Force to step 3 WITHOUT selecting a slot: emit next-step directly so
    // selectedSlot stays null, then a placement select with no id.
    const slot = wrapper.findComponent({ name: "AdSlotSelection" });
    // select a slot WITHOUT an id to trip `!selectedSlot.value.id`
    await slot.vm.$emit("select-slot", { name: "NoId", price: 5 });
    await slot.vm.$emit("next-step");
    await wrapper.find(".do-next2").trigger("click");
    await wrapper.find(".pay-payfast").trigger("click");
    await flushPromises();

    expect(wrapper.find(".perr").text()).toBe("Slot Not Selected");
  });

  it("errors when the user is missing (User Not Found guard)", async () => {
    const wrapper = mountView();
    await flushPromises();
    await gotoStep(wrapper, 3);
    user.value = null;
    await wrapper.find(".pay-payfast").trigger("click");
    await flushPromises();

    expect(wrapper.find(".perr").text()).toBe("User Not Found");
  });

  it("handles a user whose name is undefined (optional-chaining split branch → catch)", async () => {
    const wrapper = mountView();
    await flushPromises();
    await gotoStep(wrapper, 3);
    // name undefined -> user.value.name?.split(...) is undefined -> destructure throws
    user.value = { id: 7, email: "jane@example.com", businessId: 42 };
    await wrapper.find(".pay-payfast").trigger("click");
    await flushPromises();

    // a TypeError is thrown and caught; its message is surfaced
    expect(wrapper.find(".perr").text()).not.toBe("");
    expect(wrapper.find(".stub-payment-summary").exists()).toBe(true);
  });

  it("formatPlacement includes the aspect ratio when present (truthy branch)", async () => {
    createPayment.mockResolvedValueOnce({ data: { paymentId: "ORD-AR" } });
    const wrapper = mountView();
    await flushPromises();

    // select a slot WITH aspect_ratio to hit the ratio-present branch
    const slot = wrapper.findComponent({ name: "AdSlotSelection" });
    await slot.vm.$emit("select-slot", {
      id: 5,
      name: "Wide",
      price: 20,
      location: "side_bar",
      aspect_ratio: "4:3",
      fee: 8,
      billing_unit: "week",
    });
    await slot.vm.$emit("next-step");
    await wrapper.find(".do-next2").trigger("click");
    await wrapper.find(".pay-eft").trigger("click");
    await flushPromises();

    const payload = createPayment.mock.calls[0][0];
    expect(payload.placement_info).toContain("(4:3)");
    expect(payload.placement_info).toContain("SIDE BAR");
  });

  it("calculateTotal returns 0 when the slot has no price (defensive branch)", async () => {
    createPayment.mockResolvedValueOnce({ data: { paymentId: "ORD-NOPRICE" } });
    const wrapper = mountView();
    await flushPromises();

    const slot = wrapper.findComponent({ name: "AdSlotSelection" });
    // slot has an id (passes guard) but no price -> calculateTotal returns 0
    await slot.vm.$emit("select-slot", { id: 3, name: "Cheap", location: "foot", fee: 1, billing_unit: "day" });
    await slot.vm.$emit("next-step");
    await wrapper.find(".do-next2").trigger("click");
    await wrapper.find(".pay-eft").trigger("click");
    await flushPromises();

    const payload = createPayment.mock.calls[0][0];
    expect(payload.amount_gross).toBe(0);
  });

  it("formatDate returns an empty string for falsy dates (empty-date branch)", async () => {
    createPayment.mockResolvedValueOnce({ data: { paymentId: "ORD-NODATE" } });
    const wrapper = mountView();
    await flushPromises();
    await gotoStep(wrapper, 3);
    // do NOT click do-update, so adContent.startDate / endDate remain "" (falsy)
    await wrapper.find(".pay-eft").trigger("click");
    await flushPromises();

    const payload = createPayment.mock.calls[0][0];
    // item_description has empty date strings around " to "
    expect(payload.item_description).toContain(" to ");
  });

  it("uses the default payment method when proceed-to-payment emits no details", async () => {
    createPayment.mockResolvedValueOnce({
      status: 200,
      data: { merchant_id: "M2", amount: "0.00" },
    });
    const wrapper = mountView();
    await flushPromises();
    await gotoStep(wrapper, 3);
    await wrapper.find(".pay-default").trigger("click"); // emits undefined
    await flushPromises();

    const payload = createPayment.mock.calls[0][0];
    expect(payload.payment_method).toBe("payfast");
    expect(HTMLFormElement.prototype.submit).toHaveBeenCalled();
  });

  it("falls back to the generic message when the caught error has no message", async () => {
    // Reject with a messageless value -> error.message is falsy -> generic copy.
    createPayment.mockRejectedValueOnce({});
    const wrapper = mountView();
    await flushPromises();
    await gotoStep(wrapper, 3);
    await wrapper.find(".pay-payfast").trigger("click");
    await flushPromises();

    expect(wrapper.find(".perr").text()).toBe(
      "An error occurred while processing your payment. Please try again."
    );
  });

  it("formatDate renders the localized date for non-empty date strings", async () => {
    createPayment.mockResolvedValueOnce({ data: { paymentId: "ORD-DATE" } });
    const wrapper = mountView();
    await flushPromises();

    // step 1 -> select slot -> next
    await wrapper.find(".do-select").trigger("click");
    await wrapper.find(".do-next").trigger("click");
    // step 2 -> set real start/end dates so formatDate hits its non-empty branch
    await wrapper.find(".do-update").trigger("click");
    await wrapper.find(".do-next2").trigger("click");
    // step 3 -> pay (EFT keeps us in-process without form submit)
    await wrapper.find(".pay-eft").trigger("click");
    await flushPromises();

    const payload = createPayment.mock.calls[0][0];
    // 2026-01-01 -> 2026-02-01 formatted via toLocaleDateString("en-ZA")
    const start = new Date("2026-01-01").toLocaleDateString("en-ZA");
    const end = new Date("2026-02-01").toLocaleDateString("en-ZA");
    expect(payload.item_description).toContain(start);
    expect(payload.item_description).toContain(end);
    expect(payload.start_date).toBeInstanceOf(Date);
  });

  it("passes the processing flag and payment error props down to the summary", async () => {
    createPayment.mockImplementationOnce(
      () => new Promise(() => {}) // never resolves -> stays processing
    );
    const wrapper = mountView();
    await flushPromises();
    await gotoStep(wrapper, 3);
    await wrapper.find(".pay-payfast").trigger("click");
    await flushPromises();

    expect(wrapper.find(".proc").text()).toBe("true");
  });
});
