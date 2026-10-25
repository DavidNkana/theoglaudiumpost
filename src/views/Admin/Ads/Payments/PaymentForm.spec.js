import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock external service boundaries -------------------------------------
const createPayment = vi.fn();
const updatePayment = vi.fn();
const getBusinesses = vi.fn();

vi.mock("@/features/payments/PaymentsService", () => ({
  createPayment: (...args) => createPayment(...args),
  updatePayment: (...args) => updatePayment(...args),
}));

vi.mock("@/features/businesses/BusinessesService", () => ({
  getBusinesses: (...args) => getBusinesses(...args),
}));

import PaymentForm from "@/views/Admin/Ads/Payments/PaymentForm.vue";

const BUSINESSES = [
  { id: 1, name: "Acme Co" },
  { id: 2, name: "Beta Ltd" },
];

function mountForm(props = {}) {
  return mount(PaymentForm, { props });
}

// Rendered element order (commented-out fields do not render):
//   inputs:  [0] reference, [1] amount, [2] paymentDate(date),
//            [3] customerName, [4] customerEmail(email)
//   selects: [0] status, [1] businessId, [2] paymentMethod
const IN = {
  reference: (w) => w.findAll("input")[0],
  amount: (w) => w.findAll("input")[1],
  paymentDate: (w) => w.find('input[type="date"]'),
  customerName: (w) => w.findAll("input")[3],
  customerEmail: (w) => w.find('input[type="email"]'),
};
const SEL = {
  status: (w) => w.findAll("select")[0],
  business: (w) => w.findAll("select")[1],
  paymentMethod: (w) => w.findAll("select")[2],
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: getBusinesses resolves with a populated list (status 200).
  getBusinesses.mockResolvedValue({
    status: 200,
    data: { businesses: BUSINESSES },
  });
  createPayment.mockResolvedValue({ data: { id: 99 } });
  updatePayment.mockResolvedValue({ data: { id: 5 } });
  // Silence/observe alert + console used by the component.
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("PaymentForm", () => {
  it("renders create mode (no payment prop), populates business options on fetch success", async () => {
    const wrapper = mountForm();
    await flushPromises();

    // isEdit false branch -> heading + submit label
    expect(wrapper.find("h3").text()).toBe("Create New Payment");
    expect(wrapper.text()).toContain("Create Payment");

    // getBusinesses called with the paging args.
    expect(getBusinesses).toHaveBeenCalledWith({ page: 0, size: 100 });

    // v-for non-empty: one option per business plus the disabled placeholder.
    const businessSelect = SEL.business(wrapper);
    const options = businessSelect.findAll("option");
    expect(options).toHaveLength(BUSINESSES.length + 1);
    expect(options[1].text()).toBe("Acme Co");
    expect(options[2].text()).toBe("Beta Ltd");

    // loadingAds resolved to false -> no loading spinner text shown.
    expect(wrapper.text()).not.toContain("Loading...");
    // Not submitting -> close button (v-if) present.
    expect(wrapper.find("button.btn-close").exists()).toBe(true);
  });

  it("does not populate businesses when the fetch responds with a non-200 status (v-for empty)", async () => {
    getBusinesses.mockResolvedValue({ status: 500, data: { businesses: BUSINESSES } });
    const wrapper = mountForm();
    await flushPromises();

    const businessSelect = SEL.business(wrapper);
    // Only the disabled placeholder option remains (empty v-for list).
    expect(businessSelect.findAll("option")).toHaveLength(1);
    expect(businessSelect.find("option").text()).toBe("-- Select Business --");
  });

  it("handles the fetch rejection (catch branch) and still finishes loading", async () => {
    getBusinesses.mockRejectedValue(new Error("network down"));
    const wrapper = mountForm();
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(
      "Error fetching ads:",
      expect.any(Error)
    );
    // No options populated, loading finished.
    const businessSelect = SEL.business(wrapper);
    expect(businessSelect.findAll("option")).toHaveLength(1);
    expect(wrapper.text()).not.toContain("Loading...");
  });

  it("renders edit mode and maps an EFT payment with all fields present", async () => {
    const payment = {
      id: 7,
      payment_method: "eft",
      eft_reference: "EFT-REF-9",
      pf_payment_id: "PF-IGNORED",
      amount_gross: 250.75,
      status: "COMPLETE",
      created_date: "2025-01-15T10:00:00Z",
      business_id: 2,
      customer_name: "Jane Doe",
      customer_email: "jane@example.com",
      customer_phone: "0123456789",
    };
    const wrapper = mountForm({ payment });
    await flushPromises();

    // isEdit true branch.
    expect(wrapper.find("h3").text()).toBe("Edit Payment");
    expect(wrapper.text()).toContain("Update Payment");

    // EFT ternary true -> reference comes from eft_reference.
    expect(IN.reference(wrapper).element.value).toBe("EFT-REF-9");
    expect(IN.amount(wrapper).element.value).toBe("250.75");

    // status / paymentDate (sliced) / businessId / customer fields applied.
    expect(SEL.status(wrapper).element.value).toBe("COMPLETE");
    expect(IN.paymentDate(wrapper).element.value).toBe("2025-01-15");
    expect(SEL.business(wrapper).element.value).toBe("2");
    expect(IN.customerName(wrapper).element.value).toBe("Jane Doe");
    expect(IN.customerEmail(wrapper).element.value).toBe("jane@example.com");
    // payment method select reflects eft.
    expect(SEL.paymentMethod(wrapper).element.value).toBe("eft");
  });

  it("maps a non-EFT payment and exercises every || fallback (missing fields)", async () => {
    const payment = {
      id: 8,
      // payment_method omitted -> reference ternary false branch + || "eft" default
      eft_reference: "EFT-IGNORED",
      pf_payment_id: "PF-555",
      // amount_gross / status / created_date / business_id / customer_* all missing
    };
    const wrapper = mountForm({ payment });
    await flushPromises();

    // non-eft ternary false (undefined != "eft") -> reference from pf_payment_id.
    expect(IN.reference(wrapper).element.value).toBe("PF-555");
    // amount_gross missing -> || 0
    expect(IN.amount(wrapper).element.value).toBe("0");
    // status missing -> || "PENDING"
    expect(SEL.status(wrapper).element.value).toBe("PENDING");
    // created_date missing -> ?. short-circuits -> || "" empty date
    expect(IN.paymentDate(wrapper).element.value).toBe("");
    // payment_method missing -> || "eft" default.
    expect(SEL.paymentMethod(wrapper).element.value).toBe("eft");
    // customer fields default to "".
    expect(IN.customerName(wrapper).element.value).toBe("");
    expect(IN.customerEmail(wrapper).element.value).toBe("");
  });

  it("watch: switching the payment prop to a new EFT payment re-maps the form", async () => {
    const wrapper = mountForm();
    await flushPromises();

    await wrapper.setProps({
      payment: {
        id: 11,
        payment_method: "eft",
        eft_reference: "EFT-WATCH",
        pf_payment_id: "PF-X",
        amount_gross: 10,
        status: "REFUNDED",
        created_date: "2024-12-01T00:00:00Z",
        business_id: 1,
        customer_name: "Watcher",
        customer_email: "w@x.com",
        customer_phone: "999",
      },
    });
    await flushPromises();

    expect(console.log).toHaveBeenCalledWith("Payment updated:", expect.any(Object));
    expect(wrapper.find("h3").text()).toBe("Edit Payment");
    expect(IN.reference(wrapper).element.value).toBe("EFT-WATCH");
    expect(SEL.status(wrapper).element.value).toBe("REFUNDED");
    expect(IN.paymentDate(wrapper).element.value).toBe("2024-12-01");
  });

  it("watch: a non-EFT payment with missing fields hits the watcher's || fallbacks", async () => {
    const wrapper = mountForm();
    await flushPromises();

    await wrapper.setProps({
      payment: {
        id: 12,
        // payment_method omitted -> ternary false branch + || "eft" default
        pf_payment_id: "PF-WATCH",
        // everything else missing
      },
    });
    await flushPromises();

    expect(IN.reference(wrapper).element.value).toBe("PF-WATCH");
    expect(IN.amount(wrapper).element.value).toBe("0");
    expect(SEL.status(wrapper).element.value).toBe("PENDING");
    expect(IN.paymentDate(wrapper).element.value).toBe("");
    // payment_method missing -> || "eft" default.
    expect(SEL.paymentMethod(wrapper).element.value).toBe("eft");
  });

  it("watch: clearing the payment prop resets the form (else branch)", async () => {
    const wrapper = mountForm({
      payment: {
        id: 13,
        payment_method: "eft",
        eft_reference: "EFT-Z",
        amount_gross: 5,
        status: "COMPLETE",
        created_date: "2025-02-02T00:00:00Z",
        business_id: 1,
        customer_name: "Temp",
      },
    });
    await flushPromises();
    expect(wrapper.find("h3").text()).toBe("Edit Payment");

    await wrapper.setProps({ payment: null });
    await flushPromises();

    // else branch -> form reset to initialData, isEdit false.
    expect(wrapper.find("h3").text()).toBe("Create New Payment");
    expect(IN.reference(wrapper).element.value).toBe("");
    expect(IN.amount(wrapper).element.value).toBe("0");
    expect(SEL.status(wrapper).element.value).toBe("PENDING");
  });

  it("savePayment (create path): builds payload, emits add-payment + close, EFT branches", async () => {
    const wrapper = mountForm();
    await flushPromises();

    // Fill the form: EFT method (default), amount, business, customer, date.
    await IN.reference(wrapper).setValue("EFT-NEW");
    await IN.amount(wrapper).setValue("123.45");
    await SEL.status(wrapper).setValue("COMPLETE");
    await SEL.business(wrapper).setValue(1);
    await IN.customerName(wrapper).setValue("Cust Name");
    await IN.customerEmail(wrapper).setValue("c@d.com");
    // Drives the date input's v-model update handler.
    await IN.paymentDate(wrapper).setValue("2025-06-01");
    expect(IN.paymentDate(wrapper).element.value).toBe("2025-06-01");

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(createPayment).toHaveBeenCalledTimes(1);
    const payload = createPayment.mock.calls[0][0];
    // paymentMethod == "eft": pf_payment_id "" and eft_reference set.
    expect(payload.pf_payment_id).toBe("");
    expect(payload.eft_reference).toBe("EFT-NEW");
    expect(payload.payment_method).toBe("eft");
    expect(payload.status).toBe("COMPLETE");
    expect(payload.business_id).toBe(1);
    expect(payload.eft_amount).toBe(123.45);
    expect(payload.amount_gross).toBe(123.45);
    expect(payload.currency).toBe("ZAR");
    expect(payload.customer_email).toBe("c@d.com");
    expect(payload.customer_name).toBe("Cust Name");
    expect(payload.date).toBeInstanceOf(Date);

    expect(wrapper.emitted("add-payment")).toBeTruthy();
    expect(wrapper.emitted("add-payment")[0]).toEqual([{ id: 99 }]);
    expect(wrapper.emitted("close")).toBeTruthy();
    expect(updatePayment).not.toHaveBeenCalled();
  });

  it("savePayment (create path, payfast): pf_payment_id set and eft_reference empty; amount NaN -> 0", async () => {
    const wrapper = mountForm();
    await flushPromises();

    await IN.reference(wrapper).setValue("PF-NEW");
    // Leave amount empty/invalid so parseFloat -> NaN -> || 0.
    await IN.amount(wrapper).setValue("");
    await SEL.paymentMethod(wrapper).setValue("payfast");

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    const payload = createPayment.mock.calls[0][0];
    // paymentMethod != "eft": pf_payment_id from reference, eft_reference "".
    expect(payload.pf_payment_id).toBe("PF-NEW");
    expect(payload.eft_reference).toBe("");
    expect(payload.payment_method).toBe("payfast");
    // parseFloat("") || 0 -> 0
    expect(payload.eft_amount).toBe(0);
    expect(payload.amount_gross).toBe(0);
  });

  it("savePayment (edit path): calls updatePayment with the payment id and emits update-payment", async () => {
    const payment = {
      id: 42,
      payment_method: "eft",
      eft_reference: "EFT-EDIT",
      amount_gross: 50,
      status: "PENDING",
      created_date: "2025-03-03T00:00:00Z",
      business_id: 1,
      customer_name: "Edit Cust",
    };
    const wrapper = mountForm({ payment });
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(updatePayment).toHaveBeenCalledTimes(1);
    expect(updatePayment.mock.calls[0][0]).toBe(42);
    expect(wrapper.emitted("update-payment")).toBeTruthy();
    expect(wrapper.emitted("update-payment")[0]).toEqual([{ id: 5 }]);
    expect(wrapper.emitted("close")).toBeTruthy();
    expect(createPayment).not.toHaveBeenCalled();
  });

  it("savePayment (error path): rejection triggers catch -> alert, no close emitted", async () => {
    createPayment.mockRejectedValue(new Error("save failed"));
    const wrapper = mountForm();
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(
      "Failed to save payment",
      expect.any(Error)
    );
    expect(window.alert).toHaveBeenCalledWith(
      "There was an error saving the payment."
    );
    expect(wrapper.emitted("close")).toBeFalsy();
    // isSubmitting reset in finally -> submit button re-enabled, close button visible.
    expect(wrapper.find("button.btn-success").attributes("disabled")).toBeUndefined();
    expect(wrapper.find("button.btn-close").exists()).toBe(true);
  });

  it("shows the submitting spinner and hides the header close button while a save is in flight", async () => {
    // Hold createPayment pending so isSubmitting stays true during render.
    let resolveSave;
    createPayment.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    const wrapper = mountForm();
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    // isSubmitting true: spinner v-if shown, header close button v-if hidden.
    expect(wrapper.find(".btn-success .spinner-border").exists()).toBe(true);
    expect(wrapper.find("button.btn-success").attributes("disabled")).toBeDefined();
    expect(wrapper.find("button.btn-close").exists()).toBe(false);
    // The else span (label) is not rendered while submitting.
    expect(wrapper.find("button.btn-success").text()).toBe("");

    resolveSave({ data: { id: 1 } });
    await flushPromises();
    // Back to idle: label visible again.
    expect(wrapper.find("button.btn-success").text()).toBe("Create Payment");
  });

  it("emits close from the header close button and the cancel button", async () => {
    const wrapper = mountForm();
    await flushPromises();

    await wrapper.find("button.btn-close").trigger("click");
    await wrapper.find("button.btn-outline-secondary").trigger("click");

    expect(wrapper.emitted("close")).toHaveLength(2);
  });

  it("shows the loading indicator while the business fetch is in flight (loadingAds v-if)", async () => {
    let resolveFetch;
    getBusinesses.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );
    const wrapper = mountForm();
    await wrapper.vm.$nextTick();

    // loadingAds true -> loading text + spinner rendered.
    expect(wrapper.text()).toContain("Loading...");
    expect(wrapper.find(".form-text .spinner-border").exists()).toBe(true);

    resolveFetch({ status: 200, data: { businesses: BUSINESSES } });
    await flushPromises();
    expect(wrapper.text()).not.toContain("Loading...");
  });
});
