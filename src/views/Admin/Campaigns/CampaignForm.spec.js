import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock external service boundaries -------------------------------------
const createCampaign = vi.fn();
const editCampaign = vi.fn();

vi.mock("@/features/ads/AdsService", () => ({
  createCampaign: (...args) => createCampaign(...args),
  editCampaign: (...args) => editCampaign(...args),
}));

import CampaignForm from "@/views/Admin/Campaigns/CampaignForm.vue";

const BUSINESSES = [
  { id: 1, name: "Acme Co" },
  { id: 2, name: "Beta Ltd" },
];

function mountForm(props = {}) {
  return mount(CampaignForm, { props });
}

// Rendered element order:
//   inputs:  [0] title, [1] transactionRef, [2] startDate(date),
//            [3] endDate(date), [4] isRecurring(checkbox)
//   selects: [0] businessId, [1] paymentStatus
const IN = {
  title: (w) => w.findAll("input")[0],
  transactionRef: (w) => w.findAll("input")[1],
  startDate: (w) => w.findAll('input[type="date"]')[0],
  endDate: (w) => w.findAll('input[type="date"]')[1],
  isRecurring: (w) => w.find('input[type="checkbox"]'),
};
const SEL = {
  business: (w) => w.findAll("select")[0],
  paymentStatus: (w) => w.findAll("select")[1],
};

