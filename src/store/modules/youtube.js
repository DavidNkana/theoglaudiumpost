/**
 * store/modules/youtube.js
 * 
 * Vuex module for managing YouTube video integration in the application.
 * 
 * This module:
 * - Stores and manages YouTube videos data
 * - Provides actions for fetching videos from the YouTube API
 * - Supports pagination for videos
 * - Manages channel information
 * - Provides search functionality for videos
 * - Handles caching of videos to minimize API calls
 */

import { devLog } from "@/utils/devLog";
import {
  getChannelVideos,
  getVideoDetails,
  getChannelInfo,
  searchVideos,
} from "@/features/youtube/YoutubeService";
import { YOUTUBE_DEFAULT_CHANNEL_ID } from "@/config/app";

/**
 * Module state
 */
const state = () => ({
  page: 0,                // Current page for videos
  all: {
    videosByPage: {},     // Key = page number, value = array of videos
    hasMore: true,        // Whether there are more pages to load
    total: 0,             // Total number of videos
    totalPages: 0,        // Total number of pages
    page: 0,              // Current page
    size: 8,              // Number of videos per page
  },
  recent: [],             // Recent videos
  channelInfo: null,      // Information about the YouTube channel
  error: null,            // Error message if video operations fail
  defaultChannelId: YOUTUBE_DEFAULT_CHANNEL_ID, // Default YouTube channel ID from environment
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
   * Returns all videos from all pages, flattened into a single array
   * @param {Object} state - Module state
   * @returns {Array} List of all videos
   */
  videos: (state) => Object.values(state.all.videosByPage).flat(),

  /**
   * Returns the list of recent videos
   * @param {Object} state - Module state
   * @returns {Array} List of recent videos
   */
  recent: (state) => state.recent,

  /**
   * Returns information about the YouTube channel
   * @param {Object} state - Module state
   * @returns {Object|null} Channel information or null if not loaded
   */
  channelInfo: (state) => state.channelInfo,

  /**
   * Returns whether there are more videos to load
   * @param {Object} state - Module state
   * @returns {Boolean} Whether there are more videos to load
   */
  hasMore: (state) => {
    return state.all.hasMore;
  },
};

/**
 * Module mutations
 */
const mutations = {
  /**
   * Sets the recent videos array
   * 
   * @param {Object} state - Module state
   * @param {Array} videos - Array of recent videos
   */
  setRecent(state, videos) {
    devLog.info("Setting recent videos: ", videos);
    state.recent = videos;
  },

  /**
   * Sets videos for a specific page with pagination information
   * 
   * @param {Object} state - Module state
   * @param {Object} payload - Payload containing page data
   * @param {String} payload.type - Type of videos (currently only "all" is supported)
   * @param {Array} payload.videos - Videos for this page
   * @param {Number} payload.page - Page number
   * @param {Number} payload.total - Total number of videos (not used)
   * @param {Number} payload.totalResults - Total number of videos from YouTube API
   * @param {Boolean} payload.hasMore - Whether there are more pages to load
   * @param {String} payload.nextPageToken - Token for fetching the next page from YouTube API
   */
  setByType(
    state,
    { type, videos, page, total, totalResults, hasMore, nextPageToken }
  ) {
    devLog.info("Setting videos by type: ", type in state && type == "all");
    if (type in state && type == "all") {
      // Update the videos for this page
      state.all.videosByPage[page] = videos;
      state.all.page = page;
      state.all.total = totalResults;
      state.all.nextPageToken = nextPageToken;
      state.all.hasMore = hasMore;

      devLog.info(
        "Setting videos by type: ",
        type,
        state.all,
        hasMore,
        nextPageToken
      );
    }
  },

  /**
   * Sets the channel information
   * 
   * @param {Object} state - Module state
   * @param {Object|null} channelInfo - YouTube channel information
   */
  setChannelInfo(state, channelInfo) {
    state.channelInfo = channelInfo;
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
   * Adds a single video to the current page
   * Prevents duplicate videos by checking if the video already exists
   * 
   * @param {Object} state - Module state
   * @param {Object} payload - Payload containing the video
   * @param {Object} payload.video - Video object to add
   */
  addVideo(state, { video }) {
    // Check if video already exists to prevent duplicates
    const exists = Object.values(state.all.videosByPage)
      .flatMap((page) => page || [])
      .some((existing) => existing.id.videoId === video.id.videoId);

    if (exists) return;

    // Ensure the current page object exists
    if (!state.all.videosByPage[state.page]) {
      state.all.videosByPage[state.page] = [];
    }

    // Add the video to the current page
    state.all.videosByPage[state.page].push(video);
  },

  /**
   * Clears all videos from state
   * Useful when changing search queries or refreshing the video list
   * 
   * @param {Object} state - Module state
   */
  clearVideos(state) {
    state.all = {
      videosByPage: {},
      hasMore: true,
      total: 0,
      totalPages: 0,
      page: 0,
      size: 8,
      nextPageToken: null,
    };
  },
};

/**
 * Module actions
 */
const actions = {
  /**
   * Fetches recent videos from the YouTube API
   * 
   * This action:
   * 1. Checks if recent videos are already loaded to avoid unnecessary API calls
   * 2. Uses the provided channel ID or falls back to the default channel
   * 3. Fetches recent videos from the YouTube API
   * 4. Updates the state with the fetched videos
   * 
   * @param {Object} context - Vuex action context
   * @param {Function} context.commit - Commit function to trigger mutations
   * @param {Object} context.state - Current module state
   * @param {Object} payload - Action payload
   * @param {String} payload.channelId - YouTube channel ID (optional, uses default if not provided)
   * @param {Number} payload.size - Number of videos to fetch (default: 8)
   * @param {Number} payload.page - Page number for pagination (default: 0)
   */
  async fetchRecentVideos(
    { commit, state },
    { channelId = "", size = 8, page = 0 }
  ) {
    try {
      // Skip API call if recent videos are already loaded
      if (state.recent.length != 0) {
        return;
      }

      // Use provided channel ID or fall back to default
      const channelToUse = channelId || state.defaultChannelId;
      if (!channelToUse) {
        throw new Error("No channel ID provided");
      }

      // Fetch recent videos from YouTube API
      const response = await getChannelVideos(channelToUse, {
        maxResults: size,
        pageToken: "",
      });

      // Validate response
      if (!response || !response.items) {
        throw new Error("Failed to fetch recent videos");
      }

      // Update state with fetched videos
      commit("setRecent", response.items);
    } catch (err) {
      // Handle errors
      commit("setError", err.message);
      throw err;
    }
  },

  /**
   * Fetches videos with pagination from the YouTube API
   * 
   * This action:
   * 1. Checks if videos for the requested page are already loaded
   * 2. Uses the provided channel ID or falls back to the default channel
   * 3. Handles pagination using YouTube's pageToken system
   * 4. Fetches videos from the YouTube API
   * 5. Updates the state with the fetched videos and pagination info
   * 
   * @param {Object} context - Vuex action context
   * @param {Function} context.commit - Commit function to trigger mutations
   * @param {Object} context.state - Current module state
   * @param {Object} context.getters - Module getters
   * @param {Object} payload - Action payload
   * @param {String} payload.channelId - YouTube channel ID (optional, uses default if not provided)
   * @param {Number} payload.size - Number of videos to fetch per page (default: 10)
   * @param {Number} payload.page - Page number for pagination (default: 0)
   */
  async fetchVideos(
    { commit, state, getters },
    { channelId = "", size = 10, page = 0 }
  ) {
    try {
      // Skip API call if videos for this page are already loaded or no more videos
      if (
        !state.all.hasMore ||
        (state.all.videosByPage[page] &&
          state.all.videosByPage[page]?.length != 0)
      ) {
        return;
      }

      // Use provided channel ID or fall back to default
      const channelToUse = channelId || state.defaultChannelId;
      if (!channelToUse) {
        throw new Error("No channel ID provided");
      }

      // Get the appropriate page token for pagination
      const pageToken = page > 0 ? state.all.nextPageToken : "";

      // Fetch videos from YouTube API
      const response = await getChannelVideos(channelToUse, {
        maxResults: size,
        pageToken: pageToken,
      });

      // Validate response
      if (!response || !response.items) {
        throw new Error("Failed to fetch videos");
      }

      // Extract data
      const { items, nextPageToken, pageInfo } = response;

      // Update state with videos and pagination info
      commit("setByType", {
        type: "all",
        videos: items,
        page,
        totalResults: pageInfo?.totalResults || 0,
        hasMore: !!nextPageToken,
        nextPageToken,
      });
    } catch (err) {
      // Handle errors
      commit("setError", err.message);
      throw err;
    }
  },

  /**
   * Fetches channel information from the YouTube API
   * 
   * This action:
   * 1. Checks if channel info is already loaded to avoid unnecessary API calls
   * 2. Uses the provided channel ID or falls back to the default channel
   * 3. Fetches channel information from the YouTube API
   * 4. Updates the state with the fetched channel info
   * 
   * @param {Object} context - Vuex action context
   * @param {Function} context.commit - Commit function to trigger mutations
   * @param {Object} context.state - Current module state
   * @param {String} channelId - YouTube channel ID (optional, uses default if not provided)
   */
  async fetchChannelInfo({ commit, state }, channelId = "") {
    try {
      // Skip API call if channel info is already loaded
      if (state.channelInfo) {
        return;
      }

      // Use provided channel ID or fall back to default
      const channelToUse = channelId || state.defaultChannelId;
      if (!channelToUse) {
        throw new Error("No channel ID provided");
      }

      // Fetch channel info from YouTube API
      const response = await getChannelInfo(channelToUse);

      // Validate response
      if (!response || !response.items || response.items.length === 0) {
        throw new Error("Failed to fetch channel info");
      }

      // Update state with channel info
      commit("setChannelInfo", response.items[0]);
    } catch (err) {
      // Handle errors
      commit("setError", err.message);
      throw err;
    }
  },

  /**
   * Fetches detailed information for a specific video
   * 
   * This action:
   * 1. Fetches detailed information for a video by its ID
   * 2. Validates the response
   * 3. Adds the video to the store
   * 4. Returns the video details
   * 
   * @param {Object} context - Vuex action context
   * @param {Function} context.commit - Commit function to trigger mutations
   * @param {String} videoId - YouTube video ID to fetch details for
   * @returns {Object} The video details
   */
  async fetchVideoDetails({ commit }, videoId) {
    try {
      // Fetch video details from YouTube API
      const response = await getVideoDetails(videoId);

      // Validate response
      if (!response || !response.items || response.items.length === 0) {
        throw new Error("Video not found");
      }

      // Extract video data
      const video = response.items[0];

      // Add video to the store
      commit("addVideo", {
        video: video,
      });

      return video;
    } catch (err) {
      // Handle errors
      commit("setError", err.message);
      throw err;
    }
  },

  /**
   * Searches for videos in the YouTube channel
   * 
   * This action:
   * 1. Checks if videos for the requested page are already loaded
   * 2. Validates the search query
   * 3. Uses the default channel ID
   * 4. Handles pagination using YouTube's pageToken system
   * 5. Searches for videos matching the query
   * 6. Updates the state with the search results and pagination info
   * 7. Clears channel info since we're now in search mode
   * 
   * @param {Object} context - Vuex action context
   * @param {Function} context.commit - Commit function to trigger mutations
   * @param {Object} context.state - Current module state
   * @param {Object} payload - Action payload
   * @param {String} payload.query - Search query
   * @param {Number} payload.size - Number of videos to fetch per page (default: 10)
   * @param {Number} payload.page - Page number for pagination (default: 0)
   * @returns {Array} The search results
   */
  async searchVideos({ commit, state }, { query = "", size = 10, page = 0 }) {
    try {
      // Skip API call if videos for this page are already loaded or no more videos
      if (
        !state.all.hasMore ||
        (state.all.videosByPage[page] &&
          state.all.videosByPage[page]?.length != 0)
      ) {
        return;
      }

      // Validate search query
      if (!query) {
        throw new Error("No search query provided");
      }

      // Use default channel ID
      const channelToUse = state.defaultChannelId;
      if (!channelToUse) {
        throw new Error("No channel ID provided");
      }

      // Get the appropriate page token for pagination
      const pageToken = page > 0 ? state.all.nextPageToken : "";

      // Search for videos matching the query
      const response = await searchVideos(query, {
        maxResults: size,
        pageToken: pageToken,
        channelId: channelToUse,
      });

      // Validate response
      if (!response || !response.items) {
        throw new Error("Failed to search videos");
      }

      // Extract data
      const { items, nextPageToken, pageInfo } = response;

      // Update state with search results and pagination info
      commit("setByType", {
        type: "all",
        videos: items,
        page,
        totalResults: pageInfo?.totalResults || 0,
        hasMore: !!nextPageToken,
        nextPageToken,
      });

      // Clear channel info when searching
      commit("setChannelInfo", null);

      return items;
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
