/**
 * features/dashboard/DashboardService.js
 *
 * Aggregations for the admin dashboard, backed by Supabase.
 *
 * The dashboard reads the same tables the rest of the app writes to, so the
 * numbers always match what was actually published.
 */

import {
  supabase,
  ok,
  rethrow,
  withAliases,
  withAliasesAll,
} from "@/services/supabase.js";
import { BaseService } from "@/shared/services/BaseService";

/** Applies an optional published-at window to a query. */
const applyDateWindow = (query, startDate, endDate, column = "created_at") => {
  if (startDate) query = query.gte(column, startDate);
  if (endDate) query = query.lte(column, endDate);
  return query;
};

/**
 * Headline counts for the dashboard.
 */
export const getStats = async () => {
  try {
    const [articlesResult, adsResult] = await Promise.all([
      supabase.from("articles").select("id, status"),
      supabase.from("ads").select("id, status"),
    ]);

    if (articlesResult.error) throw articlesResult.error;
    if (adsResult.error) throw adsResult.error;

    const articleRows = articlesResult.data ?? [];
    const adRows = adsResult.data ?? [];

    return ok({
      articles: {
        total_articles: articleRows.length,
        total_published: articleRows.filter((r) => r.status === "published").length,
        total_draft: articleRows.filter((r) => r.status === "draft").length,
        total_scheduled: articleRows.filter((r) => r.status === "scheduled").length,
      },
      ads: {
        total_ads: adRows.length,
        active_ads: adRows.filter((r) => r.status === "active").length,
        draft_ads: adRows.filter((r) => r.status === "draft").length,
        paused_ads: adRows.filter((r) => r.status === "paused").length,
      },
    });
  } catch (error) {
    return rethrow(error, "Failed to fetch dashboard stats");
  }
};

/**
 * Article counts grouped by article type.
 */
export const getArticlesByType = async ({ startDate = "", endDate = "" } = {}) => {
  try {
    let query = supabase
      .from("articles")
      .select("article_type, status, created_at, published_at");
    query = applyDateWindow(query, startDate, endDate, "created_at");

    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    const types = ["latest", "top", "featured", "popular"];

    const result = types.map((type) => {
      const forType = rows.filter((r) => r.article_type === type);
      return {
        type,
        article_count: forType.length,
        published_count: forType.filter((r) => r.status === "published").length,
      };
    });

    return ok(result);
  } catch (error) {
    return rethrow(error, "Failed to fetch articles by type");
  }
};

/**
 * Article counts grouped by category.
 */
export const getArticlesByCategory = async ({ startDate = "", endDate = "" } = {}) => {
  try {
    let query = supabase
      .from("articles")
      .select("category_id, created_at, category:categories ( id, name )");
    query = applyDateWindow(query, startDate, endDate, "created_at");

    const { data, error } = await query;
    if (error) throw error;

    const counts = new Map();
    (data ?? []).forEach((row) => {
      const name = row.category?.name ?? "Uncategorised";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });

    const result = [...counts.entries()]
      .map(([category_name, article_count]) => ({ category_name, article_count }))
      .sort((a, b) => b.article_count - a.article_count);

    return ok(result);
  } catch (error) {
    return rethrow(error, "Failed to fetch articles by category");
  }
};

/**
 * Ad performance per placement, including click-through rate inputs.
 */
export const getAdByPlacementCTR = async ({ startDate = "", endDate = "" } = {}) => {
  try {
    let query = supabase
      .from("ads")
      .select(
        "id, title, business_name, impressions, clicks, amount, status, placement_date, expiry_date, created_at, placement:ad_placements ( id, name )",
      );
    query = applyDateWindow(query, startDate, endDate, "created_at");

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []).map((ad) => ({
      ...ad,
      placement_name: ad.placement?.name ?? null,
      // The placement stays the location key the interface expects.
      placement: ad.placement?.name ?? null,
      ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
    }));

    return ok(rows);
  } catch (error) {
    return rethrow(error, "Failed to fetch ad placement performance");
  }
};

/**
 * Daily article counts over a date window.
 */
export const getArticlesTimeline = async ({ startDate = "", endDate = "" } = {}) => {
  try {
    let query = supabase.from("articles").select("published_at, created_at");
    query = applyDateWindow(query, startDate, endDate, "created_at");

    const { data, error } = await query;
    if (error) throw error;

    const counts = new Map();
    (data ?? []).forEach((row) => {
      const stamp = row.published_at || row.created_at;
      if (!stamp) return;
      const day = String(stamp).slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    });

    const result = [...counts.entries()]
      .map(([label, count]) => ({ label, period: label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return ok(result);
  } catch (error) {
    return rethrow(error, "Failed to fetch article timeline");
  }
};

/**
 * The most recent ads, for the "recent business ads" panel.
 */
export const getBusinessAdSummary = async ({
  size = 7,
  startDate = "",
  endDate = "",
} = {}) => {
  try {
    let query = supabase
      .from("ads")
      .select(
        "id, title, business_name, status, impressions, clicks, amount, placement_date, expiry_date, created_at",
      );
    query = applyDateWindow(query, startDate, endDate, "created_at");

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(Number(size) || 7);
    if (error) throw error;

    return ok(data ?? []);
  } catch (error) {
    return rethrow(error, "Failed to fetch business ad summary");
  }
};

export class DashboardService extends BaseService {
  constructor() {
    super("dashboard");
  }
}

Object.assign(DashboardService.prototype, {
  getStats,
  getArticlesByType,
  getArticlesByCategory,
  getAdByPlacementCTR,
  getArticlesTimeline,
  getBusinessAdSummary,
});

export const dashboardService = new DashboardService();
export default dashboardService;
