import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// --- Mock the AnnouncementsService boundary ---------------------------------
vi.mock("@/features/announcements/AnnouncementsService", () => ({
  getAnnouncement: vi.fn(),
  editAnnouncement: vi.fn(),
  createAnnouncement: vi.fn(),
  getCategories: vi.fn(),
}));

// --- Mock the SweetAlert composable (pulls sweetalert2 CSS/lib) -------------
const showToast = vi.fn();
vi.mock("@/composables/useSweetAlert", () => ({
  useSweetAlert: () => ({ showToast }),
}));

// --- Mock devLog (pulls @/config/env) --------------------------------------
vi.mock("@/utils/devLog", () => ({
  devLog: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
}));

// --- Stub QuillEditor (heavy quill dep) and its CSS side-effect import ------
vi.mock("@vueup/vue-quill", () => ({
  QuillEditor: {
    name: "QuillEditor",
    props: ["content", "contentType", "theme", "toolbar", "styles"],
    emits: ["update:content"],
    template: `<div class="quill-stub" @click="$emit('update:content', '<p>Edited</p>')"></div>`,
  },
}));
vi.mock("@vueup/vue-quill/dist/vue-quill.snow.css", () => ({}));

// --- vue-router stubs -------------------------------------------------------
const push = vi.fn();
let mockRouteParams = {};
vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ params: mockRouteParams }),
}));

import {
  getAnnouncement,
  editAnnouncement,
  createAnnouncement,
  getCategories,
} from "@/features/announcements/AnnouncementsService";
import CreateOrEdit from "@/views/Admin/Announcements/CreateOrEdit.vue";

// Stub the ImagePicker child (FileReader / heavy DOM). Keep an `@edit` emitter
// so the `updateIsImageUpdated` handler can be driven from the test.
const ImagePickerStub = {
  name: "ImagePicker",
  props: ["modelValue", "initialImage", "required"],
  emits: ["update:modelValue", "edit"],
  // click -> @edit (drives updateIsImageUpdated)
  // dblclick -> update:modelValue (drives the v-model binding to form.imageBase64)
  template: `<div class="image-picker-stub" @click="$emit('edit', true)" @dblclick="$emit('update:modelValue', 'new-img-data')"></div>`,
};

const globalConfig = {
  stubs: {
    ImagePicker: ImagePickerStub,
    RouterLink: RouterLinkStub,
  },
};

const CATEGORIES = [
  { id: 1, name: "General" },
  { id: 2, name: "Funeral Notice" },
];

function mountView() {
  return mount(CreateOrEdit, { global: globalConfig });
}

