/**
 * store/modules/notices.js
 *
 * Vuex module for managing community notices/announcements in the application.
 *
 * This module:
 * - Stores and manages community notices data
 * - Provides actions for fetching notices from the API
 * - Supports pagination for notices
 * - Manages notice categories
 * - Handles caching of notices to minimize API calls
 * - Provides getters for filtering and accessing notices
 */

import {
  getAnnouncements,
  getAnnouncementBySlug,
  getCategories,
} from "@/features/announcements/AnnouncementsService";

/**
 * Module state
 */
const state = () => ({
  page: 0, // Current page for notices
  all: {
    noticesByPage: {}, // Key = page number, value = array of notices
    hasMore: true, // Whether there are more pages to load
    total: 0, // Total number of notices
    totalPages: 0, // Total number of pages
    page: 0, // Current page
    size: 8, // Number of notices per page
  },
  funerals: {
    noticesByPage: {}, // Key = page number, value = array of notices
    hasMore: true, // Whether there are more pages to load
    total: 0, // Total number of notices
    totalPages: 0, // Total number of pages
    page: 0, // Current page
    size: 8, // Number of notices per page
  },
  recent: [], // Recent notices
  categories: [], // Notice categories
  error: null, // Error message if notice operations fail
});

/**
 * Module getters
 */
const getters = {
  /**
   * Returns the current page number
   * @param {Object} state - Module state
   * @returns {Number} Current page number
   */
  currentPage: (state) => state.page,

  /**
   * Returns all notices from all pages, flattened into a single array
   * @param {Object} state - Module state
   * @returns {Array} List of all notices
   */
  notices: (state) => Object.values(state.all.noticesByPage).flat(),

  /**
   * Returns all funerals from all pages, flattened into a single array
   * @param {Object} state - Module state
   * @returns {Array} List of all funerals
   */
  funerals: (state) => Object.values(state.funerals.noticesByPage).flat(),

  /**
   * Returns the list of notice categories
   * @param {Object} state - Module state
   * @returns {Array} List of categories
   */
  categories: (state) =>
    state.categories.filter(
      (c) => c.id != 14 && !c.name?.toLowerCase()?.includes("funeral")
    ),

  /**
   * Returns the list of recent notices
   * @param {Object} state - Module state
   * @returns {Array} List of recent notices
   */
  recent: (state) => state.recent,

  /**
   * Returns a deduplicated list of all notices
   * This is useful when you need to search across all notice types
   *
   * @param {Object} state - Module state
   * @param {Object} getters - Module getters
   * @returns {Array} List of unique notices
   */
  uniqueNotices: (state, getters) => {
    // Combine all notice sources
    const combined = [...getters.notices];

    // Deduplicate by notice ID
    const unique = [];
    const seen = new Set();

    for (const notice of combined) {
      if (!seen.has(notice.id)) {
        seen.add(notice.id);
        unique.push(notice);
      }
    }

    return unique;
  },

  /**
   * Returns notices related to a specific notice by category
   *
   * @param {Object} getters - Module getters
   * @returns {Function} Function that takes notice ID and category ID and returns related notices
   */
  relatedNotices:
    (getters) =>
    ({ id, categoryId }) => {
      return getters.uniqueNotices?.filter(
        (notice) => notice.category_id === categoryId && notice.id !== id
      );
    },

  /**
   * Finds a notice by its slug
   *
   * @param {Object} state - Module state
   * @param {Object} getters - Module getters
   * @returns {Function} Function that takes a slug and returns the matching notice or null
   */
  getNoticeBySlugFromStore: (state, getters) => (slug) => {
    return (
      getters.uniqueNotices?.find(
        (notice) => notice.slug === slug && notice.content != null
      ) || null
    );
  },

  /**
   * Returns whether there are more notices to load
   *
   * @param {Object} state - Module state
   * @returns {Boolean} Whether there are more notices to load
   */
  hasMore: (state) => {
    return state.all.hasMore;
  },
  hasMoreFunerals: (state) => {
    return state.funerals.hasMore;
  },
};

