import { describe, it, expect, vi, beforeEach } from "vitest";
import { callsTo } from "../../../tests/helpers/supabaseMock.js";

const state = vi.hoisted(() => ({
  tables: {},
  builders: {},
  session: null,
  user: null,
}));

vi.mock("@/services/supabase.js", async () => {
  const { buildSupabaseModule } = await import(
    "../../../tests/helpers/supabaseModuleMock.js"
  );
  return buildSupabaseModule(state);
});

import {
  getArticles,
  getArticle,
  getArticleBySlug,
  createArticle,
  editArticle,
  removeArticle,
  publishScheduled,
  getStats,
} from "@/features/articles/ArticlesService.js";

const ARTICLE = {
  id: "a1",
  title: "Laudium roadworks",
  slug: "laudium-roadworks",
  status: "published",
  article_type: "latest",
  cover: { id: "m1", file: "latest/cover.jpg", storage_path: "latest/cover.jpg" },
};

const reset = () => {
  state.tables = {};
  Object.keys(state.builders).forEach((key) => delete state.builders[key]);
  state.session = null;
  state.user = null;
};

describe("features/articles/ArticlesService", () => {
  beforeEach(reset);

  describe("getArticles", () => {
    it("returns articles with pagination info", async () => {
      state.tables.articles = {
        data: [ARTICLE],
        error: null,
        count: 1,
      };

      const response = await getArticles({ size: 10, page: 0 });

      expect(response.status).toBe(200);
      expect(response.data.articles).toHaveLength(1);
      expect(response.data.total).toBe(1);
      expect(response.data.totalPages).toBe(1);
    });

    it("resolves the cover image to a public URL", async () => {
      state.tables.articles = { data: [ARTICLE], error: null, count: 1 };

      const response = await getArticles({});

      expect(response.data.articles[0].cover.file).toBe(
        "https://cdn.test/latest/cover.jpg",
      );
    });

    it("filters by article type and status", async () => {
      state.tables.articles = { data: [], error: null, count: 0 };

      await getArticles({ type: "featured", status: "published" });

      const builder = state.builders.articles;
      expect(callsTo(builder, "eq")).toEqual([
        { name: "eq", args: ["article_type", "featured"] },
        { name: "eq", args: ["status", "published"] },
      ]);
    });

    it("maps the top stories type to top", async () => {
      state.tables.articles = { data: [], error: null, count: 0 };

      await getArticles({ type: "topStories" });

      expect(callsTo(state.builders.articles, "eq")[0].args).toEqual([
        "article_type",
        "top",
      ]);
    });

    it("searches across title, summary and content", async () => {
      state.tables.articles = { data: [], error: null, count: 0 };

      await getArticles({ search: "roadworks" });

      const orCalls = callsTo(state.builders.articles, "or");
      expect(orCalls).toHaveLength(1);
      expect(orCalls[0].args[0]).toContain("title.ilike.%roadworks%");
    });

    it("excludes the given ids", async () => {
      state.tables.articles = { data: [], error: null, count: 0 };

      await getArticles({ excludeIds: ["a1", "a2"] });

      expect(callsTo(state.builders.articles, "not")[0].args).toEqual([
        "id",
        "in",
        "(a1,a2)",
      ]);
    });

    it("rejects with a failed request when the query fails", async () => {
      state.tables.articles = {
        data: null,
        error: { message: "boom" },
        count: 0,
      };

      await expect(getArticles({})).rejects.toThrow("boom");
    });
  });

  describe("getArticle / getArticleBySlug", () => {
    it("fetches an article by id", async () => {
      state.tables.articles = { data: ARTICLE, error: null };

      const response = await getArticle("a1");

      expect(response.status).toBe(200);
      expect(response.data.slug).toBe("laudium-roadworks");
    });

    it("fetches an article by slug", async () => {
      state.tables.articles = { data: ARTICLE, error: null };

      const response = await getArticleBySlug("laudium-roadworks");

      expect(response.status).toBe(200);
      expect(callsTo(state.builders.articles, "eq")[0].args).toEqual([
        "slug",
        "laudium-roadworks",
      ]);
    });

    it("reports a missing article as not found", async () => {
      state.tables.articles = { data: null, error: null };

      await expect(getArticleBySlug("missing")).rejects.toThrow(
        "Article not found",
      );
    });
  });

  describe("createArticle / editArticle / removeArticle", () => {
    it("creates an article and defaults it to a draft", async () => {
      state.tables.articles = { data: ARTICLE, error: null };

      const response = await createArticle({ title: "New", slug: "new" });

      expect(response.status).toBe(201);
      const insert = callsTo(state.builders.articles, "insert")[0];
      expect(insert.args[0]).toMatchObject({
        title: "New",
        slug: "new",
        status: "draft",
      });
    });

    it("stamps the publication time when publishing", async () => {
      state.tables.articles = { data: ARTICLE, error: null };

      await createArticle({ title: "New", slug: "new", status: "published" });

      const insert = callsTo(state.builders.articles, "insert")[0];
      expect(insert.args[0].published_at).toBeTruthy();
    });

    it("maps camelCase fields onto database columns", async () => {
      state.tables.articles = { data: ARTICLE, error: null };

      await createArticle({
        title: "New",
        slug: "new",
        coverId: "m9",
        categoryId: "c1",
        articleType: "featured",
        scheduledFor: "2026-12-01T10:00:00Z",
      });

      const insert = callsTo(state.builders.articles, "insert")[0];
      expect(insert.args[0]).toMatchObject({
        cover_id: "m9",
        category_id: "c1",
        article_type: "featured",
        scheduled_for: "2026-12-01T10:00:00Z",
      });
    });

    it("updates an article", async () => {
      state.tables.articles = { data: ARTICLE, error: null };

      const response = await editArticle("a1", { title: "Updated" });

      expect(response.status).toBe(200);
      const update = callsTo(state.builders.articles, "update")[0];
      expect(update.args[0]).toEqual({ title: "Updated" });
    });

    it("removes an article", async () => {
      state.tables.articles = { data: null, error: null };

      const response = await removeArticle("a1");

      expect(response.status).toBe(200);
      expect(callsTo(state.builders.articles, "delete")).toHaveLength(1);
    });

    it("reports a failed insert", async () => {
      state.tables.articles = { data: null, error: { message: "denied" } };

      await expect(createArticle({ title: "x", slug: "x" })).rejects.toThrow(
        "denied",
      );
    });
  });

  describe("publishScheduled", () => {
    it("publishes articles whose schedule has passed", async () => {
      state.tables.articles = { data: [{ id: "a1" }], error: null };

      const response = await publishScheduled();

      expect(response.status).toBe(200);
      expect(response.data.published).toBe(1);
      const update = callsTo(state.builders.articles, "update")[0];
      expect(update.args[0].status).toBe("published");
    });
  });

  describe("getStats", () => {
    it("counts articles by status and type", async () => {
      state.tables.articles = {
        data: [
          { id: "a1", status: "published", article_type: "top", views: 10 },
          { id: "a2", status: "draft", article_type: "latest", views: 0 },
        ],
        error: null,
      };

      const response = await getStats();

      expect(response.data.total).toBe(2);
      expect(response.data.published).toBe(1);
      expect(response.data.draft).toBe(1);
      expect(response.data.byType.top).toBe(1);
      expect(response.data.views).toBe(10);
    });
  });
});
