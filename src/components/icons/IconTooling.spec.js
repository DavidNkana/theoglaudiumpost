import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import IconTooling from "@/components/icons/IconTooling.vue";

describe("IconTooling", () => {
  it("renders a static SVG icon", () => {
    const wrapper = mount(IconTooling);

    const svg = wrapper.find("svg");
    expect(svg.exists()).toBe(true);
    expect(svg.attributes("viewBox")).toBe("0 0 24 24");
    expect(svg.attributes("role")).toBe("img");
  });

  it("renders a single path with the currentColor fill", () => {
    const wrapper = mount(IconTooling);

    const paths = wrapper.findAll("path");
    expect(paths).toHaveLength(1);
    expect(paths[0].attributes("fill")).toBe("currentColor");
  });
});
