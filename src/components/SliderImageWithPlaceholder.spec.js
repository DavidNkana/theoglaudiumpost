import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";

// Mock the single external boundary: the media service.
const getMediaObjectUrl = vi.fn();
vi.mock("@/features/media/MediaService", () => ({
  getMediaObjectUrl: (...args) => getMediaObjectUrl(...args),
}));

import SliderImageWithPlaceholder from "@/components/SliderImageWithPlaceholder.vue";

function mountCmp(props = {}) {
  return mount(SliderImageWithPlaceholder, {
    props: { mediaId: 42, ...props },
  });
}

describe("SliderImageWithPlaceholder", () => {
  beforeEach(() => {
    getMediaObjectUrl.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the shimmer placeholder before the image resolves (loading branch)", () => {
    // Never-resolving promise keeps loading=true so the v-if shimmer branch renders
    // and the !loading img branch does NOT render.
    getMediaObjectUrl.mockReturnValue(new Promise(() => {}));
    const wrapper = mountCmp();

    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(true);
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("loads the image on mount, hides the placeholder and emits loaded (resolve path)", async () => {
    getMediaObjectUrl.mockResolvedValue("blob:object-url");
    const wrapper = mountCmp({ mediaId: 7 });
    await flushPromises();

    // loading flipped to false -> placeholder gone (else of v-if), img shown.
    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(false);
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("blob:object-url");

    expect(getMediaObjectUrl).toHaveBeenCalledWith(7);
    expect(wrapper.emitted("loaded")).toHaveLength(1);
    expect(wrapper.emitted("loaded")[0]).toEqual([
      { mediaId: 7, url: "blob:object-url" },
    ]);
  });

  it("uses the default alt text when none is provided", async () => {
    getMediaObjectUrl.mockResolvedValue("blob:default-alt");
    const wrapper = mountCmp();
    await flushPromises();

    expect(wrapper.find("img").attributes("alt")).toBe("Image");
  });

  it("renders the provided alt text", async () => {
    getMediaObjectUrl.mockResolvedValue("blob:custom-alt");
    const wrapper = mountCmp({ alt: "Slide caption" });
    await flushPromises();

    expect(wrapper.find("img").attributes("alt")).toBe("Slide caption");
  });

  it("runs the img @load handler setting loading=false", async () => {
    getMediaObjectUrl.mockResolvedValue("blob:load-handler");
    const wrapper = mountCmp();
    await flushPromises();

    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    await img.trigger("load");

    // @load handler kept loading false; placeholder still absent, img present.
    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(false);
    expect(wrapper.find("img").exists()).toBe(true);
  });

  it("swallows errors in the catch branch when the service rejects (reject path)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("network down");
    getMediaObjectUrl.mockRejectedValue(failure);

    const wrapper = mountCmp({ mediaId: 99 });
    await flushPromises();

    // loadImage rejected before flipping loading -> placeholder stays, no img, no emit.
    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(true);
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.emitted("loaded")).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith("Failed to load image:", failure);
  });
});
