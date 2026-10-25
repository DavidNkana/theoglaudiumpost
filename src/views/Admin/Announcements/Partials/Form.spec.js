import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// Mock the announcements service boundary (every external function imported by Form.vue).
const getCategories = vi.fn();
const createAnnouncement = vi.fn();
const editAnnouncement = vi.fn();

vi.mock("@/features/announcements/AnnouncementsService", () => ({
  getCategories: (...args) => getCategories(...args),
  createAnnouncement: (...args) => createAnnouncement(...args),
  editAnnouncement: (...args) => editAnnouncement(...args),
}));

import Form from "./Form.vue";

const CATEGORIES = [
  { id: 1, name: "News" },
  { id: 2, name: "Events" },
];

const makeAnnouncement = (overrides = {}) => ({
  id: 42,
  title: "Existing Title",
  description: "Existing description",
  slug: "existing-title",
  image: { file: "data:image/png;base64,AAA" },
  location: "Hall A",
  category: { id: 2 },
  priority: "high",
  status: "draft",
  publish_date: "2026-01-01T10:00",
  expire_date: "2026-02-01T10:00",
  ...overrides,
});

const factory = (props = {}) =>
  mount(Form, {
    props,
    global: {
      // Stub child components so we control their emitted events directly.
      stubs: {
        InputLabel: {
          name: "InputLabel",
          props: ["value", "isRequired", "for"],
          template: "<label>{{ value }}</label>",
        },
        ImagePicker: {
          name: "ImagePicker",
          props: ["modelValue", "initialImage"],
          emits: ["update:modelValue", "edit"],
          template: "<div class='image-picker-stub'></div>",
        },
      },
    },
  });

