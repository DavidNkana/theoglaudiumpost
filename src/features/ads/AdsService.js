/**
 * features/ads/AdsService.js
 *
 * Ad data access for the Laudium Post application, backed by Supabase.
 *
 * Every ad is entered and scheduled by an administrator in the admin
 * dashboard. There is no business self-service ad flow in this system.
 *
 * Responses keep the axios-shaped `{ status, data }` contract the UI expects.
 */

import {
  supabase,
  ok,
  created,
  rethrow,
  withAliases,
  withAliasesAll,
} from "@/services/supabase.js";
import { uploadDataUrl } from "@/features/media/MediaService.js";
import { BaseService } from "@/shared/services/BaseService";

/** Columns selected when reading an ad. */
const AD_COLUMNS =
  "id, title, description, business_name, business_id, campaign_id, image_url, images, " +
  "video_url, click_url, placement_id, status, placement_date, expiry_date, amount, " +
  "payment_status, payment_reference, payment_method, customer_name, customer_email, " +
  "customer_phone, notes, tags, impressions, clicks, total_cost, created_at, updated_at, " +
  "placement:ad_placements ( id, name, placement_info )";

/**
 * Resolves placement names to their database ids.
 *
 * The UI addresses placements by name ("sidebar_top"), the database stores a
 * uuid. The lookup is cached because it never changes at runtime.
 */
let placementCache = null;

const getPlacementIds = async (names) => {
  const wanted = (Array.isArray(names) ? names : [names]).filter(Boolean);
  if (!wanted.length) return {};

  if (!placementCache) {
    const { data } = await supabase
      .from("ad_placements")
      .select("id, name, placement_info, status");
    placementCache = data ?? [];
  }

  return placementCache.reduce((acc, placement) => {
    if (wanted.includes(placement.name)) acc[placement.name] = placement.id;
    return acc;
  }, {});
};

/**
 * Fetches the placement row for a single ad, so the UI can show where it runs.
 */
const withPlacement = async (ad) => {
  if (!ad) return ad;
  const { data } = await supabase
    .from("ad_placements")
    .select("id, name, placement_info")
    .eq("id", ad.placement_id)
    .maybeSingle();
  return { ...ad, placement: data ?? null, placement_info: data?.placement_info ?? null };
};

/**
 * Normalises an ad row for the UI: `files` is the image list the banner
 * component rotates through, `image_url` the primary creative.
 */
const toAd = (ad) => {
  // The placement is exposed as the location key the interface expects (a
  // string, e.g. "main_page_ad"), with the name and the description beside it.
  const placementName =
    typeof ad.placement === "string"
      ? ad.placement
      : (ad.placement?.name ?? ad.placement_name ?? null);

  const placementInfo =
    typeof ad.placement === "object"
      ? (ad.placement?.placement_info ?? ad.placement_info ?? null)
      : (ad.placement_info ?? null);

  return {
    ...withAliases(ad),
    files: Array.isArray(ad.images) ? ad.images : ad.images ? [ad.images] : [],
    image_url: ad.image_url ?? (Array.isArray(ad.images) ? ad.images[0] : null) ?? null,
    placement: placementName,
    placement_name: placementName,
    placement_info: placementInfo,
  };
};

/**
 * Applies the ad visibility window (active, started, not expired).
 */
const applyRunWindow = (query, now) =>
  query
    .eq("status", "active")
    .or(`placement_date.is.null,placement_date.lte.${now}`)
    .or(`expiry_date.is.null,expiry_date.gte.${now}`);

/**
 * Fetches ads with filtering and pagination.
 *
 * @returns {Promise} - Promise resolving to { status, data: { ads, total, totalPages } }
 */
