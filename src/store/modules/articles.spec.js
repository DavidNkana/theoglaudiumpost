import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the only external boundary the module imports.
vi.mock("@/features/articles/ArticlesService", () => ({
  getArticleBySlug: vi.fn(),
  getArticles: vi.fn(),
}));

import { getArticleBySlug, getArticles } from "@/features/articles/ArticlesService";
import articlesModule from "@/store/modules/articles.js";

const { state: stateFactory, getters, mutations, actions } = articlesModule;

// Helper to build a fresh state object for each test.
const freshState = () => stateFactory();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("articles vuex module - shape", () => {
  it("is namespaced and exposes state/getters/mutations/actions", () => {
    expect(articlesModule.namespaced).toBe(true);
    expect(typeof articlesModule.state).toBe("function");
    expect(articlesModule.getters).toBe(getters);
    expect(articlesModule.mutations).toBe(mutations);
    expect(articlesModule.actions).toBe(actions);
  });

  it("state factory returns the default shape", () => {
    const s = freshState();
    expect(s.latest).toEqual({
      articlesByPage: {},
      articles: [],
      hasMore: true,
      total: 0,
      totalPages: 0,
      page: 0,
      size: 8,
    });
    expect(s.featured).toEqual([]);
    expect(s.topStories).toEqual([]);
    expect(s.popular).toEqual([]);
    expect(s.error).toBeNull();
    // Distinct object per call.
    expect(freshState()).not.toBe(s);
  });
});

