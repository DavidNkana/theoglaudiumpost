/**
 * features/businesses/BusinessDashboardService.js
 *
 * Service module for business dashboard data in the Laudium Biz application.
 *
 * This module:
 * - Provides functions to fetch business dashboard statistics and analytics
 * - Handles business-specific data for the dashboard
 * - Interacts with the backend API for business dashboard operations
 */

import api from "@/services/api";
import { BaseService } from "@/shared/services/BaseService";

/**
 * Fetches business dashboard statistics
 *
 * @returns {Promise} - Promise that resolves to the business dashboard stats
 */
export const getBusinessStats = (id) =>
  api.get(`/business-dashboard/${id}/stats`);

/**
 * Fetches business ad spend data over time
 *
 * @param {string} period - Time period for data (e.g., "month", "year")
 * @returns {Promise} - Promise that resolves to the spend data
 */
export const getBusinessSpendData = (id, period = "month") =>
  api.get(`/business-dashboard/${id}/spend-over-time?period=${period}`);

/**
 * Fetches business ad performance by placement
 *
 * @returns {Promise} - Promise that resolves to the placement performance data
 */
export const getBusinessPlacementData = (id) =>
  api.get(`/business-dashboard/${id}/spend-per-placement`);

/**
 * Fetches business ad clicks and impressions over time
 *
 * @param {string} period - Time period for data (e.g., "month", "year")
 * @returns {Promise} - Promise that resolves to the performance data
 */
export const getBusinessPerformanceData = (id, period = "month") =>
  api.get(`/business-dashboard/${id}/clicks-and-impressions?period=${period}`);

/**
 * Fetches recent ads for the business
 *
 * @param {number} limit - Number of ads to fetch
 * @returns {Promise} - Promise that resolves to the recent ads
 */
export const getBusinessRecentAds = (limit = 5) =>
  api.get(`/business/dashboard/recent-ads?limit=${limit}`);

/**
 * Fetches recent payments for the business
 *
 * @param {number} limit - Number of payments to fetch
 * @returns {Promise} - Promise that resolves to the recent payments
 */
export const getBusinessRecentPayments = (id, limit = 5) =>
  api.get(`/business-dashboard/${id}/recent-payments?limit=${limit}`);

export class BusinessDashboardService extends BaseService {
  constructor() {
    super("business-dashboard");
  }
}

// expose the domain functions as instance methods (they don't use `this`)
Object.assign(BusinessDashboardService.prototype, {
  getBusinessStats,
  getBusinessSpendData,
  getBusinessPlacementData,
  getBusinessPerformanceData,
  getBusinessRecentAds,
  getBusinessRecentPayments,
});

export const businessDashboardService = new BusinessDashboardService();
export default businessDashboardService;
