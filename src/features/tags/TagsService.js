/**
 * features/tags/TagsService.js
 *
 * Tag data access, backed by Supabase.
 */

import { supabase, ok, created, rethrow } from "@/services/supabase.js";
import { BaseService } from "@/shared/services/BaseService";

const TAG_COLUMNS = "id, name, slug, created_at, updated_at";

/** Fetches every tag. */
export const getTags = async () => {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select(TAG_COLUMNS)
      .order("name");
    if (error) throw error;
    return ok(data ?? []);
  } catch (error) {
    return rethrow(error, "Failed to fetch tags");
  }
};

/** Fetches a single tag by id. */
export const getTag = async (id) => {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select(TAG_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return ok(data);
  } catch (error) {
    return rethrow(error, "Failed to fetch tag");
  }
};

/** Fetches a single tag by slug. */
export const getTagBySlug = async (slug) => {
  try {
    const { data, error } = await supabase
      .from("tags")
      .select(TAG_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return ok(data);
  } catch (error) {
    return rethrow(error, "Failed to fetch tag");
  }
};

/** Creates a tag. */
export const createTag = async (data) => {
  try {
    const { data: newTag, error } = await supabase
      .from("tags")
      .insert({ name: data.name, slug: data.slug })
      .select(TAG_COLUMNS)
      .single();
    if (error) throw error;
    return created(newTag);
  } catch (error) {
    return rethrow(error, "Failed to create tag");
  }
};

/** Updates a tag. */
export const editTag = async (id, data) => {
  try {
    const { data: updated, error } = await supabase
      .from("tags")
      .update({ name: data.name, slug: data.slug })
      .eq("id", id)
      .select(TAG_COLUMNS)
      .single();
    if (error) throw error;
    return ok(updated);
  } catch (error) {
    return rethrow(error, "Failed to update tag");
  }
};

/** Deletes a tag. */
export const removeTag = async (id) => {
  try {
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) throw error;
    return ok(true);
  } catch (error) {
    return rethrow(error, "Failed to delete tag");
  }
};

export class TagsService extends BaseService {
  constructor() {
    super("tags");
  }
}

Object.assign(TagsService.prototype, {
  getTags,
  getTag,
  getTagBySlug,
  createTag,
  editTag,
  removeTag,
});

export const tagsService = new TagsService();
export default tagsService;
