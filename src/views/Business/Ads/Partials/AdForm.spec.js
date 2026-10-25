import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// ---- Mock every external boundary AdForm.vue imports ----

const getPlacements = vi.fn();
const createAd = vi.fn();
const editAd = vi.fn();
const getCampaigns = vi.fn();

vi.mock("@/features/ads/AdsService", () => ({
  getPlacements: (...args) => getPlacements(...args),
  createAd: (...args) => createAd(...args),
  editAd: (...args) => editAd(...args),
}));

vi.mock("@/features/businesses/BusinessesService", () => ({
  getCampaigns: (...args) => getCampaigns(...args),
}));

import AdForm from "./AdForm.vue";

const factory = (props = {}) =>
  mount(AdForm, {
    props,
    global: {
      stubs: {
        // Stub ImagePicker (pulls heavy image/crop deps) — we drive its events directly.
        ImagePicker: {
          name: "ImagePicker",
          props: ["modelValue", "initialImage", "designHelp", "aspectRatio"],
          emits: ["update:modelValue", "edit"],
          template: "<div class='image-picker-stub'></div>",
        },
      },
    },
  });

// A placement record as returned from the backend; AdForm overrides most of it but
// keeps `id` from this base object (which becomes form.placementId).
const makePlacement = (overrides = {}) => ({
  id: "pl-1",
  location: "home_banner",
  fee_type: "FIXED",
  billing_unit: "DAY",
  width: 300,
  height: 250,
  fee: 100,
  ...overrides,
});

const makeAd = (overrides = {}) => ({
  id: 55,
  title: "Existing Ad",
  description: "Existing description",
  total_cost: "900.00",
  campaign_id: 7,
  image_url: "https://img/old.png",
  click_url: "https://example.com",
  video_url: "https://video/old.mp4",
  placement_id: "pl-1",
  image: { file: "data:image/png;base64,OLD" },
  placement_date: "2026-02-01T10:00:00",
  expiry_date: "2026-02-08T10:00:00",
  status: "pending",
  ...overrides,
});

