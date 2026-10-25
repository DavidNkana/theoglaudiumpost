import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import IconEcosystem from "./IconEcosystem.vue";

describe("IconEcosystem.vue", () => {
  it("renders an svg element with the expected attributes", () => {
    const wrapper = mount(IconEcosystem);
    const svg = wrapper.find("svg");
    expect(svg.exists()).toBe(true);
    expect(svg.attributes("width")).toBe("18");
    expect(svg.attributes("height")).toBe("20");
    expect(svg.attributes("fill")).toBe("currentColor");
    expect(svg.attributes("xmlns")).toBe("http://www.w3.org/2000/svg");
  });

  it("renders the path", () => {
    const wrapper = mount(IconEcosystem);
    expect(wrapper.find("path").exists()).toBe(true);
  });
});
