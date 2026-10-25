import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// ---- Mock vue-router's useRouter() to return our router test double ----
const push = vi.fn();
const currentRoute = ref({ query: {} });
const router = {
  push: (...a) => push(...a),
  get currentRoute() {
    return currentRoute;
  },
};
vi.mock("vue-router", () => ({
  useRouter: () => router,
  useRoute: () => currentRoute.value,
  RouterLink: { name: "RouterLink", template: "<a><slot /></a>" },
}));

// ---- Mock the useAuth composable ----
const register = vi.fn();
const isAuthenticated = ref(false);
const hasRole = vi.fn(() => false);
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({
    businessRegisteration: register,
    isAuthenticated,
    hasRole,
  }),
}));

// ---- Mock devLog so we don't touch the @/config/env import chain ----
vi.mock("@/utils/devLog", () => ({
  devLog: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
}));

import Register from "@/views/Business/Register.vue";

const mountRegister = () =>
  mount(Register, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

let consoleSpy;

beforeEach(() => {
  vi.clearAllMocks();
  isAuthenticated.value = false;
  hasRole.mockReturnValue(false);
  currentRoute.value = { query: {} };
  consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  consoleSpy.mockRestore();
});

describe("Business/Register.vue", () => {
  it("renders the registration form in default (non-loading, no-error) state", () => {
    const wrapper = mountRegister();

    // Heading rendered.
    expect(wrapper.text()).toContain("Business Registration");
    // No error alert when errorMessage is empty (v-if false branch).
    expect(wrapper.find(".alert-danger").exists()).toBe(false);
    // Submit button not loading: no spinner, text "Register", not disabled.
    const submit = wrapper.find("button[type='submit']");
    expect(submit.find(".spinner-border").exists()).toBe(false);
    expect(submit.text()).toContain("Register");
    expect(submit.text()).not.toContain("Registering...");
    expect(submit.attributes("disabled")).toBeUndefined();
    // Both password inputs start masked; eye icons show (showPassword=false branch).
    expect(wrapper.find("#password").attributes("type")).toBe("password");
    expect(wrapper.find("#cpassword").attributes("type")).toBe("password");
    expect(wrapper.findAll("i.bi-eye")).toHaveLength(2);
    expect(wrapper.findAll("i.bi-eye-slash")).toHaveLength(0);
    // Two router-links present (Login + Back to Homepage).
    expect(wrapper.findAllComponents(RouterLinkStub)).toHaveLength(2);
    const targets = wrapper
      .findAllComponents(RouterLinkStub)
      .map((l) => l.props("to"));
    expect(targets).toEqual(["/business/login", "/"]);
  });

  it("does NOT redirect on mount when not authenticated", () => {
    isAuthenticated.value = false;
    hasRole.mockReturnValue(true);
    mountRegister();
    // onBeforeMount: isAuthenticated false short-circuits -> no push, hasRole never reached.
    expect(push).not.toHaveBeenCalled();
  });

  it("does NOT redirect on mount when authenticated but not an advertiser", () => {
    isAuthenticated.value = true;
    hasRole.mockReturnValue(false);
    mountRegister();
    // onBeforeMount: authenticated true but hasRole('advertiser') false -> no push.
    expect(hasRole).toHaveBeenCalledWith("advertiser");
    expect(push).not.toHaveBeenCalled();
  });

  it("redirects to dashboard on mount when authenticated advertiser", () => {
    isAuthenticated.value = true;
    hasRole.mockReturnValue(true);
    mountRegister();
    // onBeforeMount: both conditions true -> push to dashboard.
    expect(push).toHaveBeenCalledWith("/business/dashboard");
  });

  it("toggles password visibility via the first toggle button (password input-group)", async () => {
    const wrapper = mountRegister();
    // The first type="button" is the password toggle.
    const toggles = wrapper
      .findAll("button")
      .filter((b) => b.attributes("type") === "button");
    const firstToggle = toggles[0];

    expect(wrapper.find("#password").attributes("type")).toBe("password");
    expect(wrapper.find("#cpassword").attributes("type")).toBe("password");

    await firstToggle.trigger("click"); // showPassword -> true (both inputs share it)
    expect(wrapper.find("#password").attributes("type")).toBe("text");
    expect(wrapper.find("#cpassword").attributes("type")).toBe("text");
    expect(wrapper.findAll("i.bi-eye-slash")).toHaveLength(2);
    expect(wrapper.findAll("i.bi-eye")).toHaveLength(0);

    await firstToggle.trigger("click"); // showPassword -> false
    expect(wrapper.find("#password").attributes("type")).toBe("password");
    expect(wrapper.findAll("i.bi-eye")).toHaveLength(2);
  });

  it("toggles password visibility via the second toggle button (confirm input-group)", async () => {
    const wrapper = mountRegister();
    const toggles = wrapper
      .findAll("button")
      .filter((b) => b.attributes("type") === "button");
    const secondToggle = toggles[1];

    await secondToggle.trigger("click"); // showPassword -> true
    expect(wrapper.find("#password").attributes("type")).toBe("text");
    expect(wrapper.find("#cpassword").attributes("type")).toBe("text");

    await secondToggle.trigger("click"); // showPassword -> false
    expect(wrapper.find("#cpassword").attributes("type")).toBe("password");
  });

  it("binds all form fields and rememberMe via v-model", async () => {
    const wrapper = mountRegister();

    await wrapper.find("#name").setValue("Acme Biz");
    await wrapper.find("#email").setValue("biz@example.com");
    await wrapper.find("#phone").setValue("0123456789");
    await wrapper.find("#password").setValue("secret");
    await wrapper.find("#cpassword").setValue("secret");
    await wrapper.find("#rememberMe").setValue(true);

    expect(wrapper.find("#name").element.value).toBe("Acme Biz");
    expect(wrapper.find("#email").element.value).toBe("biz@example.com");
    expect(wrapper.find("#phone").element.value).toBe("0123456789");
    expect(wrapper.find("#password").element.value).toBe("secret");
    expect(wrapper.find("#cpassword").element.value).toBe("secret");
    expect(wrapper.find("#rememberMe").element.checked).toBe(true);
  });

  it("registers successfully and redirects to advertise when no redirect query is present", async () => {
    register.mockResolvedValueOnce({ data: { token: "abc" } });
    currentRoute.value = { query: {} };

    const wrapper = mountRegister();
    await wrapper.find("#name").setValue("Acme Biz");
    await wrapper.find("#email").setValue("biz@example.com");
    await wrapper.find("#phone").setValue("0123456789");
    await wrapper.find("#password").setValue("secret");
    await wrapper.find("#cpassword").setValue("secret");

    // Drive the submit handler. While in-flight, isLoading shows the spinner.
    const submitPromise = wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();
    const submitBtn = wrapper.find("button[type='submit']");
    expect(submitBtn.find(".spinner-border").exists()).toBe(true);
    expect(submitBtn.text()).toContain("Registering...");
    expect(submitBtn.attributes("disabled")).toBeDefined();

    await submitPromise;
    await flushPromises();

    // register called with the whole form object.
    expect(register).toHaveBeenCalledWith({
      name: "Acme Biz",
      email: "biz@example.com",
      phone: "0123456789",
      location: "",
      password: "secret",
      cpassword: "secret",
    });
    // redirectPath undefined -> falls back to advertise.
    expect(push).toHaveBeenCalledWith("/business/advertise");
    // finally{} resets isLoading.
    const after = wrapper.find("button[type='submit']");
    expect(after.find(".spinner-border").exists()).toBe(false);
    expect(after.text()).toContain("Register");
    expect(after.attributes("disabled")).toBeUndefined();
  });

  it("redirects to the redirect query path on successful registration when provided", async () => {
    register.mockResolvedValueOnce({ data: { token: "abc" } });
    currentRoute.value = { query: { redirect: "/business/campaigns" } };

    const wrapper = mountRegister();
    await wrapper.find("#name").setValue("Acme Biz");
    await wrapper.find("#email").setValue("biz@example.com");
    await wrapper.find("#phone").setValue("0123456789");
    await wrapper.find("#password").setValue("secret");
    await wrapper.find("#cpassword").setValue("secret");
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    // redirectPath truthy -> push to it instead of advertise.
    expect(push).toHaveBeenCalledWith("/business/campaigns");
  });

  it("shows the error message when registration rejects, logs it, and dismiss closes the alert", async () => {
    register.mockRejectedValueOnce("Email already in use");

    const wrapper = mountRegister();
    await wrapper.find("#name").setValue("Acme Biz");
    await wrapper.find("#email").setValue("biz@example.com");
    await wrapper.find("#phone").setValue("0123456789");
    await wrapper.find("#password").setValue("secret");
    await wrapper.find("#cpassword").setValue("secret");
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    // catch{} sets errorMessage to the raw error -> alert v-if true branch renders.
    const alert = wrapper.find(".alert-danger");
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain("Email already in use");
    // console.log(error) executed in catch.
    expect(consoleSpy).toHaveBeenCalledWith("Email already in use");
    // Did not navigate.
    expect(push).not.toHaveBeenCalled();
    // finally{} reset loading.
    expect(
      wrapper.find("button[type='submit']").attributes("disabled")
    ).toBeUndefined();

    // The dismiss button clears errorMessage -> alert disappears (v-if false branch).
    await wrapper.find(".alert-danger .btn-close").trigger("click");
    expect(wrapper.find(".alert-danger").exists()).toBe(false);
  });
});
