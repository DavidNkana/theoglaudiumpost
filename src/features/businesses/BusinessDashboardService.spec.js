import { describe, it, expect, vi, beforeEach } from "vitest";
import { callsTo } from "../../../tests/helpers/supabaseMock.js";

const state = vi.hoisted(() => ({
  tables: {},
  builders: {},
  session: null,
  user: null,
}));

vi.mock("@/services/supabase.js", async () => {
  const { buildSupabaseModule } = await import(
    "../../../tests/helpers/supabaseModuleMock.js"
  );
  return buildSupabaseModule(state);
});

import {
  getBusinessStats,
  getBusinessSpendData,
  getBusinessPlacementData,
  getBusinessPerformanceData,
  getBusinessRecentAds,
  getBusinessRecentPayments,
} from "@/features/businesses/BusinessDashboardService.js";

describe("features/businesses/BusinessDashboardService", () => {
  beforeEach(reset);

  it("summarises a business", async () => {
    state.tables.ads = {
      data: [
        { id: "ad1", status: "active", impressions: 100, clicks: 5, amount: 500 },
        { id: "ad2", status: "paused", impressions: 0, clicks: 0, amount: 0 },
      ],
      error: null,
    };
    state.tables.payments = {
      data: [{ id: "pay1", amount: 500, status: "paid" }],
      error: null,
    };

    const response = await getBusinessStats("b1");

    expect(response.data.totalAds).toBe(2);
    expect(response.data.activeAds).toBe(1);
    expect(response.data.impressions).toBe(100);
    expect(response.data.ctr).toBe(5);
    expect(response.data.totalSpend).toBe(500);
  });

  it("buckets spend over time by month", async () => {
    state.tables.payments = {
      data: [{ amount: 500, created_at: "2026-01-15T00:00:00Z", status: "paid" }],
      error: null,
    };

    const response = await getBusinessSpendData("b1", "month");

    expect(response.data[0].period).toBe("2026-01");
    expect(response.data[0].amount).toBe(500);
  });

  it("buckets spend by placement", async () => {
    state.tables.ads = {
      data: [
        {
          id: "ad1",
          amount: 500,
          impressions: 10,
          clicks: 1,
          placement: { id: "p1", name: "news_articles" },
        },
      ],
      error: null,
    };

    const response = await getBusinessPlacementData("b1");

    expect(response.data[0].placement).toBe("news_articles");
    expect(response.data[0].amount).toBe(500);
  });

  it("buckets clicks and impressions over time", async () => {
    state.tables.ads = {
      data: [
        { id: "ad1", impressions: 10, clicks: 1, created_at: "2026-01-15T00:00:00Z" },
      ],
      error: null,
    };

    const response = await getBusinessPerformanceData("b1", "year");

    expect(response.data[0].period).toBe("2026");
    expect(response.data[0].clicks).toBe(1);
  });

  it("lists the most recent ads", async () => {
    state.tables.ads = { data: [{ id: "ad1" }], error: null };

    const response = await getBusinessRecentAds(5);

    expect(response.data).toHaveLength(1);
  });

  it("lists the most recent payments", async () => {
    state.tables.payments = { data: [{ id: "pay1" }], error: null };

    const response = await getBusinessRecentPayments("b1", 5);

    expect(response.data).toHaveLength(1);
  });

  it("rejects when the query fails", async () => {
    state.tables.ads = { data: null, error: { message: "denied" } };

    await expect(getBusinessStats("b1")).rejects.toThrow("denied");
  });
});

const reset = () => {
  state.tables = {};
  Object.keys(state.builders).forEach((key) => delete state.builders[key]);
  state.session = null;
  state.user = null;
};
