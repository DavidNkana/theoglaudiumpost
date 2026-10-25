import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import api from "@/services/api";
import {
  getBusinessStats,
  getBusinessSpendData,
  getBusinessPlacementData,
  getBusinessPerformanceData,
  getBusinessRecentAds,
  getBusinessRecentPayments,
  BusinessDashboardService,
  businessDashboardService,
} from "@/features/businesses/BusinessDashboardService";

describe("BusinessDashboardService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getBusinessStats() requests the stats endpoint for the id", () => {
    const promise = Promise.resolve({ data: { ok: true } });
    api.get.mockReturnValue(promise);
    const result = getBusinessStats(42);
    expect(api.get).toHaveBeenCalledWith("/business-dashboard/42/stats");
    expect(result).toBe(promise);
  });

  it("getBusinessSpendData() defaults the period to month when omitted", () => {
    api.get.mockResolvedValue({ data: {} });
    getBusinessSpendData(7);
    expect(api.get).toHaveBeenCalledWith(
      "/business-dashboard/7/spend-over-time?period=month"
    );
  });

  it("getBusinessSpendData() forwards an explicit period", () => {
    api.get.mockResolvedValue({ data: {} });
    getBusinessSpendData(7, "year");
    expect(api.get).toHaveBeenCalledWith(
      "/business-dashboard/7/spend-over-time?period=year"
    );
  });

  it("getBusinessPlacementData() requests the per-placement endpoint", () => {
    api.get.mockResolvedValue({ data: {} });
    getBusinessPlacementData(3);
    expect(api.get).toHaveBeenCalledWith(
      "/business-dashboard/3/spend-per-placement"
    );
  });

  it("getBusinessPerformanceData() defaults the period to month when omitted", () => {
    api.get.mockResolvedValue({ data: {} });
    getBusinessPerformanceData(9);
    expect(api.get).toHaveBeenCalledWith(
      "/business-dashboard/9/clicks-and-impressions?period=month"
    );
  });

  it("getBusinessPerformanceData() forwards an explicit period", () => {
    api.get.mockResolvedValue({ data: {} });
    getBusinessPerformanceData(9, "week");
    expect(api.get).toHaveBeenCalledWith(
      "/business-dashboard/9/clicks-and-impressions?period=week"
    );
  });

  it("getBusinessRecentAds() defaults the limit to 5 when omitted", () => {
    api.get.mockResolvedValue({ data: {} });
    getBusinessRecentAds();
    expect(api.get).toHaveBeenCalledWith(
      "/business/dashboard/recent-ads?limit=5"
    );
  });

  it("getBusinessRecentAds() forwards an explicit limit", () => {
    api.get.mockResolvedValue({ data: {} });
    getBusinessRecentAds(10);
    expect(api.get).toHaveBeenCalledWith(
      "/business/dashboard/recent-ads?limit=10"
    );
  });

  it("getBusinessRecentPayments() defaults the limit to 5 when omitted", () => {
    api.get.mockResolvedValue({ data: {} });
    getBusinessRecentPayments(2);
    expect(api.get).toHaveBeenCalledWith(
      "/business-dashboard/2/recent-payments?limit=5"
    );
  });

  it("getBusinessRecentPayments() forwards an explicit limit", () => {
    api.get.mockResolvedValue({ data: {} });
    getBusinessRecentPayments(2, 25);
    expect(api.get).toHaveBeenCalledWith(
      "/business-dashboard/2/recent-payments?limit=25"
    );
  });

  it("propagates rejection from the underlying client (catch/error path)", async () => {
    const err = new Error("network down");
    api.get.mockRejectedValue(err);
    await expect(getBusinessStats(1)).rejects.toBe(err);
  });

  describe("BusinessDashboardService class", () => {
    it("constructs with the business-dashboard resource and shared api", () => {
      const svc = new BusinessDashboardService();
      expect(svc.resource).toBe("business-dashboard");
      expect(svc.api).toBe(api);
    });

    it("inherits BaseService REST verbs", () => {
      const svc = new BusinessDashboardService();
      api.get.mockResolvedValue({ data: {} });
      api.post.mockResolvedValue({ data: {} });
      api.put.mockResolvedValue({ data: {} });
      api.delete.mockResolvedValue({ data: {} });

      svc.list({ q: 1 });
      expect(api.get).toHaveBeenCalledWith("/business-dashboard", {
        params: { q: 1 },
      });

      svc.get(5);
      expect(api.get).toHaveBeenCalledWith("/business-dashboard/5");

      svc.create({ name: "x" });
      expect(api.post).toHaveBeenCalledWith("/business-dashboard/create", {
        name: "x",
      });

      svc.update(5, { name: "y" });
      expect(api.put).toHaveBeenCalledWith("/business-dashboard/5", {
        name: "y",
      });

      svc.remove(5);
      expect(api.delete).toHaveBeenCalledWith("/business-dashboard/5");
    });

    it("exposes the domain functions as instance methods", () => {
      const svc = new BusinessDashboardService();
      api.get.mockResolvedValue({ data: {} });

      svc.getBusinessStats(11);
      expect(api.get).toHaveBeenCalledWith("/business-dashboard/11/stats");

      svc.getBusinessSpendData(11);
      expect(api.get).toHaveBeenCalledWith(
        "/business-dashboard/11/spend-over-time?period=month"
      );

      svc.getBusinessPlacementData(11);
      expect(api.get).toHaveBeenCalledWith(
        "/business-dashboard/11/spend-per-placement"
      );

      svc.getBusinessPerformanceData(11);
      expect(api.get).toHaveBeenCalledWith(
        "/business-dashboard/11/clicks-and-impressions?period=month"
      );

      svc.getBusinessRecentAds();
      expect(api.get).toHaveBeenCalledWith(
        "/business/dashboard/recent-ads?limit=5"
      );

      svc.getBusinessRecentPayments(11);
      expect(api.get).toHaveBeenCalledWith(
        "/business-dashboard/11/recent-payments?limit=5"
      );
    });
  });

  it("businessDashboardService singleton is an instance and delegates", () => {
    expect(businessDashboardService).toBeInstanceOf(BusinessDashboardService);
    api.get.mockResolvedValue({ data: {} });
    businessDashboardService.getBusinessStats(99);
    expect(api.get).toHaveBeenCalledWith("/business-dashboard/99/stats");
  });
});
