/**
 * features/users/UsersService.js
 *
 * Account management, backed by Supabase.
 *
 * Login accounts live in Supabase Auth; the profile table carries the role
 * (admin or business) that Row Level Security reads.
 *
 * Creating a login account requires the service_role key, which must never
 * reach the browser. New accounts are therefore created through a server-side
 * function; this service manages the profile rows themselves.
 */

import { supabase, ok, created, rethrow } from "@/services/supabase.js";
import { BaseService } from "@/shared/services/BaseService";

const PROFILE_COLUMNS = "id, email, full_name, role, avatar_url, created_at, updated_at";

/** The roles an account can hold. */
export const ROLES = [
  { id: 1, name: "admin" },
  { id: 2, name: "business" },
];

/**
 * Fetches accounts with filtering and pagination.
 */
export const getUsers = async ({ page = 0, size = 10, search = "" } = {}) => {
  try {
    const from = Number(page) * Number(size);
    const to = from + Number(size) - 1;

    let query = supabase
      .from("profiles")
      .select(PROFILE_COLUMNS, { count: "exact" })
      .range(from, to);

    if (search) {
      const term = String(search).replace(/[%,]/g, " ").trim();
      if (term) {
        query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
      }
    }

    query = query.order("created_at", { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count ?? data?.length ?? 0;
    const totalPages = Number(size) > 0 ? Math.ceil(total / Number(size)) : 0;

    return ok({ users: data ?? [], total, totalPages });
  } catch (error) {
    return rethrow(error, "Failed to fetch accounts");
  }
};

/** Fetches a single account. */
export const getUser = async (id) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return ok(data);
  } catch (error) {
    return rethrow(error, "Failed to fetch account");
  }
};

/** Returns the roles an account can be given. */
export const getRoles = async () => ok(ROLES);

/**
 * Creates a profile for an existing login account.
 *
 * The account itself is created in Supabase Auth; this attaches the role and
 * display name to it.
 */
export const createUser = async (data) => {
  try {
    if (!data?.id) {
      const err = new Error("An account id is required");
      err.response = { status: 400, data: { message: "An account id is required" } };
      throw err;
    }

    const { data: newProfile, error } = await supabase
      .from("profiles")
      .insert({
        id: data.id,
        email: data.email ?? null,
        full_name: data.full_name ?? data.name ?? null,
        role: data.role ?? "business",
        avatar_url: data.avatar_url ?? null,
      })
      .select(PROFILE_COLUMNS)
      .single();
    if (error) throw error;
    return created(newProfile);
  } catch (error) {
    return rethrow(error, "Failed to create account");
  }
};

/** Updates an account profile. */
export const editUser = async (id, data) => {
  try {
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({
        email: data.email ?? undefined,
        full_name: data.full_name ?? data.name ?? undefined,
        role: data.role ?? undefined,
        avatar_url: data.avatar_url ?? undefined,
      })
      .eq("id", id)
      .select(PROFILE_COLUMNS)
      .single();
    if (error) throw error;
    return ok(updated);
  } catch (error) {
    return rethrow(error, "Failed to update account");
  }
};

/** Removes an account profile. */
export const removeUser = async (id) => {
  try {
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) throw error;
    return ok(true);
  } catch (error) {
    return rethrow(error, "Failed to remove account");
  }
};

export class UsersService extends BaseService {
  constructor() {
    super("users");
  }
}

Object.assign(UsersService.prototype, {
  getUsers,
  getUser,
  getRoles,
  createUser,
  editUser,
  removeUser,
});

export const usersService = new UsersService();
export default usersService;
