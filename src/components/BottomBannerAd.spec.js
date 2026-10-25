import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// ---- Mock external boundaries ----------------------------------------------

vi.mock("@/composables/useAds", () => ({
  // The component imports useAds but never invokes it in setup logic that
  // affects rendering; provide a harmless stub returning a reactive-ish shape.
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

// Real-ish utils: getAdDimensions returns "6:1" for fixed_bottom; delay unused.
vi.mock("@/utils", () => ({
  getAdDimensions: vi.fn(() => "6:1"),
  delay: vi.fn(() => Promise.resolve()),
}));

import BottomBannerAd from "@/components/BottomBannerAd.vue";

// ---- Helpers ----------------------------------------------------------------

function urlFor(mediaId) {
  return `blob:url-${mediaId}`;
}

async function mountReady() {
  const wrapper = mount(BottomBannerAd);
  await flushPromises();
  await wrapper.vm.$nextTick();
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default media resolver: returns a deterministic url per id.
  getMediaObjectUrl.mockImplementation((id) => Promise.resolve(urlFor(id)));
  // Object URL helpers used by media in real impl; harmless to stub.
  if (!global.URL.createObjectURL) {
    global.URL.createObjectURL = vi.fn(() => "blob:test");
  }
  // Default trackers resolve.
  trackClick.mockResolvedValue({});
  trackImpression.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---- Tests ------------------------------------------------------------------

describe("BottomBannerAd", () => {
  it("renders nothing when no ads are returned (single-ad fallback empty)", async () => {
    // getAllAdByPlacement returns empty array -> falls through to single ad
    getAllAdByPlacement.mockResolvedValue({ data: [] });
    getAdByPlacement.mockResolvedValue({ data: null });

    const wrapper = await mountReady();

    expect(wrapper.find(".bottom-ad").exists()).toBe(false);
    expect(getAllAdByPlacement).toHaveBeenCalledWith("fixed_bottom");
    expect(getAdByPlacement).toHaveBeenCalledWith("fixed_bottom");
  });

  it("falls back to single ad (with files) when getAllAdByPlacement returns non-array", async () => {
    getAllAdByPlacement.mockResolvedValue({ data: null });
    getAdByPlacement.mockResolvedValue({
      data: {
        id: 7,
        title: "Single",
        click_url: "https://single.example",
        image: 99,
        files: [1], // single file -> no multi-image, no rotation
        placement: { aspect_ratio: "3:1" },
      },
    });

    const wrapper = await mountReady();

    expect(wrapper.find(".bottom-ad").exists()).toBe(true);
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe(urlFor(1));
    expect(img.attributes("alt")).toBe("Single");
    // Single image -> no image-controls, single ad -> no ad-controls
    expect(wrapper.find(".image-controls").exists()).toBe(false);
    expect(wrapper.find(".ad-controls").exists()).toBe(false);
    // impression tracked for the single ad
    expect(trackImpression).toHaveBeenCalledWith(7);
  });

  it("falls back to single ad with no id and no files (uses ad.image, aspect_ratio fallback)", async () => {
    getAllAdByPlacement.mockResolvedValue({ data: "not-an-array" });
    getAdByPlacement.mockResolvedValue({
      data: {
        // no id -> trackImpression not called in single path
        title: "NoId",
        click_url: "https://noid.example",
        image: 42,
        // no files -> currentImageUrl falls back to ad.image
        // no placement -> getAspectRatio uses getAdDimensions
      },
    });

    const wrapper = await mountReady();

    expect(wrapper.find(".bottom-ad").exists()).toBe(true);
    const img = wrapper.find("img");
    expect(img.attributes("src")).toBe(urlFor(42));
    // no id -> no impression
    expect(trackImpression).not.toHaveBeenCalled();
    expect(getMediaObjectUrl).toHaveBeenCalledWith(42);
  });

  it("renders placeholder (v-else) when current image not yet cached", async () => {
    // Single ad whose image resolution returns null url -> currentImageUrl null
    getAllAdByPlacement.mockResolvedValue({ data: null });
    getMediaObjectUrl.mockResolvedValue(null);
    getAdByPlacement.mockResolvedValue({
      data: {
        id: 5,
        title: "Placeholder",
        click_url: "https://ph.example",
        image: 11,
        placement: { aspect_ratio: "" }, // falsy -> getAspectRatio fallback
      },
    });

    const wrapper = await mountReady();

    expect(wrapper.find(".bottom-ad").exists()).toBe(true);
    // v-else placeholder branch
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.find(".bi-badge-ad").exists()).toBe(true);
    // getAspectRatio falls back to getAdDimensions("fixed_bottom") -> "6:1"
    expect(wrapper.find("p.mb-0").text()).toBe("6:1");
  });

  it("renders multiple ads with multiple images, rotates timers, tracks clicks and dots", async () => {
    vi.useFakeTimers();

    const ad1 = {
      id: 1,
      title: "Ad One",
      click_url: "https://one.example",
      image: 100,
      files: [10, 11], // multiple images -> image rotation
      placement: { aspect_ratio: "6:1" },
    };
    const ad2 = {
      id: 2,
      title: "Ad Two",
      click_url: "https://two.example",
      image: 200,
      files: [20], // single image
    };

    getAllAdByPlacement.mockResolvedValue({ data: [ad1, ad2] });

    const wrapper = mount(BottomBannerAd);
    // Resolve the mounted fetch chain under fake timers. The fetch chain has
    // several awaited steps (loadAdImages loop + checkAndStartImageRotation ->
    // loadAdImages again), so flush repeatedly to drain all microtasks.
    for (let i = 0; i < 6; i++) {
      await flushPromises();
      await wrapper.vm.$nextTick();
    }

    expect(wrapper.find(".bottom-ad").exists()).toBe(true);
    // multiple ads -> ad-controls with two dots
    const adDots = wrapper.findAll(".ad-dot");
    expect(adDots).toHaveLength(2);
    // current ad (ad1) has multiple images -> image-controls with two dots
    const imageDots = wrapper.findAll(".image-dot");
    expect(imageDots).toHaveLength(2);
    // first image dot active
    expect(imageDots[0].classes()).toContain("active");
    expect(imageDots[1].classes()).not.toContain("active");
    // first ad dot active
    expect(adDots[0].classes()).toContain("active");

    // impression tracked for first ad on load
    expect(trackImpression).toHaveBeenCalledWith(1);

    // ---- click the anchor -> trackClick(ad.id) ----
    await wrapper.find("a").trigger("click");
    expect(trackClick).toHaveBeenCalledWith(1);

    // ---- click second image dot -> currentImageIndex = 1 ----
    await imageDots[1].trigger("click");
    expect(wrapper.findAll(".image-dot")[1].classes()).toContain("active");

    // ---- advance image rotation timer (5s) -> index wraps 1 -> 0 ----
    await vi.advanceTimersByTimeAsync(5000);
    await flushPromises();
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

  it("rotates ads that have no id without tracking impressions for them", async () => {
    vi.useFakeTimers();

    // First ad has NO id (data[0]?.id false on load); second ad HAS id.
    const adNoId = {
      title: "NoId First",
      click_url: "https://noid1.example",
      files: [40, 41], // multiple images -> image rotation starts
      placement: { aspect_ratio: "6:1" },
    };
    const adWithId = {
      id: 200,
      title: "Has Id",
      click_url: "https://hasid.example",
      files: [42],
      placement: { aspect_ratio: "6:1" },
    };

    getAllAdByPlacement.mockResolvedValue({ data: [adNoId, adWithId] });

    const wrapper = mount(BottomBannerAd);
    for (let i = 0; i < 6; i++) {
      await flushPromises();
      await wrapper.vm.$nextTick();
    }

    // First ad has no id -> no impression tracked on load
    expect(trackImpression).not.toHaveBeenCalled();

    // Advance ad rotation (10s): index 0 -> 1 (adWithId) -> tracks impression 200
    await vi.advanceTimersByTimeAsync(10000);
    await flushPromises();
    await wrapper.vm.$nextTick();
    expect(trackImpression).toHaveBeenCalledWith(200);

    // Advance ad rotation again: index 1 -> 0 (adNoId, no id) -> no new impression
    trackImpression.mockClear();
    await vi.advanceTimersByTimeAsync(10000);
    await flushPromises();
    await wrapper.vm.$nextTick();
    expect(trackImpression).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it("unmounts cleanly when no rotation timers were started", async () => {
    // Single ad, single image -> neither ad nor image rotation timer created,
    // so both onBeforeUnmount guards take their false branch.
    getAllAdByPlacement.mockResolvedValue({
      data: [
        {
          id: 77,
          title: "Lonely",
          click_url: "https://lonely.example",
          files: [88],
          placement: { aspect_ratio: "6:1" },
        },
      ],
    });

    const wrapper = await mountReady();
    expect(wrapper.find(".bottom-ad").exists()).toBe(true);
    // Should not throw despite null timers.
    expect(() => wrapper.unmount()).not.toThrow();
  });

  it("handles fetch rejection (catch branch) -> hidden", async () => {
    getAllAdByPlacement.mockRejectedValue(new Error("boom"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const wrapper = await mountReady();

    expect(wrapper.find(".bottom-ad").exists()).toBe(false);
    expect(errSpy).toHaveBeenCalled();
  });

  it("closes the banner when close button clicked", async () => {
    getAllAdByPlacement.mockResolvedValue({
      data: [
        {
          id: 3,
          title: "Closeable",
          click_url: "https://c.example",
          files: [30],
          placement: { aspect_ratio: "6:1" },
        },
      ],
    });

    const wrapper = await mountReady();
    expect(wrapper.find(".bottom-ad").exists()).toBe(true);

    await wrapper.find("button.btn-close").trigger("click");
    expect(wrapper.find(".bottom-ad").exists()).toBe(false);
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
          placement: { aspect_ratio: "6:1" },
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
          placement: { aspect_ratio: "6:1" },
        },
      ],
    });

    const wrapper = await mountReady();
    expect(wrapper.find("img").attributes("src")).toBe(urlFor(60));
    // media fetched exactly once for id 60 despite being in files AND image
    const calls60 = getMediaObjectUrl.mock.calls.filter((c) => c[0] === 60);
    expect(calls60).toHaveLength(1);
  });

  it("applies mobile image styles when viewport width < 576", async () => {
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
          placement: { aspect_ratio: "6:1" },
        },
      ],
    });

    const wrapper = await mountReady();
    const style = wrapper.find("img").attributes("style");
    expect(style).toContain("object-fit: cover");
    expect(style).toContain("max-height: 60px");

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: original,
    });
  });

  it("applies desktop image styles when viewport width >= 576", async () => {
    const original = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1024,
    });

    getAllAdByPlacement.mockResolvedValue({
      data: [
        {
          id: 16,
          title: "Desktop",
          click_url: "https://d.example",
          files: [71],
          placement: { aspect_ratio: "6:1" },
        },
      ],
    });

    const wrapper = await mountReady();
    const style = wrapper.find("img").attributes("style");
    expect(style).toContain("object-fit: contain");
    expect(style).toContain("max-height: 64px");
    expect(style).toContain("height: auto");

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: original,
    });
  });
});
