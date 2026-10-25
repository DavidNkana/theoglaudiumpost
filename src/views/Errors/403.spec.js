import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import Forbidden403 from "@/views/Errors/403.vue";

function mountView() {
  return mount(Forbidden403, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe("Errors/403.vue", () => {
  it("renders the 403 error code, subtitle, and message", () => {
    const wrapper = mountView();
    expect(wrapper.find(".error-title").text()).toBe("403");
    expect(wrapper.find(".error-subtitle").text()).toBe("Access Forbidden");
    expect(wrapper.find(".error-message").text()).toContain(
      "you don't have permission to access this page"
    );
  });

  it("renders the shield-lock icon", () => {
    const wrapper = mountView();
    expect(wrapper.find(".error-icon i.bi-shield-lock-fill").exists()).toBe(true);
  });

  it("links back to the homepage via router-link", () => {
    const wrapper = mountView();
    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.exists()).toBe(true);
    expect(link.props("to")).toBe("/");
    expect(link.text()).toContain("Go to Homepage");
    expect(link.find("i.bi-house-door").exists()).toBe(true);
  });
});
