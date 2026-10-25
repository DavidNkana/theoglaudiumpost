/**
 * composables/usePushNotifications.js
 * 
 * Push notification management composables for the Laudium Biz application.
 * 
 * This file provides two composables:
 * 1. useNotifications - Modern implementation using the OneSignal Vue 3 SDK
 * 2. usePushNotifications - Legacy implementation using the global OneSignal object
 * 
 * These composables handle:
 * - Push notification permission management
 * - Subscription status tracking
 * - User targeting with external IDs
 * - Test notification functionality
 * - Event handling for notification interactions
 */

import { ref, onMounted } from "vue";
import { useOneSignal } from "@onesignal/onesignal-vue3";

/**
 * Modern OneSignal notification management composable
 * 
 * @returns {Object} - Notification management methods and state
 */
export function useNotifications() {
  const OneSignal = useOneSignal();
  const permissionStatus = ref("checking...");
  const isSubscribed = ref(false);
  const loading = ref(false);
  const error = ref(null);
  const result = ref("");

  /**
   * Initialize notification system and check status on component mount
   */
  onMounted(async () => {
    try {
      await checkPermissionStatus();
      registerEventListeners();
    } catch (err) {
      error.value = err.message;
      permissionStatus.value = "error";
    }
  });

  /**
   * Checks the current push notification permission status
   * 
   * @async
   * @returns {string} - Current permission status
   */
  const checkPermissionStatus = async () => {
    try {
      const _ = await OneSignal.User.PushSubscription.optIn();
      _;
      isSubscribed.value = await OneSignal.isPushNotificationsEnabled();
      return permissionStatus.value;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  };

  /**
   * Requests permission for push notifications from the user
   * 
   * @async
   * @returns {string} - Updated permission status
   */
  const requestPushPermission = async () => {
    loading.value = true;
    error.value = null;
    result.value = "Requesting permission...";

    try {
      await OneSignal.showSlidedownPrompt();
      await checkPermissionStatus();
      result.value = `Permission status: ${permissionStatus.value}`;
      return permissionStatus.value;
    } catch (err) {
      error.value = err.message;
      result.value = `Error: ${err.message}`;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Registers event listeners for OneSignal notification events
   */
  const registerEventListeners = () => {
    OneSignal.on("subscriptionChange", async (isSubscribed) => {
      console.log("Subscription state changed:", isSubscribed);
      isSubscribed.value = isSubscribed;
      await checkPermissionStatus();
    });

    OneSignal.on("notificationDisplay", (event) => {
      console.log("Notification displayed:", event);
    });

    OneSignal.on("notificationPermissionChange", (permissionChange) => {
      console.log(
        "Permission changed from",
        permissionChange.from,
        "to",
        permissionChange.to
      );
      permissionStatus.value = permissionChange.to;
    });
  };

  /**
   * Sets an external user ID for targeting notifications to specific users
   * 
   * @async
   * @param {string} userId - The external user ID to set
   * @returns {Object} - Response from OneSignal
   */
  const setExternalUserId = async (userId) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await OneSignal.setExternalUserId(userId);
      console.log("External user ID set:", response);
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Removes the external user ID association
   * 
   * @async
   * @returns {Object} - Response from OneSignal
   */
  const removeExternalUserId = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await OneSignal.removeExternalUserId();
      console.log("External user ID removed:", response);
      return response;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Sends a test notification (for development purposes)
   * 
   * This is a mock implementation that would typically be triggered
   * from your backend using the OneSignal REST API.
   * 
   * @async
   * @returns {Object} - Mock response object
   */
  const sendTestNotification = async () => {
    loading.value = true;
    error.value = null;
    result.value = "Sending test notification...";

    try {
      // This would typically be done from your backend
      // Mock implementation for testing purposes

      // In a real app, make an API call to your backend
      // which would use OneSignal's REST API to send a notification

      // For testing, we'll just log and return a mock response
      console.log("Test notification requested");

      // Artificial delay to simulate network request
      await new Promise((resolve) => setTimeout(resolve, 1000));

      result.value = "Test notification sent!";
      return { success: true, message: "Test notification sent!" };
    } catch (err) {
      error.value = err.message;
      result.value = `Error: ${err.message}`;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    permissionStatus,
    isSubscribed,
    loading,
    error,
    result,
    checkPermissionStatus,
    requestPushPermission,
    setExternalUserId,
    removeExternalUserId,
    sendTestNotification,
  };
}

/**
 * Legacy OneSignal notification management composable
 * 
 * This implementation uses the global window.OneSignal object
 * rather than the Vue 3 SDK. It's provided for backward compatibility.
 * 
 * @returns {Object} - Notification management methods
 */
export default function usePushNotifications() {
  /**
   * OneSignal App ID (replace with your actual App ID in production)
   */
  const appId = "YOUR_ONESIGNAL_APP_ID"; // Replace with your real OneSignal App ID

  /**
   * Initializes the OneSignal SDK
   */
  const initOneSignal = () => {
    if (!window.OneSignal) return;

    window.OneSignal.push(() => {
      window.OneSignal.init({
        appId,
        safari_web_id: "", // Optional if using Safari
        notifyButton: {
          enable: true,
        },
        allowLocalhostAsSecureOrigin: true,
      });

      // Permission prompt
      window.OneSignal.showNativePrompt();

      // Subscribe event
      window.OneSignal.on("subscriptionChange", function (isSubscribed) {
        console.log("The user's subscription state is now:", isSubscribed);
      });

      // Receive notification
      window.OneSignal.on("notificationDisplay", function (event) {
        console.log("OneSignal notification displayed:", event);
      });
    });
  };

  /**
   * Sends a test notification using the user's OneSignal ID
   */
  const sendTestNotification = () => {
    window.OneSignal.getUserId().then((userId) => {
      console.log("User ID:", userId);
      // You'd trigger this from your backend using the OneSignal REST API
      alert("Trigger test notification from your backend using this user ID.");
    });
  };

  // Initialize OneSignal when the component mounts
  onMounted(initOneSignal);

  return {
    sendTestNotification,
  };
}
