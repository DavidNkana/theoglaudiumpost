/**
 * features/youtube/YoutubeService.js
 *
 * Service module for interacting with the YouTube Data API.
 *
 * This module:
 * - Provides functions to fetch videos from YouTube channels
 * - Retrieves detailed information about specific videos
 * - Fetches channel information
 * - Supports searching for videos by query
 * - Handles API authentication and error handling
 */

import axios from "axios";
import { YOUTUBE_API_KEY } from "@/config/app";
import { BaseService } from "@/shared/services/BaseService";

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";

/**
 * Fetches the latest videos from a YouTube channel
 * @param {string} channelId - The YouTube channel ID
 * @param {Object} options - Additional options
 * @param {string} options.pageToken - Token for pagination (nextPageToken or prevPageToken)
 * @param {number} options.maxResults - Maximum number of results to return (default: 10, max: 50)
 * @param {string} options.order - Order of the results (default: 'date', options: 'date', 'rating', 'relevance', 'title', 'videoCount', 'viewCount')
 * @returns {Promise} - Promise that resolves to the API response
 */
export const getChannelVideos = async (
  channelId,
  { pageToken = "", maxResults = 10, order = "date" } = {}
) => {
  if (!channelId) {
    throw new Error("Channel ID is required");
  }

  if (!YOUTUBE_API_KEY) {
    throw new Error("YouTube API key is not configured");
  }

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/search`, {
      params: {
        part: "snippet",
        channelId,
        maxResults: Math.min(maxResults, 50), // YouTube API allows max 50 results per request
        order,
        type: "video",
        pageToken: pageToken || undefined,
        key: YOUTUBE_API_KEY,
      },
    });

    return {
      items: response.data.items,
      nextPageToken: response.data.nextPageToken,
      prevPageToken: response.data.prevPageToken,
      pageInfo: response.data.pageInfo,
    };
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);
    throw error;
  }
};

/**
 * Fetches detailed information about specific YouTube videos
 * @param {string|string[]} videoIds - Single video ID or array of video IDs
 * @returns {Promise} - Promise that resolves to the API response
 */
export const getVideoDetails = async (videoIds) => {
  if (!videoIds || (Array.isArray(videoIds) && videoIds.length === 0)) {
    throw new Error("Video ID(s) are required");
  }

  if (!YOUTUBE_API_KEY) {
    throw new Error("YouTube API key is not configured");
  }

  const ids = Array.isArray(videoIds) ? videoIds.join(",") : videoIds;

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/videos`, {
      params: {
        part: "snippet,contentDetails,statistics",
        id: ids,
        key: YOUTUBE_API_KEY,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching YouTube video details:", error);
    throw error;
  }
};

/**
 * Fetches information about a YouTube channel
 * @param {string} channelId - The YouTube channel ID
 * @returns {Promise} - Promise that resolves to the API response
 */
export const getChannelInfo = async (channelId) => {
  if (!channelId) {
    throw new Error("Channel ID is required");
  }

  if (!YOUTUBE_API_KEY) {
    throw new Error("YouTube API key is not configured");
  }

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/channels`, {
      params: {
        part: "snippet,contentDetails,statistics",
        id: channelId,
        key: YOUTUBE_API_KEY,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching YouTube channel info:", error);
    throw error;
  }
};

/**
 * Searches for YouTube videos by query
 * @param {string} query - The search query
 * @param {Object} options - Additional options
 * @param {string} options.pageToken - Token for pagination (nextPageToken or prevPageToken)
 * @param {number} options.maxResults - Maximum number of results to return (default: 10, max: 50)
 * @param {string} options.order - Order of the results (default: 'relevance', options: 'date', 'rating', 'relevance', 'title', 'videoCount', 'viewCount')
 * @returns {Promise} - Promise that resolves to the API response
 */
export const searchVideos = async (
  query,
  { pageToken = "", maxResults = 10, order = "relevance", channelId = "" } = {}
) => {
  if (!query) {
    throw new Error("Search query is required");
  }

  if (!YOUTUBE_API_KEY) {
    throw new Error("YouTube API key is not configured");
  }

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE_URL}/search`, {
      params: {
        part: "snippet",
        q: query,
        maxResults: Math.min(maxResults, 50), // YouTube API allows max 50 results per request
        order,
        type: "video",
        pageToken: pageToken || undefined,
        channelId,
        key: YOUTUBE_API_KEY,
      },
    });

    return {
      items: response.data.items,
      nextPageToken: response.data.nextPageToken,
      prevPageToken: response.data.prevPageToken,
      pageInfo: response.data.pageInfo,
    };
  } catch (error) {
    console.error("Error searching YouTube videos:", error);
    throw error;
  }
};

export class YoutubeService extends BaseService {
  constructor() {
    super("youtube");
  }
}

// expose the domain functions as instance methods (they don't use `this`)
Object.assign(YoutubeService.prototype, {
  getChannelVideos,
  getVideoDetails,
  getChannelInfo,
  searchVideos,
});

export const youtubeService = new YoutubeService();
export default youtubeService;
