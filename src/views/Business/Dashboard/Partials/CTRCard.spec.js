import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CTRCard from "./CTRCard.vue";

describe("CTRCard.vue", () => {
  it("renders the CTR value branch (v-if: !isLoading) with default props", () => {
    const wrapper = mount(CTRCard);

    // Default props: isLoading=false, ctr=0 -> the value branch renders.
    expect(wrapper.find("h6").text()).toBe("Average CTR");
    expect(wrapper.find("h3").text()).toBe("0.0%");

    // Loading shimmer branch must NOT be present.
    expect(wrapper.find(".shimmer").exists()).toBe(false);

    // Static icon is always rendered.
    expect(wrapper.find("i.bi-graph-up-arrow").exists()).toBe(true);
  });

  it("formats the provided ctr prop to one decimal place", () => {
    const wrapper = mount(CTRCard, {
      props: { isLoading: false, ctr: 12.345 },
    });

    expect(wrapper.find("h3").text()).toBe("12.3%");
    expect(wrapper.find(".shimmer").exists()).toBe(false);
  });

  it("renders the loading shimmer branch (v-else: isLoading) and hides the value", () => {
    const wrapper = mount(CTRCard, {
      props: { isLoading: true, ctr: 7.2 },
    });

    // v-else branch: two shimmer placeholders, no value heading.
    const shimmers = wrapper.findAll(".shimmer");
    expect(shimmers).toHaveLength(2);
    expect(wrapper.find("h6").exists()).toBe(false);
    expect(wrapper.find("h3").exists()).toBe(false);

    // Icon still rendered in loading state.
    expect(wrapper.find("i.bi-graph-up-arrow").exists()).toBe(true);
  });
});
