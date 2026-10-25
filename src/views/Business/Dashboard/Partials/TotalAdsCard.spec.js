import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";

import TotalAdsCard from "./TotalAdsCard.vue";

/* ------------------------------------------------------------------ */
/* TotalAdsCard is a pure presentational component with no external    */
/* imports — nothing to mock. We drive both branches of v-if/v-else    */
/* (loaded vs loading) and the totalAds rendering, plus prop defaults. */
/* ------------------------------------------------------------------ */

describe("TotalAdsCard.vue", () => {
  it("renders the loaded state with totalAds (v-if branch)", () => {
    const wrapper = mount(TotalAdsCard, {
      props: { isLoading: false, totalAds: 42 },
    });

    // The non-loading branch shows the label and the number.
    expect(wrapper.find("h6").text()).toBe("Total Ads");
    expect(wrapper.find("h3").text()).toBe("42");

    // Shimmer placeholders must NOT be present in the loaded state.
    expect(wrapper.find(".shimmer").exists()).toBe(false);

    // Static icon markup is always present.
    expect(wrapper.find("i.bi.bi-badge-ad").exists()).toBe(true);
  });

  it("uses the prop defaults (isLoading=false, totalAds=0)", () => {
    const wrapper = mount(TotalAdsCard);

    // Defaults: not loading, zero ads.
    expect(wrapper.find("h6").exists()).toBe(true);
    expect(wrapper.find("h3").text()).toBe("0");
    expect(wrapper.find(".shimmer").exists()).toBe(false);
  });

  it("renders the loading shimmer state (v-else branch)", () => {
    const wrapper = mount(TotalAdsCard, {
      props: { isLoading: true, totalAds: 999 },
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