describe("Announcements/Partials/Form.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    // Default: getCategories resolves with data.
    getCategories.mockResolvedValue({ data: CATEGORIES });
  });

  // ---- CREATE MODE (no announcement prop) ----

  it("renders create mode: empty categories v-for, create header/button, close button visible", async () => {
    // Resolve categories with an EMPTY list to cover the empty v-for branch.
    getCategories.mockResolvedValue({ data: [] });

    const wrapper = factory({});
    await flushPromises();

    // isEdit === false branches in template.
    expect(wrapper.find("h3").text()).toBe("Create New Announcement");
    expect(wrapper.text()).toContain("Create");

    // onMounted called getCategories with {}.
    expect(getCategories).toHaveBeenCalledWith({});

    // Empty category list => only the disabled "-- Select --" option in category select.
    const categorySelect = wrapper.find("#category");
    expect(categorySelect.findAll("option")).toHaveLength(1);
    expect(categorySelect.find("option").text()).toBe("-- Select --");

    // Close button visible while not submitting.
    expect(wrapper.find("button.btn-close").exists()).toBe(true);

    // imageBase64 empty => wrapper div gets the col-md-6 class branch.
    expect(wrapper.find(".col-md-6.mb-3, .mb-3.col-md-6").exists()).toBe(true);
  });

  it("renders non-empty category options from the resolved service data", async () => {
    const wrapper = factory({});
    await flushPromises();

    const categorySelect = wrapper.find("#category");
    const options = categorySelect.findAll("option");
    // disabled "-- Select --" + 2 categories.
    expect(options).toHaveLength(3);
    expect(options[1].text()).toBe("News");
    expect(options[2].text()).toBe("Events");
  });

  it("generateSlug returns early when title is empty (no slug change)", async () => {
    const wrapper = factory({});
    await flushPromises();

    const titleInput = wrapper.find("input.form-control");
    // Title is empty initially; triggering input keeps slug empty (early return).
    await titleInput.trigger("input");
    expect(wrapper.vm.form.slug).toBe("");
  });

  it("generateSlug normalizes the title into a slug on input", async () => {
    const wrapper = factory({});
    await flushPromises();

    const titleInput = wrapper.find("input.form-control");
    await titleInput.setValue("  Hello!!  World -- Test  ");
    // setValue triggers an input event which calls generateSlug().
    expect(wrapper.vm.form.slug).toBe("-hello-world-test-");
  });

  it("updateIsImageUpdated sets imageUpdated when ImagePicker emits edit", async () => {
    const wrapper = factory({});
    await flushPromises();

    const picker = wrapper.findComponent({ name: "ImagePicker" });
    await picker.vm.$emit("edit", true);
    expect(wrapper.vm.imageUpdated).toBe(true);
  });

  it("submits create successfully and emits add + close (imageBase64 passed through, no expire_date)", async () => {
    createAnnouncement.mockResolvedValue({ data: { id: 99, title: "New" } });

    const wrapper = factory({});
    await flushPromises();

    // Populate every field through the DOM so each v-model update handler runs.
    await wrapper.find("input.form-control").setValue("New Announcement"); // title
    await wrapper.find("#description").setValue("Desc"); // textarea
    await wrapper.find("#location").setValue("Loc"); // location input
    // ImagePicker v-model update handler.
    await wrapper
      .findComponent({ name: "ImagePicker" })
      .vm.$emit("update:modelValue", "data:image/png;base64,IMG");
    await wrapper.find("#category").setValue(1); // category select
    await wrapper.find("#priority").setValue("low"); // priority select
    await wrapper.find("#status").setValue("published"); // status select
    await wrapper.find("#publish_date").setValue("2026-03-01T09:00"); // publish_date
    // expire_date intentionally left empty (falsy branch); but exercise its handler:
    await wrapper.find("#expiry_date").setValue("2026-04-01T09:00");
    await wrapper.find("#expiry_date").setValue(""); // back to falsy for this test
    await wrapper.vm.$nextTick();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(createAnnouncement).toHaveBeenCalledTimes(1);
    const payload = createAnnouncement.mock.calls[0][0];
    expect(payload.title).toBe("New Announcement");
    // create mode => base64 = data.imageBase64 (not null).
    expect(payload.imageBase64).toBe("data:image/png;base64,IMG");
    expect(payload.publish_date).toBeInstanceOf(Date);
    // expire_date falsy branch => kept as-is (empty string).
    expect(payload.expire_date).toBe("");

    expect(wrapper.emitted("add")).toBeTruthy();
    expect(wrapper.emitted("add")[0][0]).toMatchObject({
      id: 99,
      image: { file: "data:image/png;base64,IMG" },
    });
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("submits create with an expire_date (truthy branch => Date) ", async () => {
    createAnnouncement.mockResolvedValue({ data: { id: 100 } });

    const wrapper = factory({});
    await flushPromises();

    wrapper.vm.form.expire_date = "2026-04-01T09:00";
    await wrapper.vm.$nextTick();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    const payload = createAnnouncement.mock.calls[0][0];
    expect(payload.expire_date).toBeInstanceOf(Date);
  });

  it("shows the spinner while submitting and hides the close button (isSubmitting true branch)", async () => {
    let resolveCreate;
    createAnnouncement.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      })
    );

    const wrapper = factory({});
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    // isSubmitting true => spinner shown, "Create"/"Update" text hidden, close button hidden.
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.find("button.btn-close").exists()).toBe(false);
    expect(wrapper.find("button.btn-success").attributes("disabled")).toBeDefined();

    resolveCreate({ data: { id: 1 } });
    await flushPromises();

    // Reset after finally.
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.find("button.btn-close").exists()).toBe(true);
  });

  it("handles create rejection via the catch branch (alert + error log, isSubmitting reset)", async () => {
    const error = new Error("boom");
    createAnnouncement.mockRejectedValue(error);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const wrapper = factory({});
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(
      "Failed to save announcement",
      error
    );
    expect(alertSpy).toHaveBeenCalledWith(
      "There was an error saving announcement."
    );
    // finally reset.
    expect(wrapper.vm.isSubmitting).toBe(false);
    alertSpy.mockRestore();
  });

  // ---- CANCEL / CLOSE EMITS ----

  it("emits close from the header close button and the footer Cancel button", async () => {
    const wrapper = factory({});
    await flushPromises();

    await wrapper.find("button.btn-close").trigger("click");
    await wrapper.find("button.btn-outline-secondary").trigger("click");

    expect(wrapper.emitted("close")).toBeTruthy();
    expect(wrapper.emitted("close").length).toBe(2);
  });

  // ---- EDIT MODE (announcement prop provided) ----

  it("renders edit mode: maps the announcement into the form, edit header/button, image col branch", async () => {
    const announcement = makeAnnouncement();
    const wrapper = factory({ announcement });
    await flushPromises();

    // isEdit === true template branches.
    expect(wrapper.find("h3").text()).toBe("Edit Announcement");
    expect(wrapper.text()).toContain("Update");

    // onMounted mapping used optional chaining on image?.file and category?.id.
    expect(wrapper.vm.form.title).toBe("Existing Title");
    expect(wrapper.vm.form.imageBase64).toBe("data:image/png;base64,AAA");
    expect(wrapper.vm.form.category_id).toBe(2);

    // imageBase64 present => wrapper div uses '' class branch (no col-md-6 on that block).
    const imageBlock = wrapper.find(".image-picker-stub").element.parentElement;
    expect(imageBlock.classList.contains("col-md-6")).toBe(false);
  });

  it("edit mode maps gracefully when image and category are missing (optional chaining undefined branch)", async () => {
    const announcement = makeAnnouncement({ image: undefined, category: undefined });
    const wrapper = factory({ announcement });
    await flushPromises();

    expect(wrapper.vm.form.imageBase64).toBeUndefined();
    expect(wrapper.vm.form.category_id).toBeUndefined();
  });

  it("submits edit successfully (image NOT updated => base64 null) and emits update + close", async () => {
    editAnnouncement.mockResolvedValue({ data: { id: 42, title: "Updated" } });

    const announcement = makeAnnouncement();
    const wrapper = factory({ announcement });
    await flushPromises();

    // imageUpdated is false by default => base64 = null in edit mode.
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(editAnnouncement).toHaveBeenCalledTimes(1);
    expect(editAnnouncement.mock.calls[0][0]).toBe(42);
    const payload = editAnnouncement.mock.calls[0][1];
    expect(payload.imageBase64).toBeNull();

    expect(wrapper.emitted("update")).toBeTruthy();
    expect(wrapper.emitted("update")[0][0]).toMatchObject({
      id: 42,
      image: { file: "data:image/png;base64,AAA" },
    });
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("submits edit with an updated image (imageUpdated true => base64 = data.imageBase64 ?? null)", async () => {
    editAnnouncement.mockResolvedValue({ data: { id: 42 } });

    const announcement = makeAnnouncement();
    const wrapper = factory({ announcement });
    await flushPromises();

    // Simulate the image being edited.
    const picker = wrapper.findComponent({ name: "ImagePicker" });
    await picker.vm.$emit("edit", true);
    wrapper.vm.form.imageBase64 = "data:image/png;base64,NEW";
    await wrapper.vm.$nextTick();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    const payload = editAnnouncement.mock.calls[0][1];
    // imageUpdated true and imageBase64 defined => uses imageBase64 (left side of ??).
    expect(payload.imageBase64).toBe("data:image/png;base64,NEW");
  });

  it("submits edit with updated image but null base64 (imageUpdated true, imageBase64 null => ?? null branch)", async () => {
    editAnnouncement.mockResolvedValue({ data: { id: 42 } });

    const announcement = makeAnnouncement();
    const wrapper = factory({ announcement });
    await flushPromises();

    const picker = wrapper.findComponent({ name: "ImagePicker" });
    await picker.vm.$emit("edit", true);
    wrapper.vm.form.imageBase64 = null; // nullish => right side of ?? (null)
    await wrapper.vm.$nextTick();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    const payload = editAnnouncement.mock.calls[0][1];
    expect(payload.imageBase64).toBeNull();
  });

  // ---- WATCH on the announcement prop ----

  it("watch: updating the announcement prop to a value remaps the form (edit branch)", async () => {
    const wrapper = factory({});
    await flushPromises();

    // Initially create mode.
    expect(wrapper.vm.isEdit).toBe(false);

    const updated = makeAnnouncement({ title: "Watched Title", id: 7 });
    await wrapper.setProps({ announcement: updated });
    await flushPromises();

    expect(wrapper.vm.isEdit).toBe(true);
    expect(wrapper.vm.form.title).toBe("Watched Title");
    expect(wrapper.vm.form.publish_date).toBe("2026-01-01T10:00");
    expect(wrapper.vm.form.expire_date).toBe("2026-02-01T10:00");
  });

  it("watch: updating the announcement prop to null resets the form (else branch)", async () => {
    const wrapper = factory({ announcement: makeAnnouncement() });
    await flushPromises();

    expect(wrapper.vm.isEdit).toBe(true);

    await wrapper.setProps({ announcement: null });
    await flushPromises();

    expect(wrapper.vm.isEdit).toBe(false);
    // Reset back to initialData defaults.
    expect(wrapper.vm.form.title).toBe("");
    expect(wrapper.vm.form.priority).toBe("medium");
    expect(wrapper.vm.form.status).toBe("published");
  });
});
