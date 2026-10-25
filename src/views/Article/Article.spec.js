import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises, RouterLinkStub } from "@vue/test-utils";
import { nextTick, reactive } from "vue";

// --- Mock vue-router ----------------------------------------------------------
// Reactive so the component's watch(() => route.params.slug) fires on mutation.
const routeParams = reactive({ slug: "hello-world" });
vi.mock("vue-router", () => ({
  useRoute: () => ({ params: routeParams }),
}));

// --- Mock vuex ----------------------------------------------------------------
const dispatch = vi.fn();
const relatedArticlesGetter = vi.fn();
vi.mock("vuex", () => ({
  useStore: () => ({
    dispatch: (...a) => dispatch(...a),
    getters: {
      "articles/relatedArticles": (...a) => relatedArticlesGetter(...a),
    },
  }),
}));

// --- Mock @/utils -------------------------------------------------------------
const formatDate = vi.fn(() => "FORMATTED_DATE");
vi.mock("@/utils", () => ({
  formatDate: (...a) => formatDate(...a),
  IN_ARTICLE_TOP: "in_article_top",
  IN_ARTICLE_BOTTOM: "in_article_bottom",
  IN_ARTICLE_MID: "in_article_mid",
  SIDEBAR_TOP: "sidebar_top",
  SIDEBAR_MID: "sidebar_mid",
  SIDEBAR_BOTTOM: "sidebar_bottom",
}));

// --- Stub heavy child components (external boundaries) ------------------------
vi.mock("@/components/AdBanner.vue", () => ({
  default: {
    name: "AdBanner",
    props: ["size", "placement", "tags"],
    template:
      '<div class="ad-banner-stub" :data-placement="placement"></div>',
  },
}));

vi.mock("./Partials/RelatedArticles.vue", () => ({
  default: {
    name: "RelatedArticles",
    props: ["articles"],
    template: '<div class="related-articles-stub"></div>',
  },
}));

vi.mock("../News/Partials/HomeTopStories.vue", () => ({
  default: {
    name: "TopStories",
    template: '<div class="top-stories-stub"></div>',
  },
}));

vi.mock("../Admin/Articles/Partials/Tags.vue", () => ({
  default: { name: "AdminTags", template: "<div></div>" },
}));

vi.mock("../News/Partials/LatestNews.vue", () => ({
  default: {
    name: "LatestNews",
    props: ["page"],
    template: '<div class="latest-news-stub"></div>',
  },
}));

import Article from "./Article.vue";

