/**
 * features/businesses/BusinessesService.js
 *
 * Directory listing data access, backed by Supabase.
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
const BUSINESS_COLUMNS =
  "id, name, type, category, email, phone, website, address, description, logo_url, status, created_at, updated_at";

/**
 * Fetches directory businesses with filtering and pagination.
 */
export const getBusinesses = async ({
  type = "",
  page = 0,
  size = 10,
  search = "",
  category = "",
  status = "",
} = {}) => {
  try {
    const from = Number(page) * Number(size);
    const to = from + Number(size) - 1;

    let query = supabase
      .from("businesses")
      .select(BUSINESS_COLUMNS, { count: "exact" })
      .range(from, to);

    if (type) query = query.eq("type", type);
    if (category) query = query.eq("category", category);
    if (status) query = query.eq("status", status);
    if (search) {
      const term = String(search).replace(/[%,]/g, " ").trim();
      if (term) {
        query = query.or(
          `name.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`,
        );
      }
    }

    query = query.order("name");

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count ?? data?.length ?? 0;
    const totalPages = Number(size) > 0 ? Math.ceil(total / Number(size)) : 0;

    return ok({ businesses: withAliasesAll(data ?? []), total, totalPages });
  } catch (error) {
    return rethrow(error, "Failed to fetch businesses");
  }
};

/** Fetches a single business by id. */
export const getBusiness = async (id) => {
  try {
    const { data, error } = await supabase
      .from("businesses")
      .select(BUSINESS_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return ok(withAliases(data));
  } catch (error) {
    return rethrow(error, "Failed to fetch business");
  }
};

/** Fetches the ads belonging to a business. */
export const getBusinessAds = async (id) => {
  try {
    const { data, error } = await supabase
      .from("ads")
      .select("id, title, status, placement_date, expiry_date, impressions, clicks")
      .eq("business_id", id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return ok(data ?? []);
  } catch (error) {
    return rethrow(error, "Failed to fetch business ads");
  }
};

/** Creates a business. */
export const createBusiness = async (data) => {
  try {
    const { data: newBusiness, error } = await supabase
      .from("businesses")
      .insert({
        name: data.name,
        type: data.type ?? null,
        category: data.category ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        website: data.website ?? null,
        address: data.address ?? null,
        description: data.description ?? null,
        logo_url: data.logo_url ?? data.logoUrl ?? null,
        status: data.status ?? "active",
      })
      .select(BUSINESS_COLUMNS)
      .single();
    if (error) throw error;
    return created(withAliases(newBusiness));
  } catch (error) {
    return rethrow(error, "Failed to create business");
  }
};

/** Updates a business. */
export const editBusiness = async (id, data) => {
  try {
    const { data: updated, error } = await supabase
      .from("businesses")
      .update({
        name: data.name,
        type: data.type ?? null,
        category: data.category ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        website: data.website ?? null,
        address: data.address ?? null,
        description: data.description ?? null,
        logo_url: data.logo_url ?? data.logoUrl ?? null,
        status: data.status ?? "active",
      })
      .eq("id", id)
      .select(BUSINESS_COLUMNS)
      .single();
    if (error) throw error;
    return ok(withAliases(updated));
  } catch (error) {
    return rethrow(error, "Failed to update business");
  }
};

/** Deletes a business. */
export const removeBusiness = async (id) => {
  try {
    const { error } = await supabase.from("businesses").delete().eq("id", id);
    if (error) throw error;
    return ok(true);
  } catch (error) {
    return rethrow(error, "Failed to delete business");
  }
};

/**
 * Registers a business account.
 *
 * The login is created in Supabase Auth and the business profile is attached
 * to it. A self-registered account is a business account: only an
 * administrator can grant the admin role, and only an administrator can enter
 * or change ads.
 */
export const register = async (data) => {
  try {
    const email = data?.email;
    const password = data?.password;

    if (!email || !password) {
      const err = new Error("Email and password are required");
      err.response = { status: 400, data: { message: err.message } };
      throw err;
    }

    const { data: signUp, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: data.name ?? data.full_name ?? null } },
    });

    if (signUpError) {
      const err = new Error(signUpError.message);
      err.response = { status: 400, data: { message: signUpError.message } };
      throw err;
    }

    const user = signUp.user;

    // Attach the business profile to the new account.
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      email,
      full_name: data.name ?? data.full_name ?? null,
      role: "business",
    });

    if (profileError && !/duplicate key/i.test(profileError.message)) {
      throw profileError;
    }

    return created({
      id: user.id,
      email,
      name: data.name ?? data.full_name ?? null,
      role: { id: 2, name: "business" },
      needsConfirmation: !signUp.session,
    });
  } catch (error) {
    return rethrow(error, "Failed to register account");
  }
};

