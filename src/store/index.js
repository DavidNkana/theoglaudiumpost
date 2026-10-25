/**
 * store/index.js
 * 
 * Vuex store configuration for the Laudium Biz application.
 * 
 * This file:
 * - Creates the central Vuex store
 * - Manages global UI state (like drawer visibility)
 * - Registers feature-specific store modules
 * - Provides actions and mutations for global state management
 */

import { createStore } from "vuex";

// Import feature modules
import articles from "./modules/articles";
import notices from "./modules/notices";
import tags from "./modules/tags";
import youtube from "./modules/youtube";
/**
 * Create the Vuex store instance
 */
const store = createStore({
  /**
   * Global state
   * Contains application-wide UI state that doesn't belong to a specific feature
   */
  state() {
    return {
      // Controls the visibility of the navigation drawer
      drawerOpen: false,
    };
  },

  /**
   * Mutations
   * Synchronous functions that directly modify the state
   */
  mutations: {
    /**
     * Opens the navigation drawer
     * Also adds a class to the body to prevent scrolling
     */
    openDrawer(state) {
      state.drawerOpen = true;
      document.body.classList.add("drawer-open");
    },

    /**
     * Closes the navigation drawer
     * Removes the body class to re-enable scrolling
     */
    closeDrawer(state) {
      state.drawerOpen = false;
      document.body.classList.remove("drawer-open");
    },
  },

  /**
   * Actions
   * Can contain asynchronous operations and commit mutations
   */
  actions: {
    /**
     * Toggles the navigation drawer state
     * Commits either openDrawer or closeDrawer based on current state
     */
    toggleDrawer({ state, commit }) {
      if (state.drawerOpen) {
        commit("closeDrawer");
      } else {
        commit("openDrawer");
      }
    },
  },

  /**
   * Modules
   * Feature-specific store modules that are registered with the main store
   */
  modules: {
    articles, // Manages article data and operations
    notices,  // Manages community notices
    tags,     // Manages content tags
    youtube,  // Manages YouTube video integration
  },
});

export default store;
