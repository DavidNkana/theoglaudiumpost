import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";

import NewspaperAdCard from "@/components/NewspaperAdCard.vue";

const ad = {
  id: "ad1",
  title: "Fresh produce, delivered to your door",
  image_url: "https://cdn.test/ad/market.jpg",
  images: ["https://cdn.test/ad/market.jpg"],
  click_url: "https://laudiummarket.co.za",
};

const mountCard = (props = {}) => mount(NewspaperAdCard, { props: { ad, ...props } });

describe("components/NewspaperAdCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the creative and nothing else", () => {
    const wrapper = mountCard();

    expect(wrapper.find(".ad-image").attributes("src")).toBe(ad.image_url);
    expect(wrapper.text().trim()).toBe("");
    expect(wrapper.findAll("p")).toHaveLength(0);
  });

  it("links the creative to the advertiser", () => {
    const wrapper = mountCard();

    const link = wrapper.find("a.ad-link");
    expect(link.attributes("href")).toBe("https://laudiummarket.co.za");
    expect(link.attributes("target")).toBe("_blank");
    expect(link.attributes("rel")).toContain("noopener");
  });

  it("falls back to the first image when there is no primary image", () => {
    const wrapper = mountCard({
      ad: { ...ad, image_url: null, images: ["https://cdn.test/ad/other.jpg"] },
    });

    expect(wrapper.find(".ad-image").attributes("src")).toBe(
      "https://cdn.test/ad/other.jpg",
    );
  });

  it("falls back to the file list when there are no images", () => {
    const wrapper = mountCard({
      ad: { ...ad, image_url: null, images: [], files: ["https://cdn.test/ad/file.jpg"] },
    });

    expect(wrapper.find(".ad-image").attributes("src")).toBe(
      "https://cdn.test/ad/file.jpg",
    );
  });

  it("uses a placeholder when the advertisement has no creative", () => {
    const wrapper = mountCard({
      ad: { id: "ad2", title: "No creative", image_url: null, images: [] },
    });

    expect(wrapper.find(".ad-image").attributes("src")).toContain("placehold.co");
  });

  it("links to nowhere when the advertisement has no target", () => {
    const wrapper = mountCard({ ad: { ...ad, click_url: null } });

    expect(wrapper.find("a.ad-link").attributes("href")).toBe("#");
  });
});
