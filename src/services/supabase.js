/**
 * services/supabase.js
 *
 * Supabase client and the shared response adapters used by every feature
 * service.
 *
 * The application was previously written against a REST API and the UI depends
 * on the axios-shaped response contract: `{ status, data }`. These adapters
 * keep that contract intact so views and the Vuex store read exactly as they
 * did before, while the data layer is now Supabase.
 */

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/config/supabase.js";

/**
 * The Supabase client.
 *
 * The anon key is used deliberately: authorization is enforced by Row Level
 * Security on the server. An authenticated admin session automatically carries
 * its JWT, so RLS policies see the admin identity.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/* -------------------------------------------------------------------------- */
/* Response adapters                                                          */
/* -------------------------------------------------------------------------- */

/** Builds a successful response in the axios shape the UI expects. */
export const ok = (data) => ({ status: 200, data });

/** Builds a "created" response in the axios shape the UI expects. */
export const created = (data) => ({ status: 201, data });

/**
 * Builds a rejected error in the axios shape the UI expects.
 *
 * Views read `error.response.status` and `error.response.data.message`, so the
 * shape has to match even though the transport changed.
 */
export const apiError = (message, status = 500) => {
  const error = new Error(message);
  error.isAxiosError = true;
  error.response = { status, data: { message } };
  return Promise.reject(error);
};

/**
 * Normalises a Supabase error into a rejected axios-shaped error.
 */
export const rethrow = (error, fallback = "Request failed") => {
  const message =
    error?.message || error?.error_description || error?.details || fallback;
  const status =
    error?.status ||
    error?.response?.status ||
    (message.toLowerCase().includes("row-level security") ? 403 : 500);
  return apiError(message, status);
};

/* -------------------------------------------------------------------------- */
/* Auth helpers                                                               */
/* -------------------------------------------------------------------------- */

/** Returns the current Supabase session, if any. */
export const getSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
};

/** Returns the current access token, if any. */
export const getAccessToken = async () => {
  const session = await getSession();
  return session?.access_token ?? null;
};

/**
 * Returns the profile row of the signed-in user, including their role.
 */
export const getProfile = async (userId) => {
  let id = userId;
  if (!id) {
    const session = await getSession();
    id = session?.user?.id;
  }
  if (!id) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, avatar_url")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
};

/** True when the signed-in user is an administrator. */
export const isAdmin = async () => {
  const profile = await getProfile();
  return profile?.role === "admin";
};

/**
 * Signs a user in with email and password.
 *
 * @returns {Promise<{status:number, data:{token:string, refreshToken:string, user:Object}}>}
 */
export const signInWithPassword = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const message =
      error.status === 400 || error.status === 401
        ? "Invalid email or password"
        : error.message;
    return apiError(message, error.status === 400 ? 401 : error.status || 401);
  }

  const session = data.session;
  const user = data.user;

  // The profile row carries the role the router and admin areas rely on.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return ok({
    token: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
    user: {
      id: user.id,
      name: profile?.full_name || user.email,
      email: user.email,
      role: {
        id: profile?.role === "admin" ? 1 : 2,
        name: profile?.role === "admin" ? "admin" : "business",
      },
      businessId: null,
      business: null,
    },
  });
};

/** Signs the current user out. */
export const signOut = async () => {
  await supabase.auth.signOut();
  return ok(true);
};

/* -------------------------------------------------------------------------- */
/* Storage helpers                                                            */
/* -------------------------------------------------------------------------- */

/** The public bucket that holds article covers and ad creatives. */
export const MEDIA_BUCKET = "public-media";

/**
 * Builds the public URL of a file stored in the media bucket.
 */
export const publicMediaUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
};

export default supabase;
