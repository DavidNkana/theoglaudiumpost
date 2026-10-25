import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";

// ---------------------------------------------------------------------------
// Mock the only external boundary InArticleAd.vue imports: the useAds composable.
// We control both `ads` (reactive list) and `trackClick` (click handler) so we
// can drive the empty-list branch, the populated v-for branch, and the
// @click handler invocation.
// ---------------------------------------------------------------------------
const adsRef = ref([]);
const trackClick = vi.fn();
const useAds = vi.fn(() => ({ ads: adsRef, trackClick }));

vi.mock("@/composables/useAds", () => ({
  useAds: (...args) => useAds(...args),
}));

import InArticleAd from "@/components/InArticleAd.vue";

beforeEach(() => {
  adsRef.value = [];
  trackClick.mockReset();
  useAds.mockClear();
});

describe("InArticleAd.vue", () => {
  it("calls useAds with the 'in-article-mid' placement key", () => {
    mount(InArticleAd);
    expect(useAds).toHaveBeenCalledWith("in-article-mid");
  });

  it("renders nothing when the ads list is empty (v-for empty branch)", () => {
    adsRef.value = [];
    const wrapper = mount(InArticleAd);

    expect(wrapper.findAll("div.my-6")).toHaveLength(0);
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find("a").exists()).toBe(false);
  });

  it("renders one wrapper per ad with link + image attributes (v-for populated branch)", () => {
    adsRef.value = [
      {
        id: 1,
        linkUrl: "https://example.com/one",
        imageUrl: "https://cdn.example.com/one.png",
        title: "Ad One",
      },
      {
        id: 2,
        linkUrl: "https://example.com/two",
        imageUrl: "https://cdn.example.com/two.png",
        title: "Ad Two",
      },
    ];
    const wrapper = mount(InArticleAd);

    const wrappers = wrapper.findAll("div.my-6");
    expect(wrappers).toHaveLength(2);

    const anchors = wrapper.findAll("a");
    expect(anchors).toHaveLength(2);
    expect(anchors[0].attributes("href")).toBe("https://example.com/one");
    expect(anchors[0].attributes("target")).toBe("_blank");
    expect(anchors[1].attributes("href")).toBe("https://example.com/two");

    const imgs = wrapper.findAll("img");
    expect(imgs).toHaveLength(2);
    expect(imgs[0].attributes("src")).toBe("https://cdn.example.com/one.png");
    expect(imgs[0].attributes("alt")).toBe("Ad One");
    expect(imgs[0].classes()).toContain("w-full");
    expect(imgs[0].classes()).toContain("rounded-lg");
    expect(imgs[1].attributes("src")).toBe("https://cdn.example.com/two.png");
    expect(imgs[1].attributes("alt")).toBe("Ad Two");
  });

  it("calls trackClick with the ad id when its anchor is clicked", async () => {
    adsRef.value = [
      {
        id: 42,
        linkUrl: "https://example.com/click",
        imageUrl: "https://cdn.example.com/click.png",
        title: "Clickable Ad",
      },
    ];
    const wrapper = mount(InArticleAd);

    await wrapper.find("a").trigger("click");

    expect(trackClick).toHaveBeenCalledTimes(1);
    expect(trackClick).toHaveBeenCalledWith(42);
  });
});
