import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("axios", () => ({
  default: { get: vi.fn() },
}));

vi.mock("@/utils/index.js", () => ({
  parseArticleResponse: vi.fn(),
  stripCodeBlockMarkers: vi.fn(),
}));

import api from "@/services/api";
import axios from "axios";
import { parseArticleResponse, stripCodeBlockMarkers } from "@/utils/index.js";
import {
  getArticles,
  getArticleFeed,
  getStats,
  getArticle,
  getArticleBySlug,
  createArticle,
  editArticle,
  removeArticle,
  publishScheduled,
  getPrompts,
  getPrompt,
  updatePrompt,
  generateArticle,
  generateArticleAsync,
  generateArticleThumbnail,
  getSourceArticlesFromAllTasks,
  generateArticleWithGemini,
  getSourceArticlesEndpointForProvider,
  getSourceArticlesByProvider,
  getSourceArticleById,
  getSourceArticlesByIds,
  generateArticleBySourceId,
  refineArticleBySourceId,
  generateArticlesBySourceIds,
  findArticleSources,
  factCheckArticle,
  generateArticleWithMetadata,
  ArticlesService,
  articlesService,
} from "@/features/articles/ArticlesService";
import defaultExport from "@/features/articles/ArticlesService";

describe("ArticlesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: {} });
    api.post.mockResolvedValue({ data: {} });
    api.put.mockResolvedValue({ data: {} });
    api.delete.mockResolvedValue({ data: {} });
  });

  describe("getArticles", () => {
    it("applies all defaults when called with an empty object", () => {
      getArticles({});
      expect(api.post).toHaveBeenCalledWith("/articles", {
        type: "",
        search: "",
        category: "",
        status: "",
        size: 10,
        page: 0,
        startDate: "",
        endDate: "",
        excludeIds: [],
        sort: "",
      });
    });

    it("forwards explicit overrides for every option", () => {
      getArticles({
        type: "featured",
        page: 3,
        size: 25,
        search: "abc",
        category: "cat1",
        status: "published",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        excludeIds: [1, 2],
        sort: "id:desc",
      });
      expect(api.post).toHaveBeenCalledWith("/articles", {
        type: "featured",
        search: "abc",
        category: "cat1",
        status: "published",
        size: 25,
        page: 3,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        excludeIds: [1, 2],
        sort: "id:desc",
      });
    });
  });

  describe("getArticleFeed", () => {
    it("applies defaults when called with an empty object", () => {
      getArticleFeed({});
      expect(api.post).toHaveBeenCalledWith("/articles/feed", {
        type: "",
        status: "published",
        size: 10,
        page: 0,
      });
    });

    it("forwards explicit overrides", () => {
      getArticleFeed({ type: "top", page: 2, size: 5, status: "draft" });
      expect(api.post).toHaveBeenCalledWith("/articles/feed", {
        type: "top",
        status: "draft",
        size: 5,
        page: 2,
      });
    });
  });

  it("getStats() requests stats endpoint", () => {
    getStats();
    expect(api.get).toHaveBeenCalledWith("/articles/stats");
  });

  it("getArticle() requests a single article by id", () => {
    getArticle(42);
    expect(api.get).toHaveBeenCalledWith("/articles/42");
  });

  it("getArticleBySlug() requests an article by slug", () => {
    getArticleBySlug("my-slug");
    expect(api.get).toHaveBeenCalledWith("/articles/slug/my-slug");
  });

  it("createArticle() posts the article data", () => {
    const data = { title: "x" };
    createArticle(data);
    expect(api.post).toHaveBeenCalledWith("/articles/create", data);
  });

  it("editArticle() puts the updated data", () => {
    const data = { title: "y" };
    editArticle(7, data);
    expect(api.put).toHaveBeenCalledWith("/articles/7", data);
  });

  it("removeArticle() deletes by id", () => {
    removeArticle(8);
    expect(api.delete).toHaveBeenCalledWith("/articles/8");
  });

  it("publishScheduled() puts publish-scheduled payload", () => {
    const data = { foo: 1 };
    publishScheduled(data);
    expect(api.put).toHaveBeenCalledWith("/articles/publish-scheduled", data);
  });

  it("getPrompts() requests all prompts", () => {
    getPrompts();
    expect(api.get).toHaveBeenCalledWith("/ai/prompts");
  });

  it("getPrompt() requests a prompt by name", () => {
    getPrompt("welcome");
    expect(api.get).toHaveBeenCalledWith("/ai/prompts/welcome");
  });

  it("updatePrompt() puts a prompt by id", () => {
    const data = { text: "z" };
    updatePrompt(5, data);
    expect(api.put).toHaveBeenCalledWith("/ai/prompts/5", data);
  });

  describe("generateArticle", () => {
    it("returns processed html and summary on success", async () => {
      api.post.mockResolvedValue({ data: { content: "RAW" } });
      parseArticleResponse.mockReturnValue({ html: "<p>hi</p>", summary: "sum" });
      stripCodeBlockMarkers.mockReturnValue("<p>clean</p>");

      const messages = [{ role: "user", content: "hello" }];
      const result = await generateArticle(messages);

      expect(api.post).toHaveBeenCalledWith("gemini/async/generate-article", {
        messages,
        maxTokens: 2000,
        temperature: 0.7,
      });
      expect(parseArticleResponse).toHaveBeenCalledWith("RAW");
      expect(stripCodeBlockMarkers).toHaveBeenCalledWith("<p>hi</p>");
      expect(result).toEqual({ html: "<p>clean</p>", summary: "sum" });
    });

    it("returns null and logs error.response.data when present", async () => {
      const err = { response: { data: "boom" } };
      api.post.mockRejectedValue(err);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await generateArticle([]);

      expect(result).toBeNull();
      expect(spy).toHaveBeenCalledWith("Article generation failed:", "boom");
      spy.mockRestore();
    });

    it("returns null and logs error.message when no response", async () => {
      const err = new Error("network down");
      api.post.mockRejectedValue(err);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await generateArticle([]);

      expect(result).toBeNull();
      expect(spy).toHaveBeenCalledWith("Article generation failed:", "network down");
      spy.mockRestore();
    });
  });

  describe("generateArticleAsync", () => {
    it("posts with the prompt text and returns data (default options)", async () => {
      api.post.mockResolvedValue({ data: { taskId: "t1" } });
      const result = await generateArticleAsync("some text");
      expect(api.post).toHaveBeenCalledWith("gemini/async/generate-article", {
        prompt: "some text",
      });
      expect(result).toEqual({ taskId: "t1" });
    });

    it("works when options arg is supplied explicitly", async () => {
      api.post.mockResolvedValue({ data: { taskId: "t2" } });
      const result = await generateArticleAsync("txt", { maxTokens: 5 });
      expect(result).toEqual({ taskId: "t2" });
    });

    it("rethrows and logs error.response.data when present", async () => {
      const err = { response: { data: "asyncboom" } };
      api.post.mockRejectedValue(err);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(generateArticleAsync("x")).rejects.toBe(err);
      expect(spy).toHaveBeenCalledWith(
        "Async article generation failed:",
        "asyncboom"
      );
      spy.mockRestore();
    });

    it("rethrows and logs error.message when no response", async () => {
      const err = new Error("async fail");
      api.post.mockRejectedValue(err);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(generateArticleAsync("x")).rejects.toBe(err);
      expect(spy).toHaveBeenCalledWith(
        "Async article generation failed:",
        "async fail"
      );
      spy.mockRestore();
    });
  });

  describe("generateArticleThumbnail", () => {
    it("uses 'top' sizing (15% taller)", () => {
      generateArticleThumbnail("p", "top");
      expect(api.post).toHaveBeenCalledWith("/ai/articles/generate-thumbnail", {
        prompt: "p",
        size: "1792x1178",
        provider: "gpt",
      });
    });

    it("uses 'featured' sizing (85% height)", () => {
      generateArticleThumbnail("p", "featured");
      expect(api.post).toHaveBeenCalledWith("/ai/articles/generate-thumbnail", {
        prompt: "p",
        size: "1792x870",
        provider: "gpt",
      });
    });

    it("uses 'popular' sizing (60% height)", () => {
      generateArticleThumbnail("p", "popular");
      expect(api.post).toHaveBeenCalledWith("/ai/articles/generate-thumbnail", {
        prompt: "p",
        size: "1792x614",
        provider: "gpt",
      });
    });

    it("uses default base sizing for unknown type", () => {
      generateArticleThumbnail("p", "unknown");
      expect(api.post).toHaveBeenCalledWith("/ai/articles/generate-thumbnail", {
        prompt: "p",
        size: "1792x1024",
        provider: "gpt",
      });
    });

    it("forwards an explicit provider", () => {
      generateArticleThumbnail("p", "top", "minimax");
      expect(api.post).toHaveBeenCalledWith("/ai/articles/generate-thumbnail", {
        prompt: "p",
        size: "1792x1178",
        provider: "minimax",
      });
    });

    it("falls back to gpt when provider arg is falsy (empty string)", () => {
      generateArticleThumbnail("p", "top", "");
      expect(api.post).toHaveBeenCalledWith("/ai/articles/generate-thumbnail", {
        prompt: "p",
        size: "1792x1178",
        provider: "gpt",
      });
    });
  });

  describe("getSourceArticlesFromAllTasks", () => {
    it("returns axios.get result on success", async () => {
      const resp = { data: { sourceArticles: [] }, status: 200 };
      axios.get.mockResolvedValue(resp);
      const result = await getSourceArticlesFromAllTasks();
      expect(axios.get).toHaveBeenCalledWith("chatgpt/sourceArticles/all");
      expect(result).toBe(resp);
    });

    it("returns the fallback structure when axios rejects", async () => {
      axios.get.mockRejectedValue(new Error("down"));
      const result = await getSourceArticlesFromAllTasks();
      expect(result.status).toBe(200);
      expect(result.statusText).toBe("OK");
      expect(result.data.sourceArticles).toHaveLength(1);
      expect(result.data.sourceArticles[0]).toMatchObject({
        id: null,
        title: null,
        content: null,
        totalEngagement: null,
      });
    });
  });

  describe("generateArticleWithGemini", () => {
    it("throws when prompt is missing", async () => {
      await expect(generateArticleWithGemini()).rejects.toThrow(
        "Prompt is required for article generation"
      );
    });

    it("posts a string prompt directly", async () => {
      api.post.mockResolvedValue({ data: { title: "T" } });
      const result = await generateArticleWithGemini("hello prompt");
      expect(api.post).toHaveBeenCalledWith("chatgpt/generate-article", {
        prompt: "hello prompt",
      });
      expect(result).toEqual({ title: "T" });
    });

    it("formats an object prompt into a string (with all fields)", async () => {
      api.post.mockResolvedValue({ data: { ok: true } });
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await generateArticleWithGemini({
        title: "TT",
        source: "SS",
        summary: "MM",
      });
      const expectedString = `\nTitle: TT\nSource: SS\nSummary: MM`;
      expect(api.post).toHaveBeenCalledWith("chatgpt/generate-article", {
        prompt: expectedString,
      });
      expect(logSpy).toHaveBeenCalledWith(
        "Converted object prompt to string:",
        expectedString
      );
      logSpy.mockRestore();
    });

    it("formats an object prompt with missing fields (uses empty fallbacks)", async () => {
      api.post.mockResolvedValue({ data: { ok: true } });
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      await generateArticleWithGemini({});
      const expectedString = `\nTitle: \nSource: \nSummary: `;
      expect(api.post).toHaveBeenCalledWith("chatgpt/generate-article", {
        prompt: expectedString,
      });
      logSpy.mockRestore();
    });

    it("rethrows and logs error.response.data when present", async () => {
      const err = { response: { data: "geminiboom" } };
      api.post.mockRejectedValue(err);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      await expect(generateArticleWithGemini("p")).rejects.toBe(err);
      expect(spy).toHaveBeenCalledWith(
        "Gemini article generation failed:",
        "geminiboom"
      );
      spy.mockRestore();
    });

    it("rethrows and logs error.message when no response", async () => {
      const err = new Error("gemini fail");
      api.post.mockRejectedValue(err);
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      await expect(generateArticleWithGemini("p")).rejects.toBe(err);
      expect(spy).toHaveBeenCalledWith(
        "Gemini article generation failed:",
        "gemini fail"
      );
      spy.mockRestore();
    });
  });

  describe("getSourceArticlesEndpointForProvider", () => {
    it("maps each known provider", () => {
      expect(getSourceArticlesEndpointForProvider("gpt")).toBe(
        "chatgpt/sourceArticles/all"
      );
      expect(getSourceArticlesEndpointForProvider("gemini")).toBe(
        "gemini/sourceArticles/all"
      );
      expect(getSourceArticlesEndpointForProvider("minimax")).toBe(
        "minimax/sourceArticles/all"
      );
      expect(getSourceArticlesEndpointForProvider("x")).toBe(
        "x/sourceArticles/all"
      );
    });

    it("falls back to gpt for unknown provider", () => {
      expect(getSourceArticlesEndpointForProvider("nope")).toBe(
        "chatgpt/sourceArticles/all"
      );
    });

    it("defaults provider to gpt when omitted", () => {
      expect(getSourceArticlesEndpointForProvider()).toBe(
        "chatgpt/sourceArticles/all"
      );
    });
  });

  describe("getSourceArticlesByProvider", () => {
    it("requests the mapped endpoint for an explicit provider", () => {
      getSourceArticlesByProvider("gemini");
      expect(api.get).toHaveBeenCalledWith("gemini/sourceArticles/all");
    });

    it("defaults to gpt when omitted", () => {
      getSourceArticlesByProvider();
      expect(api.get).toHaveBeenCalledWith("chatgpt/sourceArticles/all");
    });

    it("appends ?deepSearch=true when deepSearch is true", () => {
      getSourceArticlesByProvider("minimax", true);
      expect(api.get).toHaveBeenCalledWith(
        "minimax/sourceArticles/all?deepSearch=true"
      );
    });

    it("works with each provider when deepSearch is true", () => {
      getSourceArticlesByProvider("gpt", true);
      expect(api.get).toHaveBeenCalledWith(
        "chatgpt/sourceArticles/all?deepSearch=true"
      );
      getSourceArticlesByProvider("gemini", true);
      expect(api.get).toHaveBeenCalledWith(
        "gemini/sourceArticles/all?deepSearch=true"
      );
      getSourceArticlesByProvider("x", true);
      expect(api.get).toHaveBeenCalledWith(
        "x/sourceArticles/all?deepSearch=true"
      );
    });

    it("omits query string when deepSearch is false", () => {
      getSourceArticlesByProvider("minimax", false);
      expect(api.get).toHaveBeenCalledWith("minimax/sourceArticles/all");
    });
  });

  describe("getSourceArticleById", () => {
    it("requests known provider base", () => {
      getSourceArticleById(11, "x");
      expect(api.get).toHaveBeenCalledWith("x/sourceArticles/11");
    });

    it("falls back to gpt base for unknown provider", () => {
      getSourceArticleById(12, "bogus");
      expect(api.get).toHaveBeenCalledWith("chatgpt/sourceArticles/12");
    });

    it("defaults provider to gpt when omitted", () => {
      getSourceArticleById(13);
      expect(api.get).toHaveBeenCalledWith("chatgpt/sourceArticles/13");
    });
  });

  describe("getSourceArticlesByIds", () => {
    it("posts an array of ids as-is for a known provider", () => {
      getSourceArticlesByIds([1, 2], "minimax");
      expect(api.post).toHaveBeenCalledWith("minimax/sourceArticles/byIds", {
        ids: [1, 2],
      });
    });

    it("coerces a single id into an array and defaults provider", () => {
      getSourceArticlesByIds(9);
      expect(api.post).toHaveBeenCalledWith("chatgpt/sourceArticles/byIds", {
        ids: [9],
      });
    });

    it("falls back to gpt base for unknown provider", () => {
      getSourceArticlesByIds([3], "bad");
      expect(api.post).toHaveBeenCalledWith("chatgpt/sourceArticles/byIds", {
        ids: [3],
      });
    });
  });

  describe("generateArticleBySourceId", () => {
    it("posts to known provider endpoint", () => {
      generateArticleBySourceId(5, "gemini");
      expect(api.post).toHaveBeenCalledWith("gemini/generate-article/by-id", {
        id: 5,
      });
    });

    it("falls back to gpt for unknown provider and defaults provider", () => {
      generateArticleBySourceId(6, "weird");
      expect(api.post).toHaveBeenCalledWith("chatgpt/generate-article/by-id", {
        id: 6,
      });
      generateArticleBySourceId(7);
      expect(api.post).toHaveBeenCalledWith("chatgpt/generate-article/by-id", {
        id: 7,
      });
    });
  });

  describe("refineArticleBySourceId", () => {
    it("posts to known provider refine endpoint", () => {
      refineArticleBySourceId({
        sourceId: 100,
        articleId: 200,
        prompt: "refine",
        provider: "x",
      });
      expect(api.post).toHaveBeenCalledWith("x/refine-article/100", {
        articleId: 200,
        prompt: "refine",
      });
    });

    it("falls back to gpt and defaults provider when unknown/omitted", () => {
      refineArticleBySourceId({ sourceId: 101, articleId: 201, prompt: "p" });
      expect(api.post).toHaveBeenCalledWith("chatgpt/refine-article/101", {
        articleId: 201,
        prompt: "p",
      });
      refineArticleBySourceId({
        sourceId: 102,
        articleId: 202,
        prompt: "q",
        provider: "unknown",
      });
      expect(api.post).toHaveBeenCalledWith("chatgpt/refine-article/102", {
        articleId: 202,
        prompt: "q",
      });
    });
  });

  describe("generateArticlesBySourceIds", () => {
    it("posts an array of ids for a known provider", () => {
      generateArticlesBySourceIds([1, 2], "gemini");
      expect(api.post).toHaveBeenCalledWith("gemini/generate-articles/bulk", {
        ids: [1, 2],
      });
    });

    it("coerces single id and defaults provider; unknown falls back to gpt", () => {
      generateArticlesBySourceIds(8);
      expect(api.post).toHaveBeenCalledWith("chatgpt/generate-articles/bulk", {
        ids: [8],
      });
      generateArticlesBySourceIds([4], "huh");
      expect(api.post).toHaveBeenCalledWith("chatgpt/generate-articles/bulk", {
        ids: [4],
      });
    });
  });

  describe("findArticleSources", () => {
    it("throws when title is missing", () => {
      expect(() => findArticleSources({})).toThrow(
        "Title is required for finding sources"
      );
    });

    it("posts with debug default false", () => {
      findArticleSources({ title: "T", summary: "S", content: "C" });
      expect(api.post).toHaveBeenCalledWith("minimax/find-sources", {
        title: "T",
        summary: "S",
        content: "C",
        debug: false,
      });
    });

    it("posts with explicit debug true", () => {
      findArticleSources({ title: "T", debug: true });
      expect(api.post).toHaveBeenCalledWith("minimax/find-sources", {
        title: "T",
        summary: undefined,
        content: undefined,
        debug: true,
      });
    });
  });

  describe("factCheckArticle", () => {
    it("throws when title is missing", () => {
      expect(() => factCheckArticle({})).toThrow(
        "Title is required for fact checking"
      );
    });

    it("posts the fact-check payload", () => {
      factCheckArticle({ title: "T", summary: "S", content: "C" });
      expect(api.post).toHaveBeenCalledWith("minimax/fact-check", {
        title: "T",
        summary: "S",
        content: "C",
      });
    });
  });

  it("generateArticleWithMetadata() posts the prompt", () => {
    generateArticleWithMetadata("my prompt");
    expect(api.post).toHaveBeenCalledWith("gemini/article", {
      prompt: "my prompt",
    });
  });

  describe("ArticlesService class and singleton", () => {
    it("constructs with the 'articles' resource", () => {
      const svc = new ArticlesService();
      expect(svc.resource).toBe("articles");
      expect(svc.api).toBe(api);
    });

    it("exposes domain functions as instance methods via the singleton", () => {
      articlesService.getStats();
      expect(api.get).toHaveBeenCalledWith("/articles/stats");
      articlesService.getArticle(77);
      expect(api.get).toHaveBeenCalledWith("/articles/77");
    });

    it("inherits BaseService default verbs", () => {
      articlesService.list({ a: 1 });
      expect(api.get).toHaveBeenCalledWith("/articles", { params: { a: 1 } });
    });

    it("default export is the singleton instance", () => {
      expect(defaultExport).toBe(articlesService);
      expect(defaultExport).toBeInstanceOf(ArticlesService);
    });
  });
});
