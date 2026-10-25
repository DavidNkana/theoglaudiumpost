import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import IconCommunity from "./IconCommunity.vue";

describe("IconCommunity.vue", () => {
  it("renders an svg element", () => {
    const wrapper = mount(IconCommunity);
    const svg = wrapper.find("svg");
    expect(svg.exists()).toBe(true);
    expect(svg.attributes("width")).toBe("20");
    expect(svg.attributes("height")).toBe("20");
    expect(svg.attributes("fill")).toBe("currentColor");
  });

  it("renders the path", () => {
    const wrapper = mount(IconCommunity);
    expect(wrapper.find("path").exists()).toBe(true);
  });
});