/**
 * Module mutations
 */
const mutations = {
  /**
   * Sets the recent notices array
   *
   * @param {Object} state - Module state
   * @param {Array} notices - Array of recent notices
   */
  setRecent(state, notices) {
    state.recent = notices;
  },

  /**
   * Sets notices for a specific page with pagination information
   *
   * @param {Object} state - Module state
   * @param {Object} payload - Payload containing page data
   * @param {String} payload.type - Type of notices (currently only "all" is supported)
   * @param {Array} payload.announcements - Notices for this page
   * @param {Number} payload.page - Page number
   * @param {Number} payload.total - Total number of notices
   * @param {Number} payload.totalPages - Total number of pages
   * @param {Boolean} payload.hasMore - Whether there are more pages to load
   */
  setByType(state, { type, announcements, page, total, totalPages, hasMore }) {
    if (type in state) {
      // Update the notices for this page
      state[type].noticesByPage[page] = announcements;
      state[type].page = page;
      state[type].total = total;
      state[type].totalPages = totalPages;
      state[type].hasMore = hasMore;
    }
  },

  /**
   * Sets the categories array
   *
   * @param {Object} state - Module state
   * @param {Array} categories - Array of notice categories
   */
  setCategories(state, categories) {
    state.categories = categories;
  },

  /**
   * Sets the error message in state
   *
   * @param {Object} state - Module state
   * @param {String} error - Error message
   */
  setError(state, error) {
    state.error = error;
  },

  /**
   * Adds a single notice to the current page
   * Prevents duplicate notices by checking if the notice already exists
   *
   * @param {Object} state - Module state
   * @param {Object} payload - Payload containing the notice
   * @param {Object} payload.notice - Notice object to add
   */
  addNotice(state, { notice }) {
    // Check if notice already exists to prevent duplicates
    const exists = Object.values(state.all.noticesByPage)
      .flatMap((page) => page.notices || [])
      .some((existing) => existing.slug === notice.slug);

    if (exists) return;

    // Ensure the current page object exists
    if (!state.all.noticesByPage[state.page]) {
      state.all.noticesByPage[state.page] = [];
    }

    // Add the notice to the current page
    state.all.noticesByPage[state.page]?.push(notice);
  },

  /**
   * Clears all notices from state
   * Useful when filtering or refreshing the notice list
   *
   * @param {Object} state - Module state
   */
  clearNotices(state) {
    state.all = {
      noticesByPage: {},
      hasMore: true,
      total: 0,
      totalPages: 0,
      page: 0,
      size: 8,
    };
  },
};

/**
 * Module actions
 */
