/**
 * config/env.js
 *
 * THE single source of truth for environment access in the frontend.
 *
 * No other module — not components, views, stores, composables, services, or
 * even other config files — may read `import.meta.env` or `process.env`
 * directly. Everything goes through the helpers exported here. This guarantees
 * there is exactly one place to look (and one place to change) when runtime
 * configuration moves, and lets the Handre/harness checks reject stray env
 * access anywhere else in the codebase.
 *
 * Exports:
 * - readEnv(key, fallback)     → raw string value (Vite env first, then Node env)
 * - readBoolEnv(key, fallback) → boolean coercion of "true"/true
 * - MODE / IS_DEV              → build mode helpers
 * - BASE_URL                   → Vite base public path (for the router)
 * - currentOrigin()            → window origin, safe in non-browser contexts
 */

// Vite injects `import.meta.env` in every browser/build/test (Vitest) context
// this ESM module runs in, so it is always present. `process` only exists when
// running under Node, so that one is guarded.
const viteEnv = import.meta.env;
const nodeEnv =
  typeof process !== "undefined" && process.env ? process.env : {};

/**
 * Reads an environment variable by key, preferring Vite env then Node env.
 *
 * @param {string} key - The env var name (e.g. "VITE_SHOW_ADS")
 * @param {*} [fallback] - Value returned when the key is unset
 * @returns {*} The env value, or the fallback when absent
 */
export function readEnv(key, fallback = undefined) {
  const value = viteEnv[key] !== undefined ? viteEnv[key] : nodeEnv[key];
  return value === undefined || value === null ? fallback : value;
}

/**
 * Reads a boolean-ish environment variable. Treats the string "true" and the
 * boolean true as true; everything else is false (unless unset, where the
 * fallback wins).
 *
 * @param {string} key
 * @param {boolean} [fallback=false]
 * @returns {boolean}
 */
export function readBoolEnv(key, fallback = false) {
  const value = readEnv(key);
  if (value === undefined) return fallback;
  return value === true || value === "true";
}

/** Current build mode: "development" | "test" | "production". */
export const MODE = viteEnv.MODE || nodeEnv.NODE_ENV || "production";

/** True while running the Vite dev server. */
export const IS_DEV = MODE === "development";

/** Vite public base path, used to configure the router history base. */
export const BASE_URL = viteEnv.BASE_URL || "/";

/**
 * Returns the current window origin, or "" when not running in a browser
 * (e.g. SSR, Capacitor bootstrap, or Node test scripts).
 *
 * @returns {string}
 */
export function currentOrigin() {
  return typeof window !== "undefined" && window.location
    ? window.location.origin
    : "";
}
