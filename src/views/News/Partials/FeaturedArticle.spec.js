import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";

// --- Mock @/utils (pulls heavy ad/image helpers) ------------------------------
const formatDateToLongString = vi.fn(() => "January 1, 2026");
const setDefaultImage = vi.fn();
vi.mock("@/utils", () => ({
  formatDateToLongString: (...a) => formatDateToLongString(...a),
  setDefaultImage: (...a) => setDefaultImage(...a),
}));

// --- Mock the media service (external boundary) ------------------------------
const getMediaById = vi.fn();
vi.mock("@/features/media/MediaService", () => ({
  getMediaById: (...a) => getMediaById(...a),
}));

// --- Mock vuex store ----------------------------------------------------------
let dispatch;
let getters;
vi.mock("vuex", () => ({
  useStore: () => ({
    dispatch: (...a) => dispatch(...a),
    getters,
  }),
}));

import FeaturedArticle from "@/views/News/Partials/FeaturedArticle.vue";

const ARTICLE = {
  cover_id: 42,
  slug: "big-story",
  title: "Big Story",
  summary: "A summary",
  created_at: "2026-01-01T00:00:00Z",
  category: { name: "World" },
};

const setFeatured = (article) => {
  getters = { "articles/featuredArticles": article ? [article] : [] };
};

const mountComp = () =>
  mount(FeaturedArticle, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

beforeEach(() => {
  dispatch = vi.fn().mockResolvedValue(undefined);
  getters = { "articles/featuredArticles": [] };
  getMediaById.mockReset();
  getMediaById.mockResolvedValue({ status: 200, data: { url: "http://img/cover.jpg" } });
  formatDateToLongString.mockClear();
  setDefaultImage.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FeaturedArticle.vue", () => {
  it("dispatches the featured fetch on mount and renders the shimmer placeholder while empty", async () => {
    // No featured article + isLoading starts truthy during fetch -> v-else shimmer.
    setFeatured(null);
    const wrapper = mountComp();
    await flushPromises();

    expect(dispatch).toHaveBeenCalledWith("articles/fetchArticlesByType", {
      type: "featured",
      size: 10,
    });
    // featuredArticle is undefined -> v-else branch renders the shimmer.
    expect(wrapper.find(".shimmer").exists()).toBe(true);
    expect(wrapper.find(".featured-content").exists()).toBe(false);
  });

  it("renders the article via cover_id media URL (JSON url branch) once loaded", async () => {
    setFeatured(ARTICLE);
    const wrapper = mountComp();
    await flushPromises();

    // fetchMedia used cover_id -> "featured" storyType
    expect(getMediaById).toHaveBeenCalledWith(42, "featured");

    // Success state: image rendered with the resolved url (not loading anymore).
    const img = wrapper.find("img.featured-img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("http://img/cover.jpg");
    expect(wrapper.find(".image-loading-container").exists()).toBe(false);

    // Content rendered.
    expect(wrapper.find(".badge").text()).toBe("World");
    expect(wrapper.find(".featured-title").text()).toBe("Big Story");
    expect(wrapper.find(".featured-excerpt").text()).toBe("A summary");
    expect(formatDateToLongString).toHaveBeenCalledWith("2026-01-01T00:00:00Z");

    // RouterLinks point to the article slug.
    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links.map((l) => l.props("to"))).toEqual([
      "/news/big-story",
      "/news/big-story",
    ]);

    // @error handler wired to setDefaultImage.
    await img.trigger("error");
    expect(setDefaultImage).toHaveBeenCalled();
  });

  it("falls back to URL.createObjectURL for a blob response (no url field)", async () => {
    const blob = { size: 1 };
    getMediaById.mockResolvedValue({ status: 200, data: blob });
    const createObjectURL = vi.fn(() => "blob:created");
    vi.stubGlobal("URL", { createObjectURL });

    setFeatured(ARTICLE);
    const wrapper = mountComp();
    await flushPromises();

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(wrapper.find("img.featured-img").attributes("src")).toBe("blob:created");

    vi.unstubAllGlobals();
  });

  it("leaves imageUrl null when the media response is not a 200/has no data", async () => {
    getMediaById.mockResolvedValue({ status: 404, data: null });
    setFeatured(ARTICLE);
    const wrapper = mountComp();
    await flushPromises();

    // Neither url nor blob branch taken -> src stays null/undefined.
    const img = wrapper.find("img.featured-img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBeUndefined();
  });

  it("logs and recovers when fetchMedia rejects (catch branch)", async () => {
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {});
    getMediaById.mockRejectedValue(new Error("boom"));
    setFeatured(ARTICLE);
    const wrapper = mountComp();
    await flushPromises();

    expect(consoleErr).toHaveBeenCalledWith("Error fetching media:", expect.any(Error));
    // isLoadingImage reset in finally -> img is shown (no loading container).
    expect(wrapper.find(".image-loading-container").exists()).toBe(false);
    expect(wrapper.find("img.featured-img").exists()).toBe(true);
  });

  it("shows the image-loading spinner while fetchMedia is in flight (isLoadingImage branch)", async () => {
    let resolveMedia;
    getMediaById.mockImplementation(
      () => new Promise((res) => { resolveMedia = res; })
    );
    setFeatured(ARTICLE);
    const wrapper = mountComp();
    // fetchPosts resolves, but media is pending -> isLoadingImage true.
    await flushPromises();

    expect(wrapper.find(".image-loading-container.featured-img").exists()).toBe(true);
    expect(wrapper.find(".spinner").exists()).toBe(true);
    expect(wrapper.find("img.featured-img").exists()).toBe(false);

    // Resolve to flush the finally block.
    resolveMedia({ status: 200, data: { url: "http://img/late.jpg" } });
    await flushPromises();
    expect(wrapper.find("img.featured-img").exists()).toBe(true);
  });

  it("uses an existing cover.file when there is no cover_id (else-if branch)", async () => {
    setFeatured({
      slug: "no-cover-id",
      title: "No Cover Id",
      summary: "s",
      created_at: "2026-01-01T00:00:00Z",
      cover: { file: "http://img/existing.jpg" },
      // no category -> category?.name optional-chain falsy branch
    });
    const wrapper = mountComp();
    await flushPromises();

    // Service not called because no cover_id.
    expect(getMediaById).not.toHaveBeenCalled();
    expect(wrapper.find("img.featured-img").attributes("src")).toBe(
      "http://img/existing.jpg"
    );
    // category?.name is undefined -> badge renders empty.
    expect(wrapper.find(".badge").text()).toBe("");
  });

  it("renders the article with no image source when neither cover_id nor cover.file exist", async () => {
    setFeatured({
      slug: "bare",
      title: "Bare",
      summary: "s",
      created_at: "2026-01-01T00:00:00Z",
    });
    const wrapper = mountComp();
    await flushPromises();

    expect(getMediaById).not.toHaveBeenCalled();
    const img = wrapper.find("img.featured-img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBeUndefined();
  });

  it("logs and resets loading when fetchPosts (dispatch) rejects (catch branch)", async () => {
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => {});
    dispatch = vi.fn().mockRejectedValue(new Error("dispatch fail"));
    setFeatured(ARTICLE);
    const wrapper = mountComp();
    await flushPromises();

    expect(consoleErr).toHaveBeenCalledWith(
      "Error fetching posts:",
      expect.any(Error)
    );
    // isLoading reset to false in catch, article present -> content renders.
    expect(wrapper.find(".featured-content").exists()).toBe(true);
  });
});
