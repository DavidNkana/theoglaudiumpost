import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, RouterLinkStub, flushPromises } from "@vue/test-utils";

// --- Mock the formatTimeAgo util boundary ------------------------------------
// Deterministic so assertions check the real rendered string the component
// produces from each article's date field.
vi.mock("@/utils", () => ({
  formatTimeAgo: vi.fn((date) => `ago:${date}`),
}));

// --- Mock the Vuex store boundary --------------------------------------------
// A single shared commit spy lets every test assert the exact mutation payload
// that cacheImage dispatches.
const commit = vi.fn();
vi.mock("vuex", () => ({
  useStore: () => ({ commit }),
}));

import { formatTimeAgo } from "@/utils";
import ArticlesRow from "@/views/News/Partials/ArticlesRow.vue";

// Stub ImageWithPlaceholder so we (a) avoid its real implementation/boundaries
// and (b) can emit the `loaded` event to drive cacheImage. A functional stub
// that re-emits keeps wrapper.emitted / findComponent ergonomics intact.
const ImageWithPlaceholderStub = {
  name: "ImageWithPlaceholder",
  props: ["mediaId"],
  emits: ["loaded"],
  template: `<div class="image-stub" :data-media-id="mediaId" @click="$emit('loaded', { mediaId, url: 'http://cdn/x.png' })"></div>`,
};

const mountRow = (props = {}) =>
  mount(ArticlesRow, {
    props,
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        ImageWithPlaceholder: ImageWithPlaceholderStub,
      },
    },
  });

const sampleArticles = [
  {
    cover_id: "cov-1",
    slug: "first-story",
    title: "First Story",
    scheduledFor: "2026-01-01T00:00:00Z",
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    cover_id: "cov-2",
    slug: "second-story",
    title: "Second Story",
    // no scheduledFor -> falls back to created_at
    scheduledFor: null,
    created_at: "2025-02-02T00:00:00Z",
  },
];

describe("ArticlesRow.vue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the loading skeleton (v-else branch) when isLoading is true", () => {
    // Default prop isLoading=true also exercised here explicitly.
    const wrapper = mountRow({ isLoading: true, articles: [] });

    const cards = wrapper.findAll(".article-card");
    expect(cards).toHaveLength(5); // v-for index in 5

    // Skeleton shimmer placeholders are present; no real article content.
    expect(wrapper.findAll(".shimmer").length).toBeGreaterThan(0);
    expect(wrapper.findAllComponents(ImageWithPlaceholderStub)).toHaveLength(0);
    expect(wrapper.findAllComponents(RouterLinkStub)).toHaveLength(0);
    expect(formatTimeAgo).not.toHaveBeenCalled();
  });

  it("uses the default isLoading prop (true) when none is provided", () => {
    const wrapper = mountRow({ articles: sampleArticles });
    // Default true => skeleton path, not the article list.
    expect(wrapper.findAll(".article-card")).toHaveLength(5);
    expect(wrapper.findAllComponents(ImageWithPlaceholderStub)).toHaveLength(0);
  });

  it("renders nothing in the list when not loading but articles is empty (empty v-for)", () => {
    const wrapper = mountRow({ isLoading: false, articles: [] });

    // v-if !isLoading is true but the v-for has no items -> zero cards.
    expect(wrapper.findAll(".article-card")).toHaveLength(0);
    expect(wrapper.findAllComponents(ImageWithPlaceholderStub)).toHaveLength(0);
    expect(wrapper.find(".article-list").exists()).toBe(true);
  });

  it("uses the default articles prop (empty) when none provided and not loading", () => {
    const wrapper = mountRow({ isLoading: false });
    expect(wrapper.findAll(".article-card")).toHaveLength(0);
  });

  it("renders one card per article (non-empty v-for) with title, link and image", () => {
    const wrapper = mountRow({ isLoading: false, articles: sampleArticles });

    const cards = wrapper.findAll(".article-card");
    expect(cards).toHaveLength(2);

    const titles = wrapper.findAll(".article-title").map((n) => n.text());
    expect(titles).toEqual(["First Story", "Second Story"]);

    const links = wrapper.findAllComponents(RouterLinkStub);
    expect(links).toHaveLength(2);
    expect(links[0].props("to")).toBe("/news/first-story");
    expect(links[1].props("to")).toBe("/news/second-story");

    const images = wrapper.findAllComponents(ImageWithPlaceholderStub);
    expect(images).toHaveLength(2);
    expect(images[0].props("mediaId")).toBe("cov-1");
    expect(images[1].props("mediaId")).toBe("cov-2");
  });

  it("formats time using scheduledFor when present, else created_at (|| branch both sides)", () => {
    const wrapper = mountRow({ isLoading: false, articles: sampleArticles });

    // First article: scheduledFor truthy -> used.
    expect(formatTimeAgo).toHaveBeenCalledWith("2026-01-01T00:00:00Z");
    // Second article: scheduledFor falsy -> created_at used.
    expect(formatTimeAgo).toHaveBeenCalledWith("2025-02-02T00:00:00Z");

    const metas = wrapper.findAll(".article-meta small").map((n) => n.text());
    expect(metas).toEqual([
      "ago:2026-01-01T00:00:00Z",
      "ago:2025-02-02T00:00:00Z",
    ]);
  });

  it("commits articles/updateArticle when ImageWithPlaceholder emits 'loaded' (cacheImage)", async () => {
    const wrapper = mountRow({ isLoading: false, articles: sampleArticles });

    const firstImage = wrapper.findAllComponents(ImageWithPlaceholderStub)[0];
    firstImage.vm.$emit("loaded", { mediaId: "cov-1", url: "http://cdn/cover-1.png" });
    await flushPromises();

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith("articles/updateArticle", {
      // props.article is undefined (spread of undefined contributes nothing),
      // so only the cover/url keys end up in the committed payload.
      cover: "http://cdn/cover-1.png",
      url: "http://cdn/cover-1.png",
    });
  });

  it("re-fires cacheImage on the @loaded native event path via the stub's click", async () => {
    const wrapper = mountRow({ isLoading: false, articles: sampleArticles });

    await wrapper.findAll(".image-stub")[1].trigger("click");
    await flushPromises();

    expect(commit).toHaveBeenCalledWith("articles/updateArticle", {
      cover: "http://cdn/x.png",
      url: "http://cdn/x.png",
    });
  });
});
