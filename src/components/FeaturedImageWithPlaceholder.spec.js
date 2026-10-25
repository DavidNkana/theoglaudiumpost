import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// Mock the single external boundary: the media service.
const getMediaObjectUrl = vi.fn();
vi.mock("@/features/media/MediaService", () => ({
  getMediaObjectUrl: (...args) => getMediaObjectUrl(...args),
}));

import FeaturedImageWithPlaceholder from "@/components/FeaturedImageWithPlaceholder.vue";

function mountCmp(props = {}) {
  return mount(FeaturedImageWithPlaceholder, {
    props: { mediaId: 42, ...props },
  });
}

describe("FeaturedImageWithPlaceholder", () => {
  let logSpy;
  let warnSpy;

  beforeEach(() => {
    getMediaObjectUrl.mockReset();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the image directly from props.image.file without calling the service", async () => {
    const wrapper = mountCmp({
      mediaId: 5,
      image: { file: "https://cdn/foo.jpg" },
      alt: "Inline",
    });
    await flushPromises();

    // image+file branch: loading flipped false immediately, img shown, no service call.
    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(false);
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("https://cdn/foo.jpg");
    expect(img.attributes("alt")).toBe("Inline");

    expect(getMediaObjectUrl).not.toHaveBeenCalled();
    expect(wrapper.emitted("loaded")).toEqual([
      [{ mediaId: 5, url: "https://cdn/foo.jpg" }],
    ]);
  });

  it("shows the shimmer placeholder before the image resolves", () => {
    // Never-resolving promise keeps loading=true so the shimmer branch renders.
    getMediaObjectUrl.mockReturnValue(new Promise(() => {}));
    const wrapper = mountCmp();

    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(true);
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("loads the image on mount via mediaId, hides the placeholder and emits loaded", async () => {
    getMediaObjectUrl.mockResolvedValue("blob:object-url");
    const wrapper = mountCmp({ mediaId: 7 });
    await flushPromises();

    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(false);
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("blob:object-url");

    expect(getMediaObjectUrl).toHaveBeenCalledWith(7);
    expect(wrapper.emitted("loaded")).toEqual([
      [{ mediaId: 7, url: "blob:object-url" }],
    ]);
  });

  it("uses the default alt text when none is provided", async () => {
    getMediaObjectUrl.mockResolvedValue("blob:default-alt");
    const wrapper = mountCmp();
    await flushPromises();

    expect(wrapper.find("img").attributes("alt")).toBe("Image");
  });

  it("sets loading=false via the img @load handler", async () => {
    getMediaObjectUrl.mockResolvedValue("blob:load-handler");
    const wrapper = mountCmp();
    await flushPromises();

    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    await img.trigger("load");

    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(false);
  });

  it("warns and stops loading when no mediaId and no image are provided", async () => {
    // The else branch: mediaId falsy, no image -> warn + loading=false, no service call.
    const wrapper = mountCmp({ mediaId: 0 });
    await flushPromises();

    expect(warnSpy).toHaveBeenCalledWith(
      "No mediaId provided for FeaturedImageWithPlaceholder"
    );
    expect(getMediaObjectUrl).not.toHaveBeenCalled();
    // loading flipped false -> placeholder gone, img attempts to render (src empty).
    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(false);
    expect(wrapper.emitted("loaded")).toBeUndefined();
  });

  it("falls back to the service when image has no file property", async () => {
    // image truthy but image.file falsy -> first branch false, mediaId branch taken.
    getMediaObjectUrl.mockResolvedValue("blob:no-file");
    const wrapper = mountCmp({ mediaId: 11, image: {} });
    await flushPromises();

    expect(getMediaObjectUrl).toHaveBeenCalledWith(11);
    expect(wrapper.find("img").attributes("src")).toBe("blob:no-file");
  });

  it("swallows errors in the catch branch when the service rejects", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("network down");
    getMediaObjectUrl.mockRejectedValue(failure);

    const wrapper = mountCmp({ mediaId: 99 });
    await flushPromises();

    // loadImage rejected before flipping loading -> placeholder stays.
    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(true);
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.emitted("loaded")).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith("Failed to load image:", failure);
  });
});
