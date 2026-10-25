import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import ClicksCard from "./ClicksCard.vue";

/* ------------------------------------------------------------------ */
/* ClicksCard is a pure presentational component with no external      */
/* imports — nothing to mock. We drive both branches of v-if/v-else    */
/* (loaded vs loading) and the totalClicks.toLocaleString() rendering. */
/* ------------------------------------------------------------------ */

describe("ClicksCard.vue", () => {
  it("renders the loaded state with formatted totalClicks (v-if branch)", () => {
    const wrapper = mount(ClicksCard, {
      props: { isLoading: false, totalClicks: 1234567 },
    });

    // The non-loading branch shows the label and the formatted number.
    expect(wrapper.find("h6").text()).toBe("Total Clicks");
    expect(wrapper.find("h3").text()).toBe((1234567).toLocaleString());

    // Shimmer placeholders must NOT be present in the loaded state.
    expect(wrapper.find(".shimmer").exists()).toBe(false);

    // Static icon markup is always present.
    expect(wrapper.find("i.bi.bi-mouse").exists()).toBe(true);
  });

  it("uses the prop defaults (isLoading=false, totalClicks=0)", () => {
    const wrapper = mount(ClicksCard);

    // Defaults: not loading, zero clicks.
    expect(wrapper.find("h6").exists()).toBe(true);
    expect(wrapper.find("h3").text()).toBe((0).toLocaleString());
    expect(wrapper.find(".shimmer").exists()).toBe(false);
  });

  it("renders the loading shimmer state (v-else branch)", () => {
    const wrapper = mount(ClicksCard, {
      props: { isLoading: true, totalClicks: 999 },
    });

    // The loading branch swaps content for shimmer placeholders.
    expect(wrapper.find("h6").exists()).toBe(false);
    expect(wrapper.find("h3").exists()).toBe(false);

    const shimmers = wrapper.findAll(".shimmer");
    expect(shimmers.length).toBe(2);

    // Container for the loading state carries the w-100 class.
    expect(wrapper.find(".card-body > div.w-100").exists()).toBe(true);
  });
});
