/**
 * features/payments/PayfastService.js
 *
 * Service module for Payfast payment integration in the Laudium Biz application.
 *
 * This module:
 * - Provides functions to generate Payfast payment URLs
 * - Handles Payfast payment notifications (ITN)
 * - Manages payment verification and processing
 * - Interacts with the backend API for payment operations
 */

import CryptoJS from "crypto-js";
import {
  createPayment as createPaymentRecord,
  getPayments,
} from "@/features/payments/PaymentsService.js";
import { PAYFAST, payfastProcessUrl } from "@/config/payfast";
import { BaseService } from "@/shared/services/BaseService";

/**
 * Builds the signed PayFast field set for a payment. Shared by
 * generatePayfastData() and generatePayfastUrl() so the field mapping and
 * signature live in exactly one place.
 *
 * @param {Object} paymentData - The payment data
 * @returns {Object} - PayFast fields including the computed signature
 */
const buildSignedPayfastData = (paymentData) => {
  const data = {
    merchant_id: PAYFAST.merchantId,
    merchant_key: PAYFAST.merchantKey,
    return_url: PAYFAST.returnUrl,
    cancel_url: PAYFAST.cancelUrl,
    notify_url: PAYFAST.notifyUrl,

    // Buyer details
    name_first: paymentData.firstName || "",
    name_last: paymentData.lastName || "",
    email_address: paymentData.email || "",

    // Transaction details
    m_payment_id: paymentData.orderId || "",
    amount: paymentData.amount.toFixed(2),
    item_name: paymentData.name,
    item_description: paymentData.description || "",
  };

  data.signature = generateSignature(data, PAYFAST.passphrase);
  return data;
};

/**
 * Returns the active PayFast gateway process URL (sandbox or live). UI code
 * that needs the gateway URL must call this instead of hardcoding it.
 *
 * @returns {string}
 */
export const getPayfastProcessUrl = () => payfastProcessUrl();

/**
 * Generates Payfast payment field data (with signature) for an advertisement.
 *
 * @param {Object} paymentData - The payment data
 * @returns {Object} - The signed Payfast field set
 */
export const generatePayfastData = (paymentData) =>
  buildSignedPayfastData(paymentData);

/**
 * Generates a Payfast payment URL for an advertisement.
 *
 * @param {Object} paymentData - The payment data
 * @returns {string} - The complete Payfast payment URL
 */
export const generatePayfastUrl = (paymentData) => {
  const baseUrl = payfastProcessUrl();
  const data = buildSignedPayfastData(paymentData);

  // Build query string
  const queryString = Object.entries(data)
    .map(
      ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");

  return `${baseUrl}?${queryString}`;
};

/**
 * Generates a signature for Payfast payment data
 *
 * @param {Object} data - The payment data
 * @param {string} passphrase - The Payfast passphrase (if configured)
 * @returns {string} - The MD5 signature
 */
const generateSignature = (data, passphrase) => {
  // Create a string from the data
  let signatureString = "";

  // Sort the keys alphabetically
  const keys = Object.keys(data).sort();

  // Build the signature string
  keys.forEach((key) => {
    if (data[key] !== "" && key !== "signature") {
      signatureString += `${key}=${encodeURIComponent(data[key]).replace(/%20/g, "+")}&`;
    }
  });

  // Remove the last ampersand
  signatureString = signatureString.slice(0, -1);

  // Add the passphrase if it exists
  if (passphrase !== "") {
    signatureString += `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`;
  }

  // Generate MD5 hash
  return CryptoJS.MD5(signatureString).toString();
};

/**
 * Creates a payment record.
 *
 * @param {Object} paymentData - The payment data
 * @returns {Promise} - Promise that resolves to the created payment record
 */
export const createPayment = (paymentData) =>
  createPaymentRecord({
    ad_id: paymentData.adId ?? paymentData.ad_id ?? null,
    business_id: paymentData.businessId ?? paymentData.business_id ?? null,
    business_name: paymentData.businessName ?? paymentData.business_name ?? null,
    amount: paymentData.amount ?? 0,
    status: "pending",
    reference: paymentData.orderId ?? null,
    payment_method: "payfast",
  });

/**
 * Verifies a payment notification from Payfast.
 *
 * The notification is signed by Payfast and confirmed server-side; in this
 * application it marks the matching payment record as paid.
 *
 * @param {Object} notificationData - The notification data from Payfast
 * @returns {Promise} - Promise that resolves to the verification result
 */
export const verifyPayment = async (notificationData) => {
  const orderId = notificationData?.m_payment_id;
  if (!orderId) {
    const error = new Error("Payment notification is missing its order id");
    error.response = { status: 400, data: { message: error.message } };
    throw error;
  }

  const response = await getPayments({ search: orderId, size: 10 });
  const payment = (response.data?.payments ?? []).find(
    (row) => row.reference === orderId,
  );

  return {
    status: 200,
    data: { verified: Boolean(payment), payment: payment ?? null },
  };
};

/**
 * Gets payment status by order ID.
 *
 * @param {string} orderId - The order ID
 * @returns {Promise} - Promise that resolves to the payment status
 */
export const getPaymentStatus = async (orderId) => {
  const response = await getPayments({ search: orderId, size: 10 });
  const payment = (response.data?.payments ?? []).find(
    (row) => row.reference === orderId,
  );
  return { status: 200, data: payment ?? null };
};

export class PayfastService extends BaseService {
  constructor() {
    super("payments");
  }
}

// expose the domain functions as instance methods (they don't use `this`)
Object.assign(PayfastService.prototype, {
  getPayfastProcessUrl,
  generatePayfastData,
  generatePayfastUrl,
  createPayment,
  verifyPayment,
  getPaymentStatus,
});

export const payfastService = new PayfastService();
export default payfastService;
