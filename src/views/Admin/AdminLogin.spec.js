import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// --- Mock every external boundary the SFC imports ---------------------------

// useAuth composable -> only `login` is consumed by AdminLogin.vue
const login = vi.fn();
vi.mock("@/composables/useAuth", () => ({
  useAuth: () => ({ login }),
}));

// vue-router -> useRoute / useRouter return controllable mocks
const push = vi.fn();
let routeMock;
vi.mock("vue-router", () => ({
  useRoute: () => routeMock,
  useRouter: () => ({ push }),
}));

import AdminLogin from "@/views/Admin/AdminLogin.vue";

function mountLogin() {
  return mount(AdminLogin, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  routeMock = { query: {} };
});

describe("AdminLogin.vue", () => {
  it("renders the login form, logo and Back to Homepage link in the default state", () => {
    const wrapper = mountLogin();

    expect(wrapper.find(".admin-login-container").exists()).toBe(true);
    expect(wrapper.find("h2.fw-bold").text()).toBe("Admin Login");
    expect(wrapper.find('img[alt="Laudium POST"]').exists()).toBe(true);

    // No error alert initially
    expect(wrapper.find(".alert.alert-danger").exists()).toBe(false);

    // Password starts hidden, eye icon shown, submit button enabled + "Sign In"
    expect(wrapper.find("#password").attributes("type")).toBe("password");
    expect(wrapper.find("i.bi.bi-eye").exists()).toBe(true);
    expect(wrapper.find("i.bi.bi-eye-slash").exists()).toBe(false);

    const submit = wrapper.find('button[type="submit"]');
    expect(submit.attributes("disabled")).toBeUndefined();
    expect(submit.text()).toContain("Sign In");
    expect(wrapper.find(".spinner-border").exists()).toBe(false);

    // RouterLink back to homepage
    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.props("to")).toBe("/");
  });

  it("toggles password visibility via the eye button (both :type and :class branches)", async () => {
    const wrapper = mountLogin();

    await wrapper.find('.input-group button[type="button"]').trigger("click");

    expect(wrapper.find("#password").attributes("type")).toBe("text");
    expect(wrapper.find("i.bi.bi-eye-slash").exists()).toBe(true);
    expect(wrapper.find("i.bi.bi-eye").exists()).toBe(false);

    // Toggle back
    await wrapper.find('.input-group button[type="button"]').trigger("click");
    expect(wrapper.find("#password").attributes("type")).toBe("password");
  });

  it("binds email, password and rememberMe via v-model", async () => {
    const wrapper = mountLogin();

    await wrapper.find("#email").setValue("admin@laudiumbiz.co.za");
    await wrapper.find("#password").setValue("secret");
    await wrapper.find("#rememberMe").setValue(true);

    expect(wrapper.find("#email").element.value).toBe("admin@laudiumbiz.co.za");
    expect(wrapper.find("#password").element.value).toBe("secret");
    expect(wrapper.find("#rememberMe").element.checked).toBe(true);
  });

  it("shows the loading state while login is in flight (spinner + disabled + 'Signing In...')", async () => {
    let resolveLogin;
    login.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveLogin = resolve;
      })
    );

    const wrapper = mountLogin();
    await wrapper.find("#email").setValue("a@b.co");
    await wrapper.find("#password").setValue("pw");

    wrapper.find("form").trigger("submit.prevent");
    await wrapper.vm.$nextTick();

    const submit = wrapper.find('button[type="submit"]');
    expect(submit.attributes("disabled")).toBeDefined();
    expect(wrapper.find(".spinner-border").exists()).toBe(true);
    expect(submit.text()).toContain("Signing In...");

    resolveLogin({});
    await flushPromises();

    // Loading reset once complete
    expect(wrapper.find('button[type="submit"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.find(".spinner-border").exists()).toBe(false);
  });

  it("redirects to /admin/dashboard on success when no redirect query is present", async () => {
    login.mockResolvedValueOnce({});

    const wrapper = mountLogin();
    await wrapper.find("#email").setValue("admin@laudiumbiz.co.za");
    await wrapper.find("#password").setValue("pw");
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(login).toHaveBeenCalledWith("admin@laudiumbiz.co.za", "pw");
    expect(push).toHaveBeenCalledWith("/admin/dashboard");
    expect(wrapper.find(".alert.alert-danger").exists()).toBe(false);
  });

  it("redirects to the route redirect query target when present", async () => {
    routeMock = { query: { redirect: "/admin/posts" } };
    login.mockResolvedValueOnce({});

    const wrapper = mountLogin();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(push).toHaveBeenCalledWith("/admin/posts");
  });

  it("shows the server message on a 401 error that includes response data message", async () => {
    login.mockRejectedValueOnce({
      response: { status: 401, data: { message: "Account locked" } },
    });

    const wrapper = mountLogin();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    const alert = wrapper.find(".alert.alert-danger");
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain("Account locked");
  });

  it("shows the default invalid-credentials message on a 401 without a data message", async () => {
    login.mockRejectedValueOnce({ response: { status: 401 } });

    const wrapper = mountLogin();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(wrapper.find(".alert.alert-danger").text()).toContain(
      "Invalid email or password"
    );
  });

  it("shows the response data message on a non-401 error", async () => {
    login.mockRejectedValueOnce({
      response: { status: 500, data: { message: "Server exploded" } },
    });

    const wrapper = mountLogin();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(wrapper.find(".alert.alert-danger").text()).toContain(
      "Server exploded"
    );
  });

  it("falls back to error.message on a non-401 error without response data message", async () => {
    login.mockRejectedValueOnce({
      response: { status: 500, data: {} },
      message: "Network down",
    });

    const wrapper = mountLogin();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(wrapper.find(".alert.alert-danger").text()).toContain("Network down");
  });

  it("falls back to the generic 'Login failed' message when no message info exists", async () => {
    login.mockRejectedValueOnce({});

    const wrapper = mountLogin();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(wrapper.find(".alert.alert-danger").text()).toContain("Login failed");
  });

  it("clears the error message when the alert dismiss button is clicked", async () => {
    login.mockRejectedValueOnce({});

    const wrapper = mountLogin();
    await wrapper.find("form").trigger("submit.prevent");
    await flushPromises();

    expect(wrapper.find(".alert.alert-danger").exists()).toBe(true);

    await wrapper.find(".alert .btn-close").trigger("click");

    expect(wrapper.find(".alert.alert-danger").exists()).toBe(false);
  });
});
