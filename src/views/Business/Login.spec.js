import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// ---- Mock the router (useRouter from "vue-router") ----
const push = vi.fn();
const currentRoute = ref({ query: {} });
const routerMock = {
  push: (...a) => push(...a),
  get currentRoute() {
    return currentRoute;
  },
};
vi.mock("vue-router", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useRouter: () => routerMock,
    useRoute: () => currentRoute.value,
  };
});

// ---- Mock the useAuth composable ----
const login = vi.fn();
const isAuthenticated = ref(false);
const hasRole = vi.fn(() => false);
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ login, isAuthenticated, hasRole }),
}));

import Login from "@/views/Business/Login.vue";

const mountLogin = () =>
  mount(Login, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  isAuthenticated.value = false;
  hasRole.mockReturnValue(false);
  currentRoute.value = { query: {} };
});

describe("Business/Login.vue", () => {
  it("renders the login form with default (non-loading, no-error) state", () => {
    const wrapper = mountLogin();

    // Heading rendered.
    expect(wrapper.text()).toContain("Business Login");
    // No error alert when errorMessage is empty (v-if false branch).
    expect(wrapper.find(".alert-danger").exists()).toBe(false);
    // Submit button not loading: no spinner, text "Sign In", not disabled.
    const submit = wrapper.find("button[type='submit']");
    expect(submit.find(".spinner-border").exists()).toBe(false);
    expect(submit.text()).toContain("Sign In");
    expect(submit.attributes("disabled")).toBeUndefined();
    // Password input starts masked; eye icon shows (showPassword=false branch).
    const pwd = wrapper.find("#password");
    expect(pwd.attributes("type")).toBe("password");
    expect(wrapper.find("i.bi-eye").exists()).toBe(true);
    expect(wrapper.find("i.bi-eye-slash").exists()).toBe(false);
    // Two router-links present (Register + Back to Homepage).
    expect(wrapper.findAllComponents(RouterLinkStub)).toHaveLength(2);
  });

  it("does NOT redirect on mount when not authenticated", () => {
    isAuthenticated.value = false;
    hasRole.mockReturnValue(true);
    mountLogin();
    // onBeforeMount: first condition false -> no push.
    expect(push).not.toHaveBeenCalled();
  });

  it("does NOT redirect on mount when authenticated but not an advertiser", () => {
    isAuthenticated.value = true;
    hasRole.mockReturnValue(false);
    mountLogin();
    // onBeforeMount: authenticated true but hasRole('advertiser') false -> no push.
    expect(hasRole).toHaveBeenCalledWith("advertiser");
    expect(push).not.toHaveBeenCalled();
  });

  it("redirects to dashboard on mount when authenticated advertiser", () => {
    isAuthenticated.value = true;
    hasRole.mockReturnValue(true);
    mountLogin();
    // onBeforeMount: both conditions true -> push to dashboard.
    expect(push).toHaveBeenCalledWith("/business/dashboard");
  });

  it("toggles password visibility and the eye icon when the toggle button is clicked", async () => {
    const wrapper = mountLogin();
    // The non-submit, non-checkbox button inside the password input-group is the toggle.
    const toggle = wrapper
      .findAll("button")
      .find((b) => b.attributes("type") === "button");

    expect(wrapper.find("#password").attributes("type")).toBe("password");

    await toggle.trigger("click"); // showPassword -> true
    expect(wrapper.find("#password").attributes("type")).toBe("text");
    expect(wrapper.find("i.bi-eye-slash").exists()).toBe(true);
    expect(wrapper.find("i.bi-eye").exists()).toBe(false);

    await toggle.trigger("click"); // showPassword -> false
    expect(wrapper.find("#password").attributes("type")).toBe("password");
    expect(wrapper.find("i.bi-eye").exists()).toBe(true);
  });

  it("binds email, password and rememberMe via v-model", async () => {
    const wrapper = mountLogin();
    const email = wrapper.find("#email");
    const password = wrapper.find("#password");
    const remember = wrapper.find("#rememberMe");

    await email.setValue("biz@example.com");
    await password.setValue("secret");
    await remember.setValue(true);

    expect(email.element.value).toBe("biz@example.com");
    expect(password.element.value).toBe("secret");
    expect(remember.element.checked).toBe(true);
  });

  it("logs in successfully and redirects to dashboard when no redirect query is present", async () => {
    login.mockResolvedValueOnce({ data: { token: "abc" } });
    currentRoute.value = { query: {} };

    const wrapper = mountLogin();
    await wrapper.find("#email").setValue("biz@example.com");
    await wrapper.find("#password").setValue("secret");

    // Drive the submit handler. While in-flight, isLoading shows the spinner.
    const submitPromise = wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();
    const submitBtn = wrapper.find("button[type='submit']");
    expect(submitBtn.find(".spinner-border").exists()).toBe(true);
    expect(submitBtn.text()).toContain("Signing In...");
    expect(submitBtn.attributes("disabled")).toBeDefined();

    await submitPromise;
    await flushPromises();

    expect(login).toHaveBeenCalledWith("biz@example.com", "secret");
    // redirectPath undefined -> falls back to dashboard.
    expect(push).toHaveBeenCalledWith("/business/dashboard");
    // finally{} resets isLoading.
    const after = wrapper.find("button[type='submit']");
    expect(after.find(".spinner-border").exists()).toBe(false);
    expect(after.text()).toContain("Sign In");
  });

  it("redirects to the redirect query path on successful login when provided", async () => {
    login.mockResolvedValueOnce({ data: { token: "abc" } });
    currentRoute.value = { query: { redirect: "/business/campaigns" } };

    const wrapper = mountLogin();
    await wrapper.find("#email").setValue("biz@example.com");
    await wrapper.find("#password").setValue("secret");
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    // redirectPath truthy -> push to it instead of the dashboard.
    expect(push).toHaveBeenCalledWith("/business/campaigns");
  });

  it("shows an error message and clears it when login rejects, then dismiss closes the alert", async () => {
    login.mockRejectedValueOnce(new Error("bad creds"));

    const wrapper = mountLogin();
    await wrapper.find("#email").setValue("biz@example.com");
    await wrapper.find("#password").setValue("wrong");
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    // catch{} sets errorMessage -> alert v-if true branch renders.
    const alert = wrapper.find(".alert-danger");
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain("Invalid email or password. Please try again.");
    // Did not navigate.
    expect(push).not.toHaveBeenCalled();
    // finally{} reset loading.
    expect(wrapper.find("button[type='submit']").attributes("disabled")).toBeUndefined();

    // The dismiss button clears errorMessage -> alert disappears (v-if false branch).
    await wrapper.find(".alert-danger .btn-close").trigger("click");
    expect(wrapper.find(".alert-danger").exists()).toBe(false);
  });
});
