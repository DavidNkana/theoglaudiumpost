/**
 * Capacitor Plugin
 *
 * This plugin initializes Capacitor and handles platform-specific functionality:
 * - Android back button handling to navigate through app history instead of closing the app
 * - Status bar configuration for better UI integration
 * - Hardware back button event handling
 * - App lifecycle management
 */

import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import router from "@/router";
import Swal from "sweetalert2";

export default {
  install(app) {
    // Initialize Capacitor functionality
    const initCapacitor = async () => {
      // Only run on native platforms (Android/iOS)
      if (Capacitor.isNativePlatform()) {
        console.log(
          "Running on native platform, initializing Capacitor features"
        );

        try {
          // Configure status bar for Android
          if (Capacitor.getPlatform() === "android") {
            await configureStatusBar();
          }

          // Hide the splash screen with a fade animation
          await SplashScreen.hide({
            fadeOutDuration: 500,
          });

          // Set up Android back button handler
          setupAndroidBackButton();

          // Set up app lifecycle listeners
          setupAppLifecycleListeners();
        } catch (error) {
          console.error("Error initializing Capacitor:", error);
        }
      } else {
        console.log("Running in browser, skipping native Capacitor features");
      }
    };

    // Configure status bar appearance
    const configureStatusBar = async () => {
      try {
        // Ensure status bar is visible and does not overlay the WebView (no edge-to-edge)
        await StatusBar.setOverlaysWebView({ overlay: false });

        // Set status bar background and content style for readability
        try {
          await StatusBar.setBackgroundColor({ color: "#000000" });
        } catch (_) {
          // setBackgroundColor may not be supported on all platforms; ignore errors
        }
        await StatusBar.setStyle({ style: Style.Light });

        console.log("Status bar configured (no overlay, light icons on black)");
      } catch (error) {
        console.error("Error configuring status bar:", error);
      }
    };

    // Set up app lifecycle listeners
    const setupAppLifecycleListeners = () => {
      // App state change listener (background/foreground)
      App.addListener("appStateChange", ({ isActive }) => {
        console.log("App state changed. Is active:", isActive);

        if (isActive) {
          // App came to foreground
          console.log("App moved to foreground");
          // Refresh data or perform other actions when app comes to foreground
        } else {
          // App went to background
          console.log("App moved to background");
          // Save state or perform cleanup when app goes to background
        }
      });

      // Resume listener (app becomes active)
      App.addListener("resume", () => {
        console.log("App resumed");
      });

      // Pause listener (app becomes inactive)
      App.addListener("pause", () => {
        console.log("App paused");
      });

      console.log("App lifecycle listeners registered");
    };

    // Handle Android back button to navigate through app history
    const setupAndroidBackButton = () => {
      // Register back button handler
      App.addListener("backButton", ({ canGoBack }) => {
        // If we can go back in the web history, do that instead of closing the app
        if (canGoBack) {
          // Use Vue Router to go back
          router.back();
        } else {
          // If we're at the root of the app (can't go back), show exit confirmation
          confirmAppExit();
        }
      });

      console.log("Android back button handler registered");
    };

    // Show confirmation dialog before exiting the app
    const confirmAppExit = async () => {
      // Check if we're on the home route
      const isOnHomePage =
        router.currentRoute.value.path === "/" ||
        router.currentRoute.value.name === "Home";

      if (isOnHomePage) {
        // If on home page, show exit confirmation with SweetAlert2
        const result = await Swal.fire({
          title: "Exit App",
          text: "Are you sure you want to exit the app?",
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#28a745",
          cancelButtonColor: "#dc3545",
          confirmButtonText: "Yes, exit",
          cancelButtonText: "Cancel",
        });

        if (result.isConfirmed) {
          App.exitApp();
        }
      } else {
        // If not on home page, navigate to home instead of exiting
        router.push("/");
      }
    };

    // Initialize Capacitor when the app is mounted
    app.config.globalProperties.$capacitor = {
      initCapacitor,
      isNative: Capacitor.isNativePlatform(),
    };

    // Auto-initialize when the plugin is installed
    initCapacitor();
  },
};
