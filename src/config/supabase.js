/**
 * config/supabase.js
 *
 * Supabase connection configuration.
 *
 * The frontend talks to Supabase directly (PostgREST + Auth + Storage). There
 * is no application server in front of it: Supabase Row Level Security is the
 * authorization boundary, and the anon key is safe to ship to the browser
 * precisely because RLS limits what it can read and write.
 *
 * Environment access goes through config/env.js — the single source of truth.
 */

import { readEnv, MODE } from "./env.js";

/** Supabase project URL, e.g. https://<project-ref>.supabase.co */
export const SUPABASE_URL = readEnv("VITE_SUPABASE_URL", "");

/**
 * Supabase anon (public) key.
 *
 * This key only grants what RLS allows. The service_role key must never be
 * bundled into the frontend — it bypasses RLS.
 */
export const SUPABASE_ANON_KEY = readEnv("VITE_SUPABASE_ANON_KEY", "");

/**
 * Fails the build loudly when a production bundle has no Supabase connection.
 * A frontend that boots without a database silently renders empty sections,
 * which is far harder to diagnose than a build failure.
 */
if (MODE === "production" && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for production builds.",
  );
}

export default {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
};
