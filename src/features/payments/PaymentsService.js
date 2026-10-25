/**
 * features/payments/PaymentsService.js
 *
 * Service module for managing payments in the Laudium Biz application.
 *
 * This module:
 * - Provides functions to fetch, create, update, and delete payments
 * - Handles payment status tracking
 * - Interacts with the backend API for payment operations
 */

import api from "@/services/api";
import { BaseService } from "@/shared/services/BaseService";

/**
 * Fetches payments with filtering and pagination
 *
 * @param {Object} options - Query options
 * @param {number} options.page - Page number for pagination (default: 0)
 * @param {number} options.size - Number of payments per page (default: 10)
 * @param {string} options.search - Search query for filtering payments
 * @param {string} options.status - Payment status filter (e.g., "paid", "pending")
 * @returns {Promise} - Promise that resolves to the filtered payments
 */
export const getPayments = ({
  businessId = 0,
  page = 0,
  size = 10,
  search = "",
  status = "",
}) =>
  api.get(
    `/payments?businessId=${businessId}&search=${search}&status=${status}&size=${size}&page=${page}`
  );

/**
 * Fetches a single payment by its ID
 *
 * @param {number|string} id - The payment ID
 * @returns {Promise} - Promise that resolves to the payment data
 */
export const getPayment = (id) => api.get(`/payments/${id}`);

/**
 * Creates a new payment
 *
 * @param {Object} data - The payment data
 * @returns {Promise} - Promise that resolves to the created payment
 */
export const createPayment = (data) => api.post("/payments/create", data);

/**
 * Updates an existing payment
 *
 * @param {number|string} id - The payment ID
 * @param {Object} data - The updated payment data
 * @returns {Promise} - Promise that resolves to the updated payment
 */
export const updatePayment = (id, data) => api.put(`/payments/${id}`, data);

/**
 * Deletes a payment
 *
 * @param {number|string} id - The payment ID
 * @returns {Promise} - Promise that resolves when the payment is deleted
 */
export const removePayment = (id) => api.delete(`/payments/${id}`);

/**
 * Updates the status of a payment
 *
 * @param {number|string} id - The payment ID
 * @param {string} status - The new status (e.g., "paid", "pending", "cancelled")
 * @returns {Promise} - Promise that resolves to the updated payment
 */
export const updatePaymentStatus = (id, status) =>
  api.put(`/payments/${id}/status`, { status });

/**
 * Downloads the receipt/invoice PDF for a payment as a blob. Routes through
 * the central API client so the correct base URL and auth header are applied
 * (callers must not fetch the receipt path directly).
 *
 * @param {number|string} id - The payment ID
 * @returns {Promise} - Promise that resolves to the PDF blob response
 */
export const getReceiptPdf = (id) =>
  api.get(`/payments/${id}/receipt`, { responseType: "blob" });

export class PaymentsService extends BaseService {
  constructor() {
    super("payments");
  }
}

// expose the domain functions as instance methods (they don't use `this`)
Object.assign(PaymentsService.prototype, {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  removePayment,
  updatePaymentStatus,
  getReceiptPdf,
});

export const paymentsService = new PaymentsService();
export default paymentsService;