const actions = {
  /**
   * Fetches recent notices from the API
   *
   * This action:
   * 1. Checks if recent notices are already loaded to avoid unnecessary API calls
   * 2. Fetches recent notices from the API
   * 3. Updates the state with the fetched notices
   *
   * @param {Object} context - Vuex action context
   * @param {Function} context.commit - Commit function to trigger mutations
   * @param {Object} context.state - Current module state
   * @param {Object} payload - Action payload
   * @param {String} payload.type - Type of notices (not currently used)
   * @param {Number} payload.size - Number of notices to fetch (default: 8)
   * @param {Number} payload.page - Page number for pagination (default: 0)
   * @param {String} payload.search - Search query (default: "")
   * @param {String} payload.priority - Priority filter (default: "")
   * @param {String} payload.category - Category filter (default: "")
   */
  async fetchRecentNotices(
    { commit, state },
    { type, size = 8, page = 0, search = "", priority = "", category = "" }
  ) {
    try {
      // Skip API call if recent notices are already loaded
      if (state.recent.length != 0) {
        return;
      }

      // Fetch recent notices from API
      const response = await getAnnouncements({
        size: size,
        page: page,
        priority,
        category,
        search: search,
        exludeFunerals: true,
        status: "published",
      });

      // Validate response
      if (response.status != 200)
        throw new Error(`Failed to fetch ${type} articles`);

      // Extract data
      const { announcements, total, totalPages } = response.data;

      // Update state
      commit("setRecent", announcements);
    } catch (err) {
      // Handle errors
      commit("setError", err.message);
      throw err;
    }
  },

  /**
   * Fetches notices with pagination from the API
   *
   * This action:
   * 1. Checks if notices for the requested page are already loaded
   * 2. Fetches notices from the API with filtering options
   * 3. Updates the state with the fetched notices and pagination info
   *
   * @param {Object} context - Vuex action context
   * @param {Function} context.commit - Commit function to trigger mutations
   * @param {Object} context.state - Current module state
   * @param {Object} context.getters - Module getters
   * @param {Object} payload - Action payload
   * @param {String} payload.type - Type of notices (not currently used)
   * @param {Number} payload.size - Number of notices to fetch per page (default: 10)
   * @param {Number} payload.page - Page number for pagination (default: 0)
   * @param {String} payload.search - Search query (default: "")
   * @param {String} payload.priority - Priority filter (default: "")
   * @param {String} payload.category - Category filter (default: "")
   */
  async fetchNotices(
    { commit, state, getters },
    {
      type = "all",
      size = 10,
      page = 0,
      search = "",
      priority = "",
      category = "",
      exludeFunerals = true,
    }
  ) {
    try {
      // Skip API call if notices for this page are already loaded

      if (
        state[type].noticesByPage[page] &&
        state[type].noticesByPage[page]?.length != 0
      ) {
        return;
      }

      // Fetch notices from API
      const response = await getAnnouncements({
        size: size,
        page: page,
        priority,
        category,
        search: search,
        exludeFunerals,
        status: "published",
      });

      // Validate response
      if (response.status != 200)
        throw new Error(`Failed to fetch ${type} articles`);

      // Extract data
      const { announcements, total, totalPages } = response.data;

      // Update state with notices and pagination info
      commit("setByType", {
        type,
        announcements,
        page,
        total,
        totalPages,
        hasMore: page < totalPages,
      });
    } catch (err) {
      // Handle errors
      commit("setError", err.message);
      throw err;
    }
  },

  /**
   * Fetches notice categories from the API
   *
   * This action:
   * 1. Checks if categories are already loaded to avoid unnecessary API calls
   * 2. Fetches categories from the API
   * 3. Updates the state with the fetched categories
   *
   * @param {Object} context - Vuex action context
   * @param {Function} context.commit - Commit function to trigger mutations
   * @param {Object} context.state - Current module state
   */
  async fetchCategories({ commit, state }) {
    try {
      // Skip API call if categories are already loaded
      if (state.categories.length) {
        return;
      }

      // Fetch categories from API
      const response = await getCategories({
        size: 100,
      });

      // Validate response
      if (response.status != 200) throw new Error(`Failed to fetch categories`);

      // Update state
      commit("setCategories", response.data.categories);
    } catch (err) {
      // Handle errors
      commit("setError", err.message);
      throw err;
    }
  },

  /**
   * Fetches a single notice by its slug
   *
   * This action:
   * 1. Checks if the notice is already in the store
   * 2. If not, fetches it from the API
   * 3. Processes the notice data
   * 4. Adds it to the store
   *
   * @param {Object} context - Vuex action context
   * @param {Function} context.commit - Commit function to trigger mutations
   * @param {Object} context.getters - Module getters
   * @param {String} slug - Notice slug to fetch
   * @returns {Object} The fetched notice
   */
  async fetchSingleNotice({ commit, getters }, slug) {
    // Check if notice is already in the store
    const bySlug = getters.getNoticeBySlugFromStore;
    const existing = bySlug(slug);
    if (existing) return existing;

    try {
      // Fetch notice from API
      const response = await getAnnouncementBySlug(slug);

      // Validate response
      if (response.status != 200 || !response.data)
        throw new Error("Notice not found");

      // Process notice data
      const notice = {
        ...response.data,
        image: response.data.image,
        categoryId: response.data?.category?.id,
      };

      // Add notice to the store
      commit("addNotice", {
        notice: notice,
      });

      return notice;
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
