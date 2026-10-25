/**
 * plugins/axios.js
 * 
 * Axios HTTP client plugin for the Laudium Biz application.
 * 
 * This plugin:
 * - Registers the API client as a global property in the Vue application
 * - Makes the API client available as $api in all components
 * - Provides a consistent way to access the API throughout the application
 */

import api from "@/services/api";

/**
 * Vue plugin that installs the API client
 * 
 * @type {Object}
 * @property {Function} install - Vue plugin installation method
 */
export default {
  /**
   * Installs the plugin into the Vue application
   * 
   * @param {Object} app - The Vue application instance
   */
  install: (app) => {
    app.config.globalProperties.$api = api;
  },
};
