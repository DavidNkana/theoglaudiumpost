import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// ---- Mock external boundaries ----------------------------------------------

vi.mock("@/composables/useAds", () => ({
  // PopupAd imports useAds but never invokes it in setup logic that affects
  // rendering; provide a harmless stub returning a reactive-ish shape.
  useAds: vi.fn(() => ({ ads: { value: [] } })),
}));

const getAdByPlacement = vi.fn();
const getAllAdByPlacement = vi.fn();
const trackClick = vi.fn();
const trackImpression = vi.fn();

vi.mock("@/features/ads/AdsService", () => ({
  getAdByPlacement: (...a) => getAdByPlacement(...a),
  getAllAdByPlacement: (...a) => getAllAdByPlacement(...a),
  trackClick: (...a) => trackClick(...a),
  trackImpression: (...a) => trackImpression(...a),
}));

const getMediaObjectUrl = vi.fn();

vi.mock("@/features/media/MediaService", () => ({
  getMediaObjectUrl: (...a) => getMediaObjectUrl(...a),
}));

// Real-ish utils: getAdDimensions returns "4:3" for popup (default branch);
// delay is unused by this component.
vi.mock("@/utils", () => ({
  getAdDimensions: vi.fn(() => "4:3"),
  delay: vi.fn(() => Promise.resolve()),
}));

import PopupAd from "@/components/PopupAd.vue";

// ---- Helpers ----------------------------------------------------------------

function urlFor(mediaId) {
  return `blob:url-${mediaId}`;
}

