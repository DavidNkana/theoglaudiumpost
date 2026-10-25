/**
 * features/media/MediaService.js
 *
 * Service module for managing media in the Laudium Biz application.
 *
 * This module is the SINGLE entry point for all media API access. UI code
 * (components/views) must never call the HTTP client or build `/media/...`
 * URLs directly — it must use the methods exported here.
 *
 * This module:
 * - Provides functions to fetch media resources (JSON metadata or raw blob)
 * - Resolves displayable <img> src URLs for a given media id
 * - Handles media retrieval by ID
 * - Interacts with the backend API for media operations
 */

import api from "@/services/api";
import { BaseService } from "@/shared/services/BaseService";

// Accept header used when requesting raw image bytes from the media endpoint.
const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/*,*/*";

/**
 * Fetches media metadata (JSON) by its ID.
 *
 * @param {number|string} id - The media ID
 * @param {string} [storyType] - The article type (e.g., "top", "featured", "popular")
 * @returns {Promise} - Promise that resolves to the media response
 */
export const getMediaById = (id, storyType) => {
  // If storyType is provided, add it as a query parameter
  const params = storyType ? { storyType } : {};
  return api.get(`/media/${id}`, { params });
};

/**
 * Fetches media as a raw image blob by its ID.
 *
 * @param {number|string} id - The media ID
 * @returns {Promise<Blob>} - Promise that resolves to the image blob
 */
export const getMediaBlob = async (id) => {
  const response = await api.get(`/media/${id}`, {
    responseType: "blob",
    headers: { Accept: IMAGE_ACCEPT },
    // The media endpoint is public and 302-redirects to a CDN (Cloudinary)
    // that returns a wildcard `Access-Control-Allow-Origin: *`. A credentialed
    // request (the api client defaults to withCredentials: true) makes the
    // browser reject that wildcard, so image bytes must be fetched WITHOUT
    // credentials.
    withCredentials: false,
  });
  return response.data;
};

/**
 * Resolves a ready-to-use <img> src for a media id by fetching the image
 * bytes and wrapping them in an object URL. This is the preferred method for
 * image-placeholder components that only DISPLAY the image: it returns a
 * string usable directly as `src`.
 *
 * @param {number|string} id - The media ID
 * @returns {Promise<string>} - Promise that resolves to an object URL
 */
export const getMediaObjectUrl = async (id) => {
  const blob = await getMediaBlob(id);
  return URL.createObjectURL(blob);
};

/**
 * Resolves a media id to a base64 data URL by fetching the image bytes and
 * encoding them. Use this (instead of getMediaObjectUrl) when the value must
 * be persisted or re-submitted to the backend — e.g. pre-loading an existing
 * ad's images into an edit form, where the form re-sends the image payload.
 *
 * @param {number|string} id - The media ID
 * @returns {Promise<string>} - Promise that resolves to a base64 data URL
 */
export const getMediaDataUrl = async (id) => {
  const blob = await getMediaBlob(id);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export class MediaService extends BaseService {
  constructor() {
    super("media");
  }
}

// expose the domain functions as instance methods (they don't use `this`)
Object.assign(MediaService.prototype, {
  getMediaById,
  getMediaBlob,
  getMediaObjectUrl,
  getMediaDataUrl,
});

export const mediaService = new MediaService();
export default mediaService;