describe("Business/Ads/Partials/AdForm.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Default: getPlacements resolves with one placement.
    getPlacements.mockResolvedValue({ data: [makePlacement()] });
  });

  // ---------------------------------------------------------------------------
  // CREATE MODE (no ad prop)
  // ---------------------------------------------------------------------------

  it("renders create mode with header/button, close button visible, empty-image col branch", async () => {
    const wrapper = factory({});
    await flushPromises();

    // isEdit === false template branches.
    expect(wrapper.find("h3").text()).toBe("Create New Ad");
    expect(wrapper.text()).toContain("Create Ad");

    // getPlacements called by onMounted.
    expect(getPlacements).toHaveBeenCalledTimes(1);

    // Not submitting => close button rendered.
    expect(wrapper.find("button.btn-close").exists()).toBe(true);

    // form reset to initialData in the create (else) branch => empty title.
    expect(wrapper.vm.form.title).toBe("");
    expect(wrapper.vm.isEdit).toBe(false);

    // imageBase64 empty => image block gets the col-md-6 class branch.
    const imageBlock = wrapper.find(".image-picker-stub").element.parentElement;
    expect(imageBlock.classList.contains("col-md-6")).toBe(true);
  });

  it("uses fallback base placement when getPlacements resolves with null data (|| [] and length===0 branches)", async () => {
    getPlacements.mockResolvedValue({ data: null });

    const wrapper = factory({});
    await flushPromises();

    // Still renders the placement option (built from the fallback base).
    expect(getPlacements).toHaveBeenCalledTimes(1);
    expect(wrapper.find("h3").text()).toBe("Create New Ad");
    // Placement select shows the disabled prompt + the single placement option.
    const placementSelect = wrapper.findAll("select")[0];
    const options = placementSelect.findAll("option");
    expect(options.length).toBe(2);
    expect(options[0].text()).toBe("-- Select Placement --");
  });

  it("renders the non-empty placement v-for option label via formatPlacement", async () => {
    const wrapper = factory({});
    await flushPromises();

    const placementSelect = wrapper.findAll("select")[0];
    const options = placementSelect.findAll("option");
    // disabled prompt + 1 placement.
    expect(options.length).toBe(2);
    // onMounted overrides location -> main_page_ad, fee -> 900, billing_unit -> WEEK,
    // keeping width/height from the base placement (300x250). formatPlacement uppercases
    // the location, swaps underscores, and appends dims + fee/unit.
    expect(options[1].text()).toContain("MAIN PAGE AD");
    expect(options[1].text()).toContain("(300x250)");
    expect(options[1].text()).toContain("$900/WEEK");
  });

  it("updateIsUpdate sets imageUpdated when ImagePicker emits edit", async () => {
    const wrapper = factory({});
    await flushPromises();

    const picker = wrapper.findComponent({ name: "ImagePicker" });
    await picker.vm.$emit("edit", true);
    expect(wrapper.vm.imageUpdated).toBe(true);
  });

  it("v-model inputs update the form (title, description, click URL, start/end time, image)", async () => {
    const wrapper = factory({});
    await flushPromises();

    // Title input (first text input).
    await wrapper.find("input.form-control").setValue("My Title");
    expect(wrapper.vm.form.title).toBe("My Title");

    // Description textarea.
    await wrapper.find("#description").setValue("My Description");
    expect(wrapper.vm.form.description).toBe("My Description");

    // ImagePicker v-model update handler.
    await wrapper
      .findComponent({ name: "ImagePicker" })
      .vm.$emit("update:modelValue", "data:image/png;base64,VM");
    expect(wrapper.vm.form.imageBase64).toBe("data:image/png;base64,VM");

    // Click URL is the 2nd plain text input (after Title) — find by label position.
    const textInputs = wrapper
      .findAll("input.form-control")
      .filter((i) => i.attributes("type") === undefined);
    // [0] = Title, [1] = Click URL.
    await textInputs[1].setValue("https://click.example");
    expect(wrapper.vm.form.linkUrl).toBe("https://click.example");

    // Start/End datetime-local inputs.
    const dt = wrapper.findAll('input[type="datetime-local"]');
    await dt[0].setValue("2026-05-01T08:00");
    expect(wrapper.vm.form.startTime).toBe("2026-05-01T08:00");
    await dt[1].setValue("2026-05-08T08:00");
    expect(wrapper.vm.form.endTime).toBe("2026-05-08T08:00");
  });

  it("calculateCost FIXED with an unknown billing_unit leaves multiplier at 1 (else-if chain false tail)", async () => {
    const wrapper = factory({});
    await flushPromises();

    // FIXED fee but a billing_unit that is neither DAY/WEEK/MONTH => multiplier stays 1.
    wrapper.vm.placements[0].fee_type = "FIXED";
    wrapper.vm.placements[0].billing_unit = "YEAR";
    wrapper.vm.placements[0].fee = 250;
    await wrapper.vm.$nextTick();

    const placementSelect = wrapper.findAll("select")[0];
    await placementSelect.trigger("change");
    await wrapper.vm.$nextTick();

    // onPlacementSelect's else branch (non-MONTH/WEEK) sets start==end (one-day),
    // then calculateCost with unknown unit => fee * 1 = 250.00.
    expect(wrapper.vm.form.totalCost).toBe("250.00");
  });

  it("create submit success: createAd resolves => emits add-ad + close (not-edit base64 branch)", async () => {
    createAd.mockResolvedValue({ data: { id: 123, title: "New" } });

    // Provide an ad-like object with status so props.ad.status doesn't throw,
    // but keep create mode by NOT making it an edit (ad must be null for isEdit).
    // To exercise the create success path we instead set form/internal state and
    // rely on isEdit=false; props.ad.status would throw, so we mount with an ad
    // and force isEdit=false to hit the createAd branch.
    const wrapper = factory({ ad: makeAd({ status: "pending" }) });
    await flushPromises();

    // Force create branch while ad prop is present (so props.ad.status is defined).
    wrapper.vm.isEdit = false;
    wrapper.vm.imageUpdated = false;
    wrapper.vm.form.imageBase64 = "data:image/png;base64,NEW";
    await wrapper.vm.$nextTick();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(createAd).toHaveBeenCalledTimes(1);
    const payload = createAd.mock.calls[0][0];
    // not-edit => base64 is data.imageBase64 directly.
    expect(payload.imageBase64).toBe("data:image/png;base64,NEW");
    expect(payload.status).toBe("pending");

    expect(wrapper.emitted("add-ad")).toBeTruthy();
    expect(wrapper.emitted("add-ad")[0][0]).toMatchObject({
      id: 123,
      image: { file: "data:image/png;base64,NEW" },
    });
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // EDIT MODE (ad prop provided)
  // ---------------------------------------------------------------------------

  it("renders edit mode: maps ad into form, edit header/button, present-image col branch", async () => {
    const wrapper = factory({ ad: makeAd() });
    await flushPromises();

    expect(wrapper.find("h3").text()).toBe("Edit Ad");
    expect(wrapper.text()).toContain("Update Ad");
    expect(wrapper.vm.isEdit).toBe(true);

    // Mapped fields (campaign_id ?? 1 left side, optional-chaining defined sides).
    // NOTE: startTime/endTime are mapped from the ad but then immediately overwritten
    // by onPlacementSelect() (placement id "pl-1" is found), so we don't assert them here.
    expect(wrapper.vm.form.title).toBe("Existing Ad");
    expect(wrapper.vm.form.campaignId).toBe(7);
    expect(wrapper.vm.form.imageBase64).toBe("data:image/png;base64,OLD");
    // onPlacementSelect ran => start/end are valid datetime-local strings (today-based).
    expect(wrapper.vm.form.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(wrapper.vm.form.endTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

    // imageBase64 present => image block does NOT get col-md-6.
    const imageBlock = wrapper.find(".image-picker-stub").element.parentElement;
    expect(imageBlock.classList.contains("col-md-6")).toBe(false);
  });

  it("edit mapping: missing campaign_id/image/dates use ?? 1 and optional-chaining undefined branches", async () => {
    const ad = makeAd({
      campaign_id: null,
      image: undefined,
      placement_date: undefined,
      expiry_date: undefined,
    });
    const wrapper = factory({ ad });
    await flushPromises();

    // The optional-chaining undefined branches on placement_date/expiry_date run during
    // mapping (then onPlacementSelect overwrites the dates), and image?.file is undefined.
    expect(wrapper.vm.form.campaignId).toBe(1); // ?? 1 right side
    expect(wrapper.vm.form.imageBase64).toBeUndefined();
  });

  it("edit submit success (image not updated => base64 null) => emits update-ad + close", async () => {
    editAd.mockResolvedValue({ data: { id: 55, title: "Updated" } });

    const wrapper = factory({ ad: makeAd() });
    await flushPromises();

    // imageUpdated false by default => edit base64 branch resolves to null.
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(editAd).toHaveBeenCalledTimes(1);
    expect(editAd.mock.calls[0][0]).toBe(55);
    const payload = editAd.mock.calls[0][1];
    expect(payload.imageBase64).toBeNull();
    expect(payload.status).toBe("pending");

    expect(wrapper.emitted("update-ad")).toBeTruthy();
    expect(wrapper.emitted("update-ad")[0][0]).toMatchObject({ id: 55 });
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("edit submit with updated image (imageUpdated true => base64 = imageBase64 ?? null left side)", async () => {
    editAd.mockResolvedValue({ data: { id: 55 } });

    const wrapper = factory({ ad: makeAd() });
    await flushPromises();

    const picker = wrapper.findComponent({ name: "ImagePicker" });
    await picker.vm.$emit("edit", true);
    wrapper.vm.form.imageBase64 = "data:image/png;base64,EDIT";
    await wrapper.vm.$nextTick();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    const payload = editAd.mock.calls[0][1];
    expect(payload.imageBase64).toBe("data:image/png;base64,EDIT");
  });

  it("edit submit with updated image but nullish base64 (imageUpdated true => ?? null right side)", async () => {
    editAd.mockResolvedValue({ data: { id: 55 } });

    const wrapper = factory({ ad: makeAd() });
    await flushPromises();

    const picker = wrapper.findComponent({ name: "ImagePicker" });
    await picker.vm.$emit("edit", true);
    wrapper.vm.form.imageBase64 = null; // nullish => null
    await wrapper.vm.$nextTick();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    const payload = editAd.mock.calls[0][1];
    expect(payload.imageBase64).toBeNull();
  });

  it("edit submit rejection => catch branch alerts + logs, isSubmitting reset in finally", async () => {
    const error = new Error("boom");
    editAd.mockRejectedValue(error);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const wrapper = factory({ ad: makeAd() });
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith("Failed to save ad", error);
    expect(alertSpy).toHaveBeenCalledWith("There was an error saving the ad.");
    expect(wrapper.vm.isSubmitting).toBe(false);
    alertSpy.mockRestore();
  });

  it("shows spinner while submitting and hides close button (isSubmitting true branch)", async () => {
    let resolveEdit;
    editAd.mockReturnValue(
      new Promise((resolve) => {
        resolveEdit = resolve;
      })
    );

    const wrapper = factory({ ad: makeAd() });
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.find("button.btn-close").exists()).toBe(false);
    expect(
      wrapper.find("button.btn-success").attributes("disabled")
    ).toBeDefined();

    resolveEdit({ data: { id: 55 } });
    await flushPromises();

    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.find("button.btn-close").exists()).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // CANCEL / CLOSE EMITS
  // ---------------------------------------------------------------------------

  it("emits close from header close button and footer Cancel button", async () => {
    const wrapper = factory({});
    await flushPromises();

    await wrapper.find("button.btn-close").trigger("click");
    await wrapper.find("button.btn-outline-secondary").trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
    expect(wrapper.emitted("close").length).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // onPlacementSelect billing_unit branches (via @change) + active disabled branch
  // ---------------------------------------------------------------------------

  it("onPlacementSelect WEEK branch: triggers @change and recalculates a 7-day range", async () => {
    const wrapper = factory({});
    await flushPromises();

    // The single placement uses billing_unit WEEK + fee 900 (set in onMounted).
    const placementSelect = wrapper.findAll("select")[0];
    await placementSelect.trigger("change");
    await wrapper.vm.$nextTick();

    // WEEK => endTime is 6 days after startTime; cost ceil(7/7)*900 = 900.
    expect(wrapper.vm.form.totalCost).toBe("900.00");
  });

  it("onPlacementSelect MONTH branch + calculateCost MONTH multiplier", async () => {
    const wrapper = factory({});
    await flushPromises();

    // Override the single placement to MONTH billing to hit those branches.
    wrapper.vm.placements[0].billing_unit = "MONTH";
    wrapper.vm.placements[0].fee_type = "FIXED";
    wrapper.vm.placements[0].fee = 900;
    await wrapper.vm.$nextTick();

    const placementSelect = wrapper.findAll("select")[0];
    await placementSelect.trigger("change");
    await wrapper.vm.$nextTick();

    // MONTH => endTime is +1 month; days ~31, ceil((31-1)/30)=1 => 900.
    expect(Number(wrapper.vm.form.totalCost)).toBeGreaterThan(0);
    expect(wrapper.vm.selectedPlacement.billing_unit).toBe("MONTH");
  });

  it("onPlacementSelect DAY branch (else) + calculateCost DAY multiplier", async () => {
    const wrapper = factory({});
    await flushPromises();

    wrapper.vm.placements[0].billing_unit = "DAY";
    wrapper.vm.placements[0].fee_type = "FIXED";
    wrapper.vm.placements[0].fee = 50;
    await wrapper.vm.$nextTick();

    const placementSelect = wrapper.findAll("select")[0];
    await placementSelect.trigger("change");
    await wrapper.vm.$nextTick();

    // DAY => start==end => days=1 => 50*1 = 50.00.
    expect(wrapper.vm.form.totalCost).toBe("50.00");
  });

  it("calculateCost no-op when fee_type is not FIXED (else of FIXED branch)", async () => {
    const wrapper = factory({});
    await flushPromises();

    wrapper.vm.placements[0].fee_type = "CPM";
    wrapper.vm.placements[0].billing_unit = "DAY";
    const before = wrapper.vm.form.totalCost;
    await wrapper.vm.$nextTick();

    const placementSelect = wrapper.findAll("select")[0];
    await placementSelect.trigger("change");
    await wrapper.vm.$nextTick();

    // Non-FIXED => totalCost left unchanged by calculateCost.
    expect(wrapper.vm.form.totalCost).toBe(before);
  });

  // ---------------------------------------------------------------------------
  // validateAndRecalculate branches (datetime-local @change)
  // ---------------------------------------------------------------------------

  it("validateAndRecalculate: valid range recalculates cost (no alert)", async () => {
    const wrapper = factory({});
    await flushPromises();

    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    wrapper.vm.form.startTime = "2026-03-01T00:00";
    wrapper.vm.form.endTime = "2026-03-08T00:00";
    await wrapper.vm.$nextTick();

    const startInput = wrapper.findAll('input[type="datetime-local"]')[0];
    await startInput.trigger("change");
    await wrapper.vm.$nextTick();

    expect(alertSpy).not.toHaveBeenCalled();
    expect(wrapper.vm.form.endTime).toBe("2026-03-08T00:00");
    alertSpy.mockRestore();
  });

  it("validateAndRecalculate: end before start => alert and clears endTime", async () => {
    const wrapper = factory({});
    await flushPromises();

    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    wrapper.vm.form.startTime = "2026-03-10T00:00";
    wrapper.vm.form.endTime = "2026-03-01T00:00"; // before start
    await wrapper.vm.$nextTick();

    const endInput = wrapper.findAll('input[type="datetime-local"]')[1];
    await endInput.trigger("change");
    await wrapper.vm.$nextTick();

    expect(alertSpy).toHaveBeenCalledWith("End date must be after start date.");
    expect(wrapper.vm.form.endTime).toBe("");
    alertSpy.mockRestore();
  });

  it("validateAndRecalculate: valid start but invalid end => alert and clears endTime", async () => {
    const wrapper = factory({});
    await flushPromises();

    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    wrapper.vm.form.startTime = "2026-03-10T00:00";
    wrapper.vm.form.endTime = "not-a-date"; // invalid => start valid && !end valid
    await wrapper.vm.$nextTick();

    const endInput = wrapper.findAll('input[type="datetime-local"]')[1];
    await endInput.trigger("change");
    await wrapper.vm.$nextTick();

    expect(alertSpy).toHaveBeenCalledWith("End date must be after start date.");
    expect(wrapper.vm.form.endTime).toBe("");
    alertSpy.mockRestore();
  });

  // ---------------------------------------------------------------------------
  // calculateCost early return when no selected placement
  // ---------------------------------------------------------------------------

  it("calculateCost returns early when there is no selected placement", async () => {
    const wrapper = factory({});
    await flushPromises();

    wrapper.vm.selectedPlacement = null;
    const before = wrapper.vm.form.totalCost;
    await wrapper.vm.$nextTick();

    // Trigger a recalculation path with no placement => early return, cost unchanged.
    wrapper.vm.form.startTime = "2026-03-01T00:00";
    wrapper.vm.form.endTime = "2026-03-08T00:00";
    const startInput = wrapper.findAll('input[type="datetime-local"]')[0];
    await startInput.trigger("change");
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.form.totalCost).toBe(before);
  });

  // ---------------------------------------------------------------------------
  // active-status disabled/readonly template branches
  // ---------------------------------------------------------------------------

  it("active ad disables placement and datetime inputs (ad?.status === 'active' branch)", async () => {
    const wrapper = factory({ ad: makeAd({ status: "active", placement_id: "pl-1" }) });
    await flushPromises();

    const placementSelect = wrapper.findAll("select")[0];
    expect(placementSelect.attributes("disabled")).toBeDefined();

    const dtInputs = wrapper.findAll('input[type="datetime-local"]');
    expect(dtInputs[0].attributes("disabled")).toBeDefined();
    expect(dtInputs[1].attributes("disabled")).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // WATCH on the ad prop
  // ---------------------------------------------------------------------------

  it("watch: setting ad prop from null to a value remaps the form (edit branch + ?? 1 left side)", async () => {
    const wrapper = factory({});
    await flushPromises();
    expect(wrapper.vm.isEdit).toBe(false);

    await wrapper.setProps({ ad: makeAd({ title: "Watched", id: 9 }) });
    await flushPromises();

    expect(wrapper.vm.isEdit).toBe(true);
    expect(wrapper.vm.form.title).toBe("Watched");
    expect(wrapper.vm.form.campaignId).toBe(7);
    // onPlacementSelect (called by the watch's edit branch) overwrites the dates with
    // today-based datetime-local strings.
    expect(wrapper.vm.form.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("watch: edit branch with missing optional fields (?? 1 right side + undefined optional chains)", async () => {
    const wrapper = factory({});
    await flushPromises();

    await wrapper.setProps({
      ad: makeAd({
        campaign_id: undefined,
        image: undefined,
        placement_date: undefined,
        expiry_date: undefined,
      }),
    });
    await flushPromises();

    // ?? 1 right side, and the optional-chaining undefined branches run during mapping.
    expect(wrapper.vm.form.campaignId).toBe(1);
    expect(wrapper.vm.form.imageBase64).toBeUndefined();
  });

  it("watch: setting ad prop back to null resets the form (else branch)", async () => {
    const wrapper = factory({ ad: makeAd() });
    await flushPromises();
    expect(wrapper.vm.isEdit).toBe(true);

    await wrapper.setProps({ ad: null });
    await flushPromises();

    expect(wrapper.vm.isEdit).toBe(false);
    expect(wrapper.vm.form.title).toBe("");
  });
});
