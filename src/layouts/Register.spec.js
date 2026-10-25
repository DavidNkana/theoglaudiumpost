import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, RouterLinkStub, flushPromises } from "@vue/test-utils";

// ---------------------------------------------------------------------------
// Mock the only external boundary Register.vue imports: the business register
// service. We drive it to both resolve and reject to cover the try/catch.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  registerMock: vi.fn(),
}));

vi.mock("@/features/businesses/BusinessesService", () => ({
  register: h.registerMock,
}));

import Register from "@/layouts/Register.vue";

function mountRegister() {
  return mount(Register, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

async function fillForm(wrapper) {
  await wrapper.find("#name").setValue("Acme Co");
  await wrapper.find("#email").setValue("admin@acme.co.za");
  await wrapper.find("#phone").setValue("0123456789");
  await wrapper.find("#location").setValue("Laudium");
  await wrapper.find("#password").setValue("secret");
  await wrapper.find("#cpassword").setValue("secret");
}

describe("Register.vue layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the registration heading and every form field", () => {
    const wrapper = mountRegister();
    expect(wrapper.find("h2").text()).toBe("Business Registration");
    expect(wrapper.find("#name").exists()).toBe(true);
    expect(wrapper.find("#email").exists()).toBe(true);
    expect(wrapper.find("#phone").exists()).toBe(true);
    expect(wrapper.find("#location").exists()).toBe(true);
    expect(wrapper.find("#password").exists()).toBe(true);
    expect(wrapper.find("#cpassword").exists()).toBe(true);
  });

  it("does not render the error alert when errorMessage is empty (v-if false branch)", () => {
    const wrapper = mountRegister();
    expect(wrapper.find(".alert.alert-danger").exists()).toBe(false);
  });

  it("renders the error alert and clears it on close-button click (v-if true branch)", async () => {
    const wrapper = mountRegister();
    wrapper.vm.errorMessage = "Something went wrong";
    await wrapper.vm.$nextTick();

    const alert = wrapper.find(".alert.alert-danger");
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain("Something went wrong");

    await wrapper.find(".alert.alert-danger .btn-close").trigger("click");
    expect(wrapper.vm.errorMessage).toBe("");
    expect(wrapper.find(".alert.alert-danger").exists()).toBe(false);
  });

  it("binds every field through v-model", async () => {
    const wrapper = mountRegister();
    await fillForm(wrapper);
    expect(wrapper.vm.form).toEqual({
      name: "Acme Co",
      email: "admin@acme.co.za",
      phone: "0123456789",
      location: "Laudium",
      password: "secret",
      cpassword: "secret",
    });
  });

  it("toggles the rememberMe checkbox", async () => {
    const wrapper = mountRegister();
    await wrapper.find("#rememberMe").setValue(true);
    expect(wrapper.vm.rememberMe).toBe(true);
  });

  it("toggles password visibility, swapping input type and icon class (both ternary branches)", async () => {
    const wrapper = mountRegister();

    // showPassword === false -> password type + bi-eye icon.
    expect(wrapper.find("#password").attributes("type")).toBe("password");
    expect(wrapper.find("#cpassword").attributes("type")).toBe("password");
    expect(wrapper.findAll(".input-group button i")[0].classes()).toContain(
      "bi-eye"
    );

    // First toggle -> showPassword true -> text type + bi-eye-slash icon.
    await wrapper.findAll(".input-group button")[0].trigger("click");
    expect(wrapper.vm.showPassword).toBe(true);
    expect(wrapper.find("#password").attributes("type")).toBe("text");
    expect(wrapper.find("#cpassword").attributes("type")).toBe("text");
    expect(wrapper.findAll(".input-group button i")[0].classes()).toContain(
      "bi-eye-slash"
    );

    // Second toggle (the confirm-password button) -> showPassword false again.
    await wrapper.findAll(".input-group button")[1].trigger("click");
    expect(wrapper.vm.showPassword).toBe(false);
    expect(wrapper.find("#password").attributes("type")).toBe("password");
  });

  it("shows the default label and enabled button when not loading (isLoading false branches)", () => {
    const wrapper = mountRegister();
    const submit = wrapper.find('button[type="submit"]');
    expect(submit.text()).toBe("Register");
    expect(submit.attributes("disabled")).toBeUndefined();
    expect(submit.find(".spinner-border").exists()).toBe(false);
  });

  it("shows the spinner, loading label and disabled button when loading (isLoading true branches)", async () => {
    const wrapper = mountRegister();
    wrapper.vm.isLoading = true;
    await wrapper.vm.$nextTick();

    const submit = wrapper.find('button[type="submit"]');
    expect(submit.text()).toContain("Registering...");
    expect(submit.attributes("disabled")).toBeDefined();
    expect(submit.find(".spinner-border").exists()).toBe(true);
  });

  it("renders the navigation links to login and homepage", () => {
    const wrapper = mountRegister();
    const targets = wrapper
      .findAllComponents(RouterLinkStub)
      .map((l) => l.props("to"));
    expect(targets).toContain("/business/login");
    expect(targets).toContain("/");
  });

  it("submits the form, calls register with the form payload and resets loading on success (try path)", async () => {
    h.registerMock.mockResolvedValue({ status: 201 });
    const wrapper = mountRegister();
    await fillForm(wrapper);
    wrapper.vm.errorMessage = "stale";

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(h.registerMock).toHaveBeenCalledTimes(1);
    expect(h.registerMock).toHaveBeenCalledWith({
      name: "Acme Co",
      email: "admin@acme.co.za",
      phone: "0123456789",
      location: "Laudium",
      password: "secret",
      cpassword: "secret",
    });
    expect(wrapper.vm.errorMessage).toBe("");
    expect(wrapper.vm.isLoading).toBe(false);
    expect(wrapper.find(".alert.alert-danger").exists()).toBe(false);
  });

  it("surfaces the error and resets loading when register rejects (catch path)", async () => {
    h.registerMock.mockRejectedValue("Registration failed");
    const wrapper = mountRegister();
    await fillForm(wrapper);

    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(h.registerMock).toHaveBeenCalledTimes(1);
    expect(wrapper.vm.errorMessage).toBe("Registration failed");
    expect(wrapper.vm.isLoading).toBe(false);

    await wrapper.vm.$nextTick();
    const alert = wrapper.find(".alert.alert-danger");
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain("Registration failed");
  });
});
