import { describe, it, expect } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import TagIndex from "@/views/Tag/Index.vue";

const mountPage = () =>
  mount(TagIndex, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

describe("Tag/Index.vue", () => {
  it("mounts without error", () => {
    const wrapper = mountPage();
    expect(wrapper.exists()).toBe(true);
  });

  it("renders the static placeholder text", () => {
    const wrapper = mountPage();
    expect(wrapper.text()).toBe("Tags");
  });
});
