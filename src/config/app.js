/**
 * config/app.js
 *
 * Centralized application runtime configuration.
 *
 * All non-API app configuration — feature flags, third-party SDK ids, and the
 * list of origins push notifications may run on — is defined here, sourced
 * exclusively through config/env.js. UI code (components, views, layouts,
 * stores, main.js) imports these named constants instead of reading
 * environment variables directly.
 */

import { readEnv, readBoolEnv, MODE, currentOrigin } from "./env.js";

/* ------------------------------------------------------------------ */
/* Feature flags                                                       */
/* ------------------------------------------------------------------ */

/** Whether advertisements should be rendered. */
export const SHOW_ADS = readBoolEnv("VITE_SHOW_ADS", false);

/* ------------------------------------------------------------------ */
/* Sentry error tracking                                               */
/* ------------------------------------------------------------------ */

/** Sentry DSN; empty string disables reporting. */
export const SENTRY_DSN = readEnv("VITE_SENTRY_DNS", "");

/** URLs for which Sentry trace propagation is enabled. */
export const SENTRY_TRACE_TARGETS = ["localhost", "https://laudium.abc.co.zm/"];

/** Sentry is disabled in development. */
export const SENTRY_ENABLED = MODE !== "development";

/* ------------------------------------------------------------------ */
/* OneSignal push notifications                                        */
/* ------------------------------------------------------------------ */

/** OneSignal application id. */
export const ONESIGNAL_APP_ID = readEnv("VITE_ONE_SIGNAL_APP_ID", "");

/* ------------------------------------------------------------------ */
/* YouTube                                                             */
/* ------------------------------------------------------------------ */

/** YouTube Data API key. */
export const YOUTUBE_API_KEY = readEnv("VITE_YOUTUBE_API_KEY", "");

/** Default YouTube channel id surfaced in the podcasts section. */
export const YOUTUBE_DEFAULT_CHANNEL_ID = readEnv(
  "VITE_YOUTUBE_DEFAULT_CHANNEL_ID",
  ""
);

/* ------------------------------------------------------------------ */
/* Allowed origins (push notifications)                                */
/* ------------------------------------------------------------------ */

/** Production origins on which push notifications may initialise. */
export const PRODUCTION_ORIGINS = [
  "https://laudiumpost.co.za",
  "https://www.laudiumpost.co.za",
];

/**
 * Returns true when the current window origin is permitted to initialise push
 * notifications — the production domains only.
 *
 * OneSignal is intentionally NOT initialised on localhost: the OneSignal app is
 * bound to a specific production site, so initialising it on any other origin
 * throws a hard "Can only be used on …" SDK error. Excluding dev avoids that.
 *
 * @returns {boolean}
 */
export function isPushAllowedOrigin() {
  return PRODUCTION_ORIGINS.includes(currentOrigin());
}
