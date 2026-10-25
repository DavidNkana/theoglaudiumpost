import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref, nextTick } from "vue";
import RotatingAd from "@/components/RotatingAd.vue";

// Mock the useAds composable so we control the reactive ads ref and trackClick.
const adsRef = ref([]);
const trackClick = vi.fn();
const useAds = vi.fn(() => ({ ads: adsRef, trackClick }));

vi.mock("@/composables/useAds", () => ({
  useAds: (...args) => useAds(...args),
}));

const sampleAds = [
  {
    id: 1,
    linkUrl: "https://example.com/1",
    imageUrl: "https://cdn.example.com/1.png",
    title: "First Ad",
  },
  {
    id: 2,
    linkUrl: "https://example.com/2",
    imageUrl: "https://cdn.example.com/2.png",
    title: "Second Ad",
  },
];

beforeEach(() => {
  vi.useFakeTimers();
  adsRef.value = [];
  trackClick.mockClear();
  useAds.mockClear();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("RotatingAd.vue", () => {
  it("renders nothing when there are no ads (v-if false branch)", () => {
    adsRef.value = [];
    const wrapper = mount(RotatingAd, { props: { placement: "home_banner" } });

    // Composable received the placement prop.
    expect(useAds).toHaveBeenCalledWith("home_banner");
    // v-if="ads.length" is false -> wrapper root div not rendered.
    expect(wrapper.find("div").exists()).toBe(false);
    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.html()).toBe("<!--v-if-->");

    wrapper.unmount();
  });

  it("renders the current ad when ads exist (v-if true + currentAd truthy)", async () => {
    adsRef.value = sampleAds;
    const wrapper = mount(RotatingAd, { props: { placement: "sidebar" } });
    await nextTick();

    const link = wrapper.find("a");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe(sampleAds[0].linkUrl);
    expect(link.attributes("target")).toBe("_blank");

    const img = wrapper.find("img");
    expect(img.attributes("src")).toBe(sampleAds[0].imageUrl);
    expect(img.attributes("alt")).toBe(sampleAds[0].title);
    expect(img.classes()).toContain("rounded");

    wrapper.unmount();
  });

  it("calls trackClick with the current ad id on click", async () => {
    adsRef.value = sampleAds;
    const wrapper = mount(RotatingAd, { props: { placement: "sidebar" } });
    await nextTick();

    await wrapper.find("a").trigger("click");
    expect(trackClick).toHaveBeenCalledWith(sampleAds[0].id);

    wrapper.unmount();
  });

  it("rotates the index on the interval when ads exist (if-true branch in interval)", async () => {
    adsRef.value = sampleAds;
    // Force Math.random so the chosen index is deterministic (-> index 1).
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);

    const wrapper = mount(RotatingAd, { props: { placement: "footer" } });
    await nextTick();

    // Initially shows the first ad.
    expect(wrapper.find("img").attributes("src")).toBe(sampleAds[0].imageUrl);

    // Advance the 8s rotation timer -> setInterval callback runs with ads present.
    vi.advanceTimersByTime(8000);
    await nextTick();

    expect(wrapper.find("img").attributes("src")).toBe(sampleAds[1].imageUrl);

    randomSpy.mockRestore();
    wrapper.unmount();
  });

  it("does not rotate when the interval fires with no ads (if-false branch)", async () => {
    // Empty ads list: the `if (ads.value.length > 0)` guard in the interval is
    // false, so no index change occurs (no throw). v-if is also false here.
    adsRef.value = [];
    const wrapper = mount(RotatingAd, { props: { placement: "footer" } });
    await nextTick();

    expect(() => vi.advanceTimersByTime(8000)).not.toThrow();
    await nextTick();
    expect(wrapper.html()).toBe("<!--v-if-->");

    wrapper.unmount();
  });

  it("falls back to {} in currentAd when the index is out of range (|| {} branch)", async () => {
    // Two ads so v-if is true; rotate to index 1, then shrink ads to one item.
    // ads.length stays truthy (v-if true) but ads.value[1] is undefined, so the
    // computed takes the `|| {}` fallback branch.
    adsRef.value = sampleAds;
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99); // -> index 1
    const wrapper = mount(RotatingAd, { props: { placement: "footer" } });
    await nextTick();

    vi.advanceTimersByTime(8000); // currentIndex -> 1
    await nextTick();
    expect(wrapper.find("img").attributes("src")).toBe(sampleAds[1].imageUrl);

    // Now only one ad remains; index 1 is out of range -> currentAd === {}.
    adsRef.value = [sampleAds[0]];
    await nextTick();

    const img = wrapper.find("img");
    // currentAd is {} -> :src/:alt bind to undefined (attributes absent).
    expect(img.attributes("src")).toBeUndefined();
    expect(img.attributes("alt")).toBeUndefined();

    randomSpy.mockRestore();
    wrapper.unmount();
  });

  it("clears the interval on unmount (onUnmounted)", async () => {
    adsRef.value = sampleAds;
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    const wrapper = mount(RotatingAd, { props: { placement: "home_banner" } });
    await nextTick();

    wrapper.unmount();
    expect(clearSpy).toHaveBeenCalled();

    clearSpy.mockRestore();
  });
});
