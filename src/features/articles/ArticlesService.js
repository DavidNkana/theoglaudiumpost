/**
 * features/articles/ArticlesService.js
 *
 * Article data access for the Laudium Post application, backed by Supabase.
 *
 * This module:
 * - Fetches articles with filtering, pagination and search
 * - Creates, updates and deletes articles (admin only — enforced by RLS)
 * - Supports publishing and scheduling
 *
 * There is no AI generation, no automated drafting and no article finder in
 * this system: every article is written and entered by an administrator.
 *
 * Responses keep the axios-shaped `{ status, data }` contract the UI expects.
 */

import {
  supabase,
  ok,
  created,
  rethrow,
  publicMediaUrl,
  withAliases,
  withAliasesAll,
} from "@/services/supabase.js";
import { BaseService } from "@/shared/services/BaseService";

/** Columns selected when listing articles. */
const LIST_COLUMNS =
  "id, title, slug, summary, content, cover_id, category_id, author_id, article_type, status, " +
  "scheduled_for, published_at, meta_title, meta_description, sources, views, created_at, updated_at, " +
  "cover:media ( id, file, storage_path, file_type, story_type ), " +
  "category:categories ( id, name, slug )";

/**
 * Maps an internal article type to the value stored in the database.
 * "" means "any type".
 */
const TYPE_FILTER = {
  featured: "featured",
  top: "top",
  topStories: "top",
  popular: "popular",
  latest: "",
};

/**
 * Turns the embedded cover row into the shape the cards render.
 *
 * The cards use `cover.file` directly as an image source, so the stored path
 * is resolved to its public URL here.
 */
const withCoverUrl = (article) => {
  if (!article) return article;
  const aliased = withAliases(article);
  if (!aliased.cover) return aliased;
  return {
    ...aliased,
    cover: {
      ...aliased.cover,
      file: publicMediaUrl(aliased.cover.storage_path || aliased.cover.file),
    },
  };
};

const withCoverUrls = (articles) => (articles ?? []).map(withCoverUrl);

/**
 * Fetches articles with filtering and pagination.
 *
 * @param {Object} options - Query options
 * @param {string} options.type - Article type filter ("featured", "top", "popular")
 * @param {number} options.page - Page number (0-based)
 * @param {number} options.size - Number of articles per page
 * @param {string} options.search - Free-text search over title and summary
 * @param {string} options.category - Category id
 * @param {string} options.status - Status filter ("published", "draft", "scheduled")
 * @param {string} options.startDate - Only articles published on/after this date
 * @param {string} options.endDate - Only articles published on/before this date
 * @param {Array} options.excludeIds - Article ids to exclude
 * @param {string} options.sort - Sort, e.g. "published_at:desc" or "id:desc"
 * @returns {Promise} - Promise resolving to { status, data: { articles, total, totalPages } }
 */
export const getArticles = async ({
  type = "",
  page = 0,
  size = 10,
  search = "",
  category = "",
  status = "",
  startDate = "",
  endDate = "",
  excludeIds = [],
  sort = "",
} = {}) => {
  try {
    const articleType = TYPE_FILTER[type] ?? type ?? "";
    const from = Number(page) * Number(size);
    const to = from + Number(size) - 1;

    let query = supabase
      .from("articles")
      .select(LIST_COLUMNS, { count: "exact" })
      .range(from, to);

    if (articleType) query = query.eq("article_type", articleType);
    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category_id", category);
    if (excludeIds?.length) query = query.not("id", "in", `(${excludeIds.join(",")})`);
    if (startDate) query = query.gte("published_at", startDate);
    if (endDate) query = query.lte("published_at", endDate);
    if (search) {
      const term = String(search).replace(/[%,]/g, " ").trim();
      if (term) {
        query = query.or(
          `title.ilike.%${term}%,summary.ilike.%${term}%,content.ilike.%${term}%`,
        );
      }
    }

    const [sortField = "published_at", sortOrder = "desc"] = String(
      sort || "published_at:desc",
    ).split(":");
    query = query.order(sortField, { ascending: sortOrder === "asc" });

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count ?? data?.length ?? 0;
    const totalPages = size > 0 ? Math.ceil(total / size) : 0;

    return ok({ articles: withCoverUrls(data), total, totalPages });
  } catch (error) {
    return rethrow(error, "Failed to fetch articles");
  }
};

/**
 * Fetches a single article by id.
 */
export const getArticle = async (id) => {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select(LIST_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return ok(withCoverUrl(data));
  } catch (error) {
    return rethrow(error, "Failed to fetch article");
  }
};

/**
 * Fetches a single article by slug.
 */
export const getArticleBySlug = async (slug) => {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select(LIST_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const err = new Error("Article not found");
      err.response = { status: 404, data: { message: "Article not found" } };
      throw err;
    }
    return ok(withCoverUrl(data));
  } catch (error) {
    return rethrow(error, "Failed to fetch article");
  }
};

/**
 * Creates a new article.
 */
export const createArticle = async (data) => {
  try {
    const payload = toArticlePayload(data);
    const { data: created_, error } = await supabase
      .from("articles")
      .insert(payload)
      .select(LIST_COLUMNS)
      .single();
    if (error) throw error;

    if (Array.isArray(data.tags)) {
      await syncArticleTags(created_.id, data.tags);
    }

    return created(withCoverUrl(created_));
  } catch (error) {
    return rethrow(error, "Failed to create article");
  }
};

