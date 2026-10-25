import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

/* ------------------------------------------------------------------ */
/* Mock every external boundary the component imports                  */
/* ------------------------------------------------------------------ */

vi.mock("@/features/ads/AdsService", () => ({
  getAdByPlacement: vi.fn(),
  getAdByPlacementAndTags: vi.fn(),
  getAllAdByPlacement: vi.fn(),
  trackClick: vi.fn(),
  trackImpression: vi.fn(),
}));

vi.mock("@/features/media/MediaService", () => ({
  getMediaObjectUrl: vi.fn(),
}));

vi.mock("@/config/app", () => ({
  SHOW_ADS: true,
}));

// getAdDimensions is mocked so we can drive the `!aspectRatio` branch in
// adContentStyle (the real impl never returns a falsy value).
vi.mock("@/utils", () => ({
  HOME_BANNER: "home_banner",
  getAdDimensions: vi.fn(() => "4:3"),
  delay: vi.fn(),
}));

import AdBanner from "@/components/AdBanner.vue";
import {
  getAdByPlacement,
  getAdByPlacementAndTags,
  getAllAdByPlacement,
  trackClick,
  trackImpression,
} from "@/features/ads/AdsService";
import { getMediaObjectUrl } from "@/features/media/MediaService";
import { getAdDimensions } from "@/utils";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const resp = (data) => ({ data });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // Default: getMediaObjectUrl resolves to a usable url so currentImageUrl is set.
  getMediaObjectUrl.mockImplementation((id) =>
    Promise.resolve(`blob:url-${id}`)
  );
  getAdDimensions.mockReturnValue("4:3");
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

/**
 * Flush pending promises while fake timers are active. flushPromises awaits a
 * macrotask; with fake timers we must also advance them so awaited microtasks
 * chained behind timers resolve. We loop a few times to settle nested awaits.
 */
async function settle() {
  for (let i = 0; i < 5; i++) {
    await flushPromises();
  }
}

