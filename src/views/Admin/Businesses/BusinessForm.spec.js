import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock every external boundary the SFC imports ---------------------------

// BusinessesService -> only createBusiness / editBusiness are consumed.
const createBusiness = vi.fn();
const editBusiness = vi.fn();
vi.mock("@/features/businesses/BusinessesService", () => ({
  createBusiness: (...args) => createBusiness(...args),
  editBusiness: (...args) => editBusiness(...args),
}));

// ImagePicker is imported but never rendered; stub it to avoid heavy deps.
vi.mock("@/components/ImagePicker.vue", () => ({
  default: { name: "ImagePicker", template: "<div />" },
}));

import BusinessForm from "@/views/Admin/Businesses/BusinessForm.vue";

function mountForm(props = {}) {
  return mount(BusinessForm, {
    props,
    global: {
      stubs: { ImagePicker: true },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BusinessForm.vue", () => {
  it("renders the create state when no business prop is provided (isEdit=false branches)", async () => {
    const wrapper = mountForm();
    await flushPromises();

    // Heading ternary -> "Create New Business"
    expect(wrapper.find("h3").text()).toBe("Create New Business");

    // Close button visible because isSubmitting is false (v-if="!isSubmitting" true)
    expect(wrapper.find("button.btn-close").exists()).toBe(true);

    // Submit button shows the v-else span with "Create"
    const submit = wrapper.find("button.btn-success");
    expect(submit.text()).toBe("Create");
    expect(submit.attributes("disabled")).toBeUndefined();
    expect(wrapper.find(".spinner-border").exists()).toBe(false);

    // onMounted else-branch resets form to initialData -> empty fields.
    expect(wrapper.find("#name").element.value).toBe("");
    expect(wrapper.find("#email").element.value).toBe("");
    expect(wrapper.find("#phone").element.value).toBe("");
    expect(wrapper.find("#location").element.value).toBe("");
  });

  it("renders the edit state and populates the form when a business prop is provided (isEdit=true branches)", async () => {
    const business = {
      id: 7,
      name: "Acme Corp",
      email: "acme@example.com",
      phone: "0123456789",
      location: "Cape Town",
    };
    const wrapper = mountForm({ business });
    await flushPromises();

    // Heading ternary -> "Edit Business"
    expect(wrapper.find("h3").text()).toBe("Edit Business");

    // Submit button shows "Update"
    expect(wrapper.find("button.btn-success").text()).toBe("Update");

    // onMounted/watch edit-branch populated form from props.business.
    expect(wrapper.find("#name").element.value).toBe("Acme Corp");
    expect(wrapper.find("#email").element.value).toBe("acme@example.com");
    expect(wrapper.find("#phone").element.value).toBe("0123456789");
    expect(wrapper.find("#location").element.value).toBe("Cape Town");
  });

  it("creates a business on submit (success path) and emits add-business + close", async () => {
    // Hold the create call open so we can assert the mid-submit render state.
    let resolveCreate;
    createBusiness.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      })
    );
    const wrapper = mountForm();
    await flushPromises();

    await wrapper.find("#name").setValue("New Biz");
    await wrapper.find("#email").setValue("new@biz.com");
    await wrapper.find("#phone").setValue("0820000000");
    await wrapper.find("#location").setValue("Joburg");
    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    // While submitting: spinner shown (v-if), close button hidden (v-if="!isSubmitting"),
    // submit button disabled.
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.find("button.btn-close").exists()).toBe(false);
    expect(wrapper.find("button.btn-success").attributes("disabled")).toBeDefined();

    resolveCreate({ data: { id: 1, name: "New Biz" } });
    await flushPromises();

    // createBusiness called with the form payload + default password (not editBusiness).
    expect(createBusiness).toHaveBeenCalledTimes(1);
    expect(createBusiness.mock.calls[0][0]).toEqual({
      name: "New Biz",
      email: "new@biz.com",
      phone: "0820000000",
      location: "Joburg",
      password: "password",
    });
    expect(editBusiness).not.toHaveBeenCalled();

    // add-business emitted with response.data, then close emitted.
    expect(wrapper.emitted("add-business")).toBeTruthy();
    expect(wrapper.emitted("add-business")[0]).toEqual([{ id: 1, name: "New Biz" }]);
    expect(wrapper.emitted("close")).toBeTruthy();

    // finally re-enabled the form.
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.find("button.btn-close").exists()).toBe(true);
  });

  it("edits a business on submit (success path) and emits update-business + close", async () => {
    editBusiness.mockResolvedValue({ data: { id: 9, name: "Edited" } });
    const business = {
      id: 9,
      name: "Original",
      email: "orig@biz.com",
      phone: "0110000000",
      location: "Durban",
    };
    const wrapper = mountForm({ business });
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    // editBusiness called with props.business.id + payload (not createBusiness).
    expect(editBusiness).toHaveBeenCalledTimes(1);
    expect(editBusiness.mock.calls[0][0]).toBe(9);
    expect(editBusiness.mock.calls[0][1]).toEqual({
      name: "Original",
      email: "orig@biz.com",
      phone: "0110000000",
      location: "Durban",
    });
    expect(createBusiness).not.toHaveBeenCalled();

    // update-business emitted with response.data, close emitted.
    expect(wrapper.emitted("update-business")).toBeTruthy();
    expect(wrapper.emitted("update-business")[0]).toEqual([{ id: 9, name: "Edited" }]);
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("handles a rejected save (catch branch) by logging the error and alerting", async () => {
    const err = new Error("network");
    createBusiness.mockRejectedValue(err);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const wrapper = mountForm();
    await flushPromises();

    await wrapper.find("#name").setValue("Boom");
    await wrapper.find("#email").setValue("boom@biz.com");
    await wrapper.find("#phone").setValue("0000000000");
    await wrapper.find("#location").setValue("Nowhere");
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    // catch branch: console.error + alert, and no success emissions.
    expect(errorSpy).toHaveBeenCalledWith("Failed to save business", err);
    expect(alertSpy).toHaveBeenCalledWith("There was an error saving the business.");
    expect(wrapper.emitted("add-business")).toBeFalsy();
    expect(wrapper.emitted("close")).toBeFalsy();

    // finally re-enabled the form even on failure.
    expect(wrapper.find("button.btn-success").attributes("disabled")).toBeUndefined();
    expect(wrapper.find(".spinner-border").exists()).toBe(false);

    errorSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it("emits close when the header close button is clicked", async () => {
    const wrapper = mountForm();
    await flushPromises();

    await wrapper.find("button.btn-close").trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("emits close when the Cancel button is clicked", async () => {
    const wrapper = mountForm();
    await flushPromises();

    await wrapper.find("button.btn-outline-secondary").trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("re-runs the watch when the business prop changes from null to an object and back", async () => {
    const wrapper = mountForm();
    await flushPromises();

    // null -> object : isEdit becomes true, watch populates form.
    await wrapper.setProps({
      business: {
        id: 3,
        name: "Watched",
        email: "watch@biz.com",
        phone: "0997654321",
        location: "Pretoria",
      },
    });
    await flushPromises();
    expect(wrapper.find("h3").text()).toBe("Edit Business");
    expect(wrapper.find("#name").element.value).toBe("Watched");

    // object -> null : isEdit becomes false, watch resets to initialData.
    await wrapper.setProps({ business: null });
    await flushPromises();
    expect(wrapper.find("h3").text()).toBe("Create New Business");
    expect(wrapper.find("#name").element.value).toBe("");
  });

  it("updateIsUpdate sets the imageUpdated flag", async () => {
    const wrapper = mountForm();
    await flushPromises();

    // updateIsUpdate is exposed but not wired into the template; call it directly.
    wrapper.vm.updateIsUpdate(true);
    expect(wrapper.vm.imageUpdated).toBe(true);
    wrapper.vm.updateIsUpdate(false);
    expect(wrapper.vm.imageUpdated).toBe(false);
  });
});
