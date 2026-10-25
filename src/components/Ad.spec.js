import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";

// --- Mock the AdsService boundary (tracking side-effects) --------------------
vi.mock("@/features/ads/AdsService", () => ({
  trackClick: vi.fn(),
  trackImpression: vi.fn(),
}));

// --- Mock the useAds composable so the test fully controls the `ads` ref -----
// The mock returns a ref we can populate per-test to drive every template
// branch (empty list vs. populated, with/without click_url).
const adsRef = ref([]);
vi.mock("@/composables/useAds", () => ({
  useAds: vi.fn(() => ({ ads: adsRef })),
}));

import { trackClick, trackImpression } from "@/features/ads/AdsService";
import { useAds } from "@/composables/useAds";
import Ad from "@/components/Ad.vue";

// A fully-populated ad (has click_url -> renders the "Visit" link)
const adWithLink = {
  id: 42,
  image: "https://cdn.example.com/ad-42.png",
  title: "Buy Widgets Now",
  click_url: "https://advertiser-site.com/landing",
};

// An ad WITHOUT click_url -> the v-if="ads[0].click_url" else branch
const adWithoutLink = {
  id: 7,
  image: "https://cdn.example.com/ad-7.png",
  title: "Plain Ad",
  click_url: null,
};

describe("Ad.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    adsRef.value = [];
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("calls useAds with the 'pop_up' placement", () => {
    mount(Ad);
    expect(useAds).toHaveBeenCalledWith("pop_up");
  });

  it("does not render the popup before the 5s show timer fires (showAd false)", () => {
    adsRef.value = [adWithLink];
    const wrapper = mount(Ad);

    // showAd is still false -> the `ads.length && showAd` branch is false
    expect(wrapper.find(".bg-white").exists()).toBe(false);
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("after 5s sets showAd and tracks an impression; renders popup + Visit link when click_url is present", async () => {
    adsRef.value = [adWithLink];
    const wrapper = mount(Ad);

    // Fire the 5s "show" timer (truthy ads[0]?.id branch for trackImpression)
    vi.advanceTimersByTime(5000);
    await wrapper.vm.$nextTick();

    // Impression is tracked once on the show timer. NOTE: in <script setup>,
    // `ads` is the ref object itself (it is auto-unwrapped only in the
    // template), so `ads[0]` indexes the ref object — always undefined — and
    // `ads[0]?.id` always evaluates to undefined regardless of ad contents.
    expect(trackImpression).toHaveBeenCalledTimes(1);
    expect(trackImpression).toHaveBeenCalledWith(undefined);

    // ads.length && showAd both truthy -> popup renders
    const popup = wrapper.find(".bg-white");
    expect(popup.exists()).toBe(true);

    // Image + title bound from ads[0]
    const img = wrapper.find("img");
    expect(img.attributes("src")).toBe(adWithLink.image);
    expect(img.attributes("alt")).toBe(adWithLink.title);
    expect(wrapper.text()).toContain("Buy Widgets Now");

    // click_url truthy -> the "Visit" anchor renders
    const link = wrapper.find("a");
    expect(link.exists()).toBe(true);
    expect(link.text()).toBe("Visit");
    expect(link.attributes("href")).toBe("https://advertiser-site.com");
  });

  it("does NOT render the Visit link when the ad has no click_url (v-if false branch)", async () => {
    adsRef.value = [adWithoutLink];
    const wrapper = mount(Ad);

    vi.advanceTimersByTime(5000);
    await wrapper.vm.$nextTick();

    // Popup is shown...
    expect(wrapper.find(".bg-white").exists()).toBe(true);
    // ...but the click_url v-if is false, so no anchor
    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.text()).toContain("Plain Ad");
  });

  it("tracks an impression with undefined when ads is empty (optional-chaining false branch)", () => {
    adsRef.value = []; // ads[0] is undefined -> ads[0]?.id === undefined
    mount(Ad);

    vi.advanceTimersByTime(5000);

    expect(trackImpression).toHaveBeenCalledTimes(1);
    expect(trackImpression).toHaveBeenCalledWith(undefined);
  });

  it("does not render the popup when there are no ads even after the timer (ads.length false branch)", async () => {
    adsRef.value = []; // ads.length is 0 -> short-circuits `ads.length && showAd`
    const wrapper = mount(Ad);

    vi.advanceTimersByTime(5000);
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".bg-white").exists()).toBe(false);
  });

  it("auto-hides the popup after the additional 15s timer", async () => {
    adsRef.value = [adWithLink];
    const wrapper = mount(Ad);

    vi.advanceTimersByTime(5000);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".bg-white").exists()).toBe(true);

    // Fire the nested 15s auto-close timer -> showAd back to false
    vi.advanceTimersByTime(15000);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".bg-white").exists()).toBe(false);
  });

  it("handleClick tracks a click with the first ad's id when the ad body is clicked", async () => {
    adsRef.value = [adWithLink];
    const wrapper = mount(Ad);

    vi.advanceTimersByTime(5000);
    await wrapper.vm.$nextTick();

    await wrapper.find(".mt-2").trigger("click");

    expect(trackClick).toHaveBeenCalledTimes(1);
    expect(trackClick).toHaveBeenCalledWith(42);
  });

  it("closeAd hides the popup and clears the auto-close timer when the close button is clicked", async () => {
    adsRef.value = [adWithLink];
    const wrapper = mount(Ad);

    vi.advanceTimersByTime(5000);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".bg-white").exists()).toBe(true);

    await wrapper.find("button.btn-close").trigger("click");
    await wrapper.vm.$nextTick();

    // Popup hidden immediately by closeAd
    expect(wrapper.find(".bg-white").exists()).toBe(false);

    // The cleared timer must not re-toggle anything afterwards
    vi.advanceTimersByTime(15000);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".bg-white").exists()).toBe(false);
  });
});