describe("AdBanner.vue", () => {
  it("renders nothing when getAllAdByPlacement returns empty and single-ad fetch yields no data", async () => {
    getAllAdByPlacement.mockResolvedValue(resp([]));
    getAdByPlacement.mockResolvedValue(resp(null));

    const wrapper = mount(AdBanner);
    await settle();

    // show && ad && currentImageUrl => ad is null, container not rendered
    expect(wrapper.find(".ad-container").exists()).toBe(false);
    expect(getAllAdByPlacement).toHaveBeenCalledWith("default");
    expect(getAdByPlacement).toHaveBeenCalledWith("default");
    // tags absent => tag-based endpoint not used
    expect(getAdByPlacementAndTags).not.toHaveBeenCalled();
  });

  it("falls back to single ad WITHOUT tags and tracks impression", async () => {
    getAllAdByPlacement.mockResolvedValue(resp(null));
    getAdByPlacement.mockResolvedValue(
      resp({
        id: 7,
        title: "Single Ad",
        description: "desc",
        business_name: "BizCo",
        click_url: "https://example.com",
        image: "img-1",
      })
    );

    const wrapper = mount(AdBanner, { props: { placement: "sidebar-top" } });
    await settle();

    expect(getAdByPlacement).toHaveBeenCalledWith("sidebar-top");
    expect(trackImpression).toHaveBeenCalledWith(7);
    expect(wrapper.find(".ad-container").exists()).toBe(true);
    expect(wrapper.find(".ad-title").text()).toBe("Single Ad");
    expect(wrapper.find(".ad-description").text()).toBe("desc");
    expect(wrapper.find(".ad-business-name").text()).toBe("BizCo");
    expect(wrapper.find("img.ad-image").attributes("src")).toBe("blob:url-img-1");
  });

  it("falls back to single ad WITH tags (tag endpoint) and renders empty description via ?? fallback", async () => {
    getAllAdByPlacement.mockResolvedValue(resp(undefined));
    getAdByPlacementAndTags.mockResolvedValue(
      resp({
        id: 9,
        title: "Tagged Ad",
        // description omitted -> ad.description ?? "" branch (null/undefined)
        business_name: "Tag Biz",
        click_url: "https://tags.example.com",
        image: "img-9",
      })
    );

    const wrapper = mount(AdBanner, {
      props: { tags: ["news", "sport"], placement: "content" },
    });
    await settle();

    expect(getAdByPlacementAndTags).toHaveBeenCalledWith("content", [
      "news",
      "sport",
    ]);
    expect(getAdByPlacement).not.toHaveBeenCalled();
    expect(wrapper.find(".ad-description").text()).toBe("");
    expect(trackImpression).toHaveBeenCalledWith(9);
  });

  it("single ad fallback where response.data has NO id does not track impression", async () => {
    getAllAdByPlacement.mockResolvedValue(resp(null));
    getAdByPlacement.mockResolvedValue(
      resp({
        title: "No Id Ad",
        business_name: "X",
        click_url: "#",
        image: "img-x",
      })
    );

    const wrapper = mount(AdBanner);
    await settle();

    expect(wrapper.find(".ad-container").exists()).toBe(true);
    expect(trackImpression).not.toHaveBeenCalled();
  });

  it("single ad fallback where response has falsy data renders nothing", async () => {
    getAllAdByPlacement.mockResolvedValue(resp([]));
    getAdByPlacement.mockResolvedValue(resp(undefined));

    const wrapper = mount(AdBanner);
    await settle();

    expect(wrapper.find(".ad-container").exists()).toBe(false);
  });

  it("hides the details block when placement === HOME_BANNER", async () => {
    getAllAdByPlacement.mockResolvedValue(resp(null));
    getAdByPlacement.mockResolvedValue(
      resp({
        id: 1,
        title: "Banner",
        business_name: "B",
        click_url: "#",
        image: "img-b",
      })
    );

    const wrapper = mount(AdBanner, { props: { placement: "home_banner" } });
    await settle();

    expect(wrapper.find(".ad-container").exists()).toBe(true);
    // placement != HOME_BANNER is false -> details not rendered
    expect(wrapper.find(".ad-details").exists()).toBe(false);
  });

  it("renders close button when showClose is true and closes the ad on click", async () => {
    getAllAdByPlacement.mockResolvedValue(resp(null));
    getAdByPlacement.mockResolvedValue(
      resp({
        id: 2,
        title: "Closable",
        business_name: "B",
        click_url: "#",
        image: "img-c",
      })
    );

    const wrapper = mount(AdBanner, { props: { showClose: true } });
    await settle();

    const closeBtn = wrapper.find(".btn-close");
    expect(closeBtn.exists()).toBe(true);

    await closeBtn.trigger("click");
    await settle();

    // show -> false collapses the whole container
    expect(wrapper.find(".ad-container").exists()).toBe(false);
  });

  it("onClick tracks click when ad has id", async () => {
    getAllAdByPlacement.mockResolvedValue(resp(null));
    getAdByPlacement.mockResolvedValue(
      resp({
        id: 42,
        title: "Clickable",
        business_name: "B",
        click_url: "#",
        image: "img-42",
      })
    );

    const wrapper = mount(AdBanner);
    await settle();

    await wrapper.find(".ad-container").trigger("click");
    expect(trackClick).toHaveBeenCalledWith(42);
  });

  it("onClick does NOT track click when ad has no id", async () => {
    // Provide an ad with an image (so it renders) but no id, via multi-ad path.
    getAllAdByPlacement.mockResolvedValue(
      resp([
        {
          title: "No Id",
          business_name: "B",
          click_url: "#",
          image: "img-noid",
        },
      ])
    );

    const wrapper = mount(AdBanner);
    await settle();

    await wrapper.find(".ad-container").trigger("click");
    expect(trackClick).not.toHaveBeenCalled();
  });

  it("multi-ad path renders ad navigation dots, supports clicking dots, and rotates ads on timer", async () => {
    const ads = [
      {
        id: 100,
        title: "Ad One",
        description: "One desc",
        business_name: "One Biz",
        click_url: "#1",
        image: "img-100",
      },
      {
        id: 200,
        title: "Ad Two",
        description: "Two desc",
        business_name: "Two Biz",
        click_url: "#2",
        image: "img-200",
      },
    ];
    getAllAdByPlacement.mockResolvedValue(resp(ads));

    const wrapper = mount(AdBanner);
    await settle();

    // hasMultipleAds true -> ad-controls rendered with one dot per ad
    const dots = wrapper.findAll(".ad-dot");
    expect(dots).toHaveLength(2);
    // first dot active (currentAdIndex 0), second not
    expect(dots[0].classes()).toContain("active");
    expect(dots[1].classes()).not.toContain("active");
    expect(wrapper.find(".ad-title").text()).toBe("Ad One");

    // Click the second dot -> currentAdIndex = 1 + checkAndStartImageRotation()
    await dots[1].trigger("click");
    await settle();
    expect(wrapper.find(".ad-title").text()).toBe("Ad Two");

    // Advance the ad-rotation timer (rotationInterval * 2 = 10000ms).
    // From index 1 -> next is 0.
    await vi.advanceTimersByTimeAsync(10000);
    await settle();
    expect(wrapper.find(".ad-title").text()).toBe("Ad One");
  });

  it("multi-image ad renders image dots, rotates images on timer, and supports clicking image dots", async () => {
    const ads = [
      {
        id: 300,
        title: "Multi Image",
        description: "imgs",
        business_name: "Biz",
        click_url: "#",
        files: ["m1", "m2", "m3"],
      },
    ];
    getAllAdByPlacement.mockResolvedValue(resp(ads));

    const wrapper = mount(AdBanner);
    await settle();

    // hasMultipleImages true -> image-controls dots, one per file
    const imageDots = wrapper.findAll(".image-dot");
    expect(imageDots).toHaveLength(3);
    expect(imageDots[0].classes()).toContain("active");
    expect(imageDots[1].classes()).not.toContain("active");

    // currentImageUrl from files[0]
    expect(wrapper.find("img.ad-image").attributes("src")).toBe("blob:url-m1");

    // Click third image dot -> currentImageIndex = 2
    await imageDots[2].trigger("click");
    await settle();
    expect(wrapper.find("img.ad-image").attributes("src")).toBe("blob:url-m3");

    // Advance image rotation timer (rotationInterval = 5000ms): 2 -> (2+1)%3 = 0
    await vi.advanceTimersByTimeAsync(5000);
    await settle();
    expect(wrapper.find("img.ad-image").attributes("src")).toBe("blob:url-m1");
  });

  it("covers fetchAd catch branch when getAllAdByPlacement rejects", async () => {
    getAllAdByPlacement.mockRejectedValue(new Error("boom"));

    const wrapper = mount(AdBanner);
    await settle();

    // catch sets ads to [] -> nothing rendered
    expect(wrapper.find(".ad-container").exists()).toBe(false);
  });

  it("covers fetchAndCacheImage catch branch when getMediaObjectUrl rejects", async () => {
    getAllAdByPlacement.mockResolvedValue(
      resp([
        {
          id: 400,
          title: "Broken Image",
          description: "d",
          business_name: "B",
          click_url: "#",
          image: "img-broken",
        },
      ])
    );
    getMediaObjectUrl.mockRejectedValue(new Error("media fail"));

    const wrapper = mount(AdBanner);
    await settle();

    // image cache stays null -> currentImageUrl null -> container not rendered
    expect(wrapper.find(".ad-container").exists()).toBe(false);
  });

  it("uses cached image url on subsequent loads (cache hit branch)", async () => {
    const ads = [
      {
        id: 500,
        title: "Cached A",
        description: "d",
        business_name: "B",
        click_url: "#",
        files: ["shared", "shared"], // duplicate mediaId hits cache on 2nd file
        image: "shared", // image already cached too
      },
    ];
    getAllAdByPlacement.mockResolvedValue(resp(ads));

    const wrapper = mount(AdBanner);
    await settle();

    expect(wrapper.find(".ad-container").exists()).toBe(true);
    // files has 2 identical ids + image identical => only one fetch
    expect(getMediaObjectUrl).toHaveBeenCalledTimes(1);
    expect(getMediaObjectUrl).toHaveBeenCalledWith("shared");
  });

  it("adContentStyle returns {} when no aspect ratio is available", async () => {
    getAdDimensions.mockReturnValue(""); // falsy -> aspectRatio falsy
    getAllAdByPlacement.mockResolvedValue(
      resp([
        {
          // no aspect_ratio -> falls back to getAdDimensions -> "" (falsy)
          id: 600,
          title: "No Ratio",
          description: "d",
          business_name: "B",
          click_url: "#",
          image: "img-600",
        },
      ])
    );

    const wrapper = mount(AdBanner);
    await settle();

    const content = wrapper.find(".ad-content");
    expect(content.exists()).toBe(true);
    // empty style object -> no inline aspect-ratio styles applied
    expect(content.attributes("style") || "").not.toContain("padding-bottom");
  });

  it("adContentStyle uses ad.aspect_ratio, sidebar max-height, and vertical (no max-height) branch", async () => {
    getAllAdByPlacement.mockResolvedValue(
      resp([
        {
          id: 700,
          title: "Vertical Sidebar",
          description: "d",
          business_name: "B",
          click_url: "#",
          image: "img-700",
          aspect_ratio: "1:2", // height > width => vertical => maxHeight none
        },
      ])
    );

    const wrapper = mount(AdBanner, { props: { placement: "sidebar" } });
    await settle();

    const style = wrapper.find(".ad-content").attributes("style");
    // paddingBottom = (2/1)*100 = 200%
    expect(style).toContain("padding-bottom: 200%");
    // vertical ad -> max-height: none
    expect(style).toContain("max-height: none");
  });

  it("adContentStyle small size branch (horizontal -> 150px max-height)", async () => {
    getAllAdByPlacement.mockResolvedValue(
      resp([
        {
          id: 800,
          title: "Small Horizontal",
          description: "d",
          business_name: "B",
          click_url: "#",
          image: "img-800",
          aspect_ratio: "4:1",
        },
      ])
    );

    const wrapper = mount(AdBanner, { props: { size: "small" } });
    await settle();

    const style = wrapper.find(".ad-content").attributes("style");
    expect(style).toContain("max-height: 150px");
  });

  it("adContentStyle medium size branch (horizontal -> 200px max-height)", async () => {
    getAllAdByPlacement.mockResolvedValue(
      resp([
        {
          id: 810,
          title: "Medium Horizontal",
          description: "d",
          business_name: "B",
          click_url: "#",
          image: "img-810",
          aspect_ratio: "4:1",
        },
      ])
    );

    // size defaults to "medium"
    const wrapper = mount(AdBanner);
    await settle();

    const style = wrapper.find(".ad-content").attributes("style");
    expect(style).toContain("max-height: 200px");
  });

  it("adContentStyle large size branch (horizontal -> default 250px max-height)", async () => {
    getAllAdByPlacement.mockResolvedValue(
      resp([
        {
          id: 820,
          title: "Large Horizontal",
          description: "d",
          business_name: "B",
          click_url: "#",
          image: "img-820",
          aspect_ratio: "4:1",
        },
      ])
    );

    const wrapper = mount(AdBanner, { props: { size: "large" } });
    await settle();

    const style = wrapper.find(".ad-content").attributes("style");
    expect(style).toContain("max-height: 250px");
  });

  it("startAdRotation timer preloads next ad images and rotates (nextAd present, with id)", async () => {
    const ads = [
      {
        id: 900,
        title: "Rotate A",
        description: "d",
        business_name: "B",
        click_url: "#",
        files: ["a1"],
      },
      {
        id: 901,
        title: "Rotate B",
        description: "d",
        business_name: "B",
        click_url: "#",
        files: ["b1"],
      },
    ];
    getAllAdByPlacement.mockResolvedValue(resp(ads));

    const wrapper = mount(AdBanner);
    await settle();
    expect(wrapper.find(".ad-title").text()).toBe("Rotate A");

    // Fire the ad-rotation interval (10000ms) -> preloads next ad + rotates.
    await vi.advanceTimersByTimeAsync(10000);
    await settle();
    expect(wrapper.find(".ad-title").text()).toBe("Rotate B");
  });

  it("startAdRotation handles next ad WITHOUT id (falsy ?.id branch)", async () => {
    const ads = [
      {
        id: 950,
        title: "Has Id",
        description: "d",
        business_name: "B",
        click_url: "#",
        image: "hi-1",
      },
      {
        // no id -> ads.value[nextAdIndex]?.id is falsy
        title: "No Id Next",
        description: "d",
        business_name: "B",
        click_url: "#",
        image: "ni-1",
      },
    ];
    getAllAdByPlacement.mockResolvedValue(resp(ads));

    const wrapper = mount(AdBanner);
    await settle();
    expect(wrapper.find(".ad-title").text()).toBe("Has Id");

    await vi.advanceTimersByTimeAsync(10000);
    await settle();
    expect(wrapper.find(".ad-title").text()).toBe("No Id Next");
  });

  it("re-runs checkAndStartImageRotation while an image timer is live (clears existing image timer)", async () => {
    // Two multi-image ads: mount starts an image timer for ad[0]; rotating to
    // ad[1] calls checkAndStartImageRotation again while that timer is still
    // set -> hits the clear-existing-image-timer branch.
    const ads = [
      {
        id: 960,
        title: "Multi A",
        description: "d",
        business_name: "B",
        click_url: "#",
        files: ["ma1", "ma2"],
      },
      {
        id: 961,
        title: "Multi B",
        description: "d",
        business_name: "B",
        click_url: "#",
        files: ["mb1", "mb2"],
      },
    ];
    getAllAdByPlacement.mockResolvedValue(resp(ads));

    const wrapper = mount(AdBanner);
    await settle();
    // image timer for ad[0] is live now
    expect(wrapper.find(".ad-title").text()).toBe("Multi A");

    // Advance ad-rotation timer -> callback calls checkAndStartImageRotation
    // while the previous ad's image timer is still running.
    await vi.advanceTimersByTimeAsync(10000);
    await settle();
    expect(wrapper.find(".ad-title").text()).toBe("Multi B");
    // new ad still multi-image -> dots present
    expect(wrapper.findAll(".image-dot")).toHaveLength(2);
  });

  it("loadAdImages handles ad with files only (no separate image) and image only (no files)", async () => {
    // First mount: files only, image undefined -> image-loading branch skipped
    getAllAdByPlacement.mockResolvedValue(
      resp([
        {
          id: 1000,
          title: "Files Only",
          description: "d",
          business_name: "B",
          click_url: "#",
          files: ["f1"],
        },
      ])
    );
    const w1 = mount(AdBanner);
    await settle();
    expect(w1.find("img.ad-image").attributes("src")).toBe("blob:url-f1");

    // Second mount: image only, files absent -> files-loop branch skipped
    getAllAdByPlacement.mockResolvedValue(
      resp([
        {
          id: 1001,
          title: "Image Only",
          description: "d",
          business_name: "B",
          click_url: "#",
          image: "i1",
        },
      ])
    );
    const w2 = mount(AdBanner);
    await settle();
    expect(w2.find("img.ad-image").attributes("src")).toBe("blob:url-i1");
  });

  it("loadAdImages with empty files array falls through to image property", async () => {
    getAllAdByPlacement.mockResolvedValue(
      resp([
        {
          id: 1100,
          title: "Empty Files",
          description: "d",
          business_name: "B",
          click_url: "#",
          files: [], // length 0 -> files block skipped, currentImageUrl uses image
          image: "i-empty",
        },
      ])
    );

    const wrapper = mount(AdBanner);
    await settle();

    expect(wrapper.find("img.ad-image").attributes("src")).toBe("blob:url-i-empty");
  });

  it("cleans up rotation timers on unmount", async () => {
    const ads = [
      {
        id: 1200,
        title: "Cleanup A",
        description: "d",
        business_name: "B",
        click_url: "#",
        files: ["c1", "c2"], // triggers image rotation timer
      },
      {
        id: 1201,
        title: "Cleanup B",
        description: "d",
        business_name: "B",
        click_url: "#",
        files: ["c3"],
      },
    ];
    getAllAdByPlacement.mockResolvedValue(resp(ads));
    const clearSpy = vi.spyOn(globalThis, "clearInterval");

    const wrapper = mount(AdBanner);
    await settle();

    // Both ad-rotation (multiple ads) and image-rotation (multiple files) timers set.
    wrapper.unmount();

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it("unmounts cleanly when no rotation timers are running (no-timer branches)", async () => {
    // Single ad, single image -> neither ad-rotation nor image-rotation timer
    // is created, so both onBeforeUnmount guards take their false path.
    getAllAdByPlacement.mockResolvedValue(resp(null));
    getAdByPlacement.mockResolvedValue(
      resp({
        id: 1300,
        title: "Lonely",
        description: "d",
        business_name: "B",
        click_url: "#",
        image: "lonely-1",
      })
    );

    const wrapper = mount(AdBanner);
    await settle();
    expect(wrapper.find(".ad-container").exists()).toBe(true);

    // Must not throw even though no timers exist.
    expect(() => wrapper.unmount()).not.toThrow();
  });
});