// Mount under fake timers, advance the 1s onMounted delay that triggers
// fetchAds, then drain microtasks repeatedly to settle the async fetch chain
// (loadAdImages loop + checkAndStartImageRotation -> loadAdImages again).
async function mountReady() {
  const wrapper = mount(PopupAd);
  await vi.advanceTimersByTimeAsync(1000);
  for (let i = 0; i < 8; i++) {
    await flushPromises();
    await wrapper.vm.$nextTick();
  }
  return wrapper;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  // Default media resolver: returns a deterministic url per id.
  getMediaObjectUrl.mockImplementation((id) => Promise.resolve(urlFor(id)));
  if (!global.URL.createObjectURL) {
    global.URL.createObjectURL = vi.fn(() => "blob:test");
  }
  trackClick.mockResolvedValue({});
  trackImpression.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---- Tests ------------------------------------------------------------------

describe("PopupAd", () => {
  it("renders nothing when neither getAll nor single placement return data", async () => {
    getAllAdByPlacement.mockResolvedValue({ data: [] });
    getAdByPlacement.mockResolvedValue({ data: null });

    const wrapper = await mountReady();

    expect(wrapper.find(".popup-container").exists()).toBe(false);
    expect(getAllAdByPlacement).toHaveBeenCalledWith("pop_up");
    expect(getAdByPlacement).toHaveBeenCalledWith("popup");
  });

  it("falls back to single ad (with files) when getAllAdByPlacement returns non-array", async () => {
    getAllAdByPlacement.mockResolvedValue({ data: null });
    getAdByPlacement.mockResolvedValue({
      data: {
        id: 7,
        title: "Single",
        description: "Single desc",
        business_name: "Single Biz",
        click_url: "https://single.example",
        image: 99,
        files: [1], // single file -> no multi-image, no rotation
        aspect_ratio: "1:1", // square -> not horizontal
      },
    });

    const wrapper = await mountReady();

    expect(wrapper.find(".popup-container").exists()).toBe(true);
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe(urlFor(1));
    expect(img.attributes("alt")).toBe("Single");
    expect(wrapper.find("a").attributes("href")).toBe("https://single.example");
    // Single image -> no image-controls, single ad -> no ad-controls
    expect(wrapper.find(".image-controls").exists()).toBe(false);
    expect(wrapper.find(".ad-controls").exists()).toBe(false);
    // rendered details
    expect(wrapper.find(".ad-title").text()).toBe("Single");
    expect(wrapper.find(".ad-description").text()).toBe("Single desc");
    expect(wrapper.find(".ad-business-name").text()).toBe("Single Biz");
    // square ad -> imageStyle max-height "none"
    expect(img.attributes("style")).toContain("max-height: none");
    // impression tracked for the single ad
    expect(trackImpression).toHaveBeenCalledWith(7);
  });

  it("falls back to single ad with no id and no files; uses ad.image and description fallback", async () => {
    getAllAdByPlacement.mockResolvedValue({ data: "not-an-array" });
    getAdByPlacement.mockResolvedValue({
      data: {
        // no id -> trackImpression not called in single path
        title: "NoId",
        // no description -> nullish-coalescing fallback text
        business_name: "NoId Biz",
        click_url: "https://noid.example",
        image: 42,
        // no files -> currentImageUrl falls back to ad.image
        // no aspect_ratio -> getAspectRatio uses getAdDimensions("popup") -> "4:3"
      },
    });

    const wrapper = await mountReady();

    expect(wrapper.find(".popup-container").exists()).toBe(true);
    const img = wrapper.find("img");
    expect(img.attributes("src")).toBe(urlFor(42));
    expect(wrapper.find(".ad-description").text()).toBe(
      "No description available"
    );
    // "4:3" -> width(4) > height(3) -> horizontal -> max-height applied (300px desktop)
    expect(img.attributes("style")).toContain("max-height: 300px");
    // no id -> no impression
    expect(trackImpression).not.toHaveBeenCalled();
    expect(getMediaObjectUrl).toHaveBeenCalledWith(42);
  });

  it("hides popup (v-if false) when current image is not cached", async () => {
    // Single ad whose image resolution returns null url -> currentImageUrl null
    getAllAdByPlacement.mockResolvedValue({ data: null });
    getMediaObjectUrl.mockResolvedValue(null);
    getAdByPlacement.mockResolvedValue({
      data: {
        id: 5,
        title: "Placeholder",
        click_url: "https://ph.example",
        image: 11,
        aspect_ratio: "", // falsy -> getAspectRatio fallback used elsewhere
      },
    });

    const wrapper = await mountReady();

    // ads.length truthy + visible true, but currentImageUrl null -> whole popup hidden
    expect(wrapper.find(".popup-container").exists()).toBe(false);
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("renders multiple ads with multiple images, rotates timers, tracks clicks and dots", async () => {
    const ad1 = {
      id: 1,
      title: "Ad One",
      description: "Desc One",
      business_name: "Biz One",
      click_url: "https://one.example",
      image: 100,
      files: [10, 11], // multiple images -> image rotation
      aspect_ratio: "16:9", // horizontal
    };
    const ad2 = {
      id: 2,
      title: "Ad Two",
      description: "Desc Two",
      business_name: "Biz Two",
      click_url: "https://two.example",
      image: 200,
      files: [20], // single image
    };

    getAllAdByPlacement.mockResolvedValue({ data: [ad1, ad2] });

    const wrapper = await mountReady();

    expect(wrapper.find(".popup-container").exists()).toBe(true);
    // multiple ads -> ad-controls with two dots
    const adDots = wrapper.findAll(".ad-dot");
    expect(adDots).toHaveLength(2);
    // current ad (ad1) has multiple images -> image-controls with two dots
    const imageDots = wrapper.findAll(".image-dot");
    expect(imageDots).toHaveLength(2);
    // first image dot active (class binding true), second not
    expect(imageDots[0].classes()).toContain("active");
    expect(imageDots[1].classes()).not.toContain("active");
    // first ad dot active, second not
    expect(adDots[0].classes()).toContain("active");
    expect(adDots[1].classes()).not.toContain("active");

    // impression tracked for first ad on load
    expect(trackImpression).toHaveBeenCalledWith(1);

    // ---- click the anchor -> trackClick(ad.id) ----
    await wrapper.find("a").trigger("click");
    expect(trackClick).toHaveBeenCalledWith(1);

    // ---- click second image dot -> currentImageIndex = 1 ----
    await imageDots[1].trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll(".image-dot")[1].classes()).toContain("active");

    // ---- advance image rotation timer (5s) -> index wraps 1 -> 0 ----
    await vi.advanceTimersByTimeAsync(5000);
    await flushPromises();
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll(".image-dot")[0].classes()).toContain("active");

    // ---- advance ad rotation timer (10s) -> moves to ad2 (preload + impression) ----
    await vi.advanceTimersByTimeAsync(10000);
    await flushPromises();
    await wrapper.vm.$nextTick();
    expect(trackImpression).toHaveBeenCalledWith(2);
    // ad2 has single image -> no image-controls now
    expect(wrapper.find(".image-controls").exists()).toBe(false);
    // ad-controls still present; second dot active now
    expect(wrapper.findAll(".ad-dot")[1].classes()).toContain("active");

    // ---- click first ad dot -> back to ad1 + checkAndStartImageRotation ----
    await wrapper.findAll(".ad-dot")[0].trigger("click");
    await flushPromises();
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".image-controls").exists()).toBe(true);

    // unmount triggers onBeforeUnmount clearing both timers
    wrapper.unmount();
  });

  it("ad rotation skips impression when next ad has no id (nextAd present, no id)", async () => {
    const ad1 = {
      id: 1,
      title: "Ad One",
      click_url: "https://one.example",
      files: [10],
      aspect_ratio: "6:1",
    };
    const ad2 = {
      // no id -> rotation preloads but does not track impression
      title: "Ad Two",
      click_url: "https://two.example",
      files: [20],
    };

    getAllAdByPlacement.mockResolvedValue({ data: [ad1, ad2] });

    const wrapper = await mountReady();
    trackImpression.mockClear();

    // advance ad rotation (10s) to move to ad2 which has no id
    await vi.advanceTimersByTimeAsync(10000);
    await flushPromises();
    await wrapper.vm.$nextTick();

    // ad2 has no id -> trackImpression not called during rotation
    expect(trackImpression).not.toHaveBeenCalled();
    // moved to second ad
    expect(wrapper.findAll(".ad-dot")[1].classes()).toContain("active");

    wrapper.unmount();
  });

  it("handles fetch rejection (catch branch) -> hidden and ads reset", async () => {
    getAllAdByPlacement.mockRejectedValue(new Error("boom"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const wrapper = await mountReady();

    expect(wrapper.find(".popup-container").exists()).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(
      "Error fetching ads:",
      expect.any(Error)
    );
  });

  it("closes the popup when close button clicked", async () => {
    getAllAdByPlacement.mockResolvedValue({
      data: [
        {
          id: 3,
          title: "Closeable",
          click_url: "https://c.example",
          files: [30],
          aspect_ratio: "6:1",
        },
      ],
    });

    const wrapper = await mountReady();
    expect(wrapper.find(".popup-container").exists()).toBe(true);

    await wrapper.find("button.btn-close").trigger("click");
    await wrapper.vm.$nextTick();
    // visible -> false collapses the v-if
    expect(wrapper.find(".popup-container").exists()).toBe(false);
  });

  it("covers fetchAndCacheImage failure (catch) returning null", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // First file fetch rejects -> catch returns null; second resolves.
    getMediaObjectUrl
      .mockRejectedValueOnce(new Error("img-fail"))
      .mockResolvedValue(urlFor(51));

    getAllAdByPlacement.mockResolvedValue({
      data: [
        {
          id: 9,
          title: "ImgFail",
          click_url: "https://imgfail.example",
          files: [50, 51],
          aspect_ratio: "6:1",
        },
      ],
    });

    const wrapper = await mountReady();

    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to load image with mediaId 50"),
      expect.any(Error)
    );
    // second image cached successfully
    expect(getMediaObjectUrl).toHaveBeenCalledWith(51);

    wrapper.unmount();
  });

  it("uses cached image url on repeat (fetchAndCacheImage cache-hit + loadAdImages image skip)", async () => {
    // ad has files [60] and image 60 (same id) so the image-branch in
    // loadAdImages sees it already cached after the files loop -> skips.
    getAllAdByPlacement.mockResolvedValue({
      data: [
        {
          id: 12,
          title: "Cached",
          click_url: "https://cached.example",
          files: [60],
          image: 60,
          aspect_ratio: "6:1",
        },
      ],
    });

    const wrapper = await mountReady();
    expect(wrapper.find("img").attributes("src")).toBe(urlFor(60));
    // media fetched exactly once for id 60 despite being in files AND image
    const calls60 = getMediaObjectUrl.mock.calls.filter((c) => c[0] === 60);
    expect(calls60).toHaveLength(1);

    wrapper.unmount();
  });

  it("applies mobile max-height (200px) when viewport width < 768", async () => {
    const original = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 400,
    });

    getAllAdByPlacement.mockResolvedValue({
      data: [
        {
          id: 15,
          title: "Mobile",
          click_url: "https://m.example",
          files: [70],
          aspect_ratio: "6:1", // horizontal -> max-height applied
        },
      ],
    });

    const wrapper = await mountReady();
    const style = wrapper.find("img").attributes("style");
    expect(style).toContain("max-height: 200px");

    // exercise the resize handler -> isMobile flips to desktop (>=768)
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1024,
    });
    window.dispatchEvent(new Event("resize"));
    await wrapper.vm.$nextTick();
    expect(wrapper.find("img").attributes("style")).toContain(
      "max-height: 300px"
    );

    wrapper.unmount();

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: original,
    });
  });

  it("getAll path: first ad without id skips impression (data[0]?.id falsy)", async () => {
    // Two ads via getAll so startAdRotation runs; first ad has no id ->
    // the `if (data[0]?.id)` guard is false.
    getAllAdByPlacement.mockResolvedValue({
      data: [
        {
          // no id
          title: "NoIdFirst",
          click_url: "https://noidfirst.example",
          files: [80],
          aspect_ratio: "6:1",
        },
        {
          id: 81,
          title: "Second",
          click_url: "https://second.example",
          files: [81],
        },
      ],
    });

    const wrapper = await mountReady();

    expect(wrapper.find(".popup-container").exists()).toBe(true);
    // first ad has no id -> no impression tracked on load
    expect(trackImpression).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it("currentImageUrl returns null when there is no current ad (!ad branch)", async () => {
    getAllAdByPlacement.mockResolvedValue({
      data: [
        {
          id: 90,
          title: "Solo",
          click_url: "https://solo.example",
          files: [90],
          aspect_ratio: "6:1",
        },
      ],
    });

    const wrapper = await mountReady();
    expect(wrapper.vm.currentImageUrl).toBe(urlFor(90));

    // Drop all ads -> currentAd becomes null -> currentImageUrl !ad branch
    wrapper.vm.ads = [];
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.currentImageUrl).toBe(null);

    wrapper.unmount();
  });

  it("loadAdImages early-returns when there is no current ad (!ad branch)", async () => {
    getAllAdByPlacement.mockResolvedValue({
      data: [
        {
          id: 91,
          title: "Solo2",
          click_url: "https://solo2.example",
          files: [91],
          aspect_ratio: "6:1",
        },
      ],
    });

    const wrapper = await mountReady();
    getMediaObjectUrl.mockClear();

    // Empty the ads, then change currentAdIndex to fire watch(currentAdIndex)
    // -> loadAdImages runs with currentAd === null -> early return.
    wrapper.vm.ads = [];
    wrapper.vm.currentAdIndex = 1;
    await flushPromises();
    await wrapper.vm.$nextTick();

    // No media fetched because loadAdImages bailed out.
    expect(getMediaObjectUrl).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it("image-rotation interval no-ops when current ad lacks multiple images", async () => {
    // Start with a multi-image ad so the image rotation timer is running.
    getAllAdByPlacement.mockResolvedValue({
      data: [
        {
          id: 92,
          title: "Multi",
          click_url: "https://multi.example",
          files: [92, 93],
          aspect_ratio: "6:1",
        },
      ],
    });

    const wrapper = await mountReady();
    expect(wrapper.vm.currentImageIndex).toBe(0);

    // Mutate the current ad so it now has a single image; the still-running
    // image-rotation interval body's guard becomes false -> index unchanged.
    wrapper.vm.ads = [
      {
        id: 92,
        title: "Multi",
        click_url: "https://multi.example",
        files: [92],
        aspect_ratio: "6:1",
      },
    ];
    await wrapper.vm.$nextTick();

    await vi.advanceTimersByTimeAsync(5000);
    await flushPromises();
    expect(wrapper.vm.currentImageIndex).toBe(0);

    wrapper.unmount();
  });

  it("ad-rotation interval no-ops when ads drops to a single entry", async () => {
    // Two ads so startAdRotation runs.
    getAllAdByPlacement.mockResolvedValue({
      data: [
        {
          id: 94,
          title: "A",
          click_url: "https://a.example",
          files: [94],
          aspect_ratio: "6:1",
        },
        {
          id: 95,
          title: "B",
          click_url: "https://b.example",
          files: [95],
        },
      ],
    });

    const wrapper = await mountReady();
    expect(wrapper.vm.currentAdIndex).toBe(0);

    // Reduce to a single ad so the ad-rotation interval guard is false.
    wrapper.vm.ads = [
      {
        id: 94,
        title: "A",
        click_url: "https://a.example",
        files: [94],
        aspect_ratio: "6:1",
      },
    ];
    await wrapper.vm.$nextTick();

    await vi.advanceTimersByTimeAsync(10000);
    await flushPromises();
    expect(wrapper.vm.currentAdIndex).toBe(0);

    wrapper.unmount();
  });

  it("ad-rotation interval handles a missing next ad (nextAd falsy)", async () => {
    // Two ads so startAdRotation runs.
    getAllAdByPlacement.mockResolvedValue({
      data: [
        {
          id: 96,
          title: "A",
          click_url: "https://a.example",
          files: [96],
          aspect_ratio: "6:1",
        },
        {
          id: 97,
          title: "B",
          click_url: "https://b.example",
          files: [97],
        },
      ],
    });

    const wrapper = await mountReady();
    getMediaObjectUrl.mockClear();
    trackImpression.mockClear();

    // Keep length 2 (interval guard true) but make index 1 a hole so
    // nextAd (ads[1]) is undefined -> `if (nextAd)` false, no preload,
    // and `ads[nextAdIndex]?.id` nullish -> no impression.
    wrapper.vm.ads = [
      {
        id: 96,
        title: "A",
        click_url: "https://a.example",
        files: [96],
        aspect_ratio: "6:1",
      },
      undefined,
    ];
    await wrapper.vm.$nextTick();

    await vi.advanceTimersByTimeAsync(10000);
    await flushPromises();
    await wrapper.vm.$nextTick();

    // moved to (empty) next ad index; no preload media fetch, no impression
    expect(wrapper.vm.currentAdIndex).toBe(1);
    expect(getMediaObjectUrl).not.toHaveBeenCalled();
    expect(trackImpression).not.toHaveBeenCalled();

    wrapper.unmount();
  });
});
