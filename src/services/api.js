/**
 * services/api.js
 *
 * Core API client service for the Laudium Biz application.
 *
 * This module:
 * - Creates and configures the axios HTTP client
 * - Sets up request interceptors for authentication
 * - Sets up response interceptors for error handling
 * - Provides a centralized API client for all service modules
 * - Handles environment-specific API endpoints
 */

import axios from "axios";
import {API_URL} from "../config/api.js";

/**
 * Environment configuration
 *
 * Uses the API_URL from the global configuration
 */

/**
 * Axios HTTP client configuration
 *
 * Creates an axios instance with custom configuration for:
 * - Base URL from environment variables
 * - Default headers for JSON communication
 * - Credentials handling for authentication
 */
const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "ngrok-skip-browser-warning": true,
    },
    withCredentials: true, // Enable cookies/session auth
});

/**
 * Request interceptor
 *
 * Intercepts all outgoing requests
 * - Token validation has been removed as per requirements
 */
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("auth.token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * Response interceptor
 *
 * Intercepts all incoming responses to:
 * - Handle successful responses
 * - Process error responses globally
 */
apiClient.interceptors.response.use(
    // Pass through successful responses
    (response) => response,

    // Handle error responses
    async (error) => {
        const request = error.config;
        const refreshToken = localStorage.getItem("auth.refresh_token");
        if (
            error.response?.status === 401
            && refreshToken
            && !request._retry
        ) {
            try {
                request._retry = true;
                const res = await apiClient.post("/auth/refresh-token", {refreshToken})
                    .then(res => res.data)
                if (res) {
                    localStorage.setItem("auth.token", res.token);
                    localStorage.setItem("auth.refresh_token", res.refreshToken);
                    request.headers.Authorization = `Bearer ${res.token}`;
                }


                return apiClient(request);
            } catch (e) {
                console.error('Token refresh failed:', e);
                // Clear auth state on refresh failure
                localStorage.removeItem("auth.token");
                localStorage.removeItem("auth.user");
                localStorage.removeItem("auth.refresh_token");
                // Redirect to login if on admin route
                if (window.location.pathname.startsWith('/admin')) {
                    window.location.href = '/admin/login';
                } else if (window.location.pathname.startsWith('/business')) {
                    window.location.href = '/business/login';
                }
                return Promise.reject(error);
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
