import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SearchField from "@/components/SearchField.vue";

describe("SearchField.vue", () => {
  it("mounts and renders its static label", () => {
    const wrapper = mount(SearchField);
    expect(wrapper.text()).toContain("SearchField");
  });
});
