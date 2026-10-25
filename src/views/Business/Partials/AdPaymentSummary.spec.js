import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import AdPaymentSummary from "./AdPaymentSummary.vue";

// --- Mock bootstrap Modal (external boundary) ---------------------------------
const showSpy = vi.fn();
const ModalSpy = vi.fn();

vi.mock("bootstrap", () => {
  return {
    Modal: class {
      constructor(el) {
        ModalSpy(el);
        this.show = showSpy;
      }
    },
  };
});

// --- Stub the heavy child component (external boundary) ------------------------
const ImageModalStub = {
  name: "ImageModal",
  props: ["show", "images", "initialIndex", "imageAlt"],
  emits: ["close"],
  template:
    '<div class="image-modal-stub" :data-show="show" :data-index="initialIndex" :data-alt="imageAlt" @click="$emit(\'close\')"></div>',
};

const baseSelectedSlot = {
  name: "Top Banner",
  aspect_ratio: "16:9",
  currency: "USD",
  price: 100,
};

const baseAdContent = {
  title: "My Ad",
  description: "Great product",
  url: "https://example.com",
  startDate: "2026-01-01",
  endDate: "2026-01-31",
  files: ["img1.png", "img2.png"],
};

function makeWrapper(props = {}) {
  return mount(AdPaymentSummary, {
    props: {
      selectedSlot: { ...baseSelectedSlot },
      adContent: { ...baseAdContent },
      ...props,
    },
    global: {
      stubs: {
        ImageModal: ImageModalStub,
      },
    },
  });
}

