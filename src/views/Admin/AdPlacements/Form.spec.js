import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// --- Mock the AdsService boundary -------------------------------------------
vi.mock("@/features/ads/AdsService", () => ({
  createAdPlacement: vi.fn(),
  editAdPlacement: vi.fn(),
  getAdPlacement: vi.fn(),
}));

import {
  createAdPlacement,
  editAdPlacement,
  getAdPlacement,
} from "@/features/ads/AdsService";
import Form from "@/views/Admin/AdPlacements/Form.vue";

// Stub the ImagePicker child (it pulls FileReader / heavy DOM deps). We keep an
// `@edit` emitter so the `updateIsUpdate` handler can be driven from the test.
const ImagePickerStub = {
  name: "ImagePicker",
  props: ["modelValue", "initialImage"],
  emits: ["update:modelValue", "edit"],
  template: `<div
    class="image-picker-stub"
    @click="$emit('edit', true)"
    @dblclick="$emit('update:modelValue', 'data:image/png;base64,NEW')"
  ></div>`,
};

const globalConfig = {
  stubs: {
    ImagePicker: ImagePickerStub,
    RouterLink: RouterLinkStub,
  },
};

// Representative edit placement (the parent passes a fully-loaded object).
const fullPlacement = {
  id: 99,
  location: "home_banner",
  description: "Home banner ad",
  image: "data:image/png;base64,AAA",
  fee: "12.50",
  fee_type: "CPM",
  billing_unit: "MONTH",
  aspectRatio: "6:1",
  aspect_ratio: "6:1",
  status: "active",
  is_rotating: true,
};

function mountForm(props = {}) {
  return mount(Form, {
    props,
    global: globalConfig,
  });
}

