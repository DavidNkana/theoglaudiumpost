import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import { createStore } from "vuex";

// ===== MOCK EXTERNAL BOUNDARIES =====

// Mock the media service boundary. The component calls getMediaById in
// fetchMedia (on mount + via the immediate watcher).
const getMediaById = vi.fn();
vi.mock("@/features/media/MediaService", () => ({
  getMediaById: (...args) => getMediaById(...args),
}));

// Mock formatTimeAgo so the rendered time text is deterministic.
vi.mock("@/utils", () => ({
  formatTimeAgo: (iso) => `time:${iso}`,
}));

import NewsCard from "@/components/NewsCard.vue";

// Stub the media-loading children so this spec only instruments NewsCard.vue
// and not the real MediaService boundary those children import.
const ImageWithPlaceholderStub = {
  name: "ImageWithPlaceholder",
  props: ["mediaId", "image"],
  emits: ["loaded"],
  template: `<div class="image-with-placeholder-stub" @click="$emit('loaded', { mediaId, url: 'cached-url' })"></div>`,
};
const FeaturedImageWithPlaceholderStub = {
  name: "FeaturedImageWithPlaceholder",
  props: ["mediaId", "image"],
  emits: ["loaded"],
  template: `<div class="featured-image-with-placeholder-stub" @click="$emit('loaded', { mediaId, url: 'cached-url' })"></div>`,
};
const TagsStub = {
  name: "Tags",
  props: ["tags", "variant", "size", "colorScheme", "showIcon", "clickable", "emptyText"],
  template: `<div class="tags-stub"></div>`,
};

function makeStore() {
  const commit = vi.fn();
  const store = createStore({});
  store.commit = commit;
  return { store, commit };
}

function baseArticle(overrides = {}) {
  return {
    slug: "my-article",
    title: "My Article Title",
    summary: "My article summary",
    ...overrides,
  };
}

function mountCard({ props = {}, store } = {}) {
  const built = store || makeStore();
  const wrapper = mount(NewsCard, {
    props: { article: baseArticle(), ...props },
    global: {
      plugins: [built.store],
      stubs: {
        ImageWithPlaceholder: ImageWithPlaceholderStub,
        FeaturedImageWithPlaceholder: FeaturedImageWithPlaceholderStub,
        Tags: TagsStub,
        RouterLink: RouterLinkStub,
        "router-link": RouterLinkStub,
      },
    },
  });
  return { wrapper, store: built.store, commit: built.commit };
}

beforeEach(() => {
  vi.clearAllMocks();
  getMediaById.mockReset();
  // default: no cover_id article -> fetchMedia takes the no-op path
  getMediaById.mockResolvedValue({ status: 200, data: { url: "fetched-url" } });
});

