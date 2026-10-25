import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock the AdsService boundary (the only external collaborator) -----------
vi.mock("@/features/ads/AdsService", () => ({
  getAdByPlacement: vi.fn(),
  getAllAdByPlacement: vi.fn(),
  trackImpression: vi.fn(),
}));

// --- Mock vue's onMounted so we can capture & invoke the registered callback,
// while keeping the real `ref` implementation for genuine reactivity. ---------
vi.mock("vue", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    onMounted: vi.fn(),
  };
});

import { onMounted, ref, isRef } from "vue";
import {
  getAllAdByPlacement,
  trackImpression,
} from "@/features/ads/AdsService";
import { useAds } from "@/composables/useAds";

/**
 * Helper: retrieves the most recent callback passed to the mocked onMounted.
 */
const lastOnMountedCallback = () =>
  onMounted.mock.calls[onMounted.mock.calls.length - 1][0];

describe("useAds composable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a reactive `ads` ref initialised to an empty array", () => {
    const result = useAds("home_banner");

    expect(result).toHaveProperty("ads");
    expect(isRef(result.ads)).toBe(true);
    expect(result.ads.value).toEqual([]);
  });

  it("registers fetchAds via onMounted exactly once per call", () => {
    useAds("home_banner");

    expect(onMounted).toHaveBeenCalledTimes(1);
    expect(typeof lastOnMountedCallback()).toBe("function");
  });

  it("fetchAds (the onMounted callback) loads ads for the placement and tracks an impression for each ad", async () => {
    const adData = [{ id: 1 }, { id: 2 }, { id: 3 }];
    getAllAdByPlacement.mockResolvedValue({ data: adData });

    const { ads } = useAds("sidebar");
    const fetchAds = lastOnMountedCallback();

    await fetchAds();

    // Calls the service with the exact placement it was given
    expect(getAllAdByPlacement).toHaveBeenCalledTimes(1);
    expect(getAllAdByPlacement).toHaveBeenCalledWith("sidebar");

    // Reactive state is updated with the returned data
    expect(ads.value).toStrictEqual(adData);

    // An impression is tracked for every loaded ad, by id
    expect(trackImpression).toHaveBeenCalledTimes(3);
    expect(trackImpression).toHaveBeenNthCalledWith(1, 1);
    expect(trackImpression).toHaveBeenNthCalledWith(2, 2);
    expect(trackImpression).toHaveBeenNthCalledWith(3, 3);
  });

  it("fetchAds tracks no impressions when the placement returns an empty list (forEach no-iteration branch)", async () => {
    getAllAdByPlacement.mockResolvedValue({ data: [] });

    const { ads } = useAds("empty_slot");
    const fetchAds = lastOnMountedCallback();

    await fetchAds();

    expect(ads.value).toEqual([]);
    expect(trackImpression).not.toHaveBeenCalled();
  });

  it("fetchAds propagates a rejection from the ad service (no swallowing/catch in source)", async () => {
    const boom = new Error("network down");
    getAllAdByPlacement.mockRejectedValue(boom);

    const { ads } = useAds("home_banner");
    const fetchAds = lastOnMountedCallback();

    await expect(fetchAds()).rejects.toThrow("network down");

    // State stays at its initial value and no impressions are tracked
    expect(ads.value).toEqual([]);
    expect(trackImpression).not.toHaveBeenCalled();
  });

  it("forwards an undefined placement straight through to the service when called without args", async () => {
    getAllAdByPlacement.mockResolvedValue({ data: [{ id: 7 }] });

    useAds();
    const fetchAds = lastOnMountedCallback();
    await fetchAds();

    expect(getAllAdByPlacement).toHaveBeenCalledWith(undefined);
    expect(trackImpression).toHaveBeenCalledWith(7);
  });

  it("keeps independent ad state across separate composable instances", () => {
    const a = useAds("a");
    const b = useAds("b");

    a.ads.value = [{ id: 100 }];

    expect(a.ads.value).toEqual([{ id: 100 }]);
    expect(b.ads.value).toEqual([]);
    expect(a.ads).not.toBe(b.ads);

    // Sanity: ref helper used to keep lint/imports honest
    expect(isRef(ref([]))).toBe(true);
  });
});
