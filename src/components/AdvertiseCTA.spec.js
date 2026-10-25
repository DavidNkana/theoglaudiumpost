import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import AdvertiseCTA from "@/components/AdvertiseCTA.vue";

describe("AdvertiseCTA.vue", () => {
  it("renders the WhatsApp advertise link with correct attributes", () => {
    const wrapper = mount(AdvertiseCTA);

    const link = wrapper.find("a");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("https://wa.me/27774806048");
    expect(link.attributes("target")).toBe("_blank");
    expect(link.attributes("rel")).toBe("noopener noreferrer");
    expect(link.classes()).toContain("btn");
    expect(link.classes()).toContain("btn-lg");
    expect(link.classes()).toContain("btn-warning");
    expect(link.classes()).toContain("animate-cta");
  });

  it("renders the megaphone icon and CTA text", () => {
    const wrapper = mount(AdvertiseCTA);

    expect(wrapper.find("i.bi.bi-megaphone").exists()).toBe(true);
    expect(wrapper.text()).toContain("Advertise with us!");
  });
});