/**
 * Updates an existing article.
 */
export const editArticle = async (id, data) => {
  try {
    const payload = toArticlePayload(data, { partial: true });
    const { data: updated, error } = await supabase
      .from("articles")
      .update(payload)
      .eq("id", id)
      .select(LIST_COLUMNS)
      .single();
    if (error) throw error;

    if (Array.isArray(data.tags)) {
      await syncArticleTags(updated.id, data.tags);
    }

    return ok(withCoverUrl(updated));
  } catch (error) {
    return rethrow(error, "Failed to update article");
  }
};

/**
 * Deletes an article.
 */
export const removeArticle = async (id) => {
  try {
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) throw error;
    return ok(true);
  } catch (error) {
    return rethrow(error, "Failed to delete article");
  }
};

/**
 * Publishes articles whose scheduled time has arrived.
 */
export const publishScheduled = async () => {
  try {
    const { data, error } = await supabase
      .from("articles")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("status", "scheduled")
      .lte("scheduled_for", new Date().toISOString())
      .select("id");
    if (error) throw error;
    return ok({ published: data?.length ?? 0 });
  } catch (error) {
    return rethrow(error, "Failed to publish scheduled articles");
  }
};

/**
 * Returns article counts grouped by status and type.
 */
export const getStats = async () => {
  try {
    const { data, error } = await supabase
      .from("articles")
      .select("id, status, article_type, views");
    if (error) throw error;

    const rows = data ?? [];
    return ok({
      total: rows.length,
      published: rows.filter((r) => r.status === "published").length,
      draft: rows.filter((r) => r.status === "draft").length,
      scheduled: rows.filter((r) => r.status === "scheduled").length,
      byType: {
        latest: rows.filter((r) => r.article_type === "latest").length,
        top: rows.filter((r) => r.article_type === "top").length,
        featured: rows.filter((r) => r.article_type === "featured").length,
        popular: rows.filter((r) => r.article_type === "popular").length,
      },
      views: rows.reduce((sum, r) => sum + (r.views ?? 0), 0),
    });
  } catch (error) {
    return rethrow(error, "Failed to fetch article statistics");
  }
};

/**
 * Replaces the tags attached to an article.
 *
 * The admin form selects tags by id, so the join rows are rebuilt from the
 * submitted id list.
 */
const syncArticleTags = async (articleId, tags) => {
  if (!Array.isArray(tags)) return;

  const { error: deleteError } = await supabase
    .from("article_tags")
    .delete()
    .eq("article_id", articleId);
  if (deleteError) throw deleteError;

  const ids = tags.filter(Boolean);
  if (!ids.length) return;

  const { error } = await supabase
    .from("article_tags")
    .insert(ids.map((tag_id) => ({ article_id: articleId, tag_id })));
  if (error) throw error;
};

/**
 * Maps a UI article payload onto the database columns.
 *
 * The admin forms use camelCase; the database uses snake_case. `partial` keeps
 * only the fields that were actually supplied so an edit does not wipe
 * untouched columns.
 */
const toArticlePayload = (data = {}, { partial = false } = {}) => {
  const payload = {};

  const has = (key) => Object.prototype.hasOwnProperty.call(data, key);
  const assign = (key, value) => {
    if (value !== undefined) payload[key] = value;
  };

  assign("title", data.title);
  assign("slug", data.slug);
  assign("content", data.content);
  assign("summary", data.summary);
  assign("meta_title", data.meta_title ?? data.metaTitle);
  assign("meta_description", data.meta_description ?? data.metaDescription);
  assign("sources", data.sources);

  // These may be cleared on purpose, so they are only written when the caller
  // actually supplied them. A partial edit must never blank a column.
  if (has("cover_id") || has("coverId")) {
    payload.cover_id = data.cover_id ?? data.coverId ?? null;
  }
  if (has("category_id") || has("categoryId")) {
    payload.category_id = data.category_id ?? data.categoryId ?? null;
  }
  if (has("article_type") || has("articleType")) {
    payload.article_type = data.article_type ?? data.articleType ?? "latest";
  }
  if (has("scheduled_for") || has("scheduledFor")) {
    payload.scheduled_for = data.scheduled_for ?? data.scheduledFor ?? null;
  }
  assign("status", data.status);

  if (!partial) {
    payload.status = payload.status ?? "draft";
    payload.article_type = payload.article_type ?? "latest";
    payload.scheduled_for = payload.scheduled_for ?? null;
    payload.sources = payload.sources ?? [];
    payload.published_at =
      data.published_at ??
      data.publishedAt ??
      (payload.status === "published" ? new Date().toISOString() : null);
  }

  return payload;
};

export class ArticlesService extends BaseService {
  constructor() {
    super("articles");
  }
}

// expose the domain functions as instance methods (they don't use `this`)
Object.assign(ArticlesService.prototype, {
  getArticles,
  getArticle,
  getArticleBySlug,
  createArticle,
  editArticle,
  removeArticle,
  publishScheduled,
  getStats,
});

export const articlesService = new ArticlesService();
export default articlesService;
