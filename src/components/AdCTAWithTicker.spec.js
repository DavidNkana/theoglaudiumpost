import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import AdCTAWithTicker from "@/components/AdCTAWithTicker.vue";

describe("AdCTAWithTicker", () => {
  it("defaults to the row layout and renders the ticker", () => {
    const wrapper = mount(AdCTAWithTicker);
    const root = wrapper.find(".cta-ticker-wrapper");
    expect(root.classes()).toContain("layout-row");
    expect(root.classes()).not.toContain("layout-col");

    // Ticker container is rendered only in the row layout.
    expect(wrapper.find(".ticker-container").exists()).toBe(true);
    expect(wrapper.find(".ticker-scroll").exists()).toBe(true);
    expect(wrapper.find(".ticker-text").exists()).toBe(true);

    // Advertise button is not full-width in row layout.
    const btn = wrapper.find("a.advertise-btn");
    expect(btn.classes()).not.toContain("btn-fullwidth");
    expect(btn.attributes("href")).toBe("https://wa.me/27774806048");
    expect(btn.attributes("target")).toBe("_blank");
    expect(btn.attributes("rel")).toBe("noopener noreferrer");
    expect(btn.find("span.btn-text").text()).toBe("Advertise with us!");
  });

  it("renders the column layout without the ticker and with a full-width button", () => {
    const wrapper = mount(AdCTAWithTicker, { props: { layout: "col" } });
    const root = wrapper.find(".cta-ticker-wrapper");
    expect(root.classes()).toContain("layout-col");
    expect(root.classes()).not.toContain("layout-row");

    // v-if="layout === 'row'" is false -> ticker container absent.
    expect(wrapper.find(".ticker-container").exists()).toBe(false);

    // Column layout makes the advertise button full width.
    expect(wrapper.find("a.advertise-btn").classes()).toContain("btn-fullwidth");
  });

  it("accepts the documented layout values via the prop validator", () => {
    const { validator } = AdCTAWithTicker.props.layout;
    expect(validator("row")).toBe(true);
    expect(validator("col")).toBe(true);
    expect(validator("diagonal")).toBe(false);
  });
});
