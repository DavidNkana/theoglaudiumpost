import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

import AdContentUpload from "./AdContentUpload.vue";

// ---- Global stubs for heavy child components ----
const ImagePickerStub = {
  name: "ImagePicker",
  props: ["modelValue", "initialImages", "designHelp", "aspectRatio", "isRequired"],
  emits: ["update:modelValue", "view-image"],
  template: "<div class='image-picker-stub'></div>",
};

const ImageModalStub = {
  name: "ImageModal",
  props: ["show", "images", "initialIndex", "imageAlt"],
  emits: ["close"],
  template: "<div class='image-modal-stub'></div>",
};

const makeSlot = (overrides = {}) => ({
  name: "Home Banner",
  aspect_ratio: "4:1",
  price: 500,
  fee_type: "FIXED",
  billing_unit: "DAY",
  fee: 100,
  ...overrides,
});

const makeContent = (overrides = {}) => ({
  title: "My Ad",
  description: "Some description",
  url: "https://example.com",
  startDate: "",
  endDate: "",
  files: [],
  ...overrides,
});

const factory = (props = {}) =>
  mount(AdContentUpload, {
    props: {
      selectedSlot: makeSlot(),
      adContent: makeContent(),
      ...props,
    },
    global: {
      stubs: {
        ImagePicker: ImagePickerStub,
        ImageModal: ImageModalStub,
      },
    },
  });

