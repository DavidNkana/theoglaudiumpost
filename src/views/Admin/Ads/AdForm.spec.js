import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

/* ------------------------------------------------------------------ */
/* Mock every external service boundary the component imports.          */
/* ------------------------------------------------------------------ */
vi.mock("@/features/ads/AdsService", () => ({
  createAd: vi.fn(),
  editAd: vi.fn(),
  getPlacements: vi.fn(),
  getAd: vi.fn(),
}));
vi.mock("@/features/businesses/BusinessesService", () => ({
  getBusinesses: vi.fn(),
  createBusiness: vi.fn(),
}));
vi.mock("@/features/tags/TagsService", () => ({
  getTags: vi.fn(),
}));
vi.mock("@/features/ads/CampaignService", () => ({
  getCampaigns: vi.fn(),
  createCampaign: vi.fn(),
}));
vi.mock("@/features/media/MediaService", () => ({
  getMediaDataUrl: vi.fn(),
}));
vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn() },
}));

import {
  createAd,
  editAd,
  getPlacements,
  getAd,
} from "@/features/ads/AdsService";
import {
  getBusinesses,
  createBusiness,
} from "@/features/businesses/BusinessesService";
import { getTags } from "@/features/tags/TagsService";
import {
  getCampaigns,
  createCampaign,
} from "@/features/ads/CampaignService";
import { getMediaDataUrl } from "@/features/media/MediaService";
import Swal from "sweetalert2";

import AdForm from "@/views/Admin/Ads/AdForm.vue";

/* ------------------------------------------------------------------ */
/* Child component stubs that pull heavy deps / DOM machinery.          */
/* ------------------------------------------------------------------ */
const MultiImagePickerStub = {
  name: "MultiImagePicker",
  props: ["modelValue", "initialImages", "maxImages", "designHelp", "aspectRatio"],
  emits: ["update:modelValue", "edit"],
  template: '<div class="multi-image-picker-stub"></div>',
};
const TagSelectorStub = {
  name: "TagSelector",
  props: [
    "modelValue",
    "title",
    "tags",
    "searchable",
    "showCount",
    "showActions",
    "showSelectionSummary",
  ],
  emits: ["update:modelValue"],
  template: '<div class="tag-selector-stub"></div>',
};

const globalStubs = {
  MultiImagePicker: MultiImagePickerStub,
  TagSelector: TagSelectorStub,
};

/* ------------------------------------------------------------------ */
/* Default happy-path service responses.                                */
/* ------------------------------------------------------------------ */
const PLACEMENT = {
  id: "p1",
  location: "home_banner",
  fee_type: "FIXED",
  billing_unit: "DAY",
};

const setHappyDefaults = () => {
  getPlacements.mockResolvedValue({ data: [PLACEMENT] });
  getBusinesses.mockResolvedValue({
    data: { businesses: [{ id: "b1", name: "Biz One" }] },
  });
  getCampaigns.mockResolvedValue({
    data: {
      campaigns: [
        { id: "c1", name: "Camp One", businessId: "b1" },
        { id: "c2", name: "Camp Two", businessId: "b2" },
      ],
    },
  });
  getTags.mockResolvedValue({ data: [{ id: "t1", name: "Tag One" }] });
};

/**
 * Mounts the component and waits for initializeForm() (onMounted) to settle.
 */
const mountForm = async (props = {}) => {
  const wrapper = mount(AdForm, {
    props,
    global: { stubs: globalStubs },
  });
  await flushPromises();
  return wrapper;
};

