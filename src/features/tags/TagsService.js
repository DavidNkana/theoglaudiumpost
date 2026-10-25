/**
 * features/tags/TagsService.js
 *
 * Service module for managing content tags in the Laudium Biz application.
 *
 * This module:
 * - Provides functions to fetch, create, update, and delete tags
 * - Supports tag lookup by ID and slug
 * - Interacts with the backend API for tag operations
 */

import api from "@/services/api";
import { BaseService } from "@/shared/services/BaseService";

/**
 * Fetches all tags
 *
 * @returns {Promise} - Promise that resolves to the list of tags
 */
export const getTags = () => api.get("/tags");

/**
 * Fetches a single tag by its ID
 *
 * @param {number|string} id - The tag ID
 * @returns {Promise} - Promise that resolves to the tag data
 */
export const getTag = (id) => api.get(`/tags/${id}`);

/**
 * Fetches a single tag by its slug
 *
 * @param {string} slug - The tag slug
 * @returns {Promise} - Promise that resolves to the tag data
 */
export const getTagBySlug = (slug) => api.get(`/tags/slug/${slug}`);

/**
 * Creates a new tag
 *
 * @param {Object} data - The tag data
 * @returns {Promise} - Promise that resolves to the created tag
 */
export const createTag = (data) => api.post("/tags/create", data);

/**
 * Updates an existing tag
 *
 * @param {number|string} id - The tag ID
 * @param {Object} data - The updated tag data
 * @returns {Promise} - Promise that resolves to the updated tag
 */
export const editTag = (id, data) => api.put(`/tags/${id}`, data);

/**
 * Deletes a tag
 *
 * @param {number|string} id - The tag ID
 * @returns {Promise} - Promise that resolves when the tag is deleted
 */
export const removeTag = (id) => api.delete(`/tags/${id}`);

export class TagsService extends BaseService {
  constructor() {
    super("tags");
  }
}

// expose the domain functions as instance methods (they don't use `this`)
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
