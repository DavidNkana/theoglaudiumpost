/**
 * features/ads/AdsService.js
 *
 * Service module for managing advertisements in the Laudium Biz application.
 *
 * This module:
 * - Provides functions to fetch, create, update, and delete ads
 * - Handles ad placement and targeting
 * - Tracks ad impressions and clicks
 * - Manages ad campaigns and placements
 * - Interacts with the backend API for ad operations
 */

import api from "@/services/api";
import { BaseService } from "@/shared/services/BaseService";

/**
 * Fetches a single ad for a specific placement
 *
 * @param {string} placement - The placement location key (e.g., "home_banner")
 * @returns {Promise} - Promise that resolves to the ad data
 */
export const getAdByPlacement = (placement) =>
  api.get(`/ads/placement/${placement}`);

/**
 * Fetches ads for a specific placement filtered by tags
 *
 * @param {string} placement - The placement location key
 * @param {Array} tags - Array of tags to filter ads by
 * @returns {Promise} - Promise that resolves to the filtered ads
 */
export const getAdByPlacementAndTags = (placement, tags) =>
  api.post(`/ads/placement/${placement}`, tags);

/**
 * Fetches all ads for a specific placement
 *
 * @param {string} placement - The placement location key
 * @returns {Promise} - Promise that resolves to all ads for the placement
 */
export const getAllAdByPlacement = (placement) =>
  api.get(`/ads/placement/${placement}/all`);

/**
 * Tracks a click on an ad
 *
 * @param {number|string} id - The ad ID
 * @returns {Promise} - Promise that resolves when the click is recorded
 */
export const trackClick = (id) => api.put(`/ads/${id}/click`);

/**
 * Tracks an impression of an ad
 *
 * @param {number|string} id - The ad ID
 * @returns {Promise} - Promise that resolves when the impression is recorded
 */
export const trackImpression = (id) => api.put(`/ads/${id}/impression`);

// Admin Functions
/**
 * Fetches ads with filtering and pagination
 *
 * @param {Object} options - Query options
 * @param {number} options.page - Page number for pagination (default: 0)
 * @param {number} options.size - Number of ads per page (default: 10)
 * @param {string} options.search - Search query for filtering ads
 * @param {string} options.status - Ad status filter (e.g., "active", "inactive")
 * @param {string} options.placement - Placement location filter
 * @returns {Promise} - Promise that resolves to the filtered ads
 */
export const getAds = ({
  page = 0,
  size = 10,
  search = "",
  status = "",
  placement = "",
}) =>
  api.get("/ads", {
    params: {
      search,
      placement,
      status,
      size,
      page,
    },
  });

/**
 * Fetches a single ad by its ID
 *
 * @param {number|string} id - The ad ID
 * @returns {Promise} - Promise that resolves to the ad data
 */
export const getAd = (id) => api.get(`/ads/${id}`);

/**
 * Creates a new ad
 *
 * @param {Object} data - The ad data
 * @returns {Promise} - Promise that resolves to the created ad
 */
export const createAd = (data) => api.post("/ads/create", data);

/**
 * Updates an existing ad
 *
 * @param {number|string} id - The ad ID
 * @param {Object} data - The updated ad data
 * @returns {Promise} - Promise that resolves to the updated ad
 */
export const editAd = (id, data) => api.put(`/ads/${id}`, data);

/**
 * Deletes an ad
 *
 * @param {number|string} id - The ad ID
 * @returns {Promise} - Promise that resolves when the ad is deleted
 */
export const removeAd = (id) => api.delete(`/ads/${id}`);

/**
 * Campaign Management Functions
 */

/**
 * Fetches ad campaigns with filtering
 *
 * @param {string} tab - Tab filter (default: "all")
 * @param {string} page - Page number for pagination (default: "0")
 * @param {string} search - Search query for filtering campaigns
 * @param {string} category - Category filter
 * @returns {Promise} - Promise that resolves to the filtered campaigns
 */
export const getCampaigns = (
  tab = "all",
  page = "0",
  search = "",
  category = ""
) => api.get(`/campaigns?search=${search}`);

/**
 * Creates a new ad campaign
 *
 * @param {Object} data - The campaign data
 * @returns {Promise} - Promise that resolves to the created campaign
 */
export const createCampaign = (data) => api.post("/campaigns/create", data);

/**
 * Updates an existing ad campaign
 *
 * @param {number|string} id - The campaign ID
 * @param {Object} data - The updated campaign data
 * @returns {Promise} - Promise that resolves to the updated campaign
 */
export const editCampaign = (id, data) => api.put(`/campaigns/${id}`, data);

/**
 * Deletes an ad campaign
 *
 * @param {number|string} id - The campaign ID
 * @returns {Promise} - Promise that resolves when the campaign is deleted
 */
export const removeCampaign = (id) => api.delete(`/campaigns/${id}`);

/**
 * Ad Placement Management Functions
 */

/**
 * Fetches all available ad placement locations
 *
 * @returns {Promise} - Promise that resolves to the list of placement locations
 */
export const getPlacements = () => api.get("/ads/placements");

/**
 * Fetches ad placements with filtering and pagination
 *
 * @param {Object} options - Query options
 * @param {string} options.page - Page number for pagination (default: "0")
 * @param {string} options.size - Number of placements per page (default: "10")
 * @param {string} options.search - Search query for filtering placements
 * @param {string} options.status - Status filter (e.g., "active", "inactive")
 * @returns {Promise} - Promise that resolves to the filtered placements
 */
export const getAdPlacements = ({
  page = "0",
  size = "10",
  search = "",
  status = "",
}) =>
  api.get(
    `/ad-placements?search=${search}&status=${status}&size=${size}&page=${page}`
  );

export const getAdPlacement = (id) => api.get(`/ad-placements/${id}`);

/**
 * Creates a new ad placement
 *
 * @param {Object} data - The placement data
 * @returns {Promise} - Promise that resolves to the created placement
 */
export const createAdPlacement = (data) =>
  api.post("/ad-placements/create", data);

/**
 * Updates an existing ad placement
 *
 * @param {number|string} id - The placement ID
 * @param {Object} data - The updated placement data
 * @returns {Promise} - Promise that resolves to the updated placement
 */
export const editAdPlacement = (id, data) =>
  api.put(`/ad-placements/${id}`, data);

/**
 * Deletes an ad placement
 *
 * @param {number|string} id - The placement ID
 * @returns {Promise} - Promise that resolves when the placement is deleted
 */
export const removeAdPlacement = (id) => api.delete(`/ad-placements/${id}`);

export class AdsService extends BaseService {
  constructor() {
    super("ads");
  }
}

// expose the domain functions as instance methods (they don't use `this`)
Object.assign(AdsService.prototype, {
  getAdByPlacement,
  getAdByPlacementAndTags,
  getAllAdByPlacement,
  trackClick,
  trackImpression,
  getAds,
  getAd,
  createAd,
  editAd,
  removeAd,
  getCampaigns,
  createCampaign,
  editCampaign,
  removeCampaign,
  getPlacements,
  getAdPlacements,
  getAdPlacement,
  createAdPlacement,
  editAdPlacement,
  removeAdPlacement,
});

export const adsService = new AdsService();
export default adsService;