/**
 * Fetches the ads belonging to the signed-in business account.
 *
 * Ads are entered by administrators; a business account sees the ones that
 * were entered for it.
 */
export const getAds = async ({
  page = 0,
  size = 10,
  search = "",
  status = "",
} = {}) => {
  try {
    const session = await supabase.auth.getSession();
    const businessId = session.data?.session?.user?.id;
    if (!businessId) return ok([]);

    const from = Number(page) * Number(size);
    const to = from + Number(size) - 1;

    let query = supabase
      .from("ads")
      .select(
        "id, title, description, business_name, image_url, images, video_url, click_url, status, placement_date, expiry_date, impressions, clicks, amount, created_at",
        { count: "exact" },
      )
      .eq("business_id", businessId)
      .range(from, to);

    if (status) query = query.eq("status", status);
    if (search) {
      const term = String(search).replace(/[%,]/g, " ").trim();
      if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return ok(
      (data ?? []).map((ad) => ({
        ...ad,
        files: Array.isArray(ad.images) ? ad.images : ad.images ? [ad.images] : [],
        image_url: ad.image_url ?? (Array.isArray(ad.images) ? ad.images[0] : null),
      })),
    );
  } catch (error) {
    return rethrow(error, "Failed to fetch ads");
  }
};

/**
 * Fetches the campaigns belonging to the signed-in business account.
 */
export const getCampaigns = async ({
  page = 0,
  size = 10,
  search = "",
  status = "",
} = {}) => {
  try {
    const session = await supabase.auth.getSession();
    const businessId = session.data?.session?.user?.id;
    if (!businessId) return ok([]);

    const from = Number(page) * Number(size);
    const to = from + Number(size) - 1;

    let query = supabase
      .from("campaigns")
      .select(
        "id, name, status, payment_status, start_date, end_date, budget, created_at",
        { count: "exact" },
      )
      .eq("business_id", businessId)
      .range(from, to);

    if (status) query = query.eq("status", status);
    if (search) {
      const term = String(search).replace(/[%,]/g, " ").trim();
      if (term) query = query.ilike("name", `%${term}%`);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return ok(data ?? []);
  } catch (error) {
    return rethrow(error, "Failed to fetch campaigns");
  }
};

/**
 * Fetches the payments belonging to the signed-in business account.
 */
export const getPayments = async ({
  businessId = 0,
  page = 0,
  size = 10,
  search = "",
  status = "",
} = {}) => {
  try {
    const session = await supabase.auth.getSession();
    const owner = businessId || session.data?.session?.user?.id;
    if (!owner) {
      return ok({ payments: [], total: 0, totalPages: 0, page: Number(page), size: Number(size) });
    }

    const from = Number(page) * Number(size);
    const to = from + Number(size) - 1;

    let query = supabase
      .from("payments")
      .select(
        "id, ad_id, business_name, amount, currency, status, reference, payment_method, paid_at, created_at",
        { count: "exact" },
      )
      .eq("business_id", owner)
      .range(from, to);

    if (status) query = query.eq("status", String(status).toLowerCase());
    if (search) {
      const term = String(search).replace(/[%,]/g, " ").trim();
      if (term) {
        query = query.or(`business_name.ilike.%${term}%,reference.ilike.%${term}%`);
      }
    }

    query = query.order("created_at", { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count ?? data?.length ?? 0;
    return ok({
      payments: data ?? [],
      total,
      totalPages: Number(size) > 0 ? Math.ceil(total / Number(size)) : 0,
      page: Number(page),
      size: Number(size),
    });
  } catch (error) {
    return rethrow(error, "Failed to fetch payments");
  }
};

export class BusinessesService extends BaseService {
  constructor() {
    super("businesses");
  }
}

Object.assign(BusinessesService.prototype, {
  getBusinesses,
  getBusiness,
  getBusinessAds,
  createBusiness,
  editBusiness,
  removeBusiness,
  register,
  getAds,
  getCampaigns,
  getPayments,
});

export const businessesService = new BusinessesService();
export default businessesService;
