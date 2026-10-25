/**
 * features/announcements/AnnouncementsService.js
 *
 * Service module for managing community announcements/notices in the Laudium Biz application.
 *
 * This module:
 * - Provides functions to fetch, create, update, and delete announcements
 * - Handles announcement filtering, pagination, and search
 * - Manages announcement categories
 * - Interacts with the backend API for announcement operations
 */

import api from "@/services/api";
import { BaseService } from "@/shared/services/BaseService";

// Base API path for notices/announcements
const path = "notices";

/**
 * Fetches announcements with filtering and pagination
 *
 * @param {Object} options - Query options
 * @param {number} options.page - Page number for pagination (default: 0)
 * @param {number} options.size - Number of announcements per page (default: 10)
 * @param {string} options.search - Search query for filtering announcements
 * @param {string} options.priority - Priority filter (e.g., "high", "medium", "low")
 * @param {string} options.category - Category ID for filtering announcements
 * @param {string} options.status - Announcement status filter (e.g., "published", "draft")
 * @returns {Promise} - Promise that resolves to the API response
 */
export const getAnnouncements = ({
  page = 0,
  size = 10,
  search = "",
  priority = "",
  category = "",
  status = "",
  excludeFunerals = true,
}) =>
  api.get(
    `${path}?priority=${priority}&search=${search}&category=${category}&status=${status}&size=${size}&page=${page}&excludeFunerals=${excludeFunerals}`
  );

/**
 * Fetches a single announcement by its ID
 *
 * @param {number|string} id - The announcement ID
 * @returns {Promise} - Promise that resolves to the announcement data
 */
export const getAnnouncement = (id) => api.get(`${path}/${id}`);

/**
 * Fetches a single announcement by its slug
 *
 * @param {string} slug - The announcement slug
 * @returns {Promise} - Promise that resolves to the announcement data
 */
export const getAnnouncementBySlug = (slug) => api.get(`${path}/slug/${slug}`);

/**
 * Creates a new announcement
 *
 * @param {Object} data - The announcement data
 * @returns {Promise} - Promise that resolves to the created announcement
 */
export const createAnnouncement = (data) => api.post(`${path}/create`, data);

/**
 * Updates an existing announcement
 *
 * @param {number|string} id - The announcement ID
 * @param {Object} data - The updated announcement data
 * @returns {Promise} - Promise that resolves to the updated announcement
 */
export const editAnnouncement = (id, data) => api.put(`${path}/${id}`, data);

/**
 * Deletes an announcement
 *
 * @param {number|string} id - The announcement ID
 * @returns {Promise} - Promise that resolves when the announcement is deleted
 */
export const removeAnnouncement = (id) => api.delete(`${path}/${id}`);

/**
 * Category Management Functions
 */

/**
 * Fetches announcement categories with filtering and pagination
 *
 * @param {Object} options - Query options
 * @param {number} options.page - Page number for pagination (default: 0)
 * @param {number} options.size - Number of categories per page (default: 10)
 * @param {string} options.search - Search query for filtering categories
 * @param {string|null} options.status - Category status filter (default: null)
 * @returns {Promise} - Promise that resolves to the API response
 */
export const getCategories = ({
  page = 0,
  size = 10,
  search = "",
  status = null,
}) =>
  api.get(
    `${path}/categories?search=${search}${status ? `&status=${status}` : ""}&size=${size}&page=${page}`
  );

/**
 * Creates a new announcement category
 *
 * @param {Object} data - The category data
 * @returns {Promise} - Promise that resolves to the created category
 */
export const createCategory = (data) => api.post(`${path}/categories`, data);

/**
 * Updates an existing announcement category
 *
 * @param {number|string} id - The category ID
 * @param {Object} data - The updated category data
 * @returns {Promise} - Promise that resolves to the updated category
 */
export const editCategory = (id, data) =>
  api.put(`${path}/categories/${id}`, data);

/**
 * Changes the status of an announcement category
 *
 * @param {number|string} id - The category ID
 * @param {Object} data - The status change data
 * @param {string} data.status - The new status value
 * @returns {Promise} - Promise that resolves when the status is changed
 */
export const changeCategoryStatus = (id, data) =>
  api.put(`${path}/categories/${id}/change-status`, data);

/**
 * Deletes an announcement category
 *
 * @param {number|string} id - The category ID
 * @returns {Promise} - Promise that resolves when the category is deleted
 */
export const removeCategory = (id) => api.delete(`${path}/categories/${id}`);

export class AnnouncementsService extends BaseService {
  constructor() {
    super("notices");
  }
}

// expose the domain functions as instance methods (they don't use `this`)
Object.assign(AnnouncementsService.prototype, {
  getAnnouncements,
  getAnnouncement,
  getAnnouncementBySlug,
  createAnnouncement,
  editAnnouncement,
  removeAnnouncement,
  getCategories,
  createCategory,
  editCategory,
  changeCategoryStatus,
  removeCategory,
});

export const announcementsService = new AnnouncementsService();
export default announcementsService;
