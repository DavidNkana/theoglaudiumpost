import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import IconSupport from "@/components/icons/IconSupport.vue";

describe("IconSupport.vue", () => {
  it("renders an svg with the expected attributes", () => {
    const wrapper = mount(IconSupport);
    const svg = wrapper.find("svg");
    expect(svg.exists()).toBe(true);
    expect(svg.attributes("width")).toBe("20");
    expect(svg.attributes("height")).toBe("20");
    expect(svg.attributes("fill")).toBe("currentColor");
    expect(wrapper.find("path").exists()).toBe(true);
  });
});
