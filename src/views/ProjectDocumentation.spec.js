import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import ProjectDocumentation from "@/views/ProjectDocumentation.vue";

const mountPage = () =>
  mount(ProjectDocumentation, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

describe("ProjectDocumentation.vue", () => {
  it("mounts without error", () => {
    const wrapper = mountPage();
    expect(wrapper.exists()).toBe(true);
  });

  it("renders the documentation placeholder text", () => {
    const wrapper = mountPage();
    expect(wrapper.text()).toBe("Documentation");
  });
});
