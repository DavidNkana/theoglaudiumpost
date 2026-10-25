/**
 * main.js
 *
 * Application entry point that initializes the Vue application and configures all
 * necessary plugins, libraries, and global components.
 *
 * This file:
 * - Imports and configures CSS/styling dependencies
 * - Sets up core Vue application with App.vue as the root component
 * - Configures routing, state management, and HTTP client
 * - Integrates third-party services (Sentry, OneSignal)
 * - Registers global components
 */

// Import global styles
import "./assets/main.css";
import "./assets/style.css";

// Import Bootstrap CSS and JS
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
// Import Bootstrap Icons
import "bootstrap-icons/font/bootstrap-icons.css";

// Import Vue core
import { createApp } from "vue";
import App from "./App.vue";

// Import application modules
import router from "@/router";
import store from "@/store/index.js";
import axiosPlugin from "./plugins/axios";
import capacitorPlugin from "./plugins/capacitor";

// Import third-party libraries
import Swal from "sweetalert2/dist/sweetalert2.js";
import "sweetalert2/src/sweetalert2.scss";

import InfiniteLoading from "v3-infinite-loading";
import "v3-infinite-loading/lib/style.css"; // required if you're not going to override default slots

// Import error tracking
import * as Sentry from "@sentry/vue";

// Import push notifications
import OneSignalVuePlugin from "@onesignal/onesignal-vue3";

// Import centralized application configuration
import {
  SENTRY_DSN,
  SENTRY_ENABLED,
  SENTRY_TRACE_TARGETS,
  ONESIGNAL_APP_ID,
  isPushAllowedOrigin,
} from "@/config/app";

// Create the Vue application instance
const app = createApp(App);

/**
 * Configure Sentry for error tracking and monitoring
 * Only enabled in production environments
 */
Sentry.init({
  app,
  dsn: SENTRY_DSN,
  integrations: [],
  // Set `tracePropagationTargets` to control for which URLs trace propagation should be enabled
  tracePropagationTargets: SENTRY_TRACE_TARGETS,
  // Disabled in development (SENTRY_ENABLED is derived from MODE in config/app)
  enabled: SENTRY_ENABLED,
});

/**
 * Register application plugins
 */
// Register Vuex store for state management
app.use(store);
// Register Vue Router for navigation
app.use(router);
// Register axios for HTTP requests
app.use(axiosPlugin);
// Register Capacitor plugin for native functionality
app.use(capacitorPlugin);
// Register OneSignal for push notifications
// Only initialize OneSignal if we're on an allowed origin (centralized gating)
if (isPushAllowedOrigin()) {
  app.use(OneSignalVuePlugin, {
    appId: ONESIGNAL_APP_ID,
    serviceWorkerPath: "/OneSignalSDKWorker.js",
    allowLocalhostAsSecureOrigin: true,
    notifyButton: {
      enable: true,
    },
  });
}

/**
 * Register global components and mount the application
 */
app.component("infinite-loading", InfiniteLoading).mount("#app");