// jsdom does not implement URL.revokeObjectURL; provide a stub we can assert on.
const revokeObjectURL = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  setHappyDefaults();
  global.URL.revokeObjectURL = revokeObjectURL;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AdForm.vue", () => {
  /* ---------------------------------------------------------------- */
  /* Loading + initial create-mode render.                             */
  /* ---------------------------------------------------------------- */
  it("shows the loading spinner before data resolves, then the create form", async () => {
    const wrapper = mount(AdForm, { global: { stubs: globalStubs } });

    // isLoadingData = true initially -> spinner shown, form hidden.
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.find("form").exists()).toBe(false);
    expect(wrapper.find("h3").text()).toBe("Create New Ad");

    await flushPromises();

    // Loaded -> form shown, spinner gone.
    expect(wrapper.find("form").exists()).toBe(true);
    expect(wrapper.find(".spinner-border").exists()).toBe(false);

    // Services were called.
    expect(getPlacements).toHaveBeenCalled();
    expect(getBusinesses).toHaveBeenCalledWith({});
    expect(getCampaigns).toHaveBeenCalledWith({ size: 1000 });
    expect(getTags).toHaveBeenCalled();

    // Business option rendered from non-empty list.
    expect(wrapper.text()).toContain("Biz One");
  });

  it("falls back to the synthesized placement when getPlacements returns an empty list", async () => {
    getPlacements.mockResolvedValue({ data: [] });
    const wrapper = await mountForm();
    // Placement select rendered with the fallback main_page_ad placement.
    const placementOptions = wrapper.findAll("select")[2]
      ? wrapper.findAll("option")
      : [];
    expect(placementOptions.length).toBeGreaterThan(0);
    // The submit button is present (form fully rendered).
    expect(wrapper.find('button[type="submit"]').text()).toBe("Create Ad");
  });

  it("falls back to the synthesized placement when placementsRes.data is undefined", async () => {
    getPlacements.mockResolvedValue({ data: undefined });
    const wrapper = await mountForm();
    expect(wrapper.find("form").exists()).toBe(true);
  });

  it("uses empty arrays when businesses / campaigns / tags lists are missing", async () => {
    getBusinesses.mockResolvedValue({ data: {} });
    getCampaigns.mockResolvedValue({ data: {} });
    getTags.mockResolvedValue({ data: undefined });
    const wrapper = await mountForm();
    expect(wrapper.find("form").exists()).toBe(true);
    // No business <option> rows beyond the placeholder.
    expect(wrapper.text()).not.toContain("Biz One");
  });

  /* ---------------------------------------------------------------- */
  /* initializeForm error path.                                        */
  /* ---------------------------------------------------------------- */
  it("fires an error Swal when initial data loading rejects", async () => {
    getPlacements.mockRejectedValue(new Error("boom"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = await mountForm();
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error", icon: "error" })
    );
    // Loading flips off even on error (finally).
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    errSpy.mockRestore();
  });

  /* ---------------------------------------------------------------- */
  /* Close buttons + emitted events.                                   */
  /* ---------------------------------------------------------------- */
  it("emits close from the header close button and the cancel button", async () => {
    const wrapper = await mountForm();
    await wrapper.find(".modal-header .btn-close").trigger("click");
    await wrapper.find("button.btn-outline-secondary").trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(2);
  });

  /* ---------------------------------------------------------------- */
  /* Media type toggle: image <-> video.                               */
  /* ---------------------------------------------------------------- */
  it("toggles between image and video media sections", async () => {
    const wrapper = await mountForm();
    // Default is image -> MultiImagePicker stub present.
    expect(wrapper.findComponent(MultiImagePickerStub).exists()).toBe(true);

    // Click "Video Ad".
    const [imageBtn, videoBtn] = wrapper.findAll(
      ".btn-group button"
    );
    await videoBtn.trigger("click");
    expect(wrapper.find('input[placeholder^="https://www.youtube.com"]').exists()).toBe(
      true
    );
    // Help tip shown when no videoUrl.
    expect(wrapper.text()).toContain("Use YouTube Shorts");

    // Back to image.
    await imageBtn.trigger("click");
    expect(wrapper.findComponent(MultiImagePickerStub).exists()).toBe(true);
  });

  /* ---------------------------------------------------------------- */
  /* Image loading spinner branch + preview + removeImage.             */
  /* ---------------------------------------------------------------- */
  it("renders the image preview when form.images has an entry", async () => {
    const wrapper = await mountForm();
    wrapper.vm.form.images = ["data:image/png;base64,AAA"];
    await flushPromises();
    const img = wrapper.find("img.preview-media");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("data:image/png;base64,AAA");
  });

  it("updates form.images through the MultiImagePicker v-model", async () => {
    const wrapper = await mountForm();
    wrapper
      .findComponent(MultiImagePickerStub)
      .vm.$emit("update:modelValue", ["data:image/png;base64,NEW"]);
    await flushPromises();
    expect(wrapper.vm.form.images).toEqual(["data:image/png;base64,NEW"]);
  });

  it("shows the image-loading spinner when isLoadingImages is true", async () => {
    const wrapper = await mountForm();
    wrapper.vm.isLoadingImages = true;
    await flushPromises();
    expect(wrapper.find(".spinner-border-sm").exists()).toBe(true);
    expect(wrapper.text()).toContain("Loading image...");
    // MultiImagePicker hidden while loading.
    expect(wrapper.findComponent(MultiImagePickerStub).exists()).toBe(false);
  });

  /* ---------------------------------------------------------------- */
  /* handleImageUpdate via MultiImagePicker @edit emit.                */
  /* ---------------------------------------------------------------- */
  it("handleImageUpdate sets imageBase64 in edit mode when images exist", async () => {
    getMediaDataUrl.mockResolvedValue("data:image/png;base64,EDIT");
    const ad = {
      id: "a1",
      title: "Existing",
      business_id: "b1",
      campaign_id: "c1",
      hasAll: true,
      imageIds: ["m1"],
    };
    const wrapper = await mountForm({ ad });
    await flushPromises();
    // Now in edit mode with images loaded; emit edit=true from picker.
    wrapper.vm.form.images = ["data:image/png;base64,PIC"];
    wrapper.findComponent(MultiImagePickerStub).vm.$emit("edit", true);
    await flushPromises();
    expect(wrapper.vm.form.imageBase64).toBe("data:image/png;base64,PIC");
  });

  it("handleImageUpdate in create mode does not touch imageBase64", async () => {
    const wrapper = await mountForm();
    wrapper.vm.form.images = ["x"];
    wrapper.findComponent(MultiImagePickerStub).vm.$emit("edit", true);
    await flushPromises();
    // Not edit mode -> imageBase64 stays empty.
    expect(wrapper.vm.form.imageBase64).toBe("");
  });

  it("handleImageUpdate with value=false (edit mode) does not set imageBase64", async () => {
    const ad = { id: "a1", title: "E", business_id: "b1", campaign_id: "c1", hasAll: true };
    const wrapper = await mountForm({ ad });
    wrapper.vm.form.images = ["pic"];
    wrapper.findComponent(MultiImagePickerStub).vm.$emit("edit", false);
    await flushPromises();
    expect(wrapper.vm.form.imageBase64).toBe("");
  });

  it("handleImageUpdate (edit mode, value true) with empty images keeps imageBase64", async () => {
    const ad = { id: "a1", title: "E", business_id: "b1", campaign_id: "c1", hasAll: true };
    const wrapper = await mountForm({ ad });
    wrapper.vm.form.images = [];
    wrapper.findComponent(MultiImagePickerStub).vm.$emit("edit", true);
    await flushPromises();
    expect(wrapper.vm.form.imageBase64).toBe("");
  });

  it("handleImageUpdate (edit mode) falls back to null when first image is falsy", async () => {
    const ad = { id: "a1", title: "E", business_id: "b1", campaign_id: "c1", hasAll: true };
    const wrapper = await mountForm({ ad });
    // Non-empty array but a falsy first entry -> images[0] || null -> null.
    wrapper.vm.form.images = [""];
    wrapper.findComponent(MultiImagePickerStub).vm.$emit("edit", true);
    await flushPromises();
    expect(wrapper.vm.form.imageBase64).toBe(null);
  });

  /* ---------------------------------------------------------------- */
  /* Business selection drives filteredCampaigns + campaign UI.        */
  /* ---------------------------------------------------------------- */
  it("filters campaigns by selected business and clears campaign on change", async () => {
    const wrapper = await mountForm();
    // No business selected -> filteredCampaigns empty, "Select Business First".
    const campaignSelect = wrapper.findAll("select")[1];
    expect(campaignSelect.attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("-- Select Business First --");

    // Select business b1 -> campaign c1 matches.
    wrapper.vm.form.campaignId = "c1";
    wrapper.vm.form.businessId = "b1";
    await flushPromises();
    // businessId watcher clears campaignId.
    expect(wrapper.vm.form.campaignId).toBe("");
    expect(wrapper.text()).toContain("Camp One");
    expect(wrapper.text()).not.toContain("Camp Two");
    expect(wrapper.text()).toContain("Select the campaign this ad belongs to");

    // Select a business with no matching campaigns -> empty-state hint.
    wrapper.vm.form.businessId = "b-none";
    await flushPromises();
    expect(wrapper.text()).toContain("No campaigns found for this business");
  });

  /* ---------------------------------------------------------------- */
  /* Placement onChange handler.                                       */
  /* ---------------------------------------------------------------- */
  it("onPlacementSelect recalculates when a known placement is chosen", async () => {
    const wrapper = await mountForm();
    // Selects order: business(0), campaign(1), placement(2), payment status(3).
    const placementSelect = wrapper.findAll("select")[2];
    // Select the rendered placement option (value = resolved placement id p1).
    // setValue drives the v-model writer and the @change handler.
    await placementSelect.setValue("p1");
    await flushPromises();
    expect(wrapper.vm.form.placementId).toBe("p1");
  });

  it("onPlacementSelect is a no-op when the placement id is unknown", async () => {
    const wrapper = await mountForm();
    // Drive the @change handler directly with an unknown id -> find() returns undefined.
    wrapper.vm.form.placementId = "does-not-exist";
    await wrapper.vm.onPlacementSelect();
    await flushPromises();
    expect(wrapper.find("form").exists()).toBe(true);
  });

  /* ---------------------------------------------------------------- */
  /* Start-date change handler: valid + invalid date branches.         */
  /* ---------------------------------------------------------------- */
  it("handleStartDateChange recalculates with a valid future date", async () => {
    const wrapper = await mountForm();
    const startInput = wrapper.find('input[type="date"]');
    // Future dates -> valid. selectedPlacement is null in create mode so
    // calculateEndDateFromStart leaves our endTime untouched.
    wrapper.vm.form.startTime = "2099-01-01";
    wrapper.vm.form.endTime = "2099-01-07";
    await startInput.trigger("change");
    await flushPromises();
    expect(Swal.fire).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: "Invalid Dates" })
    );
  });

  it("handleStartDateChange shows a warning Swal for an invalid (past) date", async () => {
    const wrapper = await mountForm();
    const startInput = wrapper.find('input[type="date"]');
    wrapper.vm.form.startTime = "2000-01-01";
    await startInput.trigger("change");
    await flushPromises();
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Invalid Dates", icon: "warning" })
    );
  });

  /* ---------------------------------------------------------------- */
  /* URL change handler / watcher.                                     */
  /* ---------------------------------------------------------------- */
  it("formats the link URL via the watcher when linkUrl changes", async () => {
    const wrapper = await mountForm();
    wrapper.vm.form.linkUrl = "example.com";
    await flushPromises();
    expect(wrapper.vm.form.linkUrl).toBe("https://example.com");
  });

  it("link URL watcher leaves an empty URL untouched", async () => {
    const wrapper = await mountForm();
    wrapper.vm.form.linkUrl = "site.com";
    await flushPromises();
    wrapper.vm.form.linkUrl = "";
    await flushPromises();
    expect(wrapper.vm.form.linkUrl).toBe("");
  });

  /* ---------------------------------------------------------------- */
  /* YouTube URL parsing across all formats + preview render.          */
  /* ---------------------------------------------------------------- */
  it("recognizes a standard YouTube watch URL and shows a 16:9 preview", async () => {
    const wrapper = await mountForm();
    await wrapper.findAll(".btn-group button")[1].trigger("click");
    wrapper.vm.form.videoUrl = "https://youtube.com/watch?v=abc123";
    await flushPromises();
    expect(wrapper.text()).toContain("YouTube Video (16:9)");
    const iframe = wrapper.find("iframe");
    expect(iframe.attributes("src")).toBe(
      "https://www.youtube.com/embed/abc123"
    );
  });

  it("recognizes a YouTube Shorts URL and shows a 9:16 short preview", async () => {
    const wrapper = await mountForm();
    await wrapper.findAll(".btn-group button")[1].trigger("click");
    wrapper.vm.form.videoUrl = "https://youtube.com/shorts/shortId";
    await flushPromises();
    expect(wrapper.text()).toContain("YouTube Short (9:16)");
    const iframe = wrapper.find("iframe");
    expect(iframe.attributes("src")).toContain(
      "https://www.youtube.com/embed/shortId?autoplay=0&loop=1"
    );
    expect(wrapper.find(".ratio").classes()).toContain("youtube-short-ratio");
  });

  it("recognizes a youtu.be short-link URL", async () => {
    const wrapper = await mountForm();
    await wrapper.findAll(".btn-group button")[1].trigger("click");
    wrapper.vm.form.videoUrl = "https://youtu.be/beId";
    await flushPromises();
    expect(wrapper.find("iframe").attributes("src")).toBe(
      "https://www.youtube.com/embed/beId"
    );
  });

  it("recognizes a youtube.com/embed URL", async () => {
    const wrapper = await mountForm();
    await wrapper.findAll(".btn-group button")[1].trigger("click");
    wrapper.vm.form.videoUrl = "https://youtube.com/embed/emId";
    await flushPromises();
    expect(wrapper.find("iframe").attributes("src")).toBe(
      "https://www.youtube.com/embed/emId"
    );
  });

  it("marks a non-YouTube URL as invalid and shows no preview", async () => {
    const wrapper = await mountForm();
    await wrapper.findAll(".btn-group button")[1].trigger("click");
    wrapper.vm.form.videoUrl = "https://vimeo.com/123";
    await flushPromises();
    expect(wrapper.text()).toContain("Please enter a valid YouTube URL");
    expect(wrapper.find("iframe").exists()).toBe(false);
  });

  /* ---------------------------------------------------------------- */
  /* removeVideo + handleMediaTypeChange clearing branches.            */
  /* ---------------------------------------------------------------- */
  it("removeVideo clears video state and revokes an object URL", async () => {
    const wrapper = await mountForm();
    await wrapper.findAll(".btn-group button")[1].trigger("click");
    wrapper.vm.videoPreviewUrl = "blob:fake";
    wrapper.vm.form.videoUrl = "https://youtube.com/watch?v=xyz";
    await flushPromises();
    // Clear button is rendered because isYouTubeUrl is true.
    await wrapper.find(".btn-outline-danger").trigger("click");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
    expect(wrapper.vm.form.videoUrl).toBe("");
    expect(wrapper.vm.videoPreviewUrl).toBe(null);
  });

  it("removeVideo without an object URL does not call revokeObjectURL", async () => {
    const wrapper = await mountForm();
    // Switch to video then back to image: handleMediaTypeChange('image') -> removeVideo with null preview.
    await wrapper.findAll(".btn-group button")[1].trigger("click");
    await wrapper.findAll(".btn-group button")[0].trigger("click");
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it("switching to video clears image data", async () => {
    const wrapper = await mountForm();
    wrapper.vm.form.images = ["pic"];
    wrapper.vm.form.imageBase64 = "base64";
    await wrapper.findAll(".btn-group button")[1].trigger("click");
    await flushPromises();
    expect(wrapper.vm.form.images).toEqual([]);
    expect(wrapper.vm.form.imageBase64).toBe("");
  });

  it("removeVideo resets the file input element value when present", async () => {
    const wrapper = await mountForm();
    // Simulate a video input element ref being set.
    wrapper.vm.videoInputRef = { value: "something" };
    wrapper.vm.removeVideo();
    expect(wrapper.vm.videoInputRef.value).toBe("");
  });

  /* ---------------------------------------------------------------- */
  /* Inline business creation modal: open, validate, success, error.   */
  /* ---------------------------------------------------------------- */
  it("opens the new-business modal and validates an empty name", async () => {
    const wrapper = await mountForm();
    // Open modal via the + button next to the business select.
    const plusButtons = wrapper.findAll(".input-group .btn-outline-primary");
    await plusButtons[0].trigger("click");
    expect(wrapper.text()).toContain("Create New Business");

    // Submit with empty name -> validation Swal, createBusiness not called.
    await wrapper
      .findAll(".modal-content")[0]
      .find(".btn-primary")
      .trigger("click");
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Business name is required" })
    );
    expect(createBusiness).not.toHaveBeenCalled();
  });

  it("creates a business successfully and selects it", async () => {
    createBusiness.mockResolvedValue({ data: { id: "bNew", name: "New Biz" } });
    const wrapper = await mountForm();
    await wrapper.findAll(".input-group .btn-outline-primary")[0].trigger("click");
    wrapper.vm.newBusinessForm.name = "  New Biz  ";
    await wrapper
      .findAll(".modal-content")[0]
      .find(".btn-primary")
      .trigger("click");
    await flushPromises();
    expect(createBusiness).toHaveBeenCalledWith({
      name: "New Biz",
      type: "business",
      status: "active",
    });
    expect(wrapper.vm.form.businessId).toBe("bNew");
    expect(wrapper.vm.showNewBusinessModal).toBe(false);
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Success!" })
    );
  });

  it("shows an error Swal when business creation rejects", async () => {
    createBusiness.mockRejectedValue(new Error("nope"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = await mountForm();
    await wrapper.findAll(".input-group .btn-outline-primary")[0].trigger("click");
    wrapper.vm.newBusinessForm.name = "X";
    await wrapper
      .findAll(".modal-content")[0]
      .find(".btn-primary")
      .trigger("click");
    await flushPromises();
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Failed to create business. Please try again." })
    );
    expect(wrapper.vm.isCreatingBusiness).toBe(false);
    errSpy.mockRestore();
  });

  it("closes the new-business modal via its close/cancel buttons", async () => {
    const wrapper = await mountForm();
    await wrapper.findAll(".input-group .btn-outline-primary")[0].trigger("click");
    expect(wrapper.vm.showNewBusinessModal).toBe(true);
    await wrapper.findAll(".modal-content")[0].find(".btn-close").trigger("click");
    expect(wrapper.vm.showNewBusinessModal).toBe(false);

    // Re-open and close via Cancel button.
    await wrapper.findAll(".input-group .btn-outline-primary")[0].trigger("click");
    await wrapper.findAll(".modal-content")[0].find(".btn-secondary").trigger("click");
    expect(wrapper.vm.showNewBusinessModal).toBe(false);
  });

  /* ---------------------------------------------------------------- */
  /* Inline campaign creation modal.                                   */
  /* ---------------------------------------------------------------- */
  it("validates an empty campaign name", async () => {
    const wrapper = await mountForm();
    wrapper.vm.form.businessId = "b1";
    await flushPromises();
    await wrapper.findAll(".input-group .btn-outline-primary")[1].trigger("click");
    await wrapper
      .findAll(".modal-content")[0]
      .find(".btn-primary")
      .trigger("click");
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Campaign name is required" })
    );
    expect(createCampaign).not.toHaveBeenCalled();
  });

  it("requires a business before creating a campaign", async () => {
    const wrapper = await mountForm();
    // Force modal open without a selected business (call handler directly).
    wrapper.vm.showNewCampaignModal = true;
    wrapper.vm.newCampaignForm.name = "My Campaign";
    wrapper.vm.form.businessId = "";
    wrapper.vm.newCampaignForm.businessId = "";
    await wrapper.vm.handleCreateCampaign();
    await flushPromises();
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Please select a business first" })
    );
    expect(createCampaign).not.toHaveBeenCalled();
  });

  it("creates a campaign successfully using the form business id", async () => {
    createCampaign.mockResolvedValue({ data: { id: "cNew", name: "New Camp" } });
    const wrapper = await mountForm();
    wrapper.vm.form.businessId = "b1";
    await flushPromises();
    await wrapper.findAll(".input-group .btn-outline-primary")[1].trigger("click");
    wrapper.vm.newCampaignForm.name = "  New Camp  ";
    await wrapper
      .findAll(".modal-content")[0]
      .find(".btn-primary")
      .trigger("click");
    await flushPromises();
    expect(createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New Camp",
        businessId: "b1",
        status: "active",
        paymentStatus: "pending",
        isRecurring: false,
      })
    );
    expect(wrapper.vm.form.campaignId).toBe("cNew");
    expect(wrapper.vm.showNewCampaignModal).toBe(false);
  });

  it("creates a campaign using the explicit campaign-form business id", async () => {
    createCampaign.mockResolvedValue({ data: { id: "cX", name: "Camp X" } });
    const wrapper = await mountForm();
    wrapper.vm.newCampaignForm.name = "Camp X";
    wrapper.vm.newCampaignForm.businessId = "bExplicit";
    wrapper.vm.form.businessId = "";
    await wrapper.vm.handleCreateCampaign();
    await flushPromises();
    expect(createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ businessId: "bExplicit" })
    );
  });

  it("shows an error Swal when campaign creation rejects", async () => {
    createCampaign.mockRejectedValue(new Error("nope"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = await mountForm();
    wrapper.vm.form.businessId = "b1";
    await flushPromises();
    await wrapper.findAll(".input-group .btn-outline-primary")[1].trigger("click");
    wrapper.vm.newCampaignForm.name = "Camp";
    await wrapper
      .findAll(".modal-content")[0]
      .find(".btn-primary")
      .trigger("click");
    await flushPromises();
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Failed to create campaign. Please try again." })
    );
    expect(wrapper.vm.isCreatingCampaign).toBe(false);
    errSpy.mockRestore();
  });

  it("renders the selected business name in the campaign modal, defaulting when unknown", async () => {
    const wrapper = await mountForm();
    wrapper.vm.form.businessId = "b1";
    wrapper.vm.showNewCampaignModal = true;
    await flushPromises();
    const businessField = wrapper
      .findAll(".modal-content")[0]
      .findAll("input")[1];
    expect(businessField.element.value).toBe("Biz One");

    // Unknown business id -> "Selected Business" fallback.
    wrapper.vm.form.businessId = "unknown";
    await flushPromises();
    expect(businessField.element.value).toBe("Selected Business");
  });

  it("closes the campaign modal via close and cancel buttons", async () => {
    const wrapper = await mountForm();
    wrapper.vm.form.businessId = "b1";
    await flushPromises();
    await wrapper.findAll(".input-group .btn-outline-primary")[1].trigger("click");
    await wrapper.findAll(".modal-content")[0].find(".btn-close").trigger("click");
    expect(wrapper.vm.showNewCampaignModal).toBe(false);

    await wrapper.findAll(".input-group .btn-outline-primary")[1].trigger("click");
    await wrapper.findAll(".modal-content")[0].find(".btn-secondary").trigger("click");
    expect(wrapper.vm.showNewCampaignModal).toBe(false);
  });

  /* ---------------------------------------------------------------- */
  /* saveAd: validation failure path.                                  */
  /* ---------------------------------------------------------------- */
  it("saveAd shows the first validation error and does not call the API", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const wrapper = await mountForm();
    // Form is mostly empty -> validation fails.
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Validation Error" })
    );
    expect(createAd).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  /* ---------------------------------------------------------------- */
  /* saveAd: create success + error.                                   */
  /* ---------------------------------------------------------------- */
  // Sets a fully-valid form. businessId is set first and flushed so the
  // businessId watcher (which clears campaignId) runs before campaignId is set.
  const fillValidForm = async (wrapper) => {
    wrapper.vm.form.businessId = "b1";
    await flushPromises();
    wrapper.vm.form.title = "My Ad";
    wrapper.vm.form.description = "Desc";
    wrapper.vm.form.placementId = "p1";
    wrapper.vm.form.campaignId = "c1";
    wrapper.vm.form.images = ["data:image/png;base64,IMG"];
    wrapper.vm.form.startTime = "2099-01-01";
    wrapper.vm.form.endTime = "2099-01-07";
    wrapper.vm.form.linkUrl = "https://valid.example.com";
    await flushPromises();
  };

  it("saveAd creates an ad and emits add-ad + close on success", async () => {
    createAd.mockResolvedValue({ data: { id: "newAd" } });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const wrapper = await mountForm();
    await fillValidForm(wrapper);
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(createAd).toHaveBeenCalled();
    expect(wrapper.emitted("add-ad")).toBeTruthy();
    expect(wrapper.emitted("close")).toBeTruthy();
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Ad created successfully!" })
    );
    expect(wrapper.vm.isSubmitting).toBe(false);
    logSpy.mockRestore();
  });

  it("saveAd handles a create rejection with the server message", async () => {
    createAd.mockRejectedValue({ response: { data: { message: "Server says no" } } });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = await mountForm();
    await fillValidForm(wrapper);
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Server says no", icon: "error" })
    );
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it("saveAd falls back to the generic error message when none is provided", async () => {
    createAd.mockRejectedValue(new Error("network"));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wrapper = await mountForm();
    await fillValidForm(wrapper);
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Failed to save ad. Please try again." })
    );
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  /* ---------------------------------------------------------------- */
  /* Edit mode: full lifecycle.                                        */
  /* ---------------------------------------------------------------- */
  it("loads ad data in edit mode and fetches images by id", async () => {
    getMediaDataUrl.mockResolvedValue("data:image/png;base64,LOADED");
    const ad = {
      id: "a1",
      title: "Existing Ad",
      business: { id: "b1" },
      campaign: { id: "c1" },
      placement_id: "p1",
      hasAll: true,
      imageIds: ["m1", "m2"],
      video_url: "https://youtube.com/watch?v=vid",
    };
    const wrapper = await mountForm({ ad });
    await flushPromises();
    expect(wrapper.find("h3").text()).toBe("Edit Ad");
    expect(getMediaDataUrl).toHaveBeenCalledTimes(2);
    expect(wrapper.vm.form.images).toEqual([
      "data:image/png;base64,LOADED",
      "data:image/png;base64,LOADED",
    ]);
    expect(wrapper.vm.form.imageBase64).toBe("data:image/png;base64,LOADED");
    // Video URL preloaded.
    expect(wrapper.vm.videoPreviewUrl).toBe("https://youtube.com/watch?v=vid");
    // Submit button label reflects edit mode.
    expect(wrapper.find('button[type="submit"]').text()).toBe("Update Ad");
  });

  it("edit mode: fetchImages error path is handled", async () => {
    getMediaDataUrl.mockRejectedValue(new Error("img fail"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ad = {
      id: "a1",
      title: "Ad",
      business: { id: "b1" },
      campaign: { id: "c1" },
      placement_id: "p1",
      hasAll: true,
      imageIds: ["m1"],
    };
    const wrapper = await mountForm({ ad });
    await flushPromises();
    expect(errSpy).toHaveBeenCalledWith(
      "Error fetching images:",
      expect.any(Error)
    );
    expect(wrapper.vm.isLoadingImages).toBe(false);
    errSpy.mockRestore();
  });

  it("edit mode without images and not-hasAll fetches complete ad data and emits update-ad", async () => {
    getAd.mockResolvedValue({
      data: {
        id: "a1",
        title: "Full Ad",
        business: { id: "b1" },
        campaign: { id: "c1" },
        placement_id: "p1",
      },
    });
    const ad = {
      id: "a1",
      title: "Partial Ad",
      business: { id: "b1" },
      placement_id: "p1",
      hasAll: false,
    };
    const wrapper = await mountForm({ ad });
    await flushPromises();
    expect(getAd).toHaveBeenCalledWith("a1");
    const updates = wrapper.emitted("update-ad");
    expect(updates).toBeTruthy();
    expect(updates[updates.length - 1][0]).toMatchObject({ hasAll: true });
  });

  it("edit mode: fetchCompleteAdData error path is handled", async () => {
    getAd.mockRejectedValue(new Error("getAd fail"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ad = {
      id: "a1",
      title: "Partial",
      business: { id: "b1" },
      placement_id: "p1",
      hasAll: false,
    };
    const wrapper = await mountForm({ ad });
    await flushPromises();
    expect(errSpy).toHaveBeenCalledWith(
      "Error fetching complete ad data:",
      expect.any(Error)
    );
    expect(wrapper.emitted("update-ad")).toBeFalsy();
    errSpy.mockRestore();
  });

  it("fetchCompleteAdData returns early when ad has no id", async () => {
    const ad = {
      title: "No Id",
      business: { id: "b1" },
      placement_id: "p1",
      hasAll: false,
    };
    const wrapper = await mountForm({ ad });
    await flushPromises();
    expect(getAd).not.toHaveBeenCalled();
  });

  it("saveAd edits an ad and emits update-ad + close on success", async () => {
    editAd.mockResolvedValue({ data: { id: "a1" } });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const ad = {
      id: "a1",
      title: "Edit Me",
      business: { id: "b1" },
      campaign: { id: "c1" },
      placement_id: "p1",
      hasAll: true,
    };
    const wrapper = await mountForm({ ad });
    await fillValidForm(wrapper);
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editAd).toHaveBeenCalledWith("a1", expect.any(Object));
    expect(wrapper.emitted("update-ad")).toBeTruthy();
    expect(wrapper.emitted("close")).toBeTruthy();
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Ad updated successfully!" })
    );
    logSpy.mockRestore();
  });

  /* ---------------------------------------------------------------- */
  /* loadAdData guard: null ad short-circuits.                         */
  /* ---------------------------------------------------------------- */
  it("loadAdData returns early when there is no ad prop", async () => {
    const wrapper = await mountForm();
    // create mode -> calling loadAdData directly is a no-op.
    await wrapper.vm.loadAdData();
    expect(getMediaDataUrl).not.toHaveBeenCalled();
    expect(getAd).not.toHaveBeenCalled();
  });

  /* ---------------------------------------------------------------- */
  /* props.ad watcher: fires loadAdData when ad set after mount.       */
  /* ---------------------------------------------------------------- */
  it("reacts to the ad prop being set after mount (watcher)", async () => {
    getMediaDataUrl.mockResolvedValue("data:image/png;base64,W");
    const wrapper = await mountForm();
    await wrapper.setProps({
      ad: {
        id: "a2",
        title: "Watched Ad",
        business: { id: "b1" },
        campaign: { id: "c1" },
        placement_id: "p1",
        hasAll: true,
        imageIds: ["m9"],
      },
    });
    await flushPromises();
    expect(getMediaDataUrl).toHaveBeenCalledWith("m9");
    expect(wrapper.find("h3").text()).toBe("Edit Ad");
  });

  it("ad watcher ignores a null new ad", async () => {
    const wrapper = await mountForm({ ad: null });
    await wrapper.setProps({ ad: null });
    await flushPromises();
    expect(getAd).not.toHaveBeenCalled();
  });

  /* ---------------------------------------------------------------- */
  /* fetchImages guard: empty / non-array media ids.                   */
  /* ---------------------------------------------------------------- */
  it("fetchImages returns early for an empty media id list", async () => {
    const wrapper = await mountForm();
    await wrapper.vm.fetchImages([]);
    expect(getMediaDataUrl).not.toHaveBeenCalled();
    await wrapper.vm.fetchImages(null);
    expect(getMediaDataUrl).not.toHaveBeenCalled();
  });

  it("fetchImages with one image sets imageBase64 from the first entry", async () => {
    getMediaDataUrl.mockResolvedValue("data:image/png;base64,ONE");
    const wrapper = await mountForm();
    await wrapper.vm.fetchImages(["only"]);
    expect(wrapper.vm.form.images).toEqual(["data:image/png;base64,ONE"]);
    expect(wrapper.vm.form.imageBase64).toBe("data:image/png;base64,ONE");
  });

  /* ---------------------------------------------------------------- */
  /* removeImage handler.                                              */
  /* ---------------------------------------------------------------- */
  it("removeImage clears images and base64", async () => {
    const wrapper = await mountForm();
    wrapper.vm.form.images = ["a"];
    wrapper.vm.form.imageBase64 = "b";
    wrapper.vm.removeImage();
    expect(wrapper.vm.form.images).toEqual([]);
    expect(wrapper.vm.form.imageBase64).toBe("");
  });

  /* ---------------------------------------------------------------- */
  /* Validation error UI rendering branches.                           */
  /* ---------------------------------------------------------------- */
  it("renders all inline validation error messages when present", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const wrapper = await mountForm();
    // Trigger validation with an empty form.
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(wrapper.text()).toContain("Title is required");
    expect(wrapper.text()).toContain("Business is required");
    expect(wrapper.text()).toContain("Description is required");
    expect(wrapper.text()).toContain("Campaign is required");
    // Media error block (d-block) renders.
    expect(wrapper.find(".invalid-feedback.d-block").exists()).toBe(true);
    logSpy.mockRestore();
  });

  it("shows the invalid-URL feedback when linkUrl is set but invalid", async () => {
    const wrapper = await mountForm();
    // Force isValidUrl false through validation with a bad URL.
    wrapper.vm.form.linkUrl = "ht!tp://%%%";
    wrapper.vm.isValidUrl = false;
    await flushPromises();
    expect(wrapper.text()).toContain("Please enter a valid URL");
  });

  /* ---------------------------------------------------------------- */
  /* Drive every v-model writer via the real DOM so the compiled       */
  /* update functions execute.                                         */
  /* ---------------------------------------------------------------- */
  it("writes back through every bound form input (v-model handlers)", async () => {
    const wrapper = await mountForm();

    // Title (text input, first .form-control).
    await wrapper.find('input.form-control').setValue("New Title");
    expect(wrapper.vm.form.title).toBe("New Title");

    // Business + campaign selects.
    const selects = wrapper.findAll("select");
    await selects[0].setValue("b1");
    expect(wrapper.vm.form.businessId).toBe("b1");
    await flushPromises();
    await selects[1].setValue("c1");
    expect(wrapper.vm.form.campaignId).toBe("c1");

    // Description textarea.
    await wrapper.find("textarea").setValue("Some description");
    expect(wrapper.vm.form.description).toBe("Some description");

    // Click URL (third form-control input in the placement/url row).
    await wrapper.find('input[placeholder="https://example.com"]').setValue(
      "example.org"
    );
    await flushPromises();
    expect(wrapper.vm.form.linkUrl).toBe("https://example.org");

    // Start + end date inputs.
    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0].setValue("2099-05-05");
    expect(wrapper.vm.form.startTime).toBe("2099-05-05");
    await dateInputs[1].setValue("2099-05-11");
    expect(wrapper.vm.form.endTime).toBe("2099-05-11");

    // Payment method radios.
    const radios = wrapper.findAll('input[type="radio"]');
    await radios[0].setValue(); // payfast
    expect(wrapper.vm.form.paymentMethod).toBe("payfast");
    await radios[1].setValue(); // eft
    expect(wrapper.vm.form.paymentMethod).toBe("eft");

    // Payment amount (readonly but still v-model-bound).
    const amountInput = wrapper
      .findAll("input.form-control")
      .find((i) => i.element.value === wrapper.vm.form.paymentInfo.amount);
    await amountInput.setValue("123.45");
    expect(wrapper.vm.form.paymentInfo.amount).toBe("123.45");

    // Payment status select.
    const statusSelect = wrapper
      .findAll("select")
      .find((s) => s.findAll("option").some((o) => o.text() === "COMPLETE"));
    await statusSelect.setValue("FAILED");
    expect(wrapper.vm.form.paymentInfo.status).toBe("FAILED");

    // Payment reference.
    await wrapper.find('input[placeholder="e.g., AD-12345"]').setValue("REF-1");
    expect(wrapper.vm.form.paymentInfo.reference).toBe("REF-1");

    // Enabled checkbox.
    const enabled = wrapper.find("#enabled");
    await enabled.setValue(false);
    expect(wrapper.vm.form.enabled).toBe(false);

    // TagSelector v-model update.
    wrapper.findComponent(TagSelectorStub).vm.$emit("update:modelValue", ["t1"]);
    await flushPromises();
    expect(wrapper.vm.form.tags).toEqual(["t1"]);
  });

  it("writes back through the YouTube URL input in video mode", async () => {
    const wrapper = await mountForm();
    await wrapper.findAll(".btn-group button")[1].trigger("click");
    const urlInput = wrapper.find(
      'input[placeholder^="https://www.youtube.com"]'
    );
    await urlInput.setValue("https://youtube.com/watch?v=zzz");
    expect(wrapper.vm.form.videoUrl).toBe("https://youtube.com/watch?v=zzz");
  });

  it("writes back through the new-business modal inputs", async () => {
    const wrapper = await mountForm();
    await wrapper.findAll(".input-group .btn-outline-primary")[0].trigger("click");
    const modal = wrapper.findAll(".modal-content")[0];
    await modal.find('input[placeholder="Enter business name"]').setValue("BizX");
    expect(wrapper.vm.newBusinessForm.name).toBe("BizX");
    await modal.find("select").setValue("individual");
    expect(wrapper.vm.newBusinessForm.type).toBe("individual");
  });

  it("writes back through the new-campaign modal inputs", async () => {
    const wrapper = await mountForm();
    wrapper.vm.form.businessId = "b1";
    await flushPromises();
    await wrapper.findAll(".input-group .btn-outline-primary")[1].trigger("click");
    const modal = wrapper.findAll(".modal-content")[0];
    await modal.find('input[placeholder="Enter campaign name"]').setValue("CampX");
    expect(wrapper.vm.newCampaignForm.name).toBe("CampX");
    await modal.find("select").setValue("paid");
    expect(wrapper.vm.newCampaignForm.paymentStatus).toBe("paid");
  });

  /* ---------------------------------------------------------------- */
  /* Remaining branch coverage.                                        */
  /* ---------------------------------------------------------------- */
  it("initializeForm sets a default paymentInfo when the form lacks one (line 126 true)", async () => {
    // Drive the `if (!form.value.paymentInfo)` true branch by nulling paymentInfo
    // and re-running initializeForm (create mode). The guard rebuilds the object
    // before resetForm runs at the end.
    const wrapper = await mountForm();
    wrapper.vm.form.paymentInfo = null;
    await wrapper.vm.initializeForm();
    await flushPromises();
    // resetForm (create mode) leaves the rebuilt-then-reset paymentInfo object.
    expect(wrapper.vm.form.paymentInfo).toBeTruthy();
    expect(wrapper.vm.form.paymentInfo).toHaveProperty("amount");
    expect(wrapper.vm.form.paymentInfo).toHaveProperty("status");
  });

  it("loadAdData skips cost recalculation when the placement id has no match (line 162 false)", async () => {
    getMediaDataUrl.mockResolvedValue("data:image/png;base64,X");
    const ad = {
      id: "a1",
      title: "Ad",
      business: { id: "b1" },
      campaign: { id: "c1" },
      placement_id: "unknown-placement",
      hasAll: true,
      imageIds: ["m1"],
    };
    const wrapper = await mountForm({ ad });
    await flushPromises();
    // selectedPlacement ends undefined because no placement matched.
    expect(wrapper.vm.selectedPlacement).toBeUndefined();
  });

  it("fetchCompleteAdData skips placement match when placementId is empty (line 194 false)", async () => {
    getAd.mockResolvedValue({
      data: { id: "a1", title: "Full", business: { id: "b1" }, campaign: { id: "c1" } },
    });
    const ad = {
      id: "a1",
      title: "Partial",
      business: { id: "b1" },
      // no placement_id -> form.placementId stays empty
      hasAll: false,
    };
    const wrapper = await mountForm({ ad });
    await flushPromises();
    expect(getAd).toHaveBeenCalledWith("a1");
    expect(wrapper.emitted("update-ad")).toBeTruthy();
  });

  it("youtubeEmbedUrl returns null for an empty video URL (extractYouTubeId line 310 true)", async () => {
    const wrapper = await mountForm();
    // In video mode with no URL, the embed computed evaluates extractYouTubeId('').
    await wrapper.findAll(".btn-group button")[1].trigger("click");
    await flushPromises();
    expect(wrapper.vm.youtubeEmbedUrl).toBe(null);
    expect(wrapper.vm.isYouTubeUrl).toBe(false);
  });

  it("saveAd create uses null image when payload has no images (line 512 binary-expr)", async () => {
    createAd.mockResolvedValue({ data: { id: "newAd" } });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const wrapper = await mountForm();
    // Valid form but video-only (no images) so payload.images is empty.
    wrapper.vm.form.businessId = "b1";
    await flushPromises();
    wrapper.vm.form.title = "Vid Ad";
    wrapper.vm.form.description = "Desc";
    wrapper.vm.form.placementId = "p1";
    wrapper.vm.form.campaignId = "c1";
    wrapper.vm.form.videoUrl = "https://youtube.com/watch?v=abc";
    wrapper.vm.form.images = [];
    wrapper.vm.form.imageBase64 = "";
    wrapper.vm.form.startTime = "2099-01-01";
    wrapper.vm.form.endTime = "2099-01-07";
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(createAd).toHaveBeenCalled();
    const emitted = wrapper.emitted("add-ad")[0][0];
    expect(emitted.image).toEqual({ file: null });
    logSpy.mockRestore();
  });

  it("saveAd edit uses null image when payload has no images (line 505 binary-expr)", async () => {
    editAd.mockResolvedValue({ data: { id: "a1" } });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const ad = {
      id: "a1",
      title: "Edit",
      business: { id: "b1" },
      campaign: { id: "c1" },
      placement_id: "p1",
      hasAll: true,
    };
    const wrapper = await mountForm({ ad });
    wrapper.vm.form.businessId = "b1";
    await flushPromises();
    wrapper.vm.form.title = "Edit Vid";
    wrapper.vm.form.description = "Desc";
    wrapper.vm.form.placementId = "p1";
    wrapper.vm.form.campaignId = "c1";
    wrapper.vm.form.videoUrl = "https://youtube.com/watch?v=abc";
    wrapper.vm.form.images = [];
    wrapper.vm.form.imageBase64 = "";
    wrapper.vm.form.startTime = "2099-01-01";
    wrapper.vm.form.endTime = "2099-01-07";
    await flushPromises();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();
    expect(editAd).toHaveBeenCalled();
    const emitted = wrapper.emitted("update-ad").at(-1)[0];
    expect(emitted.image).toEqual({ file: null });
    logSpy.mockRestore();
  });

  it("ad watcher does not reload when placements list is empty (line 542 false)", async () => {
    // Make initial load yield an empty placements list... placements is always
    // forced to a single synthesized placement, so simulate by clearing it then
    // setting the prop.
    const wrapper = await mountForm();
    wrapper.vm.placements = [];
    await flushPromises();
    getMediaDataUrl.mockClear();
    getAd.mockClear();
    await wrapper.setProps({
      ad: {
        id: "a9",
        title: "Watched",
        business: { id: "b1" },
        campaign: { id: "c1" },
        hasAll: false,
      },
    });
    await flushPromises();
    // Watcher condition placements.length > 0 is false -> loadAdData not invoked.
    expect(getAd).not.toHaveBeenCalled();
  });
});
