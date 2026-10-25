/**
 * composables/useYoutube.js
 * 
 * YouTube integration composable for the Laudium Biz application.
 * 
 * This composable:
 * - Provides methods to fetch and display YouTube videos
 * - Handles channel information retrieval
 * - Manages video details and metadata
 * - Supports pagination for video listings
 * - Handles loading states and error handling
 */

import { ref, reactive } from "vue";
import { getChannelVideos, getVideoDetails, getChannelInfo } from "@/features/youtube/YoutubeService";

/**
 * YouTube integration composable that provides methods for working with YouTube data
 * 
 * @returns {Object} - YouTube data and methods
 */
export function useYoutube() {
  /**
   * Reactive state for YouTube data
   */
  const videos = ref([]);
  const channelInfo = ref(null);
  const videoDetails = ref([]);
  const loading = ref(false);
  const error = ref(null);

  /**
   * Pagination state for YouTube video listings
   */
  const pagination = reactive({
    nextPageToken: null,
    prevPageToken: null,
    totalResults: 0,
    resultsPerPage: 0,
  });

  /**
   * Fetches videos from a YouTube channel
   * 
   * @async
   * @param {string} channelId - The YouTube channel ID
   * @param {Object} options - Additional options for the request
   * @param {string} [options.pageToken] - Token for pagination
   * @param {number} [options.maxResults] - Maximum number of results to return
   * @param {string} [options.order] - Order of results (date, rating, relevance, etc.)
   */
  const fetchChannelVideos = async (channelId, options = {}) => {
    if (!channelId) {
      error.value = "Channel ID is required";
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await getChannelVideos(channelId, options);
      videos.value = response.items;

      // Update pagination info
      pagination.nextPageToken = response.nextPageToken || null;
      pagination.prevPageToken = response.prevPageToken || null;

      if (response.pageInfo) {
        pagination.totalResults = response.pageInfo.totalResults || 0;
        pagination.resultsPerPage = response.pageInfo.resultsPerPage || 0;
      }
    } catch (err) {
      error.value = err.message || "Failed to fetch YouTube videos";
      console.error("Error in useYoutube.fetchChannelVideos:", err);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Fetches the next page of videos using the pagination token
   * 
   * @async
   * @param {string} channelId - The YouTube channel ID
   * @param {Object} options - Additional options for the request
   */
  const fetchNextPage = async (channelId, options = {}) => {
    if (!pagination.nextPageToken) return;

    await fetchChannelVideos(channelId, {
      ...options,
      pageToken: pagination.nextPageToken,
    });
  };

  /**
   * Fetches the previous page of videos using the pagination token
   * 
   * @async
   * @param {string} channelId - The YouTube channel ID
   * @param {Object} options - Additional options for the request
   */
  const fetchPrevPage = async (channelId, options = {}) => {
    if (!pagination.prevPageToken) return;

    await fetchChannelVideos(channelId, {
      ...options,
      pageToken: pagination.prevPageToken,
    });
  };

  /**
   * Fetches detailed information about specific videos
   * 
   * @async
   * @param {string|string[]} videoIds - Single video ID or array of video IDs
   */
  const fetchVideoDetails = async (videoIds) => {
    if (!videoIds) {
      error.value = "Video ID(s) are required";
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await getVideoDetails(videoIds);
      videoDetails.value = response.items || [];
    } catch (err) {
      error.value = err.message || "Failed to fetch video details";
      console.error("Error in useYoutube.fetchVideoDetails:", err);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Fetches information about a YouTube channel
   * 
   * @async
   * @param {string} channelId - The YouTube channel ID
   */
  const fetchChannelInfo = async (channelId) => {
    if (!channelId) {
      error.value = "Channel ID is required";
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await getChannelInfo(channelId);
      channelInfo.value = response.items?.[0] || null;
    } catch (err) {
      error.value = err.message || "Failed to fetch channel information";
      console.error("Error in useYoutube.fetchChannelInfo:", err);
    } finally {
      loading.value = false;
    }
  };

  return {
    videos,
    channelInfo,
    videoDetails,
    loading,
    error,
    pagination,
    fetchChannelVideos,
    fetchNextPage,
    fetchPrevPage,
    fetchVideoDetails,
    fetchChannelInfo,
  };
}
