import api from "@/services/api";
import { BaseService } from "@/shared/services/BaseService";

// Ads
export const getStats = (params = {}) => api.get("/dashboard/stats", { params });
export const getArticlesByType = (params = {}) => api.get("/dashboard/articles-by-type", { params });
export const getArticlesByCategory = (params = {}) =>
  api.get("/dashboard/articles-by-category", { params });

export const getAdByPlacementCTR = (params = {}) =>
  api.get("/dashboard/ads-placement-ctr", { params });

export const getArticlesTimeline = (params = {}) =>
  api.get("/dashboard/articles-timeline", { params });
export const getBusinessAdSummary = (params = {}) =>
  api.get("/dashboard/business-ad-summary", { params });

export class DashboardService extends BaseService {
  constructor() {
    super("dashboard");
  }
}

// expose the domain functions as instance methods (they don't use `this`)
Object.assign(DashboardService.prototype, {
  getStats,
  getArticlesByType,
  getArticlesByCategory,
  getAdByPlacementCTR,
  getArticlesTimeline,
  getBusinessAdSummary,
});

export const dashboardService = new DashboardService();
export default dashboardService;