export const getAds = async ({
  page = 0,
  size = 10,
  search = "",
  status = "",
  placement = "",
} = {}) => {
  try {
    const from = Number(page) * Number(size);
    const to = from + Number(size) - 1;

    let query = supabase.from("ads").select(AD_COLUMNS, { count: "exact" }).range(from, to);

    if (status) query = query.eq("status", status);
    if (placement) {
      const ids = await getPlacementIds(placement);
      if (ids[placement]) query = query.eq("placement_id", ids[placement]);
    }
    if (search) {
      const term = String(search).replace(/[%,]/g, " ").trim();
      if (term) {
        query = query.or(
          `title.ilike.%${term}%,business_name.ilike.%${term}%,description.ilike.%${term}%`,
        );
      }
    }

    query = query.order("created_at", { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count ?? data?.length ?? 0;
    const totalPages = size > 0 ? Math.ceil(total / size) : 0;

    return ok({ ads: (data ?? []).map(toAd), total, totalPages });
  } catch (error) {
    return rethrow(error, "Failed to fetch ads");
  }
};

/**
 * Fetches a single ad by id.
 */
export const getAd = async (id) => {
  try {
    const { data, error } = await supabase
      .from("ads")
      .select(AD_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const err = new Error("Ad not found");
      err.response = { status: 404, data: { message: "Ad not found" } };
      throw err;
    }
    return ok(await withPlacement(toAd(data)));
  } catch (error) {
    return rethrow(error, "Failed to fetch ad");
  }
};

/**
 * Fetches every active ad for a placement, newest first.
 */
export const getAllAdByPlacement = async (placement) => {
  try {
    const ids = await getPlacementIds(placement);
    const placementId = ids[placement];

    let query = supabase.from("ads").select(AD_COLUMNS);
    if (placementId) query = query.eq("placement_id", placementId);
    query = applyRunWindow(query, new Date().toISOString()).order("created_at", {
      ascending: false,
    });

    const { data, error } = await query;
    if (error) throw error;
    return ok((data ?? []).map(toAd));
  } catch (error) {
    return rethrow(error, "Failed to fetch ads for placement");
  }
};

/**
 * Fetches a single ad for a placement (the newest eligible one).
 */
export const getAdByPlacement = async (placement) => {
  try {
    const ads = await getAllAdByPlacement(placement);
    const list = ads.data ?? [];
    return ok(list[0] ?? null);
  } catch (error) {
    return rethrow(error, "Failed to fetch ad for placement");
  }
};

/**
 * Fetches a single ad for a placement, preferring ads that carry the given tags.
 */
export const getAdByPlacementAndTags = async (placement, tags) => {
  try {
    const ads = await getAllAdByPlacement(placement);
    const list = ads.data ?? [];
    if (!tags?.length) return ok(list[0] ?? null);

    const wanted = tags.map((t) => String(t).toLowerCase());
    const match = list.find((ad) =>
      (ad.tags ?? []).some((tag) => wanted.includes(String(tag).toLowerCase())),
    );
    return ok(match ?? list[0] ?? null);
  } catch (error) {
    return rethrow(error, "Failed to fetch ad for placement");
  }
};

/**
 * Creates an ad.
 */
export const createAd = async (data) => {
  try {
    const payload = await toAdPayload(data);
    const { data: createdAd, error } = await supabase
      .from("ads")
      .insert(payload)
      .select(AD_COLUMNS)
      .single();
    if (error) throw error;
    return created(toAd(createdAd));
  } catch (error) {
    return rethrow(error, "Failed to create ad");
  }
};

/**
 * Updates an ad.
 */
export const editAd = async (id, data) => {
  try {
    const payload = await toAdPayload(data, { partial: true });
    const { data: updated, error } = await supabase
      .from("ads")
      .update(payload)
      .eq("id", id)
      .select(AD_COLUMNS)
      .single();
    if (error) throw error;
    return ok(toAd(updated));
  } catch (error) {
    return rethrow(error, "Failed to update ad");
  }
};

/**
 * Deletes an ad.
 */
export const removeAd = async (id) => {
  try {
    const { error } = await supabase.from("ads").delete().eq("id", id);
    if (error) throw error;
    return ok(true);
  } catch (error) {
    return rethrow(error, "Failed to delete ad");
  }
};

/**
 * Records an ad impression.
 */
export const trackImpression = async (id) => {
  try {
    const { error } = await supabase.rpc("track_ad_event", {
      ad_id: id,
      event_type: "impression",
    });
    if (error) throw error;
    return ok(true);
  } catch (error) {
    return rethrow(error, "Failed to track impression");
  }
};

/**
 * Records an ad click.
 */
export const trackClick = async (id) => {
  try {
    const { error } = await supabase.rpc("track_ad_event", {
      ad_id: id,
      event_type: "click",
    });
    if (error) throw error;
    return ok(true);
  } catch (error) {
    return rethrow(error, "Failed to track click");
  }
};

/* -------------------------------------------------------------------------- */
/* Placements                                                                 */
/* -------------------------------------------------------------------------- */

/** Fetches every ad placement. */
export const getPlacements = async () => {
  try {
    const { data, error } = await supabase
      .from("ad_placements")
      .select("id, name, placement_info, status")
      .order("name");
    if (error) throw error;
    return ok(withAliasesAll(data ?? []));
  } catch (error) {
    return rethrow(error, "Failed to fetch placements");
  }
};

/** Fetches placements with filtering and pagination. */
export const getAdPlacements = async ({
  page = "0",
  size = "10",
  search = "",
  status = "",
} = {}) => {
  try {
    const from = Number(page) * Number(size);
    const to = from + Number(size) - 1;

    let query = supabase
      .from("ad_placements")
      .select("id, name, placement_info, status", { count: "exact" })
      .range(from, to);

    if (status) query = query.eq("status", status);
    if (search) {
      const term = String(search).replace(/[%,]/g, " ").trim();
      if (term) query = query.or(`name.ilike.%${term}%,placement_info.ilike.%${term}%`);
    }

    const { data, error, count } = await query.order("name");
    if (error) throw error;

    const total = count ?? data?.length ?? 0;
    return ok({
      placements: data ?? [],
      total,
      totalPages: Number(size) > 0 ? Math.ceil(total / Number(size)) : 0,
    });
  } catch (error) {
    return rethrow(error, "Failed to fetch placements");
  }
};

/** Fetches a single placement. */
export const getAdPlacement = async (id) => {
  try {
    const { data, error } = await supabase
      .from("ad_placements")
      .select("id, name, placement_info, status")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return ok(data);
  } catch (error) {
    return rethrow(error, "Failed to fetch placement");
  }
};

/** Creates a placement. */
export const createAdPlacement = async (data) => {
  try {
    const { data: createdPlacement, error } = await supabase
      .from("ad_placements")
      .insert({
        name: data.name,
        placement_info: data.placement_info ?? data.placementInfo ?? null,
        status: data.status ?? "active",
      })
      .select("id, name, placement_info, status")
      .single();
    if (error) throw error;
    placementCache = null;
    return created(createdPlacement);
  } catch (error) {
    return rethrow(error, "Failed to create placement");
  }
};

/** Updates a placement. */
export const editAdPlacement = async (id, data) => {
  try {
    const { data: updated, error } = await supabase
      .from("ad_placements")
      .update({
        name: data.name,
        placement_info: data.placement_info ?? data.placementInfo ?? null,
        status: data.status ?? "active",
      })
      .eq("id", id)
      .select("id, name, placement_info, status")
      .single();
    if (error) throw error;
    placementCache = null;
    return ok(updated);
  } catch (error) {
    return rethrow(error, "Failed to update placement");
  }
};

/** Deletes a placement. */
export const removeAdPlacement = async (id) => {
  try {
    const { error } = await supabase.from("ad_placements").delete().eq("id", id);
    if (error) throw error;
    placementCache = null;
    return ok(true);
  } catch (error) {
    return rethrow(error, "Failed to delete placement");
  }
};

/* -------------------------------------------------------------------------- */
/* Campaigns                                                                  */
/* -------------------------------------------------------------------------- */

/** Fetches campaigns. */
export const getCampaigns = async () => {
  try {
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, name, business_id, status, payment_status, start_date, end_date, budget")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ok(data ?? []);
  } catch (error) {
    return rethrow(error, "Failed to fetch campaigns");
  }
};

/** Creates a campaign. */
export const createCampaign = async (data) => {
  try {
    const { data: createdCampaign, error } = await supabase
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
      .select("id, name, business_id, status, payment_status, start_date, end_date, budget")
      .single();
    if (error) throw error;
    return created(withAliases(createdCampaign));
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
      .select("id, name, business_id, status, payment_status, start_date, end_date, budget")
      .single();
    if (error) throw error;
    return ok(withAliases(updated));
  } catch (error) {
    return rethrow(error, "Failed to update campaign");
  }
};

/** Deletes a campaign. */
export const removeCampaign = async (id) => {
  try {
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) throw error;
    return ok(true);
  } catch (error) {
    return rethrow(error, "Failed to delete campaign");
  }
};

/**
 * Persists ad creatives.
 *
 * The admin form supplies images as base64 data URLs; they are uploaded to
 * storage so the database only ever holds URLs. Images that are already URLs
 * are kept as they are.
 */
const persistAdImages = async (images) => {
  const list = Array.isArray(images) ? images : [images];
  const stored = [];

  for (const image of list) {
    if (!image) continue;
    if (/^data:/i.test(image)) {
      const media = await uploadDataUrl(image, "ad");
      if (media?.file) stored.push(media.file);
    } else {
      stored.push(image);
    }
  }

  return stored;
};

/**
 * Maps a UI ad payload onto the database columns.
 */
const toAdPayload = async (data = {}, { partial = false } = {}) => {
  const payload = {};

  const has = (key) => Object.prototype.hasOwnProperty.call(data, key);
  const assign = (key, value) => {
    if (value !== undefined) payload[key] = value;
  };

  // The admin form and the business area name these fields differently, so
  // every known spelling is accepted.
  const pick = (...keys) => {
    for (const key of keys) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
        return data[key];
      }
    }
    return undefined;
  };

  const paymentInfo = data.payment_info || data.paymentInfo || {};

  assign("title", data.title);
  assign("description", pick("description"));
  assign("business_name", pick("business_name", "businessName"));
  assign("business_id", pick("business_id", "businessId"));
  assign("campaign_id", pick("campaign_id", "campaignId"));
  assign("video_url", pick("video_url", "videoUrl"));
  assign("click_url", pick("click_url", "clickUrl", "linkUrl"));
  assign("status", pick("status"));
  assign("amount", pick("amount", "total_cost", "totalCost"));
  assign(
    "payment_status",
    pick("payment_status", "paymentStatus") ?? paymentInfo.paymentStatus,
  );
  assign(
    "payment_reference",
    pick("payment_reference", "paymentReference", "reference") ??
      paymentInfo.reference,
  );
  assign(
    "payment_method",
    pick("payment_method", "paymentMethod") ?? paymentInfo.paymentMethod,
  );
  assign(
    "customer_name",
    pick("customer_name", "customerName") ?? paymentInfo.customerName,
  );
  assign(
    "customer_email",
    pick("customer_email", "customerEmail") ?? paymentInfo.customerEmail,
  );
  assign("customer_phone", pick("customer_phone", "customerPhone"));
  assign("notes", pick("notes"));
  assign("tags", pick("tags"));

  // These may be cleared on purpose, so they are only written when supplied.
  if (has("image_url") || has("imageUrl")) {
    payload.image_url = pick("image_url", "imageUrl") ?? null;
  }
  if (has("placement_date") || has("placementDate") || has("startTime")) {
    payload.placement_date = pick("placement_date", "placementDate", "startTime") ?? null;
  }
  if (has("expiry_date") || has("expiryDate") || has("endTime")) {
    payload.expiry_date = pick("expiry_date", "expiryDate", "endTime") ?? null;
  }

  if (data.images !== undefined) {
    payload.images = await persistAdImages(data.images);
  }

  const placementId = pick("placement_id", "placementId");
  if (placementId) {
    payload.placement_id = placementId;
  } else {
    const placement = pick("placement", "placement_name");
    if (placement) {
      const ids = await getPlacementIds(placement);
      if (ids[placement]) payload.placement_id = ids[placement];
    }
  }

  if (!partial) {
    payload.status = payload.status ?? "draft";
    payload.images = payload.images ?? [];
    payload.tags = payload.tags ?? [];
    payload.description = payload.description ?? null;
    payload.business_name = payload.business_name ?? null;
    payload.video_url = payload.video_url ?? null;
    payload.click_url = payload.click_url ?? null;
    payload.amount = payload.amount ?? 0;
    payload.notes = payload.notes ?? null;
  }

  // The primary creative always mirrors the first stored image.
  if (!payload.image_url && payload.images?.length) {
    payload.image_url = payload.images[0];
  }

  return payload;
};

export class AdsService extends BaseService {
  constructor() {
    super("ads");
  }
}

// expose the domain functions as instance methods (they don't use `this`)
Object.assign(AdsService.prototype, {
  getAds,
  getAd,
  getAllAdByPlacement,
  getAdByPlacement,
  getAdByPlacementAndTags,
  createAd,
  editAd,
  removeAd,
  trackClick,
  trackImpression,
  getPlacements,
  getAdPlacements,
  getAdPlacement,
  createAdPlacement,
  editAdPlacement,
  removeAdPlacement,
  getCampaigns,
  createCampaign,
  editCampaign,
  removeCampaign,
});

export const adsService = new AdsService();
export default adsService;