describe("getters", () => {
  it("featuredArticles / topStories / popularArticles return the raw collections", () => {
    const s = freshState();
    s.featured = [{ id: 1 }];
    s.topStories = [{ id: 2 }];
    s.popular = [{ id: 3 }];
    expect(getters.featuredArticles(s)).toBe(s.featured);
    expect(getters.topStories(s)).toBe(s.topStories);
    expect(getters.popularArticles(s)).toBe(s.popular);
  });

  it("latestArticles flattens all pages", () => {
    const s = freshState();
    s.latest.articlesByPage = {
      0: [{ id: 1 }, { id: 2 }],
      1: [{ id: 3 }],
    };
    expect(getters.latestArticles(s)).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it("uniqueArticles dedupes by id across all sources (seen and not-seen branches)", () => {
    const s = freshState();
    s.latest.articlesByPage = { 0: [{ id: 1 }] };
    s.featured = [{ id: 1 }, { id: 2 }]; // id 1 is a duplicate (seen branch)
    s.topStories = [{ id: 3 }];
    s.popular = [{ id: 2 }]; // duplicate of featured id 2
    const fakeGetters = { latestArticles: getters.latestArticles(s) };
    const result = getters.uniqueArticles(s, fakeGetters);
    expect(result.map((a) => a.id)).toEqual([1, 2, 3]);
  });

  it("relatedArticles filters by category, excludes self, and caps at 6", () => {
    const s = freshState();
    const articles = [];
    // 8 in matching category to verify slice(0,6), plus the self article and one off-category.
    for (let i = 0; i < 8; i++) {
      articles.push({ id: 100 + i, category_id: "cat", slug: `s${i}` });
    }
    articles.push({ id: 7, category_id: "cat", slug: "self" }); // self - excluded
    articles.push({ id: 200, category_id: "other", slug: "off" }); // wrong category
    const fakeGetters = { uniqueArticles: articles };
    const related = getters.relatedArticles(s, fakeGetters)({
      id: 7,
      categoryId: "cat",
    });
    expect(related).toHaveLength(6);
    expect(related.every((a) => a.category_id === "cat" && a.id !== 7)).toBe(true);
  });

  it("relatedArticles returns empty array when nothing matches", () => {
    const s = freshState();
    const fakeGetters = { uniqueArticles: [{ id: 1, category_id: "x" }] };
    const related = getters.relatedArticles(s, fakeGetters)({
      id: 9,
      categoryId: "nomatch",
    });
    expect(related).toEqual([]);
  });

  it("relatedArticles falls back to [] when filter yields a nullish value (?.slice short-circuit + ?? [])", () => {
    const s = freshState();
    // uniqueArticles.filter(...) resolves to null, so `null?.slice(...)` is
    // undefined and the `?? []` fallback branch is taken.
    const fakeGetters = { uniqueArticles: { filter: () => null } };
    const related = getters.relatedArticles(s, fakeGetters)({
      id: 1,
      categoryId: "cat",
    });
    expect(related).toEqual([]);
  });

  it("latestArticlesByPage returns articles for an existing page", () => {
    const s = freshState();
    s.latest.totalPages = 5;
    s.latest.articlesByPage = { 2: [{ id: 1 }] };
    expect(getters.latestArticlesByPage(s)(2)).toEqual({
      pages: 5,
      articles: [{ id: 1 }],
    });
  });

  it("latestArticlesByPage falls back to [] for a missing page", () => {
    const s = freshState();
    s.latest.totalPages = 3;
    expect(getters.latestArticlesByPage(s)(99)).toEqual({
      pages: 3,
      articles: [],
    });
  });

  it("getArticleBySlugFromStore finds an article with non-empty string content", () => {
    const s = freshState();
    const match = { id: 1, slug: "good", content: "  hello  " };
    const fakeGetters = { uniqueArticles: [match] };
    expect(getters.getArticleBySlugFromStore(s, fakeGetters)("good")).toBe(match);
  });

  it("getArticleBySlugFromStore rejects matching slug with non-string content", () => {
    const s = freshState();
    const fakeGetters = {
      uniqueArticles: [{ id: 1, slug: "good", content: 123 }],
    };
    expect(getters.getArticleBySlugFromStore(s, fakeGetters)("good")).toBeNull();
  });

  it("getArticleBySlugFromStore rejects matching slug with whitespace-only content", () => {
    const s = freshState();
    const fakeGetters = {
      uniqueArticles: [{ id: 1, slug: "good", content: "   " }],
    };
    expect(getters.getArticleBySlugFromStore(s, fakeGetters)("good")).toBeNull();
  });

  it("getArticleBySlugFromStore returns null when slug not found", () => {
    const s = freshState();
    const fakeGetters = {
      uniqueArticles: [{ id: 1, slug: "other", content: "x" }],
    };
    expect(getters.getArticleBySlugFromStore(s, fakeGetters)("missing")).toBeNull();
  });

  it("idsToExclude concatenates topStories and popular ids", () => {
    const s = freshState();
    s.topStories = [{ id: 1 }, { id: 2 }];
    s.popular = [{ id: 3 }];
    expect(getters.idsToExclude(s)).toEqual([1, 2, 3]);
  });

  it("hasMore returns the latest.hasMore flag", () => {
    const s = freshState();
    s.latest.hasMore = false;
    expect(getters.hasMore(s)).toBe(false);
  });
});

describe("mutations", () => {
  describe("setArticlesByType", () => {
    it("sets a known type", () => {
      const s = freshState();
      mutations.setArticlesByType(s, { type: "featured", articles: [{ id: 1 }] });
      expect(s.featured).toEqual([{ id: 1 }]);
    });

    it("ignores an unknown type", () => {
      const s = freshState();
      const before = s.featured;
      mutations.setArticlesByType(s, { type: "nope", articles: [{ id: 1 }] });
      expect(s.featured).toBe(before);
      expect(s.nope).toBeUndefined();
    });
  });

  it("setError sets the error message", () => {
    const s = freshState();
    mutations.setError(s, "boom");
    expect(s.error).toBe("boom");
  });

  describe("addArticleByType", () => {
    it("adds to a mapped collection (top -> topStories) when not present", () => {
      const s = freshState();
      mutations.addArticleByType(s, {
        type: "top",
        article: { slug: "a", id: 1 },
      });
      expect(s.topStories).toEqual([{ slug: "a", id: 1 }]);
    });

    it("does not duplicate in a mapped collection when slug already exists", () => {
      const s = freshState();
      s.popular = [{ slug: "dup", id: 1 }];
      mutations.addArticleByType(s, {
        type: "popular",
        article: { slug: "dup", id: 2 },
      });
      expect(s.popular).toEqual([{ slug: "dup", id: 1 }]);
    });

    it("maps unknown type to latest and appends to current page when page array exists", () => {
      const s = freshState();
      s.latest.page = 0;
      s.latest.articlesByPage = { 0: [] };
      mutations.addArticleByType(s, {
        type: "weird-unknown",
        article: { slug: "x", id: 1 },
      });
      expect(s.latest.articlesByPage[0]).toEqual([{ slug: "x", id: 1 }]);
    });

    it("latest path does not duplicate when slug already on the page", () => {
      const s = freshState();
      s.latest.page = 0;
      s.latest.articlesByPage = { 0: [{ slug: "x", id: 1 }] };
      mutations.addArticleByType(s, {
        type: "latest",
        article: { slug: "x", id: 2 },
      });
      expect(s.latest.articlesByPage[0]).toEqual([{ slug: "x", id: 1 }]);
    });

    it("latest path is a no-op via optional chaining when current page array is missing", () => {
      const s = freshState();
      s.latest.page = 5; // no articlesByPage[5]
      mutations.addArticleByType(s, {
        type: "latest",
        article: { slug: "x", id: 1 },
      });
      expect(s.latest.articlesByPage[5]).toBeUndefined();
    });

    it("latest path uses page ?? 0 fallback when state.latest.page is nullish", () => {
      const s = freshState();
      s.latest.page = null; // forces the ?? 0 right-hand branch
      s.latest.articlesByPage = { 0: [] };
      mutations.addArticleByType(s, {
        type: "latest",
        article: { slug: "y", id: 1 },
      });
      expect(s.latest.articlesByPage[0]).toEqual([{ slug: "y", id: 1 }]);
    });
  });

  describe("updateArticle", () => {
    it("returns early when updatedData is missing", () => {
      const s = freshState();
      expect(() => mutations.updateArticle(s, undefined)).not.toThrow();
    });

    it("returns early when updatedData has no id", () => {
      const s = freshState();
      expect(() => mutations.updateArticle(s, { type: "featured" })).not.toThrow();
    });

    it("updates a latest article in the current page when found", () => {
      const s = freshState();
      s.latest.page = 1;
      s.latest.articlesByPage = { 1: [{ id: 10, title: "old" }] };
      mutations.updateArticle(s, { id: 10, type: "latest", title: "new" });
      expect(s.latest.articlesByPage[1][0]).toEqual({
        id: 10,
        type: "latest",
        title: "new",
      });
    });

    it("does not change latest when article id not found", () => {
      const s = freshState();
      s.latest.page = 1;
      s.latest.articlesByPage = { 1: [{ id: 10, title: "old" }] };
      mutations.updateArticle(s, { id: 999, type: "latest", title: "new" });
      expect(s.latest.articlesByPage[1][0]).toEqual({ id: 10, title: "old" });
    });

    it("updates a featured article when found", () => {
      const s = freshState();
      s.featured = [{ id: 1, title: "old" }];
      mutations.updateArticle(s, { id: 1, type: "featured", title: "new" });
      expect(s.featured[0]).toEqual({ id: 1, type: "featured", title: "new" });
    });

    it("does not change featured when not found", () => {
      const s = freshState();
      s.featured = [{ id: 1, title: "old" }];
      mutations.updateArticle(s, { id: 2, type: "featured", title: "new" });
      expect(s.featured[0]).toEqual({ id: 1, title: "old" });
    });

    it("updates a top article when found", () => {
      const s = freshState();
      s.topStories = [{ id: 1, title: "old" }];
      mutations.updateArticle(s, { id: 1, type: "top", title: "new" });
      expect(s.topStories[0]).toEqual({ id: 1, type: "top", title: "new" });
    });

    it("does not change topStories when not found", () => {
      const s = freshState();
      s.topStories = [{ id: 1, title: "old" }];
      mutations.updateArticle(s, { id: 2, type: "top", title: "new" });
      expect(s.topStories[0]).toEqual({ id: 1, title: "old" });
    });

    it("updates a popular article when found", () => {
      const s = freshState();
      s.popular = [{ id: 1, title: "old" }];
      mutations.updateArticle(s, { id: 1, type: "popular", title: "new" });
      expect(s.popular[0]).toEqual({ id: 1, type: "popular", title: "new" });
    });

    it("does not change popular when not found", () => {
      const s = freshState();
      s.popular = [{ id: 1, title: "old" }];
      mutations.updateArticle(s, { id: 2, type: "popular", title: "new" });
      expect(s.popular[0]).toEqual({ id: 1, title: "old" });
    });

    it("does nothing for an unrecognized type", () => {
      const s = freshState();
      s.featured = [{ id: 1, title: "old" }];
      mutations.updateArticle(s, { id: 1, type: "unknown", title: "new" });
      expect(s.featured[0]).toEqual({ id: 1, title: "old" });
    });
  });

  it("setLatestArticles stores page data and pagination info", () => {
    const s = freshState();
    mutations.setLatestArticles(s, {
      page: 2,
      articles: [{ id: 1 }],
      total: 50,
      totalPages: 7,
      hasMore: true,
    });
    expect(s.latest.articlesByPage[2]).toEqual([{ id: 1 }]);
    expect(s.latest.page).toBe(2);
    expect(s.latest.total).toBe(50);
    expect(s.latest.totalPages).toBe(7);
    expect(s.latest.hasMore).toBe(true);
  });
});

describe("actions.fetchArticlesByType", () => {
  it("returns early (no API call) when type maps to a null apiType", async () => {
    const s = freshState();
    const commit = vi.fn();
    await actions.fetchArticlesByType(
      { commit, state: s, getters: {} },
      { type: "doesNotExist" }
    );
    expect(getArticles).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("skips API call for latest when the requested page is already loaded", async () => {
    const s = freshState();
    s.latest.articlesByPage = { 0: [{ id: 1 }] };
    const commit = vi.fn();
    await actions.fetchArticlesByType(
      { commit, state: s, getters: {} },
      { type: "latest" }
    );
    expect(getArticles).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("skips API call for a non-latest type that is already populated", async () => {
    const s = freshState();
    s.featured = [{ id: 1 }];
    const commit = vi.fn();
    await actions.fetchArticlesByType(
      { commit, state: s, getters: {} },
      { type: "featured" }
    );
    expect(getArticles).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it("fetches latest articles and commits setLatestArticles with hasMore=true (page < totalPages)", async () => {
    const s = freshState();
    const commit = vi.fn();
    getArticles.mockResolvedValue({
      status: 200,
      data: { articles: [{ id: 1 }], total: 30, totalPages: 5 },
    });
    await actions.fetchArticlesByType(
      { commit, state: s, getters: {} },
      { type: "latest", size: 8, page: 0 }
    );
    expect(getArticles).toHaveBeenCalledWith({
      type: "",
      size: 8,
      page: 0,
      status: "published",
    });
    expect(commit).toHaveBeenCalledWith("setLatestArticles", {
      page: 0,
      articles: [{ id: 1 }],
      total: 30,
      totalPages: 5,
      hasMore: true,
    });
  });

  it("fetches latest articles and commits hasMore=false when page is the last page", async () => {
    const s = freshState();
    const commit = vi.fn();
    getArticles.mockResolvedValue({
      status: 200,
      data: { articles: [{ id: 9 }], total: 30, totalPages: 5 },
    });
    await actions.fetchArticlesByType(
      { commit, state: s, getters: {} },
      { type: "latest", page: 5 }
    );
    // default size = 10 applied here
    expect(getArticles).toHaveBeenCalledWith({
      type: "",
      size: 10,
      page: 5,
      status: "published",
    });
    expect(commit).toHaveBeenCalledWith(
      "setLatestArticles",
      expect.objectContaining({ hasMore: false })
    );
  });

  it("fetches a non-latest type and commits setArticlesByType", async () => {
    const s = freshState();
    const commit = vi.fn();
    getArticles.mockResolvedValue({
      status: 200,
      data: { articles: [{ id: 1 }], total: 1, totalPages: 1 },
    });
    await actions.fetchArticlesByType(
      { commit, state: s, getters: {} },
      { type: "topStories", size: 4, page: 0 }
    );
    expect(getArticles).toHaveBeenCalledWith({
      type: "top",
      size: 4,
      page: 0,
      status: "published",
    });
    expect(commit).toHaveBeenCalledWith("setArticlesByType", {
      type: "topStories",
      articles: [{ id: 1 }],
    });
  });

  it("commits the error and rethrows when the API responds with a non-200 status", async () => {
    const s = freshState();
    const commit = vi.fn();
    getArticles.mockResolvedValue({ status: 500, data: {} });
    await expect(
      actions.fetchArticlesByType(
        { commit, state: s, getters: {} },
        { type: "popular" }
      )
    ).rejects.toThrow("Failed to fetch popular articles");
    expect(commit).toHaveBeenCalledWith(
      "setError",
      "Failed to fetch popular articles"
    );
  });

  it("commits the error and rethrows when getArticles rejects", async () => {
    const s = freshState();
    const commit = vi.fn();
    getArticles.mockRejectedValue(new Error("network down"));
    await expect(
      actions.fetchArticlesByType(
        { commit, state: s, getters: {} },
        { type: "featured" }
      )
    ).rejects.toThrow("network down");
    expect(commit).toHaveBeenCalledWith("setError", "network down");
  });
});

describe("actions.fetchSingleArticle", () => {
  it("fetches, maps optional fields, commits with mapped article_type, and returns the article", async () => {
    const commit = vi.fn();
    getArticleBySlug.mockResolvedValue({
      status: 200,
      data: {
        id: 1,
        slug: "s",
        article_type: "featured",
        cover: { file: "img.png" },
        scheduled_for: "2030-01-01",
        category: { id: 42 },
      },
    });
    const result = await actions.fetchSingleArticle({ commit, getters: {} }, "s");
    expect(result).toMatchObject({
      id: 1,
      coverImage: "img.png",
      scheduledFor: "2030-01-01",
      categoryId: 42,
    });
    expect(commit).toHaveBeenCalledWith("addArticleByType", {
      type: "featured",
      article: result,
    });
  });

  it("defaults type to latest and tolerates missing cover/category (optional chaining)", async () => {
    const commit = vi.fn();
    getArticleBySlug.mockResolvedValue({
      status: 200,
      data: {
        id: 2,
        slug: "s2",
        // no article_type -> ?? "latest"
        // no cover -> coverImage undefined
        // no category -> categoryId undefined
        scheduled_for: undefined,
      },
    });
    const result = await actions.fetchSingleArticle({ commit, getters: {} }, "s2");
    expect(result.coverImage).toBeUndefined();
    expect(result.categoryId).toBeUndefined();
    expect(commit).toHaveBeenCalledWith("addArticleByType", {
      type: "latest",
      article: result,
    });
  });

  it("throws 'Article not found' and commits error when status is not 200", async () => {
    const commit = vi.fn();
    getArticleBySlug.mockResolvedValue({ status: 404, data: { id: 1 } });
    await expect(
      actions.fetchSingleArticle({ commit, getters: {} }, "missing")
    ).rejects.toThrow("Article not found");
    expect(commit).toHaveBeenCalledWith("setError", "Article not found");
  });

  it("throws 'Article not found' and commits error when data is falsy", async () => {
    const commit = vi.fn();
    getArticleBySlug.mockResolvedValue({ status: 200, data: null });
    await expect(
      actions.fetchSingleArticle({ commit, getters: {} }, "empty")
    ).rejects.toThrow("Article not found");
    expect(commit).toHaveBeenCalledWith("setError", "Article not found");
  });

  it("commits error and rethrows when getArticleBySlug rejects", async () => {
    const commit = vi.fn();
    getArticleBySlug.mockRejectedValue(new Error("boom"));
    await expect(
      actions.fetchSingleArticle({ commit, getters: {} }, "x")
    ).rejects.toThrow("boom");
    expect(commit).toHaveBeenCalledWith("setError", "boom");
  });
});
