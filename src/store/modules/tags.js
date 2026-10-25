/**
 * store/modules/tags.js
 * 
 * Vuex module for managing content tags in the application.
 * 
 * This module:
 * - Stores and manages tags data
 * - Provides actions for fetching tags from the API
 * - Handles error states for tag operations
 */

import { getTags } from "@/features/tags/TagsService";

/**
 * Module state
 */
const state = () => ({
  tags: [],      // Array of tag objects
  error: null,   // Error message if tag operations fail
});

/**
 * Module getters
 */
const getters = {
  /**
   * Returns the list of tags
   * @param {Object} state - Module state
   * @returns {Array} List of tag objects
   */
  tags: (state) => state.tags,
};

/**
 * Module mutations
 */
const mutations = {
  /**
   * Sets the tags array in state
   * @param {Object} state - Module state
   * @param {Object} payload - Payload containing tags array
   */
  setTags(state, { tags }) {
    state.tags = tags;
  },

  /**
   * Sets the error message in state
   * @param {Object} state - Module state
   * @param {String} error - Error message
   */
  setError(state, error) {
    state.error = error;
  },
};

/**
 * Module actions
 */
const actions = {
  /**
   * Fetches tags from the API
   * 
   * This action:
   * 1. Checks if tags are already loaded to avoid unnecessary API calls
   * 2. Calls the tags service to fetch data
   * 3. Updates the state with the fetched tags (limited to 10)
   * 4. Handles and reports any errors
   * 
   * @param {Object} context - Vuex action context
   * @param {Function} context.commit - Commit function to trigger mutations
   * @param {Object} context.state - Current module state
   */
  async fetchTags({ commit, state }) {
    try {
      // Skip API call if tags are already loaded
      if (state.tags.length != 0) return;

      // Fetch tags from API
      const response = await getTags();

      // Validate response
      if (response.status != 200)
        throw new Error(`Failed to fetch tags`);

      // Extract data and update state (limiting to 10 tags)
      const data = await response.data;
      commit("setTags", { tags: data.slice(0, 10) });
    } catch (err) {
      // Handle errors
      commit("setError", err.message);
      throw err;
    }
  },
};

/**
 * Export the Vuex module with namespace enabled
 * 
 * Namespacing ensures that module assets are properly encapsulated
 * and don't conflict with assets in other modules.
 */
export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
};