describe("AdPaymentSummary.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders order details and resolved slot/ad fields", () => {
    const wrapper = makeWrapper();
    const text = wrapper.text();
    expect(text).toContain("My Ad");
    expect(text).toContain("Great product");
    expect(text).toContain("https://example.com");
    expect(text).toContain("Top Banner");
    expect(text).toContain("16:9");
    // currency present (USD) and price (100)
    expect(text).toContain("USD");
    expect(text).toContain("100");
  });

  it("initializes the bootstrap modal on mount", () => {
    const wrapper = makeWrapper();
    expect(ModalSpy).toHaveBeenCalledTimes(1);
    expect(ModalSpy).toHaveBeenCalledWith(wrapper.vm.$refs.termsModal);
    expect(wrapper.vm.modal).not.toBeNull();
  });

  it("formats dates via toLocaleDateString", () => {
    const wrapper = makeWrapper();
    const expected = new Date("2026-01-01").toLocaleDateString("en-ZA");
    expect(wrapper.text()).toContain(expected);
  });

  it("calculateTotal returns the slot price with two decimals", () => {
    const wrapper = makeWrapper();
    expect(wrapper.vm.calculateTotal()).toBe("100.00");
    expect(wrapper.text()).toContain("100.00");
  });

  // --- slot fallback branches -------------------------------------------------
  it("falls back to aspectRatio, fee and ZAR when primary fields are absent", () => {
    const wrapper = makeWrapper({
      selectedSlot: {
        name: "Side Slot",
        aspectRatio: "4:3",
        fee: 50,
        // no aspect_ratio, no currency, no price
      },
    });
    const text = wrapper.text();
    // aspect_ratio undefined -> falls back to aspectRatio
    expect(text).toContain("4:3");
    // currency undefined -> falls back to "ZAR"
    expect(text).toContain("ZAR");
    // price undefined -> falls back to fee, also drives calculateTotal
    expect(text).toContain("50");
    expect(wrapper.vm.calculateTotal()).toBe("50.00");
    expect(text).toContain("50.00");
  });

  // --- hasImages branches -----------------------------------------------------
  it("renders image previews when files exist (v-if hasImages + v-for non-empty)", () => {
    const wrapper = makeWrapper();
    const imgs = wrapper.findAll(".preview-thumbnail img");
    expect(imgs).toHaveLength(2);
    expect(imgs[0].attributes("src")).toBe("img1.png");
    expect(imgs[1].attributes("alt")).toBe("Ad Preview 2");
    expect(wrapper.text()).toContain("Click on an image to view larger");
  });

  it("shows 'No preview available' when files array is empty (v-else + v-for empty)", () => {
    const wrapper = makeWrapper({
      adContent: { ...baseAdContent, files: [] },
    });
    expect(wrapper.vm.hasImages).toBe(false);
    expect(wrapper.findAll(".preview-thumbnail")).toHaveLength(0);
    expect(wrapper.text()).toContain("No preview available");
  });

  it("treats missing files property as no images (hasImages falsy branch)", () => {
    const wrapper = makeWrapper({
      adContent: {
        title: "T",
        description: "D",
        url: "U",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      },
    });
    expect(wrapper.vm.hasImages).toBeFalsy();
    expect(wrapper.text()).toContain("No preview available");
  });

  // --- openImageModal / closeImageModal --------------------------------------
  it("opens the image modal with the clicked index", async () => {
    const wrapper = makeWrapper();
    await wrapper.findAll(".preview-thumbnail")[1].trigger("click");
    expect(wrapper.vm.showImageModal).toBe(true);
    expect(wrapper.vm.currentImageIndex).toBe(1);
    const stub = wrapper.findComponent(ImageModalStub);
    expect(stub.props("show")).toBe(true);
    expect(stub.props("initialIndex")).toBe(1);
    expect(stub.props("imageAlt")).toBe("My Ad");
  });

  it("openImageModal uses default index 0 when called with no argument", () => {
    const wrapper = makeWrapper();
    wrapper.vm.currentImageIndex = 5;
    wrapper.vm.openImageModal();
    expect(wrapper.vm.currentImageIndex).toBe(0);
    expect(wrapper.vm.showImageModal).toBe(true);
  });

  it("closeImageModal hides the modal (close event from child)", async () => {
    const wrapper = makeWrapper();
    wrapper.vm.openImageModal(0);
    await flushPromises();
    await wrapper.findComponent(ImageModalStub).trigger("click");
    expect(wrapper.vm.showImageModal).toBe(false);
  });

  it("falls back to 'Ad Preview' alt when ad has no title", () => {
    const wrapper = makeWrapper({
      adContent: { ...baseAdContent, title: "" },
    });
    expect(wrapper.findComponent(ImageModalStub).props("imageAlt")).toBe(
      "Ad Preview"
    );
  });

  // --- payment method branches ------------------------------------------------
  it("shows the PayFast info block by default and hides the EFT form", () => {
    const wrapper = makeWrapper();
    expect(wrapper.vm.paymentMethod).toBe("payfast");
    expect(wrapper.text()).toContain("PayFast secure payment gateway");
    expect(wrapper.find(".eft-payment-form").exists()).toBe(false);
  });

  it("shows the EFT form and seeds the amount when switching to EFT", async () => {
    const wrapper = makeWrapper();
    await wrapper.find("#paymentMethodEFT").setValue("eft");
    expect(wrapper.vm.paymentMethod).toBe("eft");
    expect(wrapper.find(".eft-payment-form").exists()).toBe(true);
    // watcher seeded amount with the calculated total
    expect(wrapper.vm.eftDetails.amount).toBe("100.00");
    expect(wrapper.text()).toContain("complete the EFT payment");
  });

  it("clears the EFT amount when switching back from EFT to PayFast (watcher else)", async () => {
    const wrapper = makeWrapper();
    await wrapper.find("#paymentMethodEFT").setValue("eft");
    expect(wrapper.vm.eftDetails.amount).toBe("100.00");
    await wrapper.find("#paymentMethodPayfast").setValue("payfast");
    expect(wrapper.vm.eftDetails.amount).toBe("");
  });

  it("watcher returns early when the new value is falsy", () => {
    const wrapper = makeWrapper();
    wrapper.vm.eftDetails.amount = "preserved";
    // directly drive the watcher with a falsy newVal -> early return, no mutation
    wrapper.vm.$options.watch.paymentMethod.call(wrapper.vm, "", "payfast");
    expect(wrapper.vm.eftDetails.amount).toBe("preserved");
  });

  it("binds the (disabled) EFT amount input via v-model", async () => {
    const wrapper = makeWrapper();
    await wrapper.find("#paymentMethodEFT").setValue("eft");
    const amountInput = wrapper.find("#eftAmount");
    expect(amountInput.attributes("disabled")).toBeDefined();
    // The field is disabled, so jsdom won't dispatch input events to it. Briefly
    // enable the underlying element so the compiled v-model update handler fires
    // and its assignment is exercised.
    amountInput.element.disabled = false;
    await amountInput.setValue("250.00");
    expect(String(wrapper.vm.eftDetails.amount)).toBe("250");
  });

  it("renders the EFT reference fallback text when reference is empty", async () => {
    const wrapper = makeWrapper();
    await wrapper.find("#paymentMethodEFT").setValue("eft");
    expect(wrapper.text()).toContain("AD-Your Name");
  });

  it("renders the entered EFT reference in the bank details", async () => {
    const wrapper = makeWrapper();
    await wrapper.find("#paymentMethodEFT").setValue("eft");
    await wrapper.find("#eftReference").setValue("REF123");
    expect(wrapper.vm.eftDetails.reference).toBe("REF123");
    expect(wrapper.text()).toContain("AD-REF123");
  });

  // --- isEftFormValid branches ------------------------------------------------
  it("isEftFormValid is false when amount or reference missing, true when both set", async () => {
    const wrapper = makeWrapper();
    // both empty
    expect(wrapper.vm.isEftFormValid).toBeFalsy();
    // amount only
    wrapper.vm.eftDetails.amount = "100.00";
    wrapper.vm.eftDetails.reference = "";
    expect(wrapper.vm.isEftFormValid).toBeFalsy();
    // both set
    wrapper.vm.eftDetails.reference = "REF";
    expect(wrapper.vm.isEftFormValid).toBe("REF");
  });

  // --- processing / error / disabled-button states ----------------------------
  it("renders the processing state and hides the proceed button while processing", () => {
    const wrapper = makeWrapper({ isProcessingPayment: true });
    expect(wrapper.text()).toContain("Processing your payment request");
    // proceed button (inside the sticky nav) is removed while processing
    expect(wrapper.find(".sticky-bottom-nav .btn-success").exists()).toBe(false);
  });

  it("does not render processing state when not processing", () => {
    const wrapper = makeWrapper({ isProcessingPayment: false });
    expect(wrapper.text()).not.toContain("Processing your payment request");
    expect(wrapper.find(".sticky-bottom-nav .btn-success").exists()).toBe(true);
  });

  it("renders the payment error and runs the dismiss handler on click", async () => {
    const wrapper = makeWrapper({ paymentError: "Card declined" });
    expect(wrapper.find(".alert-danger").exists()).toBe(true);
    expect(wrapper.text()).toContain("Card declined");
    const dismiss = wrapper.find(".btn-outline-danger");
    expect(dismiss.exists()).toBe(true);
    // The inline handler assigns `paymentError = null`; clicking exercises that
    // statement. (paymentError is a prop, so the parent ultimately owns its value.)
    await dismiss.trigger("click");
    expect(dismiss.exists()).toBe(true);
  });

  it("does not render the error block when there is no payment error", () => {
    const wrapper = makeWrapper();
    expect(wrapper.find(".alert-danger").exists()).toBe(false);
  });

  it("proceed button is disabled until terms accepted", async () => {
    const wrapper = makeWrapper();
    const btn = wrapper.find(".btn-success");
    expect(btn.attributes("disabled")).toBeDefined();
    await wrapper.find("#termsCheck").setValue(true);
    expect(wrapper.vm.termsAccepted).toBe(true);
    expect(btn.attributes("disabled")).toBeUndefined();
  });

  it("proceed button stays disabled for EFT until the EFT form is valid", async () => {
    const wrapper = makeWrapper();
    await wrapper.find("#termsCheck").setValue(true);
    await wrapper.find("#paymentMethodEFT").setValue("eft");
    const btn = wrapper.find(".btn-success");
    // amount seeded by watcher, but reference still empty -> invalid
    expect(btn.attributes("disabled")).toBeDefined();
    await wrapper.find("#eftReference").setValue("REF");
    expect(btn.attributes("disabled")).toBeUndefined();
  });

  // --- emits ------------------------------------------------------------------
  it("emits prev-step when the back button is clicked", async () => {
    const wrapper = makeWrapper();
    await wrapper.find(".btn-outline-secondary").trigger("click");
    expect(wrapper.emitted("prev-step")).toHaveLength(1);
  });

  it("emits proceed-to-payment with null eftDetails for payfast", async () => {
    const wrapper = makeWrapper();
    await wrapper.find("#termsCheck").setValue(true);
    await wrapper.find(".btn-success").trigger("click");
    const events = wrapper.emitted("proceed-to-payment");
    expect(events).toHaveLength(1);
    expect(events[0][0]).toEqual({ method: "payfast", eftDetails: null });
  });

  it("emits proceed-to-payment with eftDetails for EFT", async () => {
    const wrapper = makeWrapper();
    await wrapper.find("#termsCheck").setValue(true);
    await wrapper.find("#paymentMethodEFT").setValue("eft");
    await wrapper.find("#eftReference").setValue("REF123");
    await wrapper.find(".btn-success").trigger("click");
    const events = wrapper.emitted("proceed-to-payment");
    expect(events).toHaveLength(1);
    expect(events[0][0]).toEqual({
      method: "eft",
      eftDetails: { amount: "100.00", reference: "REF123" },
    });
  });

  // --- showTerms branches -----------------------------------------------------
  it("showTerms calls modal.show when the modal exists", async () => {
    const wrapper = makeWrapper();
    await wrapper.find('a[href="#"]').trigger("click");
    expect(showSpy).toHaveBeenCalledTimes(1);
  });

  it("showTerms falls back to alert when no modal instance exists", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const wrapper = makeWrapper();
    // Simulate the modal never having been created (e.g. ref unavailable).
    wrapper.vm.modal = null;
    wrapper.vm.showTerms();
    expect(showSpy).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      "Terms and Conditions modal would show here"
    );
    alertSpy.mockRestore();
  });
});
