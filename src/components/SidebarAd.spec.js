import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";

// --- Mock the useAds composable -------------------------------------------
// SidebarAd.vue destructures `{ ads, trackClick }` from useAds("sidebar").
// We control both: `ads` is a ref we populate per-test to drive the v-for
// (empty vs. populated), and `trackClick` is a spy to assert the click
// handler wiring.
const adsRef = ref([]);
const trackClick = vi.fn();
vi.mock("@/composables/useAds", () => ({
  useAds: vi.fn(() => ({ ads: adsRef, trackClick })),
}));

import { useAds } from "@/composables/useAds";
import SidebarAd from "@/components/SidebarAd.vue";

const adA = {
  id: 1,
  linkUrl: "https://advertiser-a.com/landing",
  image: "https://cdn.example.com/ad-1.png",
  title: "Ad One",
};

const adB = {
  id: 2,
  linkUrl: "https://advertiser-b.com/landing",
  image: "https://cdn.example.com/ad-2.png",
  title: "Ad Two",
};

describe("SidebarAd.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adsRef.value = [];
  });

  it("calls useAds with the 'sidebar' placement", () => {
    mount(SidebarAd);
    expect(useAds).toHaveBeenCalledWith("sidebar");
  });

  it("renders nothing when the ads list is empty (v-for empty branch)", () => {
    adsRef.value = [];
    const wrapper = mount(SidebarAd);

    expect(wrapper.findAll("div.mb-4")).toHaveLength(0);
    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("renders one ad block per ad with bound href/image/alt (v-for populated branch)", () => {
    adsRef.value = [adA, adB];
    const wrapper = mount(SidebarAd);

    const blocks = wrapper.findAll("div.mb-4");
    expect(blocks).toHaveLength(2);

    const links = wrapper.findAll("a");
    expect(links).toHaveLength(2);
    expect(links[0].attributes("href")).toBe(adA.linkUrl);
    expect(links[0].attributes("target")).toBe("_blank");

    const imgs = wrapper.findAll("img");
    expect(imgs[0].attributes("src")).toBe(adA.image);
    expect(imgs[0].attributes("alt")).toBe(adA.title);
    expect(imgs[0].classes()).toContain("rounded");
    expect(imgs[0].classes()).toContain("shadow");

    expect(imgs[1].attributes("src")).toBe(adB.image);
    expect(imgs[1].attributes("alt")).toBe(adB.title);
  });

  it("invokes trackClick with the ad id when an ad link is clicked", async () => {
    adsRef.value = [adA, adB];
    const wrapper = mount(SidebarAd);

    await wrapper.findAll("a")[0].trigger("click");
    expect(trackClick).toHaveBeenCalledTimes(1);
    expect(trackClick).toHaveBeenCalledWith(adA.id);

    await wrapper.findAll("a")[1].trigger("click");
    expect(trackClick).toHaveBeenCalledTimes(2);
    expect(trackClick).toHaveBeenLastCalledWith(adB.id);
  });
});