const mountView = () =>
  mount(Article, {
    global: {
      stubs: { RouterLink: RouterLinkStub },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  routeParams.slug = "hello-world";
  relatedArticlesGetter.mockReturnValue([]);
  formatDate.mockReturnValue("FORMATTED_DATE");
});

describe("Article.vue", () => {
  it("renders the loading skeleton when no article is loaded (slug missing path)", async () => {
    routeParams.slug = undefined;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const wrapper = mountView();
    await flushPromises();

    // !slug branch: dispatch never called, warn emitted
    expect(dispatch).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith("fetchArticle called without a slug");

    // v-else loading skeleton rendered (5 skeleton paragraphs)
    expect(wrapper.find(".loading-skeleton").exists()).toBe(true);
    expect(wrapper.findAll(".skeleton-paragraph")).toHaveLength(5);
    expect(wrapper.find(".page-container .content-layout").exists()).toBe(false);

    warnSpy.mockRestore();
  });

  it("renders the error/loading state when the fetch rejects (catch branch)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    dispatch.mockRejectedValueOnce(new Error("boom"));

    const wrapper = mountView();
    await flushPromises();

    expect(dispatch).toHaveBeenCalledWith(
      "articles/fetchSingleArticle",
      "hello-world"
    );
    expect(errSpy).toHaveBeenCalledWith(
      "Error fetching article data:",
      expect.any(Error)
    );
    // article stays null -> loading skeleton shown
    expect(wrapper.find(".loading-skeleton").exists()).toBe(true);

    errSpy.mockRestore();
  });

  it("renders the full success state: cover, audio, paragraphs, summary, ads, sources, tags", async () => {
    const article = {
      id: 7,
      category_id: 3,
      title: "My Title",
      cover: { file: "cover.jpg" },
      audio: { file: "audio.mp3" },
      // 3 paragraphs -> summary inserted after #2, ad inserted after #3
      content: "<p>Para one</p><p>Para two</p><p>Para three</p>",
      summary: "The summary highlight",
      sources: ["https://a.example", "https://b.example"],
      tags: [
        { id: 11, slug: "news", name: "News" },
        { id: 12, slug: "sport", name: "Sport" },
      ],
      scheduled_for: "2026-01-01T10:00:00Z",
      created_at: "2025-12-01T10:00:00Z",
    };
    dispatch.mockResolvedValueOnce(article);
    relatedArticlesGetter.mockReturnValue([{ id: 99 }]);

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // Success container shown, skeleton hidden
    expect(wrapper.find(".content-layout").exists()).toBe(true);
    expect(wrapper.find(".loading-skeleton").exists()).toBe(false);

    // Featured image branch
    const img = wrapper.find(".featured-img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("cover.jpg");
    expect(img.attributes("alt")).toBe("My Title");

    // Audio branch
    const audio = wrapper.find("audio.audio-player");
    expect(audio.exists()).toBe(true);
    expect(audio.attributes("src")).toBe("audio.mp3");

    // Summary highlight block rendered after 2nd paragraph
    const summary = wrapper.find(".summary-text");
    expect(summary.exists()).toBe(true);
    expect(summary.text()).toBe("The summary highlight");

    // Regular content blocks (paragraphs) rendered
    const body = wrapper.find(".article-body");
    expect(body.html()).toContain("Para one");
    expect(body.html()).toContain("Para three");

    // In-article mid ad inserted after 3rd paragraph
    const midAds = wrapper
      .findAll(".ad-banner-stub")
      .filter((a) => a.attributes("data-placement") === "in_article_mid");
    expect(midAds.length).toBe(1);

    // Sources branch
    const sourceLinks = wrapper.findAll(".source-link");
    expect(sourceLinks).toHaveLength(2);
    expect(sourceLinks[0].attributes("href")).toBe("https://a.example");

    // Tags via RouterLink
    const tagLinks = wrapper.findAllComponents(RouterLinkStub);
    const tagTargets = tagLinks.map((l) => l.props("to"));
    expect(tagTargets).toEqual(["/tag/news", "/tag/sport"]);
    expect(tagLinks[0].text()).toBe("News");

    // Date: scheduled_for present -> formatDate called with scheduled_for
    expect(formatDate).toHaveBeenCalledWith("2026-01-01T10:00:00Z");
    expect(wrapper.text()).toContain("Published FORMATTED_DATE");

    // relatedArticles getter called with article id/category, related section shown
    expect(relatedArticlesGetter).toHaveBeenCalledWith({
      id: 7,
      categoryId: 3,
    });
    expect(wrapper.find(".related-section .related-articles-stub").exists()).toBe(
      true
    );

    // Sidebar children rendered
    expect(wrapper.find(".latest-news-stub").exists()).toBe(true);
    expect(wrapper.find(".top-stories-stub").exists()).toBe(true);
  });

  it("covers the else-branches: no cover, no audio, no sources, raw content, created_at date, no related", async () => {
    const article = {
      id: 1,
      category_id: null,
      title: "No Extras",
      cover: null,
      audio: null,
      // no <p> tags -> raw content branch (paragraphs.length === 0)
      content: "Just raw text with no paragraph tags",
      summary: "",
      sources: [],
      tags: [],
      scheduled_for: null,
      created_at: "2025-06-01T10:00:00Z",
    };
    dispatch.mockResolvedValueOnce(article);
    relatedArticlesGetter.mockReturnValue([]);

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    expect(wrapper.find(".content-layout").exists()).toBe(true);

    // No cover figure
    expect(wrapper.find(".featured-image").exists()).toBe(false);
    // No audio player
    expect(wrapper.find(".audio-player-section").exists()).toBe(false);
    // Raw content branch: single div with full raw text, no summary, no mid ad
    expect(wrapper.find(".article-body").html()).toContain(
      "Just raw text with no paragraph tags"
    );
    expect(wrapper.find(".summary-text").exists()).toBe(false);
    const midAds = wrapper
      .findAll(".ad-banner-stub")
      .filter((a) => a.attributes("data-placement") === "in_article_mid");
    expect(midAds.length).toBe(0);

    // No sources section (empty array)
    expect(wrapper.find(".article-sources").exists()).toBe(false);
    // No tags
    expect(wrapper.findAllComponents(RouterLinkStub)).toHaveLength(0);

    // Date falls back to created_at (scheduled_for null)
    expect(formatDate).toHaveBeenCalledWith("2025-06-01T10:00:00Z");

    // relatedArticles called with null id/category, related section hidden
    expect(relatedArticlesGetter).toHaveBeenCalledWith({
      id: 1,
      categoryId: null,
    });
    expect(wrapper.find(".related-section").exists()).toBe(false);
  });

  it("covers content with paragraphs but no summary (summary insert skipped)", async () => {
    const article = {
      id: 2,
      category_id: 9,
      title: "T",
      cover: { file: "c.jpg" },
      content: "<p>One</p><p>Two</p>",
      summary: "", // falsy -> summary insert skipped even at paragraph 2
      sources: ["only-one-source"],
      tags: [{ id: 5, slug: "x", name: "X" }],
      created_at: "2025-01-01T00:00:00Z",
    };
    dispatch.mockResolvedValueOnce(article);

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    // 2 paragraphs, no summary highlight, no mid ad (adCount never reaches 3)
    expect(wrapper.find(".summary-text").exists()).toBe(false);
    const midAds = wrapper
      .findAll(".ad-banner-stub")
      .filter((a) => a.attributes("data-placement") === "in_article_mid");
    expect(midAds.length).toBe(0);
    // Single source still renders the sources section (length > 0)
    expect(wrapper.find(".article-sources").exists()).toBe(true);
    expect(wrapper.findAll(".source-link")).toHaveLength(1);
  });

  it("handles an article with no content/summary fields (nullish-coalescing fallbacks)", async () => {
    // content and summary are undefined -> the `?? ""` fallback branches fire.
    const article = {
      id: 4,
      category_id: 8,
      title: "Empty Body",
      cover: { file: "c.jpg" },
      // no `content`, no `summary` keys at all
      sources: [],
      tags: [],
      created_at: "2025-03-01T00:00:00Z",
    };
    dispatch.mockResolvedValueOnce(article);

    const wrapper = mountView();
    await flushPromises();
    await nextTick();

    expect(wrapper.find(".content-layout").exists()).toBe(true);
    // Raw-content branch with empty string -> body has no paragraph text/summary
    expect(wrapper.find(".summary-text").exists()).toBe(false);
    const body = wrapper.find(".article-body");
    expect(body.exists()).toBe(true);
    expect(body.text().trim()).toBe("");
  });

  it("re-fetches when the route slug changes (watcher branch)", async () => {
    const first = {
      id: 1,
      category_id: 1,
      title: "First",
      content: "<p>First</p>",
      summary: "",
      sources: [],
      tags: [],
      created_at: "2025-01-01T00:00:00Z",
    };
    const second = {
      id: 2,
      category_id: 2,
      title: "Second",
      content: "<p>Second</p>",
      summary: "",
      sources: [],
      tags: [],
      created_at: "2025-02-01T00:00:00Z",
    };
    // Resolve based on the requested slug so re-triggered fetches stay correct.
    dispatch.mockImplementation((_action, slug) =>
      Promise.resolve(slug === "second-article" ? second : first)
    );

    const wrapper = mountView();
    await flushPromises();
    await nextTick();
    expect(wrapper.find(".article-body").html()).toContain("First");

    // Change route slug -> watcher triggers fetchArticle again
    routeParams.slug = "second-article";
    await flushPromises();
    await nextTick();
    await flushPromises();
    await nextTick();

    expect(dispatch).toHaveBeenLastCalledWith(
      "articles/fetchSingleArticle",
      "second-article"
    );
    expect(wrapper.find(".article-body").html()).toContain("Second");
  });
});
