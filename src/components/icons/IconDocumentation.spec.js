import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import IconDocumentation from "./IconDocumentation.vue";

describe("IconDocumentation.vue", () => {
  it("renders an svg element with expected attributes", () => {
    const wrapper = mount(IconDocumentation);
    const svg = wrapper.find("svg");
    expect(svg.exists()).toBe(true);
    expect(svg.attributes("width")).toBe("20");
    expect(svg.attributes("height")).toBe("17");
    expect(svg.attributes("fill")).toBe("currentColor");
  });

  it("renders the path", () => {
    const wrapper = mount(IconDocumentation);
    expect(wrapper.find("path").exists()).toBe(true);
  });
});
