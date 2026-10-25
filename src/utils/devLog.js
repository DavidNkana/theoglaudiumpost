/**
 * utils/devLog.js
 * 
 * Development logging utility for the Laudium Biz application.
 * 
 * This module:
 * - Provides styled console logging functions for development
 * - Automatically disables logging in production environments
 * - Supports different log levels (info, warn, error, success, debug)
 * - Uses color-coded output for better visibility in the console
 */

import { IS_DEV } from "@/config/env";

// Only enable logging in development environment
const isDev = IS_DEV;

/**
 * Styling configuration for different log types
 * Each type has a distinct color for easy identification in the console
 */
const styles = {
  info: "color: #2c7be5; font-weight: bold;",    // Blue
  warn: "color: #f0ad4e; font-weight: bold;",    // Orange
  error: "color: #d9534f; font-weight: bold;",   // Red
  success: "color: #5cb85c; font-weight: bold;", // Green
  debug: "color: #6c757d; font-weight: bold;",   // Gray
};

/**
 * Internal logging function that handles styling and environment checks
 * 
 * @param {string} type - The log type (info, warn, error, success, debug)
 * @param {...any} args - The content to log
 */
function log(type, ...args) {
  if (!isDev) return; // Skip logging in non-development environments

  const label = type.toUpperCase();
  const style = styles[type];

  console.log(`%c[${label}]`, style, ...args);
}

/**
 * Exported logging utility with methods for different log levels
 * All methods are no-ops in production environments
 */
export const devLog = {
  /**
   * Log informational messages (blue)
   * @param {...any} args - Content to log
   */
  info: (...args) => log("info", ...args),

  /**
   * Log warning messages (orange)
   * @param {...any} args - Content to log
   */
  warn: (...args) => log("warn", ...args),

  /**
   * Log error messages (red)
   * @param {...any} args - Content to log
   */
  error: (...args) => log("error", ...args),

  /**
   * Log success messages (green)
   * @param {...any} args - Content to log
   */
  success: (...args) => log("success", ...args),

  /**
   * Log debug messages (gray)
   * @param {...any} args - Content to log
   */
  debug: (...args) => log("debug", ...args),
};
