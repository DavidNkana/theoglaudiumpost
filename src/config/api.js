/**
 * config/api.js
 *
 * API configuration for the Laudium Biz application.
 *
 * This module:
 * - Defines global API URL constants
 * - Centralizes API endpoint configuration
 * - Provides environment-specific API endpoints
 */

import { readEnv, MODE } from "./env.js";

// Development/test fallback. Production requires an explicit backend URL so a
// static host cannot silently send API requests to its SPA fallback.
export const API_BASE_URL = "/api/v1/";

// Environment-specific API URLs (all env access flows through config/env.js).
const devBaseUrl = readEnv("VITE_DEV_API_BASE_URL", API_BASE_URL);
const testBaseUrl = readEnv("VITE_TEST_API_BASE_URL", devBaseUrl);
const prodBaseUrl = readEnv("VITE_PROD_API_BASE_URL", "");

if (MODE === "production" && !prodBaseUrl) {
  throw new Error(
    "VITE_PROD_API_BASE_URL is required for production builds. Set it to the deployed backend API URL.",
  );
}

export const API_URL =
  MODE === "development"
    ? devBaseUrl
    : MODE === "test"
      ? testBaseUrl
      : prodBaseUrl;

export default {
  API_BASE_URL,
  API_URL,
};
