import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import NotFound404 from "@/views/Errors/404.vue";

function mountView() {
  return mount(NotFound404, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  });
}

describe("Errors/404.vue", () => {
  it("renders the 404 error code, subtitle, and message", () => {
    const wrapper = mountView();
    expect(wrapper.find(".error-title").text()).toBe("404");
    expect(wrapper.find(".error-subtitle").text()).toBe("Page Not Found");
    expect(wrapper.find(".error-message").text()).toContain(
      "the page you are looking for doesn't exist or has been moved"
    );
  });

  it("renders the question-circle icon", () => {
    const wrapper = mountView();
    expect(
      wrapper.find(".error-icon i.bi-question-circle-fill").exists()
    ).toBe(true);
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
