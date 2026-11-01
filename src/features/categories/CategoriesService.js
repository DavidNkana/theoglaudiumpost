/**
 * features/categories/CategoriesService.js
 *
 * Category data access, backed by Supabase.
 */

import { supabase, ok, created, rethrow } from "@/services/supabase.js";
import { BaseService } from "@/shared/services/BaseService";

const CATEGORY_COLUMNS = "id, name, slug, description, created_at, updated_at";

/**
 * Fetches categories.
 */
export const getCategories = async ({
  tab = "all",
  page = "0",
  search = "",
  category = "",
} = {}) => {
  try {
    let query = supabase.from("categories").select(CATEGORY_COLUMNS);

    if (search) {
      const term = String(search).replace(/[%,]/g, " ").trim();
      if (term) query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%`);
    }

    const { data, error } = await query.order("name");
    if (error) throw error;

    const list = data ?? [];
    const size = Number(page) + 1;
    void size;

    return ok({
      categories: list,
      total: list.length,
      totalPages: 1,
      page: Number(page),
      size: list.length,
    });
  } catch (error) {
    return rethrow(error, "Failed to fetch categories");
  }
};

/**
 * Fetches a single category by id.
 */
export const getCategory = async (id) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return ok(data);
  } catch (error) {
    return rethrow(error, "Failed to fetch category");
  }
};

/**
 * Fetches a single category by slug.
 */
export const getCategoryBySlug = async (slug) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return ok(data);
  } catch (error) {
    return rethrow(error, "Failed to fetch category");
  }
};

/**
 * Fetches the published articles in a category.
 */
export const getCategoryArticles = async (slug, { page = "0", size = 10 } = {}) => {
  try {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (!category) return ok({ articles: [], total: 0, totalPages: 0 });

    const from = Number(page) * Number(size);
    const to = from + Number(size) - 1;

    const { data, error, count } = await supabase
      .from("articles")
      .select("id, title, slug, summary, cover_id, category_id, article_type, status, published_at, cover:media ( id, file )")
      .eq("category_id", category.id)
      .eq("status", "published")
      .range(from, to)
      .order("published_at", { ascending: false });

    if (error) throw error;

    const total = count ?? data?.length ?? 0;
    return ok({
      articles: data ?? [],
      total,
      totalPages: Number(size) > 0 ? Math.ceil(total / Number(size)) : 0,
    });
  } catch (error) {
    return rethrow(error, "Failed to fetch category articles");
  }
};

/**
 * Creates a category.
 */
export const createCategory = async (data) => {
  try {
    const { data: newCategory, error } = await supabase
      .from("categories")
      .insert({
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
      })
      .select(CATEGORY_COLUMNS)
      .single();
    if (error) throw error;
    return created(newCategory);
  } catch (error) {
    return rethrow(error, "Failed to create category");
  }
};

/**
 * Updates a category.
 */
export const editCategory = async (id, data) => {
  try {
    const { data: updated, error } = await supabase
      .from("categories")
      .update({
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
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

/**
 * Deletes a category.
 */
export const removeCategory = async (id) => {
  try {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
    return ok(true);
  } catch (error) {
    return rethrow(error, "Failed to delete category");
  }
};

export class CategoriesService extends BaseService {
  constructor() {
    super("categories");
  }
}

Object.assign(CategoriesService.prototype, {
  getCategories,
  getCategory,
  getCategoryBySlug,
  getCategoryArticles,
  createCategory,
  editCategory,
  removeCategory,
});

export const categoriesService = new CategoriesService();
export default categoriesService;