describe("NewsCard.vue", () => {
  // ---------- FEATURED layout (v-if="featured") ----------
  it("renders the featured layout with author, publisher and time meta", async () => {
    const { wrapper } = mountCard({
      props: {
        featured: true,
        article: baseArticle({
          author: "Jane Doe",
          publisher: "Daily News",
          publishedAt: "2025-01-01T00:00:00Z",
        }),
      },
    });
    await Promise.resolve();

    // featured branch chosen, standard branch absent
    expect(wrapper.find(".featured-card").exists()).toBe(true);
    expect(wrapper.find(".card-image").exists()).toBe(false);

    // featured child receives props
    const featuredImg = wrapper.findComponent(FeaturedImageWithPlaceholderStub);
    expect(featuredImg.exists()).toBe(true);

    expect(wrapper.find(".featured-title").text()).toBe("My Article Title");
    expect(wrapper.find(".featured-summary").text()).toBe("My article summary");

    const meta = wrapper.find(".featured-meta");
    expect(meta.text()).toContain("By Jane Doe");
    expect(meta.text()).toContain("Daily News");

    const time = wrapper.find(".featured-meta time");
    expect(time.exists()).toBe(true);
    expect(time.attributes("datetime")).toBe("2025-01-01T00:00:00Z");
    expect(time.text()).toContain("time:2025-01-01T00:00:00Z");

    // router-link target
    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.props("to")).toBe("/news/my-article");
  });

  it("featured layout hides author/publisher/time when all absent (false v-if branches)", async () => {
    const { wrapper } = mountCard({
      props: {
        featured: true,
        // no author, no publisher, no publishedAt/scheduledFor/created_at
        article: baseArticle(),
      },
    });
    await Promise.resolve();

    expect(wrapper.find(".featured-meta span").exists()).toBe(false);
    expect(wrapper.find(".featured-meta time").exists()).toBe(false);
  });

  // ---------- STANDARD layout (v-else) ----------
  it("renders the standard layout with summary, tags and footer when minDetails is false", async () => {
    const { wrapper } = mountCard({
      props: {
        article: baseArticle({
          author: "Bob",
          publisher: "Gazette",
          created_at: "2024-12-31T00:00:00Z",
          tags: [{ name: "News" }],
        }),
      },
    });
    await Promise.resolve();

    expect(wrapper.find(".featured-card").exists()).toBe(false);
    expect(wrapper.find(".news-card").exists()).toBe(true);

    expect(wrapper.find(".card-title").text()).toBe("My Article Title");
    expect(wrapper.find(".card-summary").text()).toBe("My article summary");
    expect(wrapper.findComponent(TagsStub).exists()).toBe(true);
    expect(wrapper.findComponent(TagsStub).props("tags")).toEqual([{ name: "News" }]);

    const footer = wrapper.find(".card-footer");
    expect(footer.exists()).toBe(true);
    expect(footer.text()).toContain("By Bob");
    expect(footer.text()).toContain("Gazette");

    const time = footer.find("time");
    expect(time.exists()).toBe(true);
    expect(time.attributes("datetime")).toBe("2024-12-31T00:00:00Z");
    expect(time.text()).toContain("time:2024-12-31T00:00:00Z");

    // standard child receives props
    expect(wrapper.findComponent(ImageWithPlaceholderStub).exists()).toBe(true);
  });

  it("hides summary, tags and footer when minDetails is true (false template/footer branches)", async () => {
    const { wrapper } = mountCard({ props: { minDetails: true } });
    await Promise.resolve();

    expect(wrapper.find(".card-summary").exists()).toBe(false);
    expect(wrapper.find(".card-tags").exists()).toBe(false);
    expect(wrapper.findComponent(TagsStub).exists()).toBe(false);
    expect(wrapper.find(".card-footer").exists()).toBe(false);
  });

  it("standard footer hides author/publisher/time when all absent (false v-if branches)", async () => {
    const { wrapper } = mountCard();
    await Promise.resolve();

    const footer = wrapper.find(".card-footer");
    expect(footer.exists()).toBe(true);
    expect(footer.find("span span").exists()).toBe(false);
    expect(footer.find("time").exists()).toBe(false);
  });

  // ---------- cacheImage (store.commit) ----------
  it("commits articles/updateArticle when a child emits loaded (standard)", async () => {
    const { wrapper, commit } = mountCard({
      props: { article: baseArticle({ extra: "keep" }) },
    });
    await Promise.resolve();

    await wrapper.findComponent(ImageWithPlaceholderStub).trigger("click");

    expect(commit).toHaveBeenCalledWith("articles/updateArticle", {
      slug: "my-article",
      title: "My Article Title",
      summary: "My article summary",
      extra: "keep",
      cover: "cached-url",
      url: "cached-url",
    });
  });

  it("commits articles/updateArticle when the featured child emits loaded", async () => {
    const { wrapper, commit } = mountCard({
      props: { featured: true },
    });
    await Promise.resolve();

    await wrapper.findComponent(FeaturedImageWithPlaceholderStub).trigger("click");

    expect(commit).toHaveBeenCalledWith(
      "articles/updateArticle",
      expect.objectContaining({ cover: "cached-url", url: "cached-url" })
    );
  });

  // ---------- storyType computed (drives getMediaById's 2nd arg) ----------
  it("storyType=featured passes 'featured' to getMediaById", async () => {
    mountCard({ props: { featured: true, article: baseArticle({ cover_id: 5 }) } });
    await Promise.resolve();
    expect(getMediaById).toHaveBeenCalledWith(5, "featured");
  });

  it("storyType=top via isTopStory prop", async () => {
    mountCard({ props: { isTopStory: true, article: baseArticle({ cover_id: 5 }) } });
    await Promise.resolve();
    expect(getMediaById).toHaveBeenCalledWith(5, "top");
  });

  it("storyType=top via article.isTopStory", async () => {
    mountCard({ props: { article: baseArticle({ cover_id: 5, isTopStory: true }) } });
    await Promise.resolve();
    expect(getMediaById).toHaveBeenCalledWith(5, "top");
  });

  it("storyType=top via article.type === 'topStories'", async () => {
    mountCard({ props: { article: baseArticle({ cover_id: 5, type: "topStories" }) } });
    await Promise.resolve();
    expect(getMediaById).toHaveBeenCalledWith(5, "top");
  });

  it("storyType=top via tags containing 'top story' (tags?.some truthy branch)", async () => {
    mountCard({
      props: {
        article: baseArticle({ cover_id: 5, tags: [{ name: "Top Story" }] }),
      },
    });
    await Promise.resolve();
    expect(getMediaById).toHaveBeenCalledWith(5, "top");
  });

  it("storyType=popular via isPopular prop", async () => {
    mountCard({ props: { isPopular: true, article: baseArticle({ cover_id: 5 }) } });
    await Promise.resolve();
    expect(getMediaById).toHaveBeenCalledWith(5, "popular");
  });

  it("storyType=popular via article.type === 'popular'", async () => {
    mountCard({ props: { article: baseArticle({ cover_id: 5, type: "popular" }) } });
    await Promise.resolve();
    expect(getMediaById).toHaveBeenCalledWith(5, "popular");
  });

  it("storyType=popular via tags containing 'popular' (tags?.some truthy branch)", async () => {
    mountCard({
      props: {
        article: baseArticle({ cover_id: 5, tags: [{ name: "Popular" }] }),
      },
    });
    await Promise.resolve();
    expect(getMediaById).toHaveBeenCalledWith(5, "popular");
  });

  it("storyType=null when no flags and tags present but non-matching (tags?.some falsy branch)", async () => {
    mountCard({
      props: {
        article: baseArticle({ cover_id: 5, tags: [{ name: "Sports" }] }),
      },
    });
    await Promise.resolve();
    expect(getMediaById).toHaveBeenCalledWith(5, null);
  });

  // ---------- fetchMedia branches ----------
  it("fetchMedia sets imageUrl from response.data.url when status 200 (url present)", async () => {
    getMediaById.mockResolvedValue({ status: 200, data: { url: "https://img/x.png" } });
    const { wrapper } = mountCard({
      props: { article: baseArticle({ cover_id: 9 }) },
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(getMediaById).toHaveBeenCalledWith(9, null);
    expect(wrapper.vm.imageUrl).toBe("https://img/x.png");
  });

  it("fetchMedia falls back to URL.createObjectURL when response.data has no url", async () => {
    const blob = { not: "a url object" };
    const createSpy = vi.fn().mockReturnValue("blob:created");
    const original = URL.createObjectURL;
    URL.createObjectURL = createSpy;
    getMediaById.mockResolvedValue({ status: 200, data: blob });

    const { wrapper } = mountCard({
      props: { article: baseArticle({ cover_id: 9 }) },
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(createSpy).toHaveBeenCalledWith(blob);
    expect(wrapper.vm.imageUrl).toBe("blob:created");
    URL.createObjectURL = original;
  });

  it("fetchMedia does not set imageUrl when status is not 200 (data && status falsy branch)", async () => {
    getMediaById.mockResolvedValue({ status: 500, data: { url: "ignored" } });
    const { wrapper } = mountCard({
      props: { article: baseArticle({ cover_id: 9 }) },
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(wrapper.vm.imageUrl).toBe(null);
    expect(wrapper.vm.isLoadingImage).toBe(false);
  });

  it("fetchMedia logs and recovers when getMediaById rejects (catch branch)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const rejection = new Error("media boom");
    getMediaById.mockRejectedValue(rejection);

    const { wrapper } = mountCard({
      props: { article: baseArticle({ cover_id: 9 }) },
    });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(errorSpy).toHaveBeenCalledWith("Error fetching media:", rejection);
    expect(wrapper.vm.imageUrl).toBe(null);
    expect(wrapper.vm.isLoadingImage).toBe(false);
    errorSpy.mockRestore();
  });

  it("fetchMedia uses article.cover.file when no cover_id (else-if branch)", async () => {
    const { wrapper } = mountCard({
      props: { article: baseArticle({ cover: { file: "cover-file-url" } }) },
    });
    await Promise.resolve();
    expect(getMediaById).not.toHaveBeenCalled();
    expect(wrapper.vm.imageUrl).toBe("cover-file-url");
  });

  it("fetchMedia no-ops when there is no cover_id and no cover.file", async () => {
    const { wrapper } = mountCard({ props: { article: baseArticle() } });
    await Promise.resolve();
    expect(getMediaById).not.toHaveBeenCalled();
    expect(wrapper.vm.imageUrl).toBe(null);
  });

  // ---------- watcher re-runs fetchMedia when article changes ----------
  it("re-runs fetchMedia when the article prop changes (watcher)", async () => {
    const { wrapper } = mountCard({ props: { article: baseArticle() } });
    await Promise.resolve();
    expect(getMediaById).not.toHaveBeenCalled();

    await wrapper.setProps({ article: baseArticle({ cover_id: 77 }) });
    await Promise.resolve();
    await Promise.resolve();
    expect(getMediaById).toHaveBeenCalledWith(77, null);
  });

  // ---------- publishedIso precedence branches ----------
  it("publishedIso prefers publishedAt, then scheduledFor, then created_at, then null", async () => {
    const a = mountCard({
      props: {
        article: baseArticle({
          publishedAt: "P",
          scheduledFor: "S",
          created_at: "C",
        }),
      },
    });
    await Promise.resolve();
    expect(a.wrapper.vm.publishedIso).toBe("P");

    const b = mountCard({
      props: { article: baseArticle({ scheduledFor: "S", created_at: "C" }) },
    });
    await Promise.resolve();
    expect(b.wrapper.vm.publishedIso).toBe("S");

    const c = mountCard({
      props: { article: baseArticle({ created_at: "C" }) },
    });
    await Promise.resolve();
    expect(c.wrapper.vm.publishedIso).toBe("C");

    const d = mountCard({ props: { article: baseArticle() } });
    await Promise.resolve();
    expect(d.wrapper.vm.publishedIso).toBe(null);
  });

  // ---------- authorText branches ----------
  it("authorText: null when absent, string passthrough, object .name, object .fullName, object null", async () => {
    const none = mountCard({ props: { article: baseArticle() } });
    await Promise.resolve();
    expect(none.wrapper.vm.authorText).toBe(null);

    const str = mountCard({ props: { article: baseArticle({ author: "Alice" }) } });
    await Promise.resolve();
    expect(str.wrapper.vm.authorText).toBe("Alice");

    const named = mountCard({
      props: { article: baseArticle({ author: { name: "Nina" } }) },
    });
    await Promise.resolve();
    expect(named.wrapper.vm.authorText).toBe("Nina");

    const full = mountCard({
      props: { article: baseArticle({ author: { fullName: "Full Name" } }) },
    });
    await Promise.resolve();
    expect(full.wrapper.vm.authorText).toBe("Full Name");

    const empty = mountCard({
      props: { article: baseArticle({ author: {} }) },
    });
    await Promise.resolve();
    expect(empty.wrapper.vm.authorText).toBe(null);
  });

  // ---------- publisherText branches ----------
  it("publisherText: null when absent, string passthrough, object .name, object .title, object null", async () => {
    const none = mountCard({ props: { article: baseArticle() } });
    await Promise.resolve();
    expect(none.wrapper.vm.publisherText).toBe(null);

    const str = mountCard({
      props: { article: baseArticle({ publisher: "Press" }) },
    });
    await Promise.resolve();
    expect(str.wrapper.vm.publisherText).toBe("Press");

    const named = mountCard({
      props: { article: baseArticle({ publisher: { name: "PubName" } }) },
    });
    await Promise.resolve();
    expect(named.wrapper.vm.publisherText).toBe("PubName");

    const titled = mountCard({
      props: { article: baseArticle({ publisher: { title: "PubTitle" } }) },
    });
    await Promise.resolve();
    expect(titled.wrapper.vm.publisherText).toBe("PubTitle");

    const empty = mountCard({
      props: { article: baseArticle({ publisher: {} }) },
    });
    await Promise.resolve();
    expect(empty.wrapper.vm.publisherText).toBe(null);
  });
});
