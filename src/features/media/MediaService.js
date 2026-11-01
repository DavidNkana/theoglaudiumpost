/**
 * features/media/MediaService.js
 *
 * Image access and uploads against Supabase Storage.
 *
 * Article covers and ad creatives live in the public "public-media" bucket and
 * are described by rows in the media table. Uploading is an admin action and
 * is enforced by the bucket's storage policy.
 */

import { supabase, ok, created, rethrow, publicMediaUrl, MEDIA_BUCKET } from "@/services/supabase.js";
import { BaseService } from "@/shared/services/BaseService";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/*,*/*";

/**
 * Fetches a media record by id.
 *
 * @param {string} id - Media id
 * @param {string} storyType - Optional story type, used to pick a variant
 * @returns {Promise} - Promise resolving to { status, data: media }
 */
export const getMediaById = async (id, storyType) => {
  try {
    const columns =
      "id, file, storage_path, file_type, story_type, upload_type, created_at";

    // Prefer a variant that matches the story type, but fall back to the
    // media row itself: an article has one cover image, and a card asking for
    // a different story type must still render it.
    let query = supabase.from("media").select(columns).eq("id", id);
    if (storyType) query = query.eq("story_type", storyType);

    let { data, error } = await query.maybeSingle();
    if (error) throw error;

    if (!data && storyType) {
      const fallback = await supabase
        .from("media")
        .select(columns)
        .eq("id", id)
        .maybeSingle();
      if (fallback.error) throw fallback.error;
      data = fallback.data;
    }

    if (!data) {
      const err = new Error("Media not found");
      err.response = { status: 404, data: { message: "Media not found" } };
      throw err;
    }

    return ok({ ...data, file: publicMediaUrl(data.storage_path || data.file) });
  } catch (error) {
    return rethrow(error, "Failed to fetch media");
  }
};

/**
 * Resolves a media reference to a usable URL.
 *
 * A reference is either a media id (uuid) or a direct URL. Both occur in the
 * UI: article covers are stored as media rows, ad creatives as plain URLs.
 */
const resolveUrl = async (reference) => {
  if (!reference) return null;
  if (/^https?:\/\//i.test(reference)) return reference;

  const { data } = await supabase
    .from("media")
    .select("file, storage_path")
    .eq("id", reference)
    .maybeSingle();

  if (!data) return null;
  return publicMediaUrl(data.storage_path || data.file);
};

/**
 * Fetches an image as a blob, from a media id or a direct URL.
 */
export const getMediaBlob = async (reference) => {
  try {
    const url = await resolveUrl(reference);
    if (!url) {
      const err = new Error("Media not found");
      err.response = { status: 404, data: { message: "Media not found" } };
      throw err;
    }

    const response = await fetch(url, {
      headers: { Accept: IMAGE_ACCEPT },
    });
    if (!response.ok) {
      const err = new Error(`Failed to load media (${response.status})`);
      err.response = { status: response.status, data: { message: err.message } };
      throw err;
    }
    return await response.blob();
  } catch (error) {
    return rethrow(error, "Failed to fetch media");
  }
};

/**
 * Fetches an image and wraps it in an object URL for display.
 */
export const getMediaObjectUrl = async (reference) => {
  const blob = await getMediaBlob(reference);
  return URL.createObjectURL(blob);
};

/**
 * Fetches an image and converts it to a data URL.
 */
export const getMediaDataUrl = async (reference) => {
  const blob = await getMediaBlob(reference);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Uploads an image to the public media bucket and records it in the media table.
 *
 * @param {File} file - The image file
 * @param {string} storyType - Story type the image belongs to
 * @returns {Promise} - Promise resolving to { status, data: media }
 */
export const uploadMedia = async (file, storyType = "latest") => {
  try {
    if (!file) {
      const err = new Error("No file provided");
      err.response = { status: 400, data: { message: "No file provided" } };
      throw err;
    }

    const extension = (file.name?.split(".").pop() || "jpg").toLowerCase();
    const path = `${storyType}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) throw uploadError;

    const { data: record, error } = await supabase
      .from("media")
      .insert({
        file: publicMediaUrl(path),
        storage_path: path,
        file_type: file.type ?? null,
        story_type: storyType,
        upload_type: "manual",
      })
      .select("id, file, storage_path, file_type, story_type")
      .single();

    if (error) throw error;

    return created({ ...record, file: publicMediaUrl(path) });
  } catch (error) {
    return rethrow(error, "Failed to upload media");
  }
};

/**
 * Uploads an image supplied as a data URL and returns the stored media row.
 *
 * The admin ad form hands over base64 images; they are persisted to storage
 * so the database only ever holds URLs.
 *
 * @param {string} dataUrl - A "data:image/..." URL
 * @param {string} storyType - Story type the image belongs to
 * @returns {Promise} - Promise resolving to the media row
 */
export const uploadDataUrl = async (dataUrl, storyType = "ad") => {
  try {
    if (!dataUrl || typeof dataUrl !== "string") {
      const err = new Error("No image provided");
      err.response = { status: 400, data: { message: "No image provided" } };
      throw err;
    }

    const response = await fetch(dataUrl);
    const blob = await response.blob();

    const extension = blob.type?.split("/")[1] || "png";
    const file = new File([blob], `upload-${Date.now()}.${extension}`, {
      type: blob.type || "image/png",
    });

    const uploaded = await uploadMedia(file, storyType);
    return uploaded.data;
  } catch (error) {
    return rethrow(error, "Failed to upload image");
  }
};

/**
 * Removes a media record and its file.
 */
export const removeMedia = async (id) => {
  try {
    const { data } = await supabase
      .from("media")
      .select("storage_path, file")
      .eq("id", id)
      .maybeSingle();

    if (data?.storage_path) {
      await supabase.storage.from(MEDIA_BUCKET).remove([data.storage_path]);
    }

    const { error } = await supabase.from("media").delete().eq("id", id);
    if (error) throw error;
    return ok(true);
  } catch (error) {
    return rethrow(error, "Failed to remove media");
  }
};

export class MediaService extends BaseService {
  constructor() {
    super("media");
  }
}

Object.assign(MediaService.prototype, {
  getMediaById,
  getMediaBlob,
  getMediaObjectUrl,
  getMediaDataUrl,
  uploadMedia,
  uploadDataUrl,
  removeMedia,
});

export const mediaService = new MediaService();
export default mediaService;
