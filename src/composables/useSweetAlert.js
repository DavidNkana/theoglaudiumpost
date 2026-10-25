/**
 * composables/useSweetAlert.js
 * 
 * SweetAlert2 integration composable for the Laudium Biz application.
 * 
 * This composable:
 * - Provides a simplified interface to the SweetAlert2 library
 * - Offers pre-configured alert types (success, error, confirmation)
 * - Includes toast notification functionality
 * - Maintains consistent styling across all application alerts
 */

import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

/**
 * SweetAlert composable that provides alert and notification functionality
 * 
 * @returns {Object} - Alert and notification methods
 */
export function useSweetAlert() {
  /**
   * Pre-configured toast notification settings
   */
  const toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

  /**
   * Displays a success alert
   * 
   * @param {string} title - Alert title (default: "Success!")
   * @param {string} text - Alert description text
   * @param {Object} options - Additional SweetAlert2 options
   * @returns {Promise} - SweetAlert2 promise
   */
  const success = (title = "Success!", text = "", options = {}) => {
    return Swal.fire({
      icon: "success",
      title,
      text,
      ...options,
    });
  };

  /**
   * Displays an error alert
   * 
   * @param {string} title - Alert title (default: "Oops!")
   * @param {string} text - Alert description text
   * @param {Object} options - Additional SweetAlert2 options
   * @returns {Promise} - SweetAlert2 promise
   */
  const error = (title = "Oops!", text = "", options = {}) => {
    return Swal.fire({
      icon: "error",
      title,
      text,
      ...options,
    });
  };

  /**
   * Displays a confirmation dialog with Yes/Cancel buttons
   * 
   * @param {string} title - Dialog title (default: "Are you sure?")
   * @param {string} text - Dialog description text
   * @param {Object} options - Additional SweetAlert2 options
   * @returns {Promise} - SweetAlert2 promise that resolves with the user's choice
   */
  const confirm = async (title = "Are you sure?", text = "", options = {}) => {
    return Swal.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "Cancel",
      ...options,
    });
  };

  /**
   * Displays a toast notification
   * 
   * @param {string} icon - Notification icon type (success, error, warning, info)
   * @param {string} message - Notification message
   * @returns {Promise} - Toast promise
   */
  const showToast = (icon = "success", message = "") => {
    return toast.fire({
      icon,
      title: message,
    });
  };

  return {
    success,
    error,
    confirm,
    showToast,
  };
}
