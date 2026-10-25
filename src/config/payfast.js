/**
 * config/payfast.js
 *
 * Centralized PayFast gateway configuration.
 *
 * All PayFast merchant credentials, callback URLs and the gateway process URLs
 * live here, sourced through config/env.js. features/payments/PayfastService.js
 * is the only consumer — UI code must never hardcode PayFast URLs or read
 * PayFast env vars.
 */

import { readEnv, readBoolEnv, currentOrigin } from "./env.js";

const origin = currentOrigin();

/**
 * PayFast merchant + callback configuration.
 *
 * NOTE: `sandbox` defaults to true and only flips to false when
 * VITE_PAYFAST_SANDBOX is explicitly set to "false". This preserves the
 * previous always-sandbox default while making live mode opt-in via config
 * (the old inline `=== "true" || true` was always-true by accident).
 */
export const PAYFAST = {
  merchantId: readEnv("VITE_PAYFAST_MERCHANT_ID", "10000100"),
  merchantKey: readEnv("VITE_PAYFAST_MERCHANT_KEY", "46f0cd694581a"),
  passphrase: readEnv("VITE_PAYFAST_PASSPHRASE", ""),
  returnUrl: readEnv("VITE_PAYFAST_RETURN_URL", origin + "/payment/success"),
  cancelUrl: readEnv("VITE_PAYFAST_CANCEL_URL", origin + "/payment/cancel"),
  notifyUrl: readEnv("VITE_PAYFAST_NOTIFY_URL", origin + "/api/payments/notify"),
  sandbox: readEnv("VITE_PAYFAST_SANDBOX") === "false" ? false : true,
};

/** PayFast sandbox gateway process URL. */
export const PAYFAST_PROCESS_URL_SANDBOX =
  "https://sandbox.payfast.co.za/eng/process";

/** PayFast live gateway process URL. */
export const PAYFAST_PROCESS_URL_LIVE = "https://www.payfast.co.za/eng/process";

/**
 * Resolves the active PayFast process URL based on the current sandbox flag.
 *
 * @returns {string}
 */
export function payfastProcessUrl() {
  return PAYFAST.sandbox
    ? PAYFAST_PROCESS_URL_SANDBOX
    : PAYFAST_PROCESS_URL_LIVE;
}
