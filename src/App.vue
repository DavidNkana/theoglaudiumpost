<script setup>
/**
 * App.vue
 *
 * Root component of the Laudium Biz application that:
 * - Serves as the application shell containing the router view
 * - Manages OneSignal push notification setup and configuration
 * - Provides user notification preferences management
 */

import { onMounted } from "vue";
import { useOneSignal } from "@onesignal/onesignal-vue3";
import Swal from "sweetalert2";

/**
 * OneSignal Push Notifications
 *
 * The following functions handle the setup and management of push notifications
 * using the OneSignal service.
 */

/**
 * Initializes OneSignal push notifications
 *
 * This function:
 * 1. Checks the current notification permission status
 * 2. Requests permission if needed
 * 3. Sets up the notification subscription
 */
const initializeOneSignal = async () => {
  try {
    // First, check if OneSignal is available
    const oneSignal = useOneSignal();
    if (!oneSignal) {
      console.log("OneSignal is not initialized. Skipping push notification setup.");
      return;
    }

    // Check current permission status
    const currentPermission = oneSignal.Notifications.permission;
    console.log("Current permission status:", currentPermission);

    if (currentPermission) {
      console.log("Permission already granted");
      await handleOptIn();
      return;
    }

    // Request permission first
    console.log("Requesting notification permission...");
    const permissionResult =
      await oneSignal.Notifications.requestPermission();
    console.log("Permission request result:", permissionResult);

    if (permissionResult == true || permissionResult == "granted") {
      await handleOptIn();
    } else {
      console.log("Permission not granted:", permissionResult);
    }
  } catch (error) {
    console.error("Error initializing OneSignal:", error);
  }
};

/**
 * Handles the opt-in process for push notifications
 *
 * This function:
 * 1. Checks if the user is already subscribed
 * 2. Opts in to push notifications if not already subscribed
 * 3. Sets up event listeners for notification events
 */
const handleOptIn = async () => {
  try {
    console.log("Attempting to opt in to push notifications...");

    // Check if OneSignal is available
    const oneSignal = useOneSignal();
    if (!oneSignal) {
      console.log("OneSignal is not initialized. Skipping opt-in process.");
      return;
    }

    // Check if user is already subscribed
    const isSubscribed = oneSignal.User.PushSubscription.optedIn;
    if (isSubscribed) {
      console.log("User is already subscribed");
      // await setupUserSegmentation();
      setupEventListeners();
      return;
    }

    // Opt in to push notifications
    const optInResult = oneSignal.User.PushSubscription.optIn();
    console.log("Opt-in result:", optInResult);

    // Setup user segmentation after successful opt-in
    // await setupUserSegmentation();

    // Setup event listeners
    setupEventListeners();
  } catch (error) {
    console.error("Error during opt-in process:", error);
  }
};

/**
 * Sets up event listeners for OneSignal notification events
 *
 * This function configures handlers for various notification events:
 * - foregroundWillDisplay: When a notification is about to be displayed while the app is in the foreground
 * - click: When a user clicks on a notification
 * - subscription changes: When a user's subscription status changes
 */
const setupEventListeners = () => {
  try {
    console.log("Setting up notification event listeners...");

    // Check if OneSignal is available
    const oneSignal = useOneSignal();
    if (!oneSignal) {
      console.log("OneSignal is not initialized. Skipping event listener setup.");
      return;
    }

    // Handle notifications displayed while app is in foreground
    oneSignal.Notifications.addEventListener(
      "foregroundWillDisplay",
      (event) => {
        console.log("Foreground notification will display:", event);
        const notification = event.notification;

        // You can customize notification display here
      }
    );

    // Handle notification clicks
    oneSignal.Notifications.addEventListener("click", (event) => {
      console.log("Notification clicked:", event);
      // Handle notification click
    });

    // Listen for subscription changes
    oneSignal.User.PushSubscription.addEventListener(
      "change",
      async (event) => {
        console.log("Subscription changed:", event);
        if (event.current.optedIn) {
          // User subscribed, add to segments
          // await setupUserSegmentation();
        }
      }
    );

    console.log("Event listeners setup complete");
  } catch (error) {
    console.error("Error setting up event listeners:", error);
  }
};

/**
 * Initialize OneSignal when component mounts
 *
 * A small delay is added to ensure the application is fully loaded
 * before initializing OneSignal.
 */
onMounted(() => {
  setTimeout(() => {
    initializeOneSignal();
  }, 1000);
});
</script>

<!-- Root template: the router-view renders the current route's component. -->
<template>
  <div>
    <router-view></router-view>
  </div>
</template>
