/**
 * features/announcements/AnnouncementsService.js
 *
 * Community notices (announcements) data access, backed by Supabase.
 */

import { supabase, ok, created, rethrow } from "@/services/supabase.js";
import { BaseService } from "@/shared/services/BaseService";

const NOTICE_COLUMNS =
  "id, title, slug, content, summary, priority, category_id, status, is_funeral, image_url, published_at, created_at, updated_at, " +
  "category:notice_categories ( id, name, slug )";

const CATEGORY_COLUMNS =
  "id, name, slug, description, is_active, created_at, updated_at";

/**
 * Fetches notices with filtering and pagination.
 *
 * @returns {Promise} - Promise resolving to { status, data: { announcements, total, totalPages } }
 */
export const getAnnouncements = async ({
  page = 0,
  size = 10,
  search = "",
  priority = "",
  category = "",
  status = "",
  excludeFunerals = true,
} = {}) => {
  try {
    const from = Number(page) * Number(size);
    const to = from + Number(size) - 1;

    let query = supabase
      .from("announcements")
      .select(NOTICE_COLUMNS, { count: "exact" })
      .range(from, to);

    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("priority", priority);
    if (category) query = query.eq("category_id", category);
    if (excludeFunerals) query = query.eq("is_funeral", false);
    if (search) {
      const term = String(search).replace(/[%,]/g, " ").trim();
      if (term) {
        query = query.or(`title.ilike.%${term}%,summary.ilike.%${term}%,content.ilike.%${term}%`);
      }
    }

    query = query.order("published_at", { ascending: false, nullsFirst: false });

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count ?? data?.length ?? 0;
    const totalPages = Number(size) > 0 ? Math.ceil(total / Number(size)) : 0;

    return ok({ announcements: data ?? [], total, totalPages });
  } catch (error) {
    return rethrow(error, "Failed to fetch notices");
  }
};

/**
 * Fetches the notice categories with their notice counts.
 *
 * Also exported as `getCategories` because the notices store uses that name.
 */
export const getAnnouncementCategories = async () => {
  try {
    const [{ data: categories }, { data: notices }] = await Promise.all([
      supabase
        .from("notice_categories")
        .select(CATEGORY_COLUMNS)
        .order("name"),
      supabase.from("announcements").select("category_id").eq("status", "published"),
    ]);

    const counts = new Map();
    (notices ?? []).forEach((row) => {
      if (!row.category_id) return;
      counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
    });

    const result = (categories ?? []).map((category) => ({
      ...category,
      count: counts.get(category.id) ?? 0,
    }));

    return ok({ categories: result });
  } catch (error) {
    return rethrow(error, "Failed to fetch notice categories");
  }
};

/** Creates a notice category. */
export const createCategory = async (data) => {
  try {
    const { data: newCategory, error } = await supabase
      .from("notice_categories")
      .insert({
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        is_active: data.is_active ?? true,
      })
      .select(CATEGORY_COLUMNS)
      .single();
    if (error) throw error;
    return created(newCategory);
  } catch (error) {
    return rethrow(error, "Failed to create category");
  }
};

/** Updates a notice category. */
export const editCategory = async (id, data) => {
  try {
    const { data: updated, error } = await supabase
      .from("notice_categories")
      .update({
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        is_active: data.is_active ?? true,
      })
      .eq("id", id)
      .select(CATEGORY_COLUMNS)
      .single();
    if (error) throw error;
    return ok(updated);
  } catch (error) {
    return rethrow(error, "Failed to update category");
  }
};

/** Activates or retires a notice category. */
export const changeCategoryStatus = async (id, data) => {
  try {
    const { data: updated, error } = await supabase
      .from("notice_categories")
      .update({ is_active: data?.is_active ?? true })
      .eq("id", id)
      .select(CATEGORY_COLUMNS)
      .single();
    if (error) throw error;
    return ok(updated);
  } catch (error) {
    return rethrow(error, "Failed to update category status");
  }
};

/** Deletes a notice category. */
export const removeCategory = async (id) => {
  try {
    const { error } = await supabase.from("notice_categories").delete().eq("id", id);
    if (error) throw error;
    return ok(true);
  } catch (error) {
    return rethrow(error, "Failed to delete category");
  }
};

/** Fetches a single notice by id. */
export const getAnnouncement = async (id) => {
  try {
    const { data, error } = await supabase
      .from("announcements")
      .select(NOTICE_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return ok(data);
  } catch (error) {
    return rethrow(error, "Failed to fetch notice");
  }
};

/** Fetches a single notice by slug. */
export const getAnnouncementBySlug = async (slug) => {
  try {
    const { data, error } = await supabase
      .from("announcements")
      .select(NOTICE_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const err = new Error("Notice not found");
      err.response = { status: 404, data: { message: "Notice not found" } };
      throw err;
    }
    return ok(data);
  } catch (error) {
    return rethrow(error, "Failed to fetch notice");
  }
};

/** Creates a notice. */
export const createAnnouncement = async (data) => {
  try {
    const { data: newNotice, error } = await supabase
      .from("announcements")
      .insert({
        title: data.title,
        slug: data.slug,
        content: data.content ?? null,
        summary: data.summary ?? null,
        priority: data.priority ?? "normal",
        category_id: data.category_id ?? data.categoryId ?? null,
        status: data.status ?? "published",
        is_funeral: data.is_funeral ?? data.isFuneral ?? false,
        image_url: data.image_url ?? data.imageUrl ?? null,
        published_at:
          data.published_at ?? data.publishedAt ?? new Date().toISOString(),
      })
      .select(NOTICE_COLUMNS)
      .single();
    if (error) throw error;
    return created(newNotice);
  } catch (error) {
    return rethrow(error, "Failed to create notice");
  }
};

/** Updates a notice. */
export const editAnnouncement = async (id, data) => {
  try {
    const { data: updated, error } = await supabase
      .from("announcements")
      .update({
        title: data.title,
        slug: data.slug,
        content: data.content ?? null,
        summary: data.summary ?? null,
        priority: data.priority ?? "normal",
        category_id: data.category_id ?? data.categoryId ?? null,
        status: data.status ?? "published",
        is_funeral: data.is_funeral ?? data.isFuneral ?? false,
        image_url: data.image_url ?? data.imageUrl ?? null,
      })
      .eq("id", id)
      .select(NOTICE_COLUMNS)
      .single();
    if (error) throw error;
    return ok(updated);
  } catch (error) {
    return rethrow(error, "Failed to update notice");
  }
};

/** Deletes a notice. */
export const removeAnnouncement = async (id) => {
  try {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) throw error;
    return ok(true);
  } catch (error) {
    return rethrow(error, "Failed to delete notice");
  }
};

/** Alias kept for the notices store, which calls this `getCategories`. */
export const getCategories = getAnnouncementCategories;

export class AnnouncementsService extends BaseService {
  constructor() {
    super("announcements");
  }
}

Object.assign(AnnouncementsService.prototype, {
  getAnnouncements,
  getCategories,
  createCategory,
  editCategory,
  changeCategoryStatus,
  removeCategory,
  getAnnouncementCategories,
  getAnnouncement,
  getAnnouncementBySlug,
  createAnnouncement,
  editAnnouncement,
  removeAnnouncement,
});

export const announcementsService = new AnnouncementsService();
export default announcementsService;
