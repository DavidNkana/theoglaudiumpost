import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import SmallImageWithPlaceholder from "./SmallImageWithPlaceholder.vue";
import { getMediaObjectUrl } from "@/features/media/MediaService";

// Mock the single external boundary the component imports.
vi.mock("@/features/media/MediaService", () => ({
  getMediaObjectUrl: vi.fn(),
}));

describe("SmallImageWithPlaceholder.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the shimmer placeholder before the image resolves (loading=true branch)", () => {
    // Never resolve so loading stays true and only the shimmer renders.
    getMediaObjectUrl.mockReturnValue(new Promise(() => {}));

    const wrapper = mount(SmallImageWithPlaceholder, {
      props: { mediaId: 42 },
    });

    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(true);
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("loads the image on mount, renders the img with default alt, and emits 'loaded' (success branch + alt default)", async () => {
    getMediaObjectUrl.mockResolvedValue("blob:object-url-1");

    const wrapper = mount(SmallImageWithPlaceholder, {
      props: { mediaId: 7 },
    });

    await flushPromises();

    // Media service called with the provided mediaId.
    expect(getMediaObjectUrl).toHaveBeenCalledWith(7);

    // loading flipped to false -> shimmer gone, img shown (both v-if branches).
    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(false);
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("blob:object-url-1");
    // Default prop value for alt.
    expect(img.attributes("alt")).toBe("Image");

    // 'loaded' event emitted with the expected payload.
    expect(wrapper.emitted("loaded")).toBeTruthy();
    expect(wrapper.emitted("loaded")[0]).toEqual([
      { mediaId: 7, url: "blob:object-url-1" },
    ]);
  });

  it("uses the provided alt prop and re-runs the @load inline handler", async () => {
    getMediaObjectUrl.mockResolvedValue("blob:object-url-2");

    const wrapper = mount(SmallImageWithPlaceholder, {
      props: { mediaId: 9, alt: "Custom alt text" },
    });

    await flushPromises();

    const img = wrapper.find("img");
    expect(img.attributes("alt")).toBe("Custom alt text");

    // Drive the @load="loading = false" inline template handler.
    await img.trigger("load");
    await flushPromises();

    // Still rendered (loading remains false) after the load handler runs.
    expect(wrapper.find("img").exists()).toBe(true);
    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(false);
  });

  it("keeps the shimmer and logs an error when the media service rejects (catch branch)", async () => {
    const error = new Error("boom");
    getMediaObjectUrl.mockRejectedValue(error);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const wrapper = mount(SmallImageWithPlaceholder, {
      props: { mediaId: 13 },
    });

    await flushPromises();

    // Failure path: loading stays true, shimmer stays, img never renders.
    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(true);
    expect(wrapper.find("img").exists()).toBe(false);

    // catch block ran.
    expect(consoleSpy).toHaveBeenCalledWith("Failed to load image:", error);

    // No 'loaded' event on failure.
    expect(wrapper.emitted("loaded")).toBeFalsy();
  });
});