beforeEach(() => {
  vi.clearAllMocks();
  createCampaign.mockResolvedValue({ data: { id: 99 } });
  editCampaign.mockResolvedValue({ data: { id: 5 } });
  vi.spyOn(window, "alert").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("CampaignForm", () => {
  it("renders create mode (no campaign prop) with empty businesses list (v-for empty)", async () => {
    const wrapper = mountForm();
    await flushPromises();

    // isEdit false branch -> heading + submit label.
    expect(wrapper.find("h3").text()).toBe("Create New Campaign");
    expect(wrapper.text()).toContain("Create Campaign");

    // Not submitting -> header close button (v-if) present, no spinner.
    expect(wrapper.find("button.btn-close").exists()).toBe(true);
    expect(wrapper.find(".btn-success .spinner-border").exists()).toBe(false);

    // businesses defaults to [] -> only the disabled placeholder option.
    const businessOptions = SEL.business(wrapper).findAll("option");
    expect(businessOptions).toHaveLength(1);
    expect(businessOptions[0].text()).toBe("-- Select Business --");

    // Static payment status v-for always renders the 3 statuses + placeholder.
    const statusOptions = SEL.paymentStatus(wrapper).findAll("option");
    expect(statusOptions).toHaveLength(4);
    expect(statusOptions.map((o) => o.text())).toEqual([
      "-- Select --",
      "pending",
      "paid",
      "failed",
    ]);

    // Form starts blank (initialData).
    expect(IN.title(wrapper).element.value).toBe("");
    expect(IN.transactionRef(wrapper).element.value).toBe("");
    expect(IN.isRecurring(wrapper).element.checked).toBe(false);
  });

  it("renders the business options when businesses prop is populated (v-for non-empty)", async () => {
    const wrapper = mountForm({ businesses: BUSINESSES });
    await flushPromises();

    const options = SEL.business(wrapper).findAll("option");
    // placeholder + one per business.
    expect(options).toHaveLength(BUSINESSES.length + 1);
    expect(options[1].text()).toBe("Acme Co");
    expect(options[2].text()).toBe("Beta Ltd");
  });

  it("renders edit mode and maps a fully-populated campaign (onMounted isEdit true)", async () => {
    const campaign = {
      id: 7,
      name: "Summer Sale",
      business_id: 2,
      transaction_ref: "TX-9",
      is_recurring: true,
      payment_status: "paid",
      start_date: "2025-01-15T10:00:00Z",
      end_date: "2025-02-20T10:00:00Z",
    };
    const wrapper = mountForm({ businesses: BUSINESSES, campaign });
    await flushPromises();

    // isEdit true branch -> heading + submit label.
    expect(wrapper.find("h3").text()).toBe("Edit Campaign");
    expect(wrapper.text()).toContain("Update Campaign");

    // Fields mapped from the campaign (?? present, ?.split present).
    expect(IN.title(wrapper).element.value).toBe("Summer Sale");
    expect(SEL.business(wrapper).element.value).toBe("2");
    expect(IN.transactionRef(wrapper).element.value).toBe("TX-9");
    expect(IN.isRecurring(wrapper).element.checked).toBe(true);
    expect(SEL.paymentStatus(wrapper).element.value).toBe("paid");
    expect(IN.startDate(wrapper).element.value).toBe("2025-01-15");
    expect(IN.endDate(wrapper).element.value).toBe("2025-02-20");
  });

  it("edit mode applies ?? and ?. fallbacks when optional campaign fields are missing", async () => {
    const campaign = {
      id: 8,
      name: "Bare",
      business_id: 1,
      transaction_ref: "TX-BARE",
      // is_recurring missing -> ?? false
      // payment_status missing -> ?? "pending"
      // start_date / end_date missing -> ?. short-circuits to undefined
    };
    const wrapper = mountForm({ businesses: BUSINESSES, campaign });
    await flushPromises();

    expect(IN.isRecurring(wrapper).element.checked).toBe(false);
    expect(SEL.paymentStatus(wrapper).element.value).toBe("pending");
    expect(IN.startDate(wrapper).element.value).toBe("");
    expect(IN.endDate(wrapper).element.value).toBe("");
  });

  it("watch: switching campaign prop to a fully-populated campaign re-maps the form", async () => {
    const wrapper = mountForm({ businesses: BUSINESSES });
    await flushPromises();
    expect(wrapper.find("h3").text()).toBe("Create New Campaign");

    await wrapper.setProps({
      campaign: {
        id: 11,
        name: "Watched",
        business_id: 1,
        transaction_ref: "TX-WATCH",
        is_recurring: true,
        payment_status: "failed",
        start_date: "2024-12-01T00:00:00Z",
        end_date: "2024-12-31T00:00:00Z",
      },
    });
    await flushPromises();

    expect(wrapper.find("h3").text()).toBe("Edit Campaign");
    expect(IN.title(wrapper).element.value).toBe("Watched");
    expect(IN.isRecurring(wrapper).element.checked).toBe(true);
    expect(SEL.paymentStatus(wrapper).element.value).toBe("failed");
    expect(IN.startDate(wrapper).element.value).toBe("2024-12-01");
    expect(IN.endDate(wrapper).element.value).toBe("2024-12-31");
  });

  it("watch: a campaign with missing optional fields hits the watcher ?? / ?. fallbacks", async () => {
    const wrapper = mountForm({ businesses: BUSINESSES });
    await flushPromises();

    await wrapper.setProps({
      campaign: {
        id: 12,
        name: "WatchBare",
        business_id: 2,
        transaction_ref: "TX-WB",
        // is_recurring / payment_status / start_date / end_date all missing
      },
    });
    await flushPromises();

    expect(wrapper.find("h3").text()).toBe("Edit Campaign");
    expect(IN.isRecurring(wrapper).element.checked).toBe(false);
    expect(SEL.paymentStatus(wrapper).element.value).toBe("pending");
    expect(IN.startDate(wrapper).element.value).toBe("");
    expect(IN.endDate(wrapper).element.value).toBe("");
  });

  it("watch: clearing the campaign prop resets the form (else branch)", async () => {
    const wrapper = mountForm({
      businesses: BUSINESSES,
      campaign: {
        id: 13,
        name: "ToClear",
        business_id: 1,
        transaction_ref: "TX-CLR",
        is_recurring: true,
        payment_status: "paid",
        start_date: "2025-02-02T00:00:00Z",
        end_date: "2025-03-03T00:00:00Z",
      },
    });
    await flushPromises();
    expect(wrapper.find("h3").text()).toBe("Edit Campaign");

    await wrapper.setProps({ campaign: null });
    await flushPromises();

    // else branch -> isEdit false, form reset to initialData.
    expect(wrapper.find("h3").text()).toBe("Create New Campaign");
    expect(IN.title(wrapper).element.value).toBe("");
    expect(IN.transactionRef(wrapper).element.value).toBe("");
    expect(IN.isRecurring(wrapper).element.checked).toBe(false);
    expect(SEL.paymentStatus(wrapper).element.value).toBe("");
  });

  it("submit (create path): builds payload, emits add-campaign + close", async () => {
    const wrapper = mountForm({ businesses: BUSINESSES });
    await flushPromises();

    await IN.title(wrapper).setValue("New Campaign");
    await SEL.business(wrapper).setValue(1);
    await IN.transactionRef(wrapper).setValue("TX-NEW");
    await SEL.paymentStatus(wrapper).setValue("pending");
    await IN.isRecurring(wrapper).setValue(true);
    await IN.startDate(wrapper).setValue("2025-06-01");
    await IN.endDate(wrapper).setValue("2025-06-30");

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(createCampaign).toHaveBeenCalledTimes(1);
    const payload = createCampaign.mock.calls[0][0];
    expect(payload.name).toBe("New Campaign");
    expect(payload.businessId).toBe(1);
    expect(payload.transactionRef).toBe("TX-NEW");
    expect(payload.isRecurring).toBe(true);
    expect(payload.paymentStatus).toBe("pending");
    expect(payload.status).toBe("pending");
    expect(payload.startDate).toBeInstanceOf(Date);
    expect(payload.endDate).toBeInstanceOf(Date);

    expect(wrapper.emitted("add-campaign")).toBeTruthy();
    expect(wrapper.emitted("add-campaign")[0]).toEqual([{ id: 99 }]);
    expect(wrapper.emitted("close")).toBeTruthy();
    expect(editCampaign).not.toHaveBeenCalled();
  });

  it("submit (edit path): calls editCampaign with the campaign id and emits update-campaign", async () => {
    const campaign = {
      id: 42,
      name: "Editable",
      business_id: 1,
      transaction_ref: "TX-EDIT",
      is_recurring: false,
      payment_status: "paid",
      start_date: "2025-03-03T00:00:00Z",
      end_date: "2025-04-04T00:00:00Z",
    };
    const wrapper = mountForm({ businesses: BUSINESSES, campaign });
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(editCampaign).toHaveBeenCalledTimes(1);
    expect(editCampaign.mock.calls[0][0]).toBe(42);
    expect(wrapper.emitted("update-campaign")).toBeTruthy();
    expect(wrapper.emitted("update-campaign")[0]).toEqual([{ id: 5 }]);
    expect(wrapper.emitted("close")).toBeTruthy();
    expect(createCampaign).not.toHaveBeenCalled();
  });

  it("submit (create path) exercises the ?? fallbacks in the payload (undefined recurring/status)", async () => {
    const wrapper = mountForm({ businesses: BUSINESSES });
    await flushPromises();

    // Force form.value fields to undefined so `?? false` / `?? "pending"` take the right branch.
    wrapper.vm.form.isRecurring = undefined;
    wrapper.vm.form.paymentStatus = undefined;
    await wrapper.vm.$nextTick();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    const payload = createCampaign.mock.calls[0][0];
    expect(payload.isRecurring).toBe(false);
    expect(payload.paymentStatus).toBe("pending");
  });

  it("submit (error path): rejection triggers catch -> alert, no close emitted, re-enables UI", async () => {
    createCampaign.mockRejectedValue(new Error("save failed"));
    const wrapper = mountForm({ businesses: BUSINESSES });
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(
      "Failed to save campaign",
      expect.any(Error)
    );
    expect(window.alert).toHaveBeenCalledWith(
      "There was an error saving the campaign."
    );
    expect(wrapper.emitted("close")).toBeFalsy();
    // isSubmitting reset in finally -> submit button re-enabled, close button visible.
    expect(
      wrapper.find("button.btn-success").attributes("disabled")
    ).toBeUndefined();
    expect(wrapper.find("button.btn-close").exists()).toBe(true);
  });

  it("shows the submitting spinner (v-if) and hides the header close button while a save is in flight", async () => {
    let resolveSave;
    createCampaign.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );
    const wrapper = mountForm({ businesses: BUSINESSES });
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    // isSubmitting true: spinner v-if shown, header close button v-if hidden, label v-else gone.
    expect(wrapper.find(".btn-success .spinner-border").exists()).toBe(true);
    expect(
      wrapper.find("button.btn-success").attributes("disabled")
    ).toBeDefined();
    expect(wrapper.find("button.btn-close").exists()).toBe(false);
    expect(wrapper.find("button.btn-success").text()).toBe("");

    resolveSave({ data: { id: 1 } });
    await flushPromises();
    // Back to idle: label (v-else) visible again.
    expect(wrapper.find("button.btn-success").text()).toBe("Create Campaign");
  });

  it("emits close from the header close button and the cancel button", async () => {
    const wrapper = mountForm({ businesses: BUSINESSES });
    await flushPromises();

    await wrapper.find("button.btn-close").trigger("click");
    await wrapper.find("button.btn-outline-secondary").trigger("click");

    expect(wrapper.emitted("close")).toHaveLength(2);
  });
});
