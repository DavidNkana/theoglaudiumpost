import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// --- Mock every external boundary the SFC imports ---------------------------

// UsersService -> only createUser / editUser are consumed.
vi.mock("@/features/users/UsersService", () => ({
  createUser: vi.fn(),
  editUser: vi.fn(),
}));

import { createUser, editUser } from "@/features/users/UsersService";
import UserForm from "@/views/Admin/Users/UserForm.vue";

const roles = [
  { id: 1, name: "Admin" },
  { id: 2, name: "Editor" },
];

function mountForm(props = {}) {
  return mount(UserForm, {
    props: { roles, ...props },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("UserForm.vue", () => {
  it("renders the create state when no user prop is provided (isEdit=false branches)", async () => {
    const wrapper = mountForm();
    await flushPromises();

    // Heading ternary -> "Create New User"
    expect(wrapper.find("h3").text()).toBe("Create New User");

    // Close button visible because isSubmitting is false (v-if="!isSubmitting" true)
    expect(wrapper.find("button.btn-close").exists()).toBe(true);

    // Submit button shows the v-else span with "Create"
    const submit = wrapper.find("button.btn-success");
    expect(submit.text()).toBe("Create");
    expect(submit.attributes("disabled")).toBeUndefined();
    expect(wrapper.find(".spinner-border").exists()).toBe(false);

    // Password label is the create-mode text and the field is required.
    expect(wrapper.find('label[for="password"]').text()).toBe("Password");
    expect(wrapper.find("#password").attributes("required")).toBeDefined();

    // watch else-branch resets form to empty fields.
    expect(wrapper.find("#name").element.value).toBe("");
    expect(wrapper.find("#email").element.value).toBe("");
    expect(wrapper.find("#password").element.value).toBe("");
  });

  it("renders the edit state and populates the form when a user prop is provided (isEdit=true branches)", async () => {
    const user = {
      id: 7,
      name: "Jane Doe",
      email: "jane@example.com",
      roleId: 2,
    };
    const wrapper = mountForm({ user });
    await flushPromises();

    // Heading ternary -> "Edit User"
    expect(wrapper.find("h3").text()).toBe("Edit User");

    // Submit button shows "Update"
    expect(wrapper.find("button.btn-success").text()).toBe("Update");

    // Password label is the edit-mode text and the field is NOT required.
    expect(wrapper.find('label[for="password"]').text()).toBe(
      "New Password (leave blank to keep)"
    );
    expect(wrapper.find("#password").attributes("required")).toBeUndefined();

    // watch edit-branch populated form from props.user.
    expect(wrapper.find("#name").element.value).toBe("Jane Doe");
    expect(wrapper.find("#email").element.value).toBe("jane@example.com");
    expect(wrapper.find("#password").element.value).toBe("");
    expect(wrapper.find("#roleId").element.value).toBe("2");
  });

  it("populates with defaults when the user prop has missing fields (nullish branches)", async () => {
    // user is truthy but every populated field is undefined -> exercises the ?? defaults.
    const wrapper = mountForm({ user: { id: 5 } });
    await flushPromises();

    expect(wrapper.find("h3").text()).toBe("Edit User");
    expect(wrapper.find("#name").element.value).toBe("");
    expect(wrapper.find("#email").element.value).toBe("");
    expect(wrapper.find("#roleId").element.value).toBe("");
  });

  it("renders the role options from the roles prop", async () => {
    const wrapper = mountForm();
    await flushPromises();

    const options = wrapper.findAll("#roleId option");
    expect(options).toHaveLength(2);
    expect(options[0].text()).toBe("Admin");
    expect(options[0].attributes("value")).toBe("1");
    expect(options[1].text()).toBe("Editor");
    expect(options[1].attributes("value")).toBe("2");
  });

  it("creates a user on submit (success path) and emits add-user + close", async () => {
    // Hold the create call open so we can assert the mid-submit render state.
    let resolveCreate;
    createUser.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      })
    );
    const wrapper = mountForm();
    await flushPromises();

    await wrapper.find("#name").setValue("New User");
    await wrapper.find("#email").setValue("new@user.com");
    await wrapper.find("#password").setValue("secret");
    await wrapper.find("#roleId").setValue("1");
    await wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    // While submitting: spinner shown (v-if), close button hidden (v-if="!isSubmitting"),
    // submit button disabled.
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(wrapper.find("button.btn-close").exists()).toBe(false);
    expect(
      wrapper.find("button.btn-success").attributes("disabled")
    ).toBeDefined();

    resolveCreate({ data: { id: 1, name: "New User" } });
    await flushPromises();

    // createUser called with the form payload (not editUser).
    expect(createUser).toHaveBeenCalledTimes(1);
    expect(createUser.mock.calls[0][0]).toEqual({
      name: "New User",
      email: "new@user.com",
      password: "secret",
      roleId: 1,
    });
    expect(editUser).not.toHaveBeenCalled();

    // add-user emitted with response.data, then close emitted.
    expect(wrapper.emitted("add-user")).toBeTruthy();
    expect(wrapper.emitted("add-user")[0]).toEqual([{ id: 1, name: "New User" }]);
    expect(wrapper.emitted("close")).toBeTruthy();

    // finally re-enabled the form.
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
    expect(wrapper.find("button.btn-close").exists()).toBe(true);
  });

  it("edits a user on submit (success path) and emits update-user + close", async () => {
    editUser.mockResolvedValue({ data: { id: 9, name: "Edited" } });
    const user = {
      id: 9,
      name: "Original",
      email: "orig@user.com",
      roleId: 2,
    };
    const wrapper = mountForm({ user });
    await flushPromises();

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    // editUser called with props.user.id + payload (not createUser).
    expect(editUser).toHaveBeenCalledTimes(1);
    expect(editUser.mock.calls[0][0]).toBe(9);
    expect(editUser.mock.calls[0][1]).toEqual({
      name: "Original",
      email: "orig@user.com",
      password: "",
      roleId: 2,
    });
    expect(createUser).not.toHaveBeenCalled();

    // update-user emitted with response.data, close emitted.
    expect(wrapper.emitted("update-user")).toBeTruthy();
    expect(wrapper.emitted("update-user")[0]).toEqual([{ id: 9, name: "Edited" }]);
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("handles a rejected save (catch branch) by logging the error and alerting", async () => {
    const err = new Error("network");
    createUser.mockRejectedValue(err);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const wrapper = mountForm();
    await flushPromises();

    await wrapper.find("#name").setValue("Boom");
    await wrapper.find("#email").setValue("boom@user.com");
    await wrapper.find("#password").setValue("pw");
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    // catch branch: console.error + alert, and no success emissions.
    expect(errorSpy).toHaveBeenCalledWith("Failed to save user", err);
    expect(alertSpy).toHaveBeenCalledWith("There was an error saving the user.");
    expect(wrapper.emitted("add-user")).toBeFalsy();
    expect(wrapper.emitted("close")).toBeFalsy();

    // finally re-enabled the form even on failure.
    expect(
      wrapper.find("button.btn-success").attributes("disabled")
    ).toBeUndefined();
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

  it("re-runs the watch when the user prop changes from null to an object and back", async () => {
    const wrapper = mountForm();
    await flushPromises();

    // null -> object : isEdit becomes true, watch populates form.
    await wrapper.setProps({
      user: {
        id: 3,
        name: "Watched",
        email: "watch@user.com",
        roleId: 1,
      },
    });
    await flushPromises();
    expect(wrapper.find("h3").text()).toBe("Edit User");
    expect(wrapper.find("#name").element.value).toBe("Watched");

    // object -> null : isEdit becomes false, watch resets to empty.
    await wrapper.setProps({ user: null });
    await flushPromises();
    expect(wrapper.find("h3").text()).toBe("Create New User");
    expect(wrapper.find("#name").element.value).toBe("");
  });
});