describe("Admin/AdPlacements/Form.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom has no alert by default; stub it so the catch path doesn't throw.
    vi.stubGlobal("alert", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // -- CREATE mode (no adPlacement prop) -------------------------------------
  it("renders the create state when no adPlacement prop is provided", () => {
    const wrapper = mountForm();

    // h3 ternary -> create label
    expect(wrapper.find("h3").text()).toBe("Create New Ad Placement");
    // submit button else-branch -> "Create"
    expect(wrapper.find(".btn-success").text()).toBe("Create");
    // close button rendered (isSubmitting false)
    expect(wrapper.find(".btn-close").exists()).toBe(true);
    // Location input uses formatAdLocation("") -> ""
    expect(wrapper.find("input[readonly]").element.value).toBe("");
    // Both selects render every v-for option
    const options = wrapper.findAll("option").map((o) => o.text());
    expect(options).toEqual(
      expect.arrayContaining(["FIXED", "CPM", "DAY", "WEEK", "MONTH"])
    );
  });

  it("drives the v-model bindings (image, aspect ratio, enabled checkbox)", async () => {
    createAdPlacement.mockResolvedValue({ data: { id: 3 } });
    const wrapper = mountForm();

    // ImagePicker update:modelValue -> form.imageBase64 setter (line 214)
    await wrapper.findComponent(ImagePickerStub).trigger("dblclick");
    // aspect-ratio text input v-model setter (line 223)
    await wrapper.find('input[type="text"]').setValue("16:9");
    // enabled checkbox v-model setter (line 289)
    const enabled = wrapper.find("#enabled");
    expect(enabled.element.checked).toBe(true); // initialData.enabled = true
    await enabled.setValue(false);
    expect(enabled.element.checked).toBe(false);

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    const payload = createAdPlacement.mock.calls[0][0];
    expect(payload.aspectRatio).toBe("16:9");
    expect(payload.imageBase64).toBe("data:image/png;base64,NEW");
    expect(payload.status).toBe("inactive");
    expect(payload.enabled).toBe(false);
  });

  it("emits close when the header close button is clicked", async () => {
    const wrapper = mountForm();
    await wrapper.find(".btn-close").trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("emits close when the footer Cancel button is clicked", async () => {
    const wrapper = mountForm();
    await wrapper.find(".btn-outline-secondary").trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("submits the create path and emits add-ad-placement then close", async () => {
    createAdPlacement.mockResolvedValue({ data: { id: 1, location: "x" } });
    const wrapper = mountForm();

    await wrapper.find("textarea").setValue("My description");
    await wrapper.find('input[type="number"]').setValue("9.99");
    await wrapper.find("#fee_type").setValue("CPM");
    await wrapper.find("#billing_unit").setValue("DAY");
    await wrapper.find("#rotating").setValue(true);

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(createAdPlacement).toHaveBeenCalledTimes(1);
    const payload = createAdPlacement.mock.calls[0][0];
    expect(payload).toMatchObject({
      description: "My description",
      fee: 9.99,
      fee_type: "CPM",
      billing_unit: "DAY",
      status: "active",
      enabled: true,
      rotating: true,
    });
    // create branch: base64 = data.imageBase64 (not edit) -> "" initialData
    expect(payload.imageBase64).toBe("");
    expect(editAdPlacement).not.toHaveBeenCalled();

    expect(wrapper.emitted("add-ad-placement")[0][0]).toMatchObject({
      id: 1,
      location: "x",
    });
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("shows an error alert when the create call rejects (catch path)", async () => {
    createAdPlacement.mockRejectedValue(new Error("boom"));
    const wrapper = mountForm();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(alert).toHaveBeenCalledWith("There was an error saving the ad.");
    // close NOT emitted on failure
    expect(wrapper.emitted("close")).toBeUndefined();
    // finally re-enabled the submit button
    expect(wrapper.find(".btn-success").attributes("disabled")).toBeUndefined();
  });

  // -- EDIT mode (adPlacement prop present at mount) -------------------------
  it("populates the form and renders the edit state from a mount-time prop", async () => {
    const wrapper = mountForm({ adPlacement: fullPlacement });
    await flushPromises();

    expect(wrapper.find("h3").text()).toBe("Edit Ad Placement");
    expect(wrapper.find(".btn-success").text()).toBe("Update");
    // onMounted maps the prop into the form
    expect(wrapper.find("input[readonly]").element.value).toBe("Home Banner");
    expect(wrapper.find("textarea").element.value).toBe("Home banner ad");
    expect(wrapper.find('input[type="number"]').element.value).toBe("12.50");
    // enabled checkbox checked because status === "active"
    expect(wrapper.find("#enabled").element.checked).toBe(true);
    expect(wrapper.find("#rotating").element.checked).toBe(true);
  });

  it("edit submit emits update-ad-placement (imageUpdated=true keeps base64)", async () => {
    editAdPlacement.mockResolvedValue({ data: { id: 99, location: "y" } });
    const wrapper = mountForm({ adPlacement: fullPlacement });

    // drive the ImagePicker @edit handler -> imageUpdated = true
    await wrapper.findComponent(ImagePickerStub).trigger("click");

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(editAdPlacement).toHaveBeenCalledTimes(1);
    const [id, payload] = editAdPlacement.mock.calls[0];
    expect(id).toBe(99);
    // edit + imageUpdated true -> base64 = data.imageBase64 ?? null (the image)
    expect(payload.imageBase64).toBe("data:image/png;base64,AAA");
    expect(createAdPlacement).not.toHaveBeenCalled();

    expect(wrapper.emitted("update-ad-placement").at(-1)[0]).toMatchObject({
      id: 99,
      location: "y",
      image: "data:image/png;base64,AAA",
    });
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("edit submit sends null base64 when image was updated but cleared (?? null)", async () => {
    editAdPlacement.mockResolvedValue({ data: { id: 99 } });
    const wrapper = mountForm({
      adPlacement: { ...fullPlacement, image: undefined },
    });

    // imageUpdated = true, but form.imageBase64 is undefined -> ?? null branch
    await wrapper.findComponent(ImagePickerStub).trigger("click");

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    const [, payload] = editAdPlacement.mock.calls[0];
    expect(payload.imageBase64).toBeNull();
  });

  it("edit submit sends null base64 when image was NOT updated", async () => {
    editAdPlacement.mockResolvedValue({ data: { id: 99 } });
    const wrapper = mountForm({ adPlacement: fullPlacement });

    // imageUpdated stays false -> base64 = null branch
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    const [, payload] = editAdPlacement.mock.calls[0];
    expect(payload.imageBase64).toBeNull();
  });

  it("disables the submit button and shows the spinner while submitting", async () => {
    let resolveCreate;
    createAdPlacement.mockReturnValue(
      new Promise((res) => {
        resolveCreate = res;
      })
    );
    const wrapper = mountForm();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    // mid-flight: isSubmitting true -> spinner shown, close button hidden,
    // button disabled
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.find(".btn-close").exists()).toBe(false);
    expect(wrapper.find(".btn-success").attributes("disabled")).toBeDefined();

    resolveCreate({ data: { id: 5 } });
    await flushPromises();

    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.find(".btn-close").exists()).toBe(true);
  });

  // -- WATCHER paths ---------------------------------------------------------
  it("watcher: prop becomes a full placement -> maps it inline (hasAll)", async () => {
    const wrapper = mountForm();

    await wrapper.setProps({
      adPlacement: { ...fullPlacement, hasAll: true },
    });

    expect(wrapper.find("h3").text()).toBe("Edit Ad Placement");
    expect(wrapper.find("textarea").element.value).toBe("Home banner ad");
    expect(getAdPlacement).not.toHaveBeenCalled();
  });

  it("watcher: prop without hasAll -> fetchData resolves and emits update", async () => {
    getAdPlacement.mockResolvedValue({
      data: {
        id: 7,
        location: "sidebar_top",
        description: "Fetched desc",
        image: "img",
        fee: "3.00",
        fee_type: "FIXED",
        billing_unit: "WEEK",
        aspect_ratio: "1:1",
        status: "inactive",
        is_rotating: false,
      },
    });
    const wrapper = mountForm();

    await wrapper.setProps({ adPlacement: { id: 7 } });
    await flushPromises();

    expect(getAdPlacement).toHaveBeenCalledWith(7);
    expect(wrapper.find("textarea").element.value).toBe("Fetched desc");
    // status inactive -> enabled unchecked
    expect(wrapper.find("#enabled").element.checked).toBe(false);
    expect(wrapper.emitted("update-ad-placement").at(-1)[0]).toMatchObject({
      id: 7,
      hasAll: true,
    });
  });

  it("watcher: prop cleared back to null -> resets to initialData", async () => {
    const wrapper = mountForm({ adPlacement: fullPlacement });

    await wrapper.setProps({ adPlacement: null });

    expect(wrapper.find("h3").text()).toBe("Create New Ad Placement");
    expect(wrapper.find("textarea").element.value).toBe("");
  });
});