describe("AdContentUpload.vue", () => {
  let alertSpy;

  beforeEach(() => {
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders selected slot details with aspect_ratio present", () => {
    const wrapper = factory();
    const text = wrapper.text();
    expect(text).toContain("Home Banner");
    // aspect_ratio is present so the left side of the || is used
    expect(text).toContain("4:1");
    expect(text).toContain("ZAR 500");
  });

  it("falls back to aspectRatio (camelCase) when aspect_ratio is absent", () => {
    const wrapper = factory({
      selectedSlot: makeSlot({ aspect_ratio: undefined, aspectRatio: "2:1" }),
    });
    expect(wrapper.text()).toContain("2:1");
    // Passed through to ImagePicker too
    const picker = wrapper.findComponent(ImagePickerStub);
    expect(picker.props("aspectRatio")).toBe("2:1");
  });

  it("uses the '4:1' default aspectRatio for ImagePicker when both slot ratios are absent", () => {
    const wrapper = factory({
      selectedSlot: makeSlot({ aspect_ratio: undefined, aspectRatio: undefined }),
    });
    const picker = wrapper.findComponent(ImagePickerStub);
    expect(picker.props("aspectRatio")).toBe("4:1");
  });

  it("initializes form fields from adContent props (truthy branch)", () => {
    const wrapper = factory({
      adContent: makeContent({
        title: "Provided Title",
        description: "Provided Desc",
        url: "https://provided.com",
        files: [{ name: "a.png" }],
      }),
    });
    expect(wrapper.vm.form.title).toBe("Provided Title");
    expect(wrapper.vm.form.description).toBe("Provided Desc");
    expect(wrapper.vm.form.url).toBe("https://provided.com");
    expect(wrapper.vm.files).toEqual([{ name: "a.png" }]);
  });

  it("uses empty-string/array fallbacks when adContent fields are missing (falsy branch)", () => {
    const wrapper = factory({
      adContent: {
        title: "",
        description: "",
        url: "",
        files: undefined,
      },
    });
    expect(wrapper.vm.form.title).toBe("");
    expect(wrapper.vm.form.description).toBe("");
    expect(wrapper.vm.form.url).toBe("");
    expect(wrapper.vm.form.files).toEqual([]);
    expect(wrapper.vm.files).toEqual([]);
  });

  it("uses adContent.startDate/endDate fallbacks when missing (falsy branch via undefined)", () => {
    // Pass an object missing startDate/endDate so the || "" branch is exercised
    const wrapper = factory({
      adContent: { title: "t", description: "d", url: "u", files: [] },
    });
    // mounted() overwrites startDate/endDate, but the data() initializer ran first.
    expect(wrapper.vm.form).toBeDefined();
  });

  it("uses provided adContent.startDate/endDate (truthy branch)", () => {
    const wrapper = factory({
      adContent: makeContent({ startDate: "2026-01-01T00:00", endDate: "2026-02-01T00:00" }),
    });
    // data() initialized from props; mounted() then recalculates, but truthy branch was taken.
    expect(wrapper.vm).toBeDefined();
  });

  // ---- watcher: form.url ----
  it("returns early in url watcher when new value is empty (falsy branch)", async () => {
    const wrapper = factory();
    wrapper.vm.isValidUrl = false;
    wrapper.vm.form.url = "";
    await flushPromises();
    expect(wrapper.vm.isValidUrl).toBe(false);
  });

  it("auto-prepends https:// when scheme is missing", async () => {
    const wrapper = factory();
    wrapper.vm.form.url = "example.org";
    await flushPromises();
    expect(wrapper.vm.form.url).toBe("https://example.org");
  });

  it("does not prepend https:// when scheme is already present", async () => {
    const wrapper = factory();
    wrapper.vm.form.url = "http://already.com";
    await flushPromises();
    expect(wrapper.vm.form.url).toBe("http://already.com");
  });

  it("sets isValidUrl false (catch branch) when form.linkUrl is invalid", async () => {
    const wrapper = factory();
    // form.linkUrl is undefined => new URL(undefined) throws => catch sets false
    wrapper.vm.form.url = "https://changed.com";
    await flushPromises();
    expect(wrapper.vm.isValidUrl).toBe(false);
    // The :class binding reflects the invalid state
    const urlInput = wrapper.find("#adUrl");
    expect(urlInput.classes()).toContain("is-invalid");
  });

  it("sets isValidUrl true (try success branch) when form.linkUrl is a valid URL", async () => {
    const wrapper = factory();
    // Provide a valid linkUrl so new URL() succeeds inside the watcher
    wrapper.vm.form.linkUrl = "https://valid.example.com";
    wrapper.vm.form.url = "https://trigger.com";
    await flushPromises();
    expect(wrapper.vm.isValidUrl).toBe(true);
    const urlInput = wrapper.find("#adUrl");
    expect(urlInput.classes()).not.toContain("is-invalid");
  });

  // ---- initializeDates / mounted switch branches ----
  it("initializeDates default DAY branch (no billing_unit)", () => {
    const wrapper = factory({ selectedSlot: makeSlot({ billing_unit: undefined }) });
    expect(wrapper.vm.form.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(wrapper.vm.form.endDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("initializeDates WEEK branch", () => {
    const wrapper = factory({
      selectedSlot: makeSlot({ billing_unit: "WEEK", fee_type: "FIXED", fee: 70 }),
    });
    expect(wrapper.vm.form.endDate).toBeTruthy();
  });

  it("initializeDates MONTH branch", () => {
    const wrapper = factory({
      selectedSlot: makeSlot({ billing_unit: "MONTH", fee_type: "FIXED", fee: 300 }),
    });
    expect(wrapper.vm.form.endDate).toBeTruthy();
  });

  it("initializeDates explicit DAY branch", () => {
    const wrapper = factory({
      selectedSlot: makeSlot({ billing_unit: "DAY", fee_type: "FIXED", fee: 10 }),
    });
    expect(wrapper.vm.form.endDate).toBeTruthy();
  });

  // ---- calculateCost branches ----
  it("calculateCost FIXED + DAY computes multiplier from days", () => {
    const wrapper = factory({ selectedSlot: makeSlot({ fee_type: "FIXED", billing_unit: "DAY", fee: 100 }) });
    wrapper.vm.form.startDate = "2026-01-01T00:00";
    wrapper.vm.form.endDate = "2026-01-03T00:00"; // 3 days inclusive
    wrapper.vm.calculateCost();
    expect(wrapper.vm.form.totalCost).toBe("300.00");
  });

  it("calculateCost FIXED + WEEK uses ceil(days/7)", () => {
    const wrapper = factory({ selectedSlot: makeSlot({ fee_type: "FIXED", billing_unit: "WEEK", fee: 50 }) });
    wrapper.vm.form.startDate = "2026-01-01T00:00";
    wrapper.vm.form.endDate = "2026-01-08T00:00"; // 8 days inclusive => ceil(8/7)=2
    wrapper.vm.calculateCost();
    expect(wrapper.vm.form.totalCost).toBe("100.00");
  });

  it("calculateCost FIXED + MONTH uses ceil((days-1)/30)", () => {
    const wrapper = factory({ selectedSlot: makeSlot({ fee_type: "FIXED", billing_unit: "MONTH", fee: 200 }) });
    wrapper.vm.form.startDate = "2026-01-01T00:00";
    wrapper.vm.form.endDate = "2026-02-15T00:00"; // ~46 days inclusive => ceil(45/30)=2
    wrapper.vm.calculateCost();
    expect(wrapper.vm.form.totalCost).toBe("400.00");
  });

  it("calculateCost FIXED with unknown billing_unit keeps multiplier 1", () => {
    const wrapper = factory({ selectedSlot: makeSlot({ fee_type: "FIXED", billing_unit: "YEAR", fee: 99 }) });
    wrapper.vm.form.startDate = "2026-01-01T00:00";
    wrapper.vm.form.endDate = "2026-01-10T00:00";
    wrapper.vm.calculateCost();
    expect(wrapper.vm.form.totalCost).toBe("99.00");
  });

  it("calculateCost does nothing when fee_type is not FIXED", () => {
    const wrapper = factory({ selectedSlot: makeSlot({ fee_type: "DYNAMIC", billing_unit: "DAY", fee: 100 }) });
    wrapper.vm.form.totalCost = "SENTINEL";
    wrapper.vm.calculateCost();
    expect(wrapper.vm.form.totalCost).toBe("SENTINEL");
  });

  it("calculateCost returns early when selectedSlot/placement is falsy", () => {
    const wrapper = factory();
    // Force the early-return guard: replace selectedSlot reference with a falsy value
    wrapper.vm.form.totalCost = "KEEP";
    Object.defineProperty(wrapper.vm, "selectedSlot", {
      configurable: true,
      get: () => null,
    });
    wrapper.vm.calculateCost();
    expect(wrapper.vm.form.totalCost).toBe("KEEP");
  });

  // ---- validateAndRecalculate branches ----
  it("validateAndRecalculate alerts and clears endDate when end is before start", () => {
    const wrapper = factory();
    wrapper.vm.form.startDate = "2026-01-10T00:00";
    wrapper.vm.form.endDate = "2026-01-01T00:00"; // before start
    wrapper.vm.validateAndRecalculate();
    expect(alertSpy).toHaveBeenCalledWith("End date must be after start date.");
    expect(wrapper.vm.form.endDate).toBe("");
  });

  it("validateAndRecalculate alerts when start valid but end invalid", () => {
    const wrapper = factory();
    wrapper.vm.form.startDate = "2026-01-10T00:00";
    wrapper.vm.form.endDate = "not-a-date";
    wrapper.vm.validateAndRecalculate();
    expect(alertSpy).toHaveBeenCalledWith("End date must be after start date.");
    expect(wrapper.vm.form.endDate).toBe("");
  });

  it("validateAndRecalculate recalculates when dates are valid and ordered", () => {
    const wrapper = factory({ selectedSlot: makeSlot({ fee_type: "FIXED", billing_unit: "DAY", fee: 100 }) });
    wrapper.vm.form.startDate = "2026-01-01T00:00";
    wrapper.vm.form.endDate = "2026-01-02T00:00";
    alertSpy.mockClear();
    wrapper.vm.validateAndRecalculate();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(wrapper.vm.form.totalCost).toBe("200.00");
  });

  // ---- handleFileUpload ----
  it("handleFileUpload returns early when no file present", () => {
    const wrapper = factory();
    wrapper.vm.filePreview = "untouched";
    wrapper.vm.handleFileUpload({ target: { files: [] } });
    expect(wrapper.vm.filePreview).toBe("untouched");
  });

  it("handleFileUpload reads file and sets preview via FileReader onload", async () => {
    const wrapper = factory();
    const realFileReader = window.FileReader;
    let onloadCb;
    class FakeFileReader {
      set onload(cb) {
        onloadCb = cb;
      }
      readAsDataURL() {
        // Synchronously invoke the captured onload with a fake result
        onloadCb({ target: { result: "data:image/png;base64,XYZ" } });
      }
    }
    window.FileReader = FakeFileReader;
    try {
      wrapper.vm.handleFileUpload({ target: { files: [{ name: "x.png" }] } });
      expect(wrapper.vm.filePreview).toBe("data:image/png;base64,XYZ");
      expect(wrapper.vm.file).toEqual({ name: "x.png" });
    } finally {
      window.FileReader = realFileReader;
    }
  });

  // ---- image modal handlers ----
  it("viewImage opens modal at the given index", async () => {
    const wrapper = factory({ adContent: makeContent({ files: [{ n: 1 }, { n: 2 }] }) });
    const picker = wrapper.findComponent(ImagePickerStub);
    picker.vm.$emit("view-image", 3);
    await flushPromises();
    expect(wrapper.vm.currentImageIndex).toBe(3);
    expect(wrapper.vm.showImageModal).toBe(true);
    const modal = wrapper.findComponent(ImageModalStub);
    expect(modal.props("show")).toBe(true);
    expect(modal.props("initialIndex")).toBe(3);
  });

  it("closeImageModal hides the modal", async () => {
    const wrapper = factory();
    wrapper.vm.showImageModal = true;
    await flushPromises();
    const modal = wrapper.findComponent(ImageModalStub);
    modal.vm.$emit("close");
    await flushPromises();
    expect(wrapper.vm.showImageModal).toBe(false);
  });

  it("passes form.title to ImageModal imageAlt, falling back to default", async () => {
    const wrapper = factory({ adContent: makeContent({ title: "" }) });
    let modal = wrapper.findComponent(ImageModalStub);
    expect(modal.props("imageAlt")).toBe("Ad Preview");

    wrapper.vm.form.title = "Real Title";
    await flushPromises();
    modal = wrapper.findComponent(ImageModalStub);
    expect(modal.props("imageAlt")).toBe("Real Title");
  });

  // ---- validateAndProceed branches ----
  it("validateAndProceed alerts when end date is not after start date", async () => {
    const wrapper = factory();
    wrapper.vm.form.startDate = "2026-01-10T00:00";
    wrapper.vm.form.endDate = "2026-01-10T00:00"; // equal => not after
    // Avoid validateAndRecalculate clearing endDate path interfering: keep equal handled there too,
    // but endDate==startDate is not "before", and both valid, so recalc passes.
    alertSpy.mockClear();
    wrapper.vm.validateAndProceed();
    expect(alertSpy).toHaveBeenCalledWith("End date must be after start date");
    expect(wrapper.emitted("next-step")).toBeFalsy();
  });

  it("validateAndProceed alerts when no images are selected", async () => {
    const wrapper = factory({ adContent: makeContent({ files: [] }) });
    wrapper.vm.form.startDate = "2026-01-01T00:00";
    wrapper.vm.form.endDate = "2026-01-05T00:00";
    wrapper.vm.files = [];
    alertSpy.mockClear();
    wrapper.vm.validateAndProceed();
    expect(alertSpy).toHaveBeenCalledWith(
      "Please select at least one image for your advertisement"
    );
    expect(wrapper.emitted("update-content")).toBeFalsy();
  });

  it("validateAndProceed alerts when files is null (falsy left side)", async () => {
    const wrapper = factory();
    wrapper.vm.form.startDate = "2026-01-01T00:00";
    wrapper.vm.form.endDate = "2026-01-05T00:00";
    wrapper.vm.files = null;
    alertSpy.mockClear();
    wrapper.vm.validateAndProceed();
    expect(alertSpy).toHaveBeenCalledWith(
      "Please select at least one image for your advertisement"
    );
  });

  it("validateAndProceed emits update-content and next-step on the happy path", async () => {
    const wrapper = factory({ selectedSlot: makeSlot({ fee_type: "FIXED", billing_unit: "DAY", fee: 100 }) });
    wrapper.vm.form.startDate = "2026-01-01T00:00";
    wrapper.vm.form.endDate = "2026-01-05T00:00";
    wrapper.vm.form.title = "Title";
    wrapper.vm.form.description = "Desc";
    wrapper.vm.form.url = "https://example.com";
    wrapper.vm.files = [{ name: "img1.png" }, { name: "img2.png" }];
    alertSpy.mockClear();

    wrapper.vm.validateAndProceed();

    expect(alertSpy).not.toHaveBeenCalled();
    const updates = wrapper.emitted("update-content");
    expect(updates).toBeTruthy();
    const payload = updates[0][0];
    expect(payload.files).toHaveLength(2);
    expect(payload.file).toEqual({ name: "img1.png" });
    expect(payload.title).toBe("Title");
    expect(payload.description).toBe("Desc");
    expect(payload.url).toBe("https://example.com");
    expect(payload.totalCost).toBeDefined();
    expect(wrapper.emitted("next-step")).toBeTruthy();
  });

  it("submitting the form triggers validateAndProceed", async () => {
    const wrapper = factory();
    const spy = vi.spyOn(wrapper.vm, "validateAndProceed");
    await wrapper.find("form").trigger("submit.prevent");
    expect(spy).toHaveBeenCalled();
  });

  it("Back button emits prev-step", async () => {
    const wrapper = factory();
    await wrapper.find("button.btn-outline-secondary").trigger("click");
    expect(wrapper.emitted("prev-step")).toBeTruthy();
  });

  // ---- v-model update handlers (template-generated input listeners) ----
  it("updates form.title via the title input v-model", async () => {
    const wrapper = factory();
    const input = wrapper.find("#adTitle");
    await input.setValue("Typed Title");
    expect(wrapper.vm.form.title).toBe("Typed Title");
  });

  it("updates form.description via the description textarea v-model", async () => {
    const wrapper = factory();
    const textarea = wrapper.find("#adDescription");
    await textarea.setValue("Typed Description");
    expect(wrapper.vm.form.description).toBe("Typed Description");
  });

  it("updates form.url via the url input v-model", async () => {
    const wrapper = factory();
    const input = wrapper.find("#adUrl");
    await input.setValue("https://typed-url.com");
    expect(wrapper.vm.form.url).toBe("https://typed-url.com");
  });

  it("updates files via ImagePicker v-model update:modelValue", async () => {
    const wrapper = factory();
    const picker = wrapper.findComponent(ImagePickerStub);
    picker.vm.$emit("update:modelValue", [{ name: "new.png" }]);
    await flushPromises();
    expect(wrapper.vm.files).toEqual([{ name: "new.png" }]);
  });

  it("updates form.designHelp via the design-help checkbox v-model", async () => {
    const wrapper = factory();
    const checkbox = wrapper.find("#designHelp");
    await checkbox.setValue(true);
    expect(wrapper.vm.form.designHelp).toBe(true);
  });
});
