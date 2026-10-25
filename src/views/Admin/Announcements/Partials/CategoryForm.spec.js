import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock every external boundary the SFC imports ---------------------------

// AnnouncementsService -> only createCategory / editCategory are consumed.
const createCategory = vi.fn();
const editCategory = vi.fn();
vi.mock("@/features/announcements/AnnouncementsService", () => ({
  createCategory: (...args) => createCategory(...args),
  editCategory: (...args) => editCategory(...args),
}));

// useSweetAlert composable -> only showToast is consumed.
const showToast = vi.fn();
vi.mock("@/composables/useSweetAlert", () => ({
  useSweetAlert: () => ({ showToast }),
}));

// devLog utility -> no-op spies (avoid pulling @/config/env + console noise).
const devLogInfo = vi.fn();
const devLogError = vi.fn();
vi.mock("@/utils/devLog", () => ({
  devLog: {
    info: (...args) => devLogInfo(...args),
    error: (...args) => devLogError(...args),
  },
}));

import CategoryForm from "@/views/Admin/Announcements/Partials/CategoryForm.vue";

function mountForm(props = {}) {
  return mount(CategoryForm, {
    props,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CategoryForm.vue", () => {
  it("renders the create state when no category prop is provided (isEdit=false branches)", async () => {
    const wrapper = mountForm();
    await flushPromises();

    // Heading ternary -> "Create New Category"
    expect(wrapper.find("h3").text()).toBe("Create New Category");

    // Close button visible because isSubmitting is false (v-if="!isSubmitting" true)
    expect(wrapper.find("button.btn-close").exists()).toBe(true);

    // Submit button shows the v-else span with "Create"
    const submit = wrapper.find("button.btn-success");
    expect(submit.text()).toBe("Create");
    expect(submit.attributes("disabled")).toBeUndefined();
    expect(wrapper.find(".spinner-border").exists()).toBe(false);

    // onMounted else-branch resets form to initialData -> empty fields, checkbox checked
    expect(wrapper.find("input.form-control").element.value).toBe("");
    expect(wrapper.find("textarea").element.value).toBe("");
    expect(wrapper.find("#is_active").element.checked).toBe(true);

    // Toggle the is_active checkbox -> drives the v-model update setter on the input.
    await wrapper.find("#is_active").setValue(false);
    expect(wrapper.vm.form.is_active).toBe(false);
  });

  it("renders the edit state and populates the form when a category prop is provided (isEdit=true branches)", async () => {
    const category = {
      id: 7,
      name: "Sports News",
      description: "All about sports",
      slug: "sports-news",
      is_active: false,
    };
    const wrapper = mountForm({ category });
    await flushPromises();

    // Heading ternary -> "Edit Category"
    expect(wrapper.find("h3").text()).toBe("Edit Category");

    // Submit button shows "Update"
    expect(wrapper.find("button.btn-success").text()).toBe("Update");

    // onMounted edit-branch populated form from props.category (includes slug)
    expect(wrapper.find("input.form-control").element.value).toBe("Sports News");
    expect(wrapper.find("textarea").element.value).toBe("All about sports");
    // is_active false -> checkbox unchecked
    expect(wrapper.find("#is_active").element.checked).toBe(false);

    // The immediate watch logged the form via devLog.info on the edit branch.
    expect(devLogInfo).toHaveBeenCalledWith("Form: ", expect.any(Object));
  });

  it("generateSlug early-returns when name is empty and slugifies when name has content", async () => {
    const wrapper = mountForm();
    await flushPromises();

    const nameInput = wrapper.find("input.form-control");

    // Empty name -> generateSlug hits the `!form.value.name` early return.
    await nameInput.setValue("");
    await nameInput.trigger("input");
    // slug stays empty (initialData default)
    expect(wrapper.vm.form.slug).toBe("");

    // Non-empty name with special chars / multiple spaces / dashes -> slugified.
    await nameInput.setValue("Hello,  World!!  --  Foo");
    await nameInput.trigger("input");
    expect(wrapper.vm.form.slug).toBe("hello-world-foo");
  });

  it("generateSlug truncates the slug to 255 chars (substring branch)", async () => {
    const wrapper = mountForm();
    await flushPromises();

    const nameInput = wrapper.find("input.form-control");
    const longName = "a".repeat(300);
    await nameInput.setValue(longName);
    await nameInput.trigger("input");
    expect(wrapper.vm.form.slug.length).toBe(255);
  });

  it("creates a category on submit (success path) and emits add + close", async () => {
    // Hold the create call open so we can assert the mid-submit render state.
    let resolveCreate;
    createCategory.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      })
    );
    const wrapper = mountForm();
    await flushPromises();

    await wrapper.find("input.form-control").setValue("New Cat");
    await wrapper.find("textarea").setValue("desc");
    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    // While submitting: spinner shown (v-if), close button hidden (v-if="!isSubmitting"),
    // submit button disabled.
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.find("button.btn-close").exists()).toBe(false);
    expect(wrapper.find("button.btn-success").attributes("disabled")).toBeDefined();

    resolveCreate({ data: { id: 1, name: "New Cat" } });
    await flushPromises();

    // createCategory called with the form payload (not editCategory).
    expect(createCategory).toHaveBeenCalledTimes(1);
    expect(createCategory.mock.calls[0][0].name).toBe("New Cat");
    expect(editCategory).not.toHaveBeenCalled();

    // add emitted with response.data, then close emitted, success toast (created).
    expect(wrapper.emitted("add")).toBeTruthy();
    expect(wrapper.emitted("add")[0]).toEqual([{ id: 1, name: "New Cat" }]);
    expect(wrapper.emitted("close")).toBeTruthy();
    expect(showToast).toHaveBeenCalledWith(
      "success",
      "Category created successfully!"
    );

    // finally re-enabled the form.
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.find("button.btn-close").exists()).toBe(true);
  });

  it("edits a category on submit (success path) and emits update + close", async () => {
    editCategory.mockResolvedValue({ data: { id: 9, name: "Edited" } });
    const category = {
      id: 9,
      name: "Original",
      description: "orig desc",
      slug: "original",
      is_active: true,
    };
    const wrapper = mountForm({ category });
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    // editCategory called with props.category.id + payload (not createCategory).
    expect(editCategory).toHaveBeenCalledTimes(1);
    expect(editCategory.mock.calls[0][0]).toBe(9);
    expect(createCategory).not.toHaveBeenCalled();

    // update emitted with response.data, close emitted, success toast (updated).
    expect(wrapper.emitted("update")).toBeTruthy();
    expect(wrapper.emitted("update")[0]).toEqual([{ id: 9, name: "Edited" }]);
    expect(wrapper.emitted("close")).toBeTruthy();
    expect(showToast).toHaveBeenCalledWith(
      "success",
      "Category updated successfully!"
    );
  });

  it("handles a rejected save (catch branch) by logging and showing an error toast", async () => {
    const err = new Error("network");
    createCategory.mockRejectedValue(err);
    const wrapper = mountForm();
    await flushPromises();

    await wrapper.find("input.form-control").setValue("Boom");
    await wrapper.find("textarea").setValue("desc");
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    // catch branch: devLog.error + error toast, and no success emissions.
    expect(devLogError).toHaveBeenCalledWith("Failed to save category", err);
    expect(showToast).toHaveBeenCalledWith("error", "Failed to save category");
    expect(wrapper.emitted("add")).toBeFalsy();
    expect(wrapper.emitted("close")).toBeFalsy();

    // finally re-enabled the form even on failure.
    expect(wrapper.find("button.btn-success").attributes("disabled")).toBeUndefined();
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
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

  it("re-runs the watch when the category prop changes from null to an object and back", async () => {
    const wrapper = mountForm();
    await flushPromises();

    // null -> object : isEdit becomes true, watch populates form + devLog.info.
    await wrapper.setProps({
      category: {
        id: 3,
        name: "Watched",
        description: "watched desc",
        is_active: false,
      },
    });
    await flushPromises();
    expect(wrapper.find("h3").text()).toBe("Edit Category");
    expect(wrapper.find("input.form-control").element.value).toBe("Watched");
    expect(devLogInfo).toHaveBeenCalledWith("Form: ", expect.any(Object));

    // object -> null : isEdit becomes false, watch resets to initialData.
    await wrapper.setProps({ category: null });
    await flushPromises();
    expect(wrapper.find("h3").text()).toBe("Create New Category");
  });
});
