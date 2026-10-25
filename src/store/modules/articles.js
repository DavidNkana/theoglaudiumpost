/**
 * store/modules/articles.js
 *
 * Vuex module for managing article data in the application.
 *
 * This module:
 * - Stores and manages different types of articles (latest, featured, top stories, popular)
 * - Provides actions for fetching articles from the API
 * - Supports pagination for latest articles
 * - Handles caching of articles to minimize API calls
 * - Provides getters for filtering and accessing articles
 */

import { getArticleBySlug, getArticles } from "@/features/articles/ArticlesService";

/**
 * Module state
 */
const state = () => ({
  // Latest articles with pagination support
  latest: {
    articlesByPage: {}, // key = page number, value = array of articles
    articles: [], // Deprecated, use articlesByPage instead
    hasMore: true, // Whether there are more pages to load
    total: 0, // Total number of articles
    totalPages: 0, // Total number of pages
    page: 0, // Current page
    size: 8, // Number of articles per page
  },
  featured: [], // Featured articles
  topStories: [], // Top stories
  popular: [], // Popular articles
  error: null, // Error message if article operations fail
});

/**
 * Module getters
 */
const getters = {
  /**
   * Returns the list of featured articles
   * @param {Object} state - Module state
   * @returns {Array} List of featured articles
   */
  featuredArticles: (state) => state.featured,

  /**
   * Returns the list of top stories
   * @param {Object} state - Module state
   * @returns {Array} List of top stories
   */
  topStories: (state) => state.topStories,

  /**
   * Returns the list of popular articles
   * @param {Object} state - Module state
   * @returns {Array} List of popular articles
   */
  popularArticles: (state) => state.popular,

  /**
   * Returns all latest articles from all pages, flattened into a single array
   * @param {Object} state - Module state
   * @returns {Array} List of all latest articles
   */
  latestArticles: (state) => Object.values(state.latest.articlesByPage).flat(),

  /**
   * Returns a deduplicated list of all articles from all sources
   * This is useful when you need to search across all article types
   *
   * @param {Object} state - Module state
   * @param {Object} getters - Module getters
   * @returns {Array} List of unique articles from all sources
   */
  uniqueArticles: (state, getters) => {
    // Combine all article sources
    const combined = [
      ...getters.latestArticles,
      ...state.featured,
      ...state.topStories,
      ...state.popular,
    ];

    // Deduplicate by article ID
    const unique = [];
    const seen = new Set();

    for (const article of combined) {
      if (!seen.has(article.id)) {
        seen.add(article.id);
        unique.push(article);
      }
    }

    return unique;
  },

  /**
   * Returns articles related to a specific article by category
   *
   * @param {Object} state - Module state
   * @param {Object} getters - Module getters
   * @returns {Function} Function that takes article ID and category ID and returns related articles
   */
  relatedArticles:
    (state, getters) =>
    ({ id, categoryId }) => {
      return (
        getters.uniqueArticles
          .filter(
            (article) => article.category_id === categoryId && article.id !== id
          )
          ?.slice(0, 6) ?? []
      );
    },

  /**
   * Returns latest articles for a specific page with pagination info
   *
   * @param {Object} state - Module state
   * @returns {Function} Function that takes a page number and returns articles with pagination info
   */
  latestArticlesByPage: (state) => (page) => {
    return {
      pages: state.latest.totalPages,
      articles: state.latest.articlesByPage[page] || [],
    };
  },

  /**
   * Finds an article by its slug in all article collections
   *
   * @param {Object} state - Module state
   * @param {Object} getters - Module getters
   * @returns {Function} Function that takes a slug and returns the matching article or null
   */
  getArticleBySlugFromStore: (state, getters) => (slug) => {
    return (
      getters.uniqueArticles.find(
        (article) => article.slug === slug && typeof article.content === "string" && article.content.trim().length > 0
      ) || null
    );
  },

  /**
   * Returns IDs of articles that should be excluded from latest articles
   * This prevents duplicate articles across different sections
   *
   * @param {Object} state - Module state
   * @returns {Array} List of article IDs to exclude
   */
  idsToExclude: (state) => [
    ...state.topStories.map((story) => story.id),
    ...state.popular.map((story) => story.id),
  ],

  /**
   * Returns whether there are more latest articles to load
   *
   * @param {Object} state - Module state
   * @returns {Boolean} Whether there are more articles to load
   */
  hasMore: (state) => {
    return state.latest.hasMore;
  },
};

