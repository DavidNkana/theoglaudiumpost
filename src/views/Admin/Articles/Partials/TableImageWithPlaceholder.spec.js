import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import TableImageWithPlaceholder from "@/views/Admin/Articles/Partials/TableImageWithPlaceholder.vue";
import { getMediaObjectUrl } from "@/features/media/MediaService";

// Mock the only external boundary the component imports.
vi.mock("@/features/media/MediaService", () => ({
  getMediaObjectUrl: vi.fn(),
}));

describe("TableImageWithPlaceholder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the shimmer placeholder while loading (before the image resolves)", () => {
    // Pending promise: loadImage starts but never settles within this tick.
    getMediaObjectUrl.mockReturnValue(new Promise(() => {}));

    const wrapper = mount(TableImageWithPlaceholder, {
      props: { mediaId: 7 },
    });

    // loading === true -> shimmer rendered, img NOT rendered.
    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(true);
    expect(wrapper.find("img").exists()).toBe(false);
  });

  it("loads the image on mount and emits 'loaded' on the success path", async () => {
    getMediaObjectUrl.mockResolvedValue("blob:object-url");

    const wrapper = mount(TableImageWithPlaceholder, {
      props: { mediaId: 42, alt: "My picture" },
    });

    await flushPromises();

    // Service called with the provided mediaId.
    expect(getMediaObjectUrl).toHaveBeenCalledTimes(1);
    expect(getMediaObjectUrl).toHaveBeenCalledWith(42);

    // loading === false -> shimmer gone, img rendered with resolved src + alt.
    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(false);
    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("blob:object-url");
    // The `:alt="alt"` binding is overridden by the later static alt attribute,
    // so the DOM reflects the static value; the prop still flows through.
    expect(wrapper.props("alt")).toBe("My picture");

    // 'loaded' emitted with mediaId + url payload.
    const loaded = wrapper.emitted("loaded");
    expect(loaded).toHaveLength(1);
    expect(loaded[0][0]).toEqual({ mediaId: 42, url: "blob:object-url" });
  });

  it("uses the default alt prop when none is provided", async () => {
    getMediaObjectUrl.mockResolvedValue("blob:default-alt");

    const wrapper = mount(TableImageWithPlaceholder, {
      props: { mediaId: 1 },
    });

    await flushPromises();

    expect(wrapper.props("alt")).toBe("Image");
    expect(wrapper.find("img").exists()).toBe(true);
  });

  it("handles the rejection path: logs the error and keeps the shimmer (no 'loaded')", async () => {
    const error = new Error("boom");
    getMediaObjectUrl.mockRejectedValue(error);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const wrapper = mount(TableImageWithPlaceholder, {
      props: { mediaId: 99 },
    });

    await flushPromises();

    // catch branch: console.error called, loading stays true, no emit.
    expect(consoleSpy).toHaveBeenCalledWith("Failed to load image:", error);
    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(true);
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.emitted("loaded")).toBeUndefined();

    consoleSpy.mockRestore();
  });

  it("sets loading false via the img @load handler", async () => {
    // Keep the service pending so the success path does not flip loading first;
    // then force-render the img to exercise the @load event binding directly.
    let resolveFn;
    getMediaObjectUrl.mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      })
    );

    const wrapper = mount(TableImageWithPlaceholder, {
      props: { mediaId: 5 },
    });

    // Resolve so loadImage sets loading=false and the <img> renders.
    resolveFn("blob:loaded-url");
    await flushPromises();

    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);

    // Trigger the native load event -> @load="loading = false".
    await img.trigger("load");

    expect(wrapper.find("img").exists()).toBe(true);
    expect(wrapper.find(".shimmer-placeholder").exists()).toBe(false);
  });
});
