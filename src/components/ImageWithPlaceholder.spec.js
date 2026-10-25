import { mount, flushPromises } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the media service boundary.
import { getMediaById } from "@/features/media/MediaService";
vi.mock("@/features/media/MediaService", () => ({
  getMediaById: vi.fn(),
}));

import ImageWithPlaceholder from "@/components/ImageWithPlaceholder.vue";

describe("ImageWithPlaceholder.vue", () => {
  let createObjectURLSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    // jsdom does not implement URL.createObjectURL; define it so we can spy.
    if (typeof URL.createObjectURL !== "function") {
      URL.createObjectURL = () => "";
    }
    createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:object-url");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the shimmer placeholder while loading, then loads via service (non-base64 url)", async () => {
    // Service resolves with a plain (non-base64) url -> the else branch.
    getMediaById.mockResolvedValueOnce({ data: { url: "https://cdn/img.png" } });

    const wrapper = mount(ImageWithPlaceholder, {
      props: { mediaId: 42 },
    });

    // Before the async loadImage settles, loading is true: shimmer shown, no img.
    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(true);
    expect(wrapper.find("img").exists()).toBe(false);

    await flushPromises();

    // Service was called with the mediaId.
    expect(getMediaById).toHaveBeenCalledWith(42);
    // Non-base64 url -> createObjectURL NOT used.
    expect(createObjectURLSpy).not.toHaveBeenCalled();

    // loading is now false: img rendered, shimmer gone.
    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(false);
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("https://cdn/img.png");
    // Default alt prop.
    expect(img.attributes("alt")).toBe("Image");

    // "loaded" emitted with resolved url.
    expect(wrapper.emitted("loaded")).toBeTruthy();
    expect(wrapper.emitted("loaded")[0]).toEqual([
      { mediaId: 42, url: "https://cdn/img.png" },
    ]);
  });

  it("wraps a base64 url in an object URL (if branch)", async () => {
    getMediaById.mockResolvedValueOnce({
      data: { url: "data:image/png;base64,AAAA" },
    });

    const wrapper = mount(ImageWithPlaceholder, {
      props: { mediaId: 7, alt: "Custom alt" },
    });

    await flushPromises();

    expect(createObjectURLSpy).toHaveBeenCalledWith("data:image/png;base64,AAAA");
    const img = wrapper.find("img");
    expect(img.attributes("src")).toBe("blob:object-url");
    expect(img.attributes("alt")).toBe("Custom alt");
    expect(wrapper.emitted("loaded")[0]).toEqual([
      { mediaId: 7, url: "blob:object-url" },
    ]);
  });

  it("logs and stays loading when the service rejects (catch branch)", async () => {
    getMediaById.mockRejectedValueOnce(new Error("boom"));

    const wrapper = mount(ImageWithPlaceholder, {
      props: { mediaId: 99 },
    });

    await flushPromises();

    expect(console.error).toHaveBeenCalledWith(
      "Failed to load image:",
      expect.any(Error)
    );
    // Catch path: loading never set false, shimmer still shown, no img, no emit.
    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(true);
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.emitted("loaded")).toBeFalsy();
  });

  it("uses a string image prop directly (string branch, early return)", async () => {
    // loadImage still runs; reject it so the service path does not also emit.
    getMediaById.mockRejectedValueOnce(new Error("ignored"));

    const wrapper = mount(ImageWithPlaceholder, {
      props: { mediaId: 5, image: "https://direct/string.png" },
    });

    await flushPromises();

    expect(wrapper.emitted("loaded")).toBeTruthy();
    expect(wrapper.emitted("loaded")[0]).toEqual([
      { mediaId: 5, url: "https://direct/string.png" },
    ]);
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("https://direct/string.png");
  });

  it("uses an object image prop with .file (object branch, early return)", async () => {
    getMediaById.mockRejectedValueOnce(new Error("ignored"));

    const wrapper = mount(ImageWithPlaceholder, {
      props: { mediaId: 6, image: { file: "https://direct/object.png" } },
    });

    await flushPromises();

    expect(wrapper.emitted("loaded")[0]).toEqual([
      { mediaId: 6, url: "https://direct/object.png" },
    ]);
    expect(wrapper.find("img").attributes("src")).toBe(
      "https://direct/object.png"
    );
  });

  it("falls through when object image prop has no .file (no early return)", async () => {
    // image is a truthy object, not a string, no .file -> neither inner branch.
    getMediaById.mockResolvedValueOnce({ data: { url: "https://cdn/from-service.png" } });

    const wrapper = mount(ImageWithPlaceholder, {
      props: { mediaId: 8, image: { notFile: "x" } },
    });

    await flushPromises();

    // Service path won: src from service, single emit.
    const img = wrapper.find("img");
    expect(img.attributes("src")).toBe("https://cdn/from-service.png");
    expect(wrapper.emitted("loaded")).toHaveLength(1);
    expect(wrapper.emitted("loaded")[0]).toEqual([
      { mediaId: 8, url: "https://cdn/from-service.png" },
    ]);
  });

  it("sets loading false on the img @load event handler", async () => {
    // Reach a state where the img is rendered (loading already false via string prop),
    // then trigger @load to execute the inline handler `loading = false`.
    getMediaById.mockRejectedValueOnce(new Error("ignored"));

    const wrapper = mount(ImageWithPlaceholder, {
      props: { mediaId: 3, image: "https://direct/load.png" },
    });

    await flushPromises();

    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    await img.trigger("load");
    // Still rendered (handler keeps loading false).
    expect(wrapper.find("img").exists()).toBe(true);
    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(false);
  });
});
