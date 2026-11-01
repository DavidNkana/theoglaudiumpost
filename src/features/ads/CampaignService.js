/**
 * features/ads/CampaignService.js
 *
 * Campaign data access, backed by Supabase.
 *
 * A campaign groups the ads an administrator has entered for one customer.
 */

import {
  supabase,
  ok,
  created,
  rethrow,
  withAliases,
  withAliasesAll,
} from "@/services/supabase.js";
import { BaseService } from "@/shared/services/BaseService";

const CAMPAIGN_COLUMNS =
  "id, name, business_id, status, payment_status, start_date, end_date, budget, created_at, updated_at";

/**
 * Fetches campaigns with filtering and pagination.
 */
export const getCampaigns = async ({
  page = 0,
  size = 100,
  search = "",
  status = "",
  payment_status = "",
} = {}) => {
  try {
    const from = Number(page) * Number(size);
    const to = from + Number(size) - 1;

    let query = supabase
      .from("campaigns")
      .select(CAMPAIGN_COLUMNS, { count: "exact" })
      .range(from, to);

    if (status) query = query.eq("status", status);
    if (payment_status) query = query.eq("payment_status", payment_status);
    if (search) {
      const term = String(search).replace(/[%,]/g, " ").trim();
      if (term) query = query.or(`name.ilike.%${term}%`);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count ?? data?.length ?? 0;
    const totalPages = Number(size) > 0 ? Math.ceil(total / Number(size)) : 0;

    return ok({ campaigns: withAliasesAll(data ?? []), total, totalPages });
  } catch (error) {
    return rethrow(error, "Failed to fetch campaigns");
  }
};

/** Fetches a single campaign. */
export const getCampaign = async (id) => {
  try {
    const { data, error } = await supabase
      .from("campaigns")
      .select(CAMPAIGN_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return ok(withAliases(data));
  } catch (error) {
    return rethrow(error, "Failed to fetch campaign");
  }
};

/** Creates a campaign. */
export const createCampaign = async (data) => {
  try {
    const { data: newCampaign, error } = await supabase
      .from("campaigns")
      .insert({
        name: data.name,
        business_id: data.business_id ?? data.businessId ?? null,
        status: data.status ?? "active",
        payment_status: data.payment_status ?? data.paymentStatus ?? null,
        start_date: data.start_date ?? data.startTime ?? null,
        end_date: data.end_date ?? data.endTime ?? null,
        budget: data.budget ?? data.amount ?? 0,
      })
      .select(CAMPAIGN_COLUMNS)
      .single();
    if (error) throw error;
    return created(withAliases(newCampaign));
  } catch (error) {
    return rethrow(error, "Failed to create campaign");
  }
};

/** Updates a campaign. */
export const editCampaign = async (id, data) => {
  try {
    const { data: updated, error } = await supabase
      .from("campaigns")
      .update({
        name: data.name,
        business_id: data.business_id ?? data.businessId ?? null,
        status: data.status ?? "active",
        payment_status: data.payment_status ?? data.paymentStatus ?? null,
        start_date: data.start_date ?? data.startTime ?? null,
        end_date: data.end_date ?? data.endTime ?? null,
        budget: data.budget ?? data.amount ?? 0,
      })
      .eq("id", id)
      .select(CAMPAIGN_COLUMNS)
      .single();
    if (error) throw error;
    return ok(withAliases(updated));
  } catch (error) {
    return rethrow(error, "Failed to update campaign");
  }
};

/** Deletes a campaign. */
export const deleteCampaign = async (id) => {
  try {
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) throw error;
    return ok(true);
  } catch (error) {
    return rethrow(error, "Failed to delete campaign");
  }
};

export class CampaignService extends BaseService {
  constructor() {
    super("campaigns");
  }
}

Object.assign(CampaignService.prototype, {
  getCampaigns,
  getCampaign,
  createCampaign,
  editCampaign,
  deleteCampaign,
});

export const campaignService = new CampaignService();
export default campaignService;