/**
 * Module mutations
 */
const mutations = {
  /**
   * Sets articles for a specific type (featured, topStories, popular)
   *
   * @param {Object} state - Module state
   * @param {Object} payload - Payload containing type and articles
   * @param {String} payload.type - Type of articles (featured, topStories, popular)
   * @param {Array} payload.articles - Array of articles
   */
  setArticlesByType(state, { type, articles }) {
    if (type in state) {
      state[type] = articles;
    }
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
   * Adds a single article to the appropriate collection based on its type
   * Prevents duplicate articles by checking if the article already exists
   *
   * @param {Object} state - Module state
   * @param {Object} payload - Payload containing type and article
   * @param {String} payload.type - Type of article (featured, top, popular, or latest)
   * @param {Object} payload.article - Article object to add
   */
  addArticleByType(state, { type, article }) {
    // Map API article types to state property names
    const typeMap = {
      featured: "featured",
      top: "topStories",
      popular: "popular",
    };

    // Determine the target collection
    const _type = typeMap[type] ?? "latest";

    if (_type === "latest") {
      // For latest articles, add to the current page
      const page = state.latest.page ?? 0;

      // Check if article already exists to prevent duplicates
      const exists = state.latest.articlesByPage[page]?.find(
        (a) => a.slug === article.slug
      );

      // Add only if it doesn't exist
      if (!exists) {
        state.latest.articlesByPage[page]?.push(article);
      }
    } else {
      // For other article types, add to the appropriate collection
      const exists = state[_type].find((a) => a.slug === article.slug);

      // Add only if it doesn't exist
      if (!exists) {
        state[_type].push(article);
      }
    }
  },

  updateArticle(state, updatedData) {
    if (!updatedData || !updatedData.id) return;
    // console.log("Updating article:", updatedData);
    if (updatedData.type === "latest") {
      const articleIndex = state.latest.articlesByPage[
        state.latest.page
      ].findIndex((article) => article.id === updatedData.id);
      if (articleIndex !== -1) {
        state.latest.articlesByPage[state.latest.page][articleIndex] = {
          ...state.latest.articlesByPage[state.latest.page][articleIndex],
          ...updatedData,
        };
      }
    } else if (updatedData.type === "featured") {
      const articleIndex = state.featured.findIndex(
        (article) => article.id === updatedData.id
      );
      if (articleIndex !== -1) {
        state.featured[articleIndex] = {
          ...state.featured[articleIndex],
          ...updatedData,
        };
      }
    } else if (updatedData.type === "top") {
      const articleIndex = state.topStories.findIndex(
        (article) => article.id === updatedData.id
      );
      if (articleIndex !== -1) {
        state.topStories[articleIndex] = {
          ...state.topStories[articleIndex],
          ...updatedData,
        };
      }
    } else if (updatedData.type === "popular") {
      const articleIndex = state.popular.findIndex(
        (article) => article.id === updatedData.id
      );
      if (articleIndex !== -1) {
        state.popular[articleIndex] = {
          ...state.popular[articleIndex],
          ...updatedData,
        };
      }
    }
  },
  /**
   * Sets latest articles for a specific page with pagination information
   *
   * @param {Object} state - Module state
   * @param {Object} payload - Payload containing page data
   * @param {Number} payload.page - Page number
   * @param {Array} payload.articles - Articles for this page
   * @param {Number} payload.total - Total number of articles
   * @param {Number} payload.totalPages - Total number of pages
   * @param {Boolean} payload.hasMore - Whether there are more pages to load
   */
  setLatestArticles(state, { page, articles, total, totalPages, hasMore }) {
    state.latest.articlesByPage[page] = articles;
    state.latest.page = page;
    state.latest.total = total;
    state.latest.totalPages = totalPages;
    state.latest.hasMore = hasMore;
  },
};

/**
 * Module actions
 */
const actions = {
  /**
   * Fetches articles of a specific type from the API
   *
   * This action:
   * 1. Maps the internal type to the API type
   * 2. Checks if articles are already loaded to avoid unnecessary API calls
   * 3. Fetches articles from the API
   * 4. Updates the state with the fetched articles
   * 5. Handles pagination for latest articles
   *
   * @param {Object} context - Vuex action context
   * @param {Function} context.commit - Commit function to trigger mutations
   * @param {Object} context.state - Current module state
   * @param {Object} context.getters - Module getters
   * @param {Object} payload - Action payload
   * @param {String} payload.type - Type of articles to fetch (featured, topStories, popular, latest)
   * @param {Number} payload.size - Number of articles to fetch per page (default: 10)
   * @param {Number} payload.page - Page number for pagination (default: 0)
   */
  async fetchArticlesByType(
    { commit, state, getters },
    { type, size = 10, page = 0 }
  ) {
    // Map internal article types to API types
    const typeMap = {
      featured: "featured",
      topStories: "top",
      popular: "popular",
      latest: "",
    };

    // const apiType = typeMap[type] ?? "";
    const apiType = typeMap[type];
    if (apiType == null) return;

    const isLatest = type === "latest";
    try {
      // Skip API call if articles are already loaded
      if (
        isLatest &&
        state.latest.articlesByPage[page] &&
        state.latest.articlesByPage[page]?.length !== 0
      ) {
        return;
      } else if (state[type].length) {
        return;
      }

      // Fetch articles from API
      const response = await getArticles({
        type: apiType,
        size: size,
        page: page,
        status: "published",
        // excludeIds: apiType == "" ? (getters.idsToExclude ?? []) : null,
      });

      // Validate response
      if (response.status !== 200)
        throw new Error(`Failed to fetch ${type} articles`);

      // Extract data
      const data = await response.data;
      const { articles, total, totalPages } = response.data;

      // Update state based on article type
      if (isLatest) {
        // For latest articles, update with pagination info
        commit("setLatestArticles", {
          page,
          articles,
          total,
          totalPages,
          hasMore: page < totalPages,
        });
      } else {
        // For other article types, replace the entire collection
        commit("setArticlesByType", {
          type,
          articles,
        });
      }
    } catch (err) {
      // Handle errors
      commit("setError", err.message);
      throw err;
    }
  },

  /**
   * Fetches a single article by its slug
   *
   * This action:
   * 1. Checks if the article is already in the store
   * 2. If not, fetches it from the API
   * 3. Processes the article data
   * 4. Adds it to the appropriate collection
   *
   * @param {Object} context - Vuex action context
   * @param {Function} context.commit - Commit function to trigger mutations
   * @param {Object} context.getters - Module getters
   * @param {String} slug - Article slug to fetch
   * @returns {Object} The fetched article
   */
  async fetchSingleArticle({ commit, getters }, slug) {
    // Always fetch fresh article data from API to ensure up-to-date content before rendering
    try {
      // Fetch article from API
      const response = await getArticleBySlug(slug);

      // Validate response
      if (response.status != 200 || !response.data)
        throw new Error("Article not found");

      // Process article data
      const article = {
        ...response.data,
        coverImage: response.data.cover?.file,
        scheduledFor: response.data.scheduled_for,
        categoryId: response.data?.category?.id,
      };

      // Add article to the appropriate collection
      commit("addArticleByType", {
        type: article.article_type ?? "latest",
        article: article,
      });

      return article;
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
