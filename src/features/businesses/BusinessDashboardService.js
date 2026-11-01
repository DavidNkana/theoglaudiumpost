/**
 * features/businesses/BusinessDashboardService.js
 *
 * Read-only reporting for a business account, backed by Supabase.
 *
 * Ads are entered by administrators. A business account sees the ads that
 * were entered for them and how they performed.
 */

import { supabase, ok, rethrow } from "@/services/supabase.js";
import { BaseService } from "@/shared/services/BaseService";

/**
 * Headline numbers for a business.
 */
export const getBusinessStats = async (id) => {
  try {
    const [adsResult, paymentsResult] = await Promise.all([
      supabase
        .from("ads")
        .select("id, status, impressions, clicks, amount")
        .eq("business_id", id),
      supabase
        .from("payments")
        .select("id, amount, status")
        .eq("business_id", id),
    ]);

    if (adsResult.error) throw adsResult.error;
    if (paymentsResult.error) throw paymentsResult.error;

    const adRows = adsResult.data ?? [];
    const paymentRows = paymentsResult.data ?? [];

    return ok({
      totalAds: adRows.length,
      activeAds: adRows.filter((ad) => ad.status === "active").length,
      impressions: adRows.reduce((sum, ad) => sum + (ad.impressions ?? 0), 0),
      clicks: adRows.reduce((sum, ad) => sum + (ad.clicks ?? 0), 0),
      ctr:
        adRows.reduce((sum, ad) => sum + (ad.impressions ?? 0), 0) > 0
          ? (adRows.reduce((sum, ad) => sum + (ad.clicks ?? 0), 0) /
              adRows.reduce((sum, ad) => sum + (ad.impressions ?? 0), 0)) *
            100
          : 0,
      totalSpend: paymentRows
        .filter((payment) => payment.status === "paid")
        .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0),
    });
  } catch (error) {
    return rethrow(error, "Failed to fetch business stats");
  }
};

/**
 * Spend over time for a business.
 */
export const getBusinessSpendData = async (id, period = "month") => {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select("amount, paid_at, created_at, status")
      .eq("business_id", id)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const buckets = new Map();
    (data ?? []).forEach((payment) => {
      const stamp = payment.paid_at || payment.created_at;
      if (!stamp) return;
      const date = new Date(stamp);
      const key =
        period === "year"
          ? `${date.getFullYear()}`
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      const current = buckets.get(key) ?? { period: key, amount: 0, count: 0 };
      current.amount += Number(payment.amount ?? 0);
      current.count += 1;
      buckets.set(key, current);
    });

    return ok([...buckets.values()]);
  } catch (error) {
    return rethrow(error, "Failed to fetch business spend");
  }
};

/**
 * Spend per placement for a business.
 */
export const getBusinessPlacementData = async (id) => {
  try {
    const { data, error } = await supabase
      .from("ads")
      .select(
        "id, amount, impressions, clicks, placement:ad_placements ( id, name )",
      )
      .eq("business_id", id);
    if (error) throw error;

    const buckets = new Map();
    (data ?? []).forEach((ad) => {
      const name = ad.placement?.name ?? "Unassigned";
      const current = buckets.get(name) ?? {
        placement: name,
        amount: 0,
        impressions: 0,
        clicks: 0,
      };
      current.amount += Number(ad.amount ?? 0);
      current.impressions += ad.impressions ?? 0;
      current.clicks += ad.clicks ?? 0;
      buckets.set(name, current);
    });

    return ok([...buckets.values()]);
  } catch (error) {
    return rethrow(error, "Failed to fetch business placement data");
  }
};

/**
 * Clicks and impressions over time for a business.
 */
export const getBusinessPerformanceData = async (id, period = "month") => {
  try {
    const { data, error } = await supabase
      .from("ads")
      .select("id, impressions, clicks, created_at")
      .eq("business_id", id)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const buckets = new Map();
    (data ?? []).forEach((ad) => {
      if (!ad.created_at) return;
      const date = new Date(ad.created_at);
      const key =
        period === "year"
          ? `${date.getFullYear()}`
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      const current = buckets.get(key) ?? {
        period: key,
        clicks: 0,
        impressions: 0,
      };
      current.clicks += ad.clicks ?? 0;
      current.impressions += ad.impressions ?? 0;
      buckets.set(key, current);
    });

    return ok([...buckets.values()]);
  } catch (error) {
    return rethrow(error, "Failed to fetch business performance");
  }
};

/**
 * The most recent ads for a business.
 */
export const getBusinessRecentAds = async (limit = 5, businessId = null) => {
  try {
    let query = supabase
      .from("ads")
      .select(
        "id, title, status, impressions, clicks, amount, placement_date, expiry_date, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(Number(limit) || 5);

    if (businessId) query = query.eq("business_id", businessId);

    const { data, error } = await query;
    if (error) throw error;
    return ok(data ?? []);
  } catch (error) {
    return rethrow(error, "Failed to fetch recent ads");
  }
};

/**
 * The most recent payments for a business.
 */
export const getBusinessRecentPayments = async (id, limit = 5) => {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select(
        "id, amount, currency, status, reference, payment_method, paid_at, created_at",
      )
      .eq("business_id", id)
      .order("created_at", { ascending: false })
      .limit(Number(limit) || 5);
    if (error) throw error;
    return ok(data ?? []);
  } catch (error) {
    return rethrow(error, "Failed to fetch recent payments");
  }
};

export class BusinessDashboardService extends BaseService {
  constructor() {
    super("business-dashboard");
  }
}

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