describe("Admin/Announcements/CreateOrEdit.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouteParams = {};
    // jsdom has confirm/alert as no-op throwers; stub them.
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // -- CREATE mode -----------------------------------------------------------
  it("renders the create state and populates category/priority/status options", async () => {
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    const wrapper = mountView();
    await flushPromises();

    // isEdit false -> create header + Create button label
    expect(wrapper.find("h3").text()).toBe("Create New Announcement");
    expect(wrapper.find(".btn-success").text()).toBe("Create");

    // category v-for produced both options (non-empty list)
    const catOptions = wrapper.find("#category").findAll("option");
    expect(catOptions.map((o) => o.text())).toEqual([
      "-- Select --",
      "General",
      "Funeral Notice",
    ]);

    // priority + status v-for
    const priorityOptions = wrapper
      .find("#priority")
      .findAll("option")
      .map((o) => o.text());
    expect(priorityOptions).toEqual(["low", "medium", "high"]);
    const statusOptions = wrapper
      .find("#status")
      .findAll("option")
      .map((o) => o.text());
    expect(statusOptions).toEqual([
      "draft",
      "pending",
      "published",
      "archived",
      "rejected",
    ]);

    // Not funeral category -> content + location blocks rendered
    expect(wrapper.find(".quill-stub").exists()).toBe(true);
    expect(wrapper.find("#location").exists()).toBe(true);
    // imageBase64 empty -> wrapper gets col-md-6 class
    expect(wrapper.findComponent(ImagePickerStub).exists()).toBe(true);

    expect(getCategories).toHaveBeenCalledWith({});
    expect(getAnnouncement).not.toHaveBeenCalled();
  });

  it("renders with empty categories list when res.data.categories is missing (?? [])", async () => {
    // data present but no `categories` key -> nullish -> []
    getCategories.mockResolvedValue({ data: {} });
    const wrapper = mountView();
    await flushPromises();

    const catOptions = wrapper.find("#category").findAll("option");
    // only the disabled placeholder, v-for produced nothing (empty list)
    expect(catOptions).toHaveLength(1);
    expect(catOptions[0].text()).toBe("-- Select --");
  });

  it("renders with empty categories when res.data is undefined (optional chain)", async () => {
    getCategories.mockResolvedValue({});
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find("#category").findAll("option")).toHaveLength(1);
  });

  it("logs a warning when getCategories rejects (onMounted catch path)", async () => {
    const { devLog } = await import("@/utils/devLog");
    getCategories.mockRejectedValue(new Error("net down"));
    const wrapper = mountView();
    await flushPromises();

    expect(devLog.warn).toHaveBeenCalledWith(
      "Error fetching initial data:",
      expect.any(Error)
    );
    // still renders (form fell through, categories stays [])
    expect(wrapper.find("#category").findAll("option")).toHaveLength(1);
  });

  // -- generateSlug ----------------------------------------------------------
  it("generateSlug builds a slug from the title on input", async () => {
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    const wrapper = mountView();
    await flushPromises();

    const titleInput = wrapper.findAll("input.form-control")[0];
    await titleInput.setValue("  Hello, World!!  Big-- News  ");
    await titleInput.trigger("input");
    await flushPromises();

    expect(wrapper.vm.form.slug).toBe("-hello-world-big-news-");
  });

  it("generateSlug returns early when the title is empty", async () => {
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    const wrapper = mountView();
    await flushPromises();

    const titleInput = wrapper.findAll("input.form-control")[0];
    // setValue("") then input -> generateSlug early-return (no title)
    await titleInput.setValue("");
    await titleInput.trigger("input");
    await flushPromises();

    expect(wrapper.vm.form.slug).toBe("");
  });

  // -- resetForm (not wired in template; invoke directly) --------------------
  it("resetForm restores initialData + clears errors when confirm returns true", async () => {
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    const wrapper = mountView();
    await flushPromises();

    // Replace form with a distinct object so the reset to `initialData` is
    // observable (the source assigns form.value = initialData, the shared seed).
    wrapper.vm.form = { ...wrapper.vm.form, title: "Dirty" };
    wrapper.vm.validationErrors = { title: "x" };
    await flushPromises();

    wrapper.vm.resetForm();
    await flushPromises();

    expect(confirm).toHaveBeenCalled();
    // form now references the initialData seed again + errors cleared
    expect(wrapper.vm.form.priority).toBe("medium");
    expect(wrapper.vm.form.status).toBe("published");
    expect(wrapper.vm.validationErrors).toEqual({});
  });

  it("resetForm does nothing when confirm returns false", async () => {
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    confirm.mockReturnValue(false);
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.form = { ...wrapper.vm.form, title: "Dirty" };
    wrapper.vm.validationErrors = { title: "x" };
    await flushPromises();

    wrapper.vm.resetForm();
    await flushPromises();

    expect(wrapper.vm.form.title).toBe("Dirty");
    // errors untouched because confirm bailed
    expect(wrapper.vm.validationErrors).toEqual({ title: "x" });
  });

  // -- isSelectedFuneralCategory computed ------------------------------------
  it("isSelectedFuneralCategory is false when no category selected", async () => {
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    const wrapper = mountView();
    await flushPromises();

    // form.category_id defaults to "" -> !id true -> false
    expect(wrapper.vm.isSelectedFuneralCategory).toBe(false);
    // content + location blocks visible (not funeral)
    expect(wrapper.find(".quill-stub").exists()).toBe(true);
  });

  it("isSelectedFuneralCategory false when selected category is not funeral", async () => {
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    const wrapper = mountView();
    await flushPromises();

    await wrapper.find("#category").setValue(1); // General
    expect(wrapper.vm.isSelectedFuneralCategory).toBe(false);
  });

  it("isSelectedFuneralCategory true hides content/location blocks for funeral", async () => {
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    const wrapper = mountView();
    await flushPromises();

    await wrapper.find("#category").setValue(2); // Funeral Notice
    expect(wrapper.vm.isSelectedFuneralCategory).toBe(true);

    // v-if="!isSelectedFuneralCategory" -> content + location removed
    expect(wrapper.find(".quill-stub").exists()).toBe(false);
    expect(wrapper.find("#location").exists()).toBe(false);
  });

  it("isSelectedFuneralCategory false when selected id is not in the list (find -> undefined)", async () => {
    // category list has a category whose id won't match the selected value's
    // ?. chain; selecting an id absent from list exercises the optional chain
    getCategories.mockResolvedValue({
      data: { categories: [{ id: 5, name: null }] },
    });
    const wrapper = mountView();
    await flushPromises();

    // select id 5 whose name is null -> ?.name?.toLowerCase chain short-circuits
    await wrapper.find("#category").setValue(5);
    expect(wrapper.vm.isSelectedFuneralCategory).toBeUndefined();
  });

  // -- validateForm via save() ----------------------------------------------
  it("save returns early and sets validation errors when fields are empty", async () => {
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    const wrapper = mountView();
    await flushPromises();

    // everything empty: title, slug, content empty; no category
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(wrapper.vm.validationErrors).toMatchObject({
      title: "Title is required",
      slug: "Slug is required",
      category_id: "Please select a category",
    });
    // content is never auto-required (the dead branch was removed at source);
    // the validation-errors block still renders for content if set externally.
    expect(wrapper.vm.validationErrors.content).toBeUndefined();
    expect(createAnnouncement).not.toHaveBeenCalled();
    expect(editAnnouncement).not.toHaveBeenCalled();
  });

  it("renders the content invalid-feedback when validationErrors.content is set", async () => {
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    const wrapper = mountView();
    await flushPromises();

    wrapper.vm.validationErrors = { content: "Content is required" };
    await flushPromises();

    const fb = wrapper.find(".invalid-feedback");
    expect(fb.exists()).toBe(true);
    expect(fb.text()).toBe("Content is required");
  });

  // -- save: CREATE success path --------------------------------------------
  it("create submit builds payload, toasts success and navigates", async () => {
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    createAnnouncement.mockResolvedValue({ data: { id: 10 } });
    const wrapper = mountView();
    await flushPromises();

    // fill required fields so validateForm passes
    await wrapper.findAll("input.form-control")[0].setValue("My Title");
    wrapper.vm.form.slug = "my-title";
    wrapper.vm.form.content = "<p>Body</p>";
    await wrapper.find("#category").setValue(1);
    await wrapper.find("#location").setValue("Town Hall");
    await wrapper.find("#publish_date").setValue("2026-06-20T10:00");
    // expire_date left empty -> falsy branch keeps raw value
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(createAnnouncement).toHaveBeenCalledTimes(1);
    const payload = createAnnouncement.mock.calls[0][0];
    expect(payload).toMatchObject({
      title: "My Title",
      slug: "my-title",
      content: "<p>Body</p>",
      location: "Town Hall",
      category_id: 1,
      priority: "medium",
      status: "published",
    });
    // create branch: base64 = data.imageBase64 (initialData "")
    expect(payload.imageBase64).toBe("");
    // publish_date wrapped in Date; expire_date empty stays "" (falsy branch)
    expect(payload.publish_date).toBeInstanceOf(Date);
    expect(payload.expire_date).toBe("");

    expect(showToast).toHaveBeenCalledWith(
      "success",
      "Category created successfully!"
    );
    expect(push).toHaveBeenCalledWith("/admin/announcements");
    expect(editAnnouncement).not.toHaveBeenCalled();
  });

  it("create submit wraps expire_date in a Date when provided (truthy branch)", async () => {
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    createAnnouncement.mockResolvedValue({ data: {} });
    const wrapper = mountView();
    await flushPromises();

    await wrapper.findAll("input.form-control")[0].setValue("T");
    wrapper.vm.form.slug = "t";
    wrapper.vm.form.content = "c";
    await wrapper.find("#category").setValue(1);
    await wrapper.find("#location").setValue("loc");
    await wrapper.find("#publish_date").setValue("2026-06-20T10:00");
    await wrapper.find("#expiry_date").setValue("2026-07-20T10:00");
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    const payload = createAnnouncement.mock.calls[0][0];
    expect(payload.expire_date).toBeInstanceOf(Date);
  });

  it("create submit shows error toast on rejection (catch path)", async () => {
    const { devLog } = await import("@/utils/devLog");
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    createAnnouncement.mockRejectedValue(new Error("boom"));
    const wrapper = mountView();
    await flushPromises();

    await wrapper.findAll("input.form-control")[0].setValue("T");
    wrapper.vm.form.slug = "t";
    wrapper.vm.form.content = "c";
    await wrapper.find("#category").setValue(1);
    await wrapper.find("#location").setValue("loc");
    await wrapper.find("#publish_date").setValue("2026-06-20T10:00");
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(devLog.error).toHaveBeenCalledWith(
      "There was an error saving announcement",
      expect.any(Error)
    );
    expect(showToast).toHaveBeenCalledWith("error", "Category creation failed!");
    expect(push).not.toHaveBeenCalled();
    // finally re-enabled the button
    expect(wrapper.find(".btn-success").attributes("disabled")).toBeUndefined();
  });

  it("shows the spinner while submitting and hides it after settle", async () => {
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    let resolveCreate;
    createAnnouncement.mockReturnValue(
      new Promise((res) => {
        resolveCreate = res;
      })
    );
    const wrapper = mountView();
    await flushPromises();

    await wrapper.findAll("input.form-control")[0].setValue("T");
    wrapper.vm.form.slug = "t";
    wrapper.vm.form.content = "c";
    await wrapper.find("#category").setValue(1);
    await wrapper.find("#location").setValue("loc");
    await wrapper.find("#publish_date").setValue("2026-06-20T10:00");
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    // mid-flight: isSubmitting true -> spinner shown, label hidden, disabled
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.find(".btn-success").attributes("disabled")).toBeDefined();

    resolveCreate({ data: {} });
    await flushPromises();

    expect(wrapper.find(".spinner-border").exists()).toBe(false);
  });

  // -- EDIT mode -------------------------------------------------------------
  it("edit mode loads the announcement and renders the edit state", async () => {
    mockRouteParams = { id: "42" };
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    getAnnouncement.mockResolvedValue({
      data: {
        title: "Existing",
        description: "Desc",
        content: "Content",
        slug: "existing",
        image: { file: "data:image/png;base64,AAA" },
        location: "Hall",
        category: { id: 1 },
        priority: "high",
        status: "archived",
        publish_date: "2026-06-20T10:00",
        expire_date: "2026-07-20T10:00",
      },
    });
    const wrapper = mountView();
    await flushPromises();

    expect(getAnnouncement).toHaveBeenCalledWith("42");
    expect(wrapper.find("h3").text()).toBe("Edit Announcement");
    expect(wrapper.find(".btn-success").text()).toBe("Update");
    expect(wrapper.vm.form.title).toBe("Existing");
    // content = description ?? content -> "Desc" (description present)
    expect(wrapper.vm.form.content).toBe("Desc");
    expect(wrapper.vm.form.imageBase64).toBe("data:image/png;base64,AAA");
    expect(wrapper.vm.form.category_id).toBe(1);
  });

  it("edit mode falls back to content/null on optional fields (?? and ?.)", async () => {
    mockRouteParams = { id: 7 };
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    getAnnouncement.mockResolvedValue({
      data: {
        title: "NoDesc",
        description: null, // -> content fallback
        content: "FallbackContent",
        slug: "nodesc",
        image: null, // image?.file -> undefined
        location: "L",
        category: null, // category?.id -> undefined
        priority: "low",
        status: "draft",
        publish_date: "",
        expire_date: "",
      },
    });
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.vm.form.content).toBe("FallbackContent");
    expect(wrapper.vm.form.imageBase64).toBeUndefined();
    expect(wrapper.vm.form.category_id).toBeUndefined();
  });

  it("edit submit (image NOT updated) sends null base64 and toasts update", async () => {
    mockRouteParams = { id: "42" };
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    getAnnouncement.mockResolvedValue({
      data: {
        title: "Existing",
        description: "Desc",
        content: "C",
        slug: "existing",
        image: { file: "img" },
        location: "Hall",
        category: { id: 1 },
        priority: "high",
        status: "archived",
        publish_date: "2026-06-20T10:00",
        expire_date: "",
      },
    });
    editAnnouncement.mockResolvedValue({ data: {} });
    const wrapper = mountView();
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(editAnnouncement).toHaveBeenCalledTimes(1);
    const [id, payload] = editAnnouncement.mock.calls[0];
    expect(id).toBe("42");
    // edit + imageUpdated false -> base64 = null
    expect(payload.imageBase64).toBeNull();
    expect(showToast).toHaveBeenCalledWith(
      "success",
      "Category updated successfully!"
    );
    expect(push).toHaveBeenCalledWith("/admin/announcements");
    expect(createAnnouncement).not.toHaveBeenCalled();
  });

  it("edit submit (image updated) keeps base64 via ?? branch", async () => {
    mockRouteParams = { id: "42" };
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    getAnnouncement.mockResolvedValue({
      data: {
        title: "Existing",
        description: "Desc",
        content: "C",
        slug: "existing",
        image: { file: "img-data" },
        location: "Hall",
        category: { id: 1 },
        priority: "high",
        status: "archived",
        publish_date: "2026-06-20T10:00",
        expire_date: "",
      },
    });
    editAnnouncement.mockResolvedValue({ data: {} });
    const wrapper = mountView();
    await flushPromises();

    // drive ImagePicker @edit -> imageUpdated = true
    await wrapper.findComponent(ImagePickerStub).trigger("click");

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    const [, payload] = editAnnouncement.mock.calls[0];
    // imageUpdated true -> base64 = data.imageBase64 ?? null -> "img-data"
    expect(payload.imageBase64).toBe("img-data");
  });

  it("edit submit (image updated but cleared) sends null via ?? null", async () => {
    mockRouteParams = { id: "42" };
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    getAnnouncement.mockResolvedValue({
      data: {
        title: "Existing",
        description: "Desc",
        content: "C",
        slug: "existing",
        image: null, // imageBase64 -> undefined
        location: "Hall",
        category: { id: 1 },
        priority: "high",
        status: "archived",
        publish_date: "2026-06-20T10:00",
        expire_date: "",
      },
    });
    editAnnouncement.mockResolvedValue({ data: {} });
    const wrapper = mountView();
    await flushPromises();

    await wrapper.findComponent(ImagePickerStub).trigger("click"); // imageUpdated=true

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    const [, payload] = editAnnouncement.mock.calls[0];
    // imageUpdated true but imageBase64 undefined -> ?? null
    expect(payload.imageBase64).toBeNull();
  });

  it("edit submit shows error toast on rejection (catch path)", async () => {
    mockRouteParams = { id: "42" };
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    getAnnouncement.mockResolvedValue({
      data: {
        title: "Existing",
        description: "Desc",
        content: "C",
        slug: "existing",
        image: { file: "img" },
        location: "Hall",
        category: { id: 1 },
        priority: "high",
        status: "archived",
        publish_date: "2026-06-20T10:00",
        expire_date: "",
      },
    });
    editAnnouncement.mockRejectedValue(new Error("nope"));
    const wrapper = mountView();
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(showToast).toHaveBeenCalledWith("error", "Category update failed!");
    expect(push).not.toHaveBeenCalled();
  });

  // -- v-model update handlers (template-generated functions) ---------------
  it("drives every v-model update handler (priority, status, content, image)", async () => {
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    const wrapper = mountView();
    await flushPromises();

    // priority select v-model -> form.priority
    await wrapper.find("#priority").setValue("high");
    expect(wrapper.vm.form.priority).toBe("high");

    // status select v-model -> form.status
    await wrapper.find("#status").setValue("draft");
    expect(wrapper.vm.form.status).toBe("draft");

    // QuillEditor update:content -> form.content
    await wrapper.find(".quill-stub").trigger("click");
    expect(wrapper.vm.form.content).toBe("<p>Edited</p>");

    // ImagePicker update:modelValue -> form.imageBase64
    await wrapper.findComponent(ImagePickerStub).trigger("dblclick");
    expect(wrapper.vm.form.imageBase64).toBe("new-img-data");
  });

  // -- close emit ------------------------------------------------------------
  it("emits close when the Cancel button is clicked", async () => {
    getCategories.mockResolvedValue({ data: { categories: CATEGORIES } });
    const wrapper = mountView();
    await flushPromises();

    await wrapper.find(".btn-outline-secondary").trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });
});
