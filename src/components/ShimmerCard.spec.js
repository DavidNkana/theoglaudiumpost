import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ShimmerCard from "@/components/ShimmerCard.vue";

describe("ShimmerCard.vue", () => {
  it("renders the static shimmer skeleton structure", () => {
    const wrapper = mount(ShimmerCard);

    // Root card container.
    const root = wrapper.find("div.card.news-card");
    expect(root.exists()).toBe(true);
    expect(root.classes()).toContain("h-100");
    expect(root.classes()).toContain("bg-white");

    // Image container with shimmer image + category badge.
    const imgContainer = wrapper.find("div.card-img-container");
    expect(imgContainer.exists()).toBe(true);
    expect(imgContainer.find("div.card-img-top.shimmer").exists()).toBe(true);
    expect(wrapper.find("span.category-badge.badge.shimmer").exists()).toBe(true);

    // Card body has three shimmer placeholder lines.
    const body = wrapper.find("div.card-body");
    expect(body.exists()).toBe(true);
    expect(body.findAll("div.shimmer")).toHaveLength(3);

    // Footer has two shimmer placeholders.
    const footer = wrapper.find("div.card-footer");
    expect(footer.exists()).toBe(true);
    expect(footer.findAll("div.shimmer")).toHaveLength(2);

    // Total shimmer elements across the whole card (1 img + 1 badge + 3 body + 2 footer).
    expect(wrapper.findAll(".shimmer")).toHaveLength(7);
  });
});
