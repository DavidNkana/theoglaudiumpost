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
  getStats,
  getArticlesByType,
  getArticlesByCategory,
  getAdByPlacementCTR,
  getArticlesTimeline,
  getBusinessAdSummary,
} from "@/features/dashboard/DashboardService.js";

describe("features/dashboard/DashboardService", () => {
  beforeEach(reset);

  it("summarises articles and ads", async () => {
    state.tables.articles = {
      data: [
        { id: "a1", status: "published" },
        { id: "a2", status: "draft" },
      ],
      error: null,
    };
    state.tables.ads = {
      data: [
        { id: "ad1", status: "active" },
        { id: "ad2", status: "draft" },
      ],
      error: null,
    };

    const response = await getStats();

    expect(response.data.articles.total_articles).toBe(2);
    expect(response.data.articles.total_published).toBe(1);
    expect(response.data.ads.total_ads).toBe(2);
    expect(response.data.ads.active_ads).toBe(1);
  });

  it("groups articles by type", async () => {
    state.tables.articles = {
      data: [
        { id: "a1", article_type: "top", status: "published", created_at: "2026-01-01" },
        { id: "a2", article_type: "top", status: "draft", created_at: "2026-01-02" },
      ],
      error: null,
    };

    const response = await getArticlesByType({});

    const top = response.data.find((row) => row.type === "top");
    expect(top.article_count).toBe(2);
    expect(top.published_count).toBe(1);
  });

  it("groups articles by category", async () => {
    state.tables.articles = {
      data: [
        { id: "a1", category: { id: "c1", name: "Sport" }, created_at: "2026-01-01" },
        { id: "a2", category: null, created_at: "2026-01-02" },
      ],
      error: null,
    };

    const response = await getArticlesByCategory({});

    expect(response.data[0].category_name).toBe("Sport");
    expect(response.data[0].article_count).toBe(1);
  });

  it("reports ad performance per placement", async () => {
    state.tables.ads = {
      data: [
        {
          id: "ad1",
          impressions: 100,
          clicks: 10,
          created_at: "2026-01-01",
          placement: { id: "p1", name: "news_articles" },
        },
      ],
      error: null,
    };

    const response = await getAdByPlacementCTR({});

    expect(response.data[0].ctr).toBe(10);
    expect(response.data[0].placement_name).toBe("news_articles");
  });

  it("reports daily article counts", async () => {
    state.tables.articles = {
      data: [
        { id: "a1", published_at: "2026-01-01T10:00:00Z", created_at: "2026-01-01" },
        { id: "a2", published_at: "2026-01-01T12:00:00Z", created_at: "2026-01-01" },
      ],
      error: null,
    };

    const response = await getArticlesTimeline({});

    expect(response.data[0].label).toBe("2026-01-01");
    expect(response.data[0].count).toBe(2);
  });

  it("lists the most recent ads", async () => {
    state.tables.ads = { data: [{ id: "ad1" }], error: null };

    const response = await getBusinessAdSummary({ size: 7 });

    expect(response.data).toHaveLength(1);
  });

  it("rejects when the query fails", async () => {
    state.tables.articles = { data: null, error: { message: "denied" } };

    await expect(getStats()).rejects.toThrow("denied");
  });
});

const reset = () => {
  state.tables = {};
  Object.keys(state.builders).forEach((key) => delete state.builders[key]);
  state.session = null;
  state.user = null;
};
