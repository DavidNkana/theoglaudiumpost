import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import api from "@/services/api";
import dashboardServiceDefault, {
  getStats,
  getArticlesByType,
  getArticlesByCategory,
  getAdByPlacementCTR,
  getArticlesTimeline,
  getBusinessAdSummary,
  DashboardService,
  dashboardService,
} from "@/features/dashboard/DashboardService";

describe("DashboardService", () => {
  beforeEach(() => vi.clearAllMocks());

  // Table of every exported domain function: endpoint + the function under test.
  const fns = [
    ["getStats", getStats, "/dashboard/stats"],
    ["getArticlesByType", getArticlesByType, "/dashboard/articles-by-type"],
    ["getArticlesByCategory", getArticlesByCategory, "/dashboard/articles-by-category"],
    ["getAdByPlacementCTR", getAdByPlacementCTR, "/dashboard/ads-placement-ctr"],
    ["getArticlesTimeline", getArticlesTimeline, "/dashboard/articles-timeline"],
    ["getBusinessAdSummary", getBusinessAdSummary, "/dashboard/business-ad-summary"],
  ];

  describe.each(fns)("%s()", (_name, fn, endpoint) => {
    it("defaults params to {} when called without an argument", () => {
      const expected = { data: 1 };
      api.get.mockReturnValue(expected);
      const result = fn();
      expect(api.get).toHaveBeenCalledWith(endpoint, { params: {} });
      expect(result).toBe(expected);
    });

    it("forwards the supplied params object", () => {
      const params = { from: "2026-01-01", to: "2026-02-01" };
      const expected = { data: 2 };
      api.get.mockReturnValue(expected);
      const result = fn(params);
      expect(api.get).toHaveBeenCalledWith(endpoint, { params });
      expect(result).toBe(expected);
    });
  });

  it("DashboardService is a subclass of BaseService bound to the 'dashboard' resource", () => {
    const svc = new DashboardService();
    expect(svc.resource).toBe("dashboard");
    // Inherited BaseService verb uses the resource segment.
    api.get.mockReturnValue("listed");
    expect(svc.list({ q: 1 })).toBe("listed");
    expect(api.get).toHaveBeenCalledWith("/dashboard", { params: { q: 1 } });
  });

  it("exposes the domain functions on the prototype", () => {
    const svc = new DashboardService();
    api.get.mockReturnValue("ok");
    const result = svc.getStats({ live: true });
    expect(api.get).toHaveBeenCalledWith("/dashboard/stats", { params: { live: true } });
    expect(result).toBe("ok");
    expect(DashboardService.prototype.getArticlesByType).toBe(getArticlesByType);
  });

  it("dashboardService singleton delegates to the domain methods", () => {
    api.get.mockReturnValue("singleton");
    const result = dashboardService.getBusinessAdSummary();
    expect(api.get).toHaveBeenCalledWith("/dashboard/business-ad-summary", { params: {} });
    expect(result).toBe("singleton");
  });

  it("default export is the singleton instance", () => {
    expect(dashboardServiceDefault).toBe(dashboardService);
    expect(dashboardServiceDefault).toBeInstanceOf(DashboardService);
  });
});
