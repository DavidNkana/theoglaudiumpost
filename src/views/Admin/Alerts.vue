<!-- 
  Admin alerts management page that contains:
  1. Search and category filters
  2. Table of alerts with pagination
  3. Actions for creating, editing, and deleting alerts
-->
<template>
  <div class="container-fluid py-4">
    <div class="row mb-4">
      <div class="col-12">
        <div class="d-flex justify-content-between align-items-center">
          <h2>Alerts</h2>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-body">
            <!-- Filters -->
            <div class="mb-4">
              <div class="row g-3 align-items-center">
                <div class="col-auto">
                  <input
                    type="text"
                    v-model="filters.search"
                    class="form-control"
                    placeholder="Search posts..."
                  />
                </div>
                <div class="col-auto">
                  <select v-model="filters.category" class="form-select">
                    <option value="">All Categories</option>
                    <option
                      v-for="category in categories"
                      :key="category.id"
                      :value="category.id"
                    >
                      {{ category.name }}
                    </option>
                  </select>
                </div>
                <div class="col-auto">
                  <button
                    class="btn btn-outline-secondary"
                    @click="applyFilters"
                  >
                    Apply Filters
                  </button>
                </div>
                <div class="col-auto ml-auto">
                  <button class="btn btn-success" @click="createNewPost">
                    Add New
                  </button>
                </div>
              </div>
            </div>

            <!-- Posts Table -->
            <div class="table-responsive">
              <table class="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Category</th>
                    <th>Created Date</th>
                    <th>Status</th>
                    <th>Views</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loading">
                    <td colspan="8" class="text-center">
                      <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-else-if="posts.length === 0">
                    <td colspan="8" class="text-center">No posts found</td>
                  </tr>
                  <tr v-for="post in posts" :key="post.id">
                    <td>{{ post.id }}</td>
                    <td>
                      <div class="d-flex align-items-center">
                        <div v-if="post.featured_image" class="me-2">
                          <img
                            :src="post.featured_image"
                            class="rounded"
                            width="40"
                            height="40"
                            alt="Post thumbnail"
                          />
                        </div>
                        <div>{{ post.title }}</div>
                      </div>
                    </td>
                    <td>{{ post.author }}</td>
                    <td>{{ post.category }}</td>
                    <td>{{ formatDate(post.created_at) }}</td>
                    <td>
                      <span :class="getStatusBadgeClass(post.status)">
                        {{ post.status }}
                      </span>
                    </td>
                    <td>{{ post.views }}</td>
                    <td>
                      <div class="btn-group">
                        <button
                          class="btn btn-sm btn-outline-success"
                          @click="editPost(post.id)"
                        >
                          <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button
                          class="btn btn-sm btn-outline-danger"
                          @click="confirmDelete(post.id)"
                        >
                          <i class="bi bi-trash"></i> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <nav aria-label="Posts pagination" v-if="pagination.total > 0">
              <ul class="pagination justify-content-center">
                <li
                  class="page-item"
                  :class="{ disabled: pagination.current_page === 1 }"
                >
                  <a
                    class="page-link"
                    href="#"
                    @click.prevent="changePage(pagination.current_page - 1)"
                    >Previous</a
                  >
                </li>
                <li
                  v-for="page in getPageNumbers()"
                  :key="page"
                  class="page-item"
                  :class="{ active: page === pagination.current_page }"
                >
                  <a
                    class="page-link"
                    href="#"
                    @click.prevent="changePage(page)"
                    >{{ page }}</a
                  >
                </li>
                <li
                  class="page-item"
                  :class="{
                    disabled: pagination.current_page === pagination.last_page,
                  }"
                >
                  <a
                    class="page-link"
                    href="#"
                    @click.prevent="changePage(pagination.current_page + 1)"
                    >Next</a
                  >
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * Alerts.vue
 * 
 * Admin interface for managing system alerts in the Laudium Biz application.
 * 
 * This component:
 * - Provides filtering and search functionality for alerts
 * - Lists alerts in a paginated table
 * - Enables CRUD operations for alert management
 * - Handles status changes and content moderation
 */

import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

export default {
  name: "AdminEvents",
  /**
   * Component setup function that initializes state and methods
   * 
   * @returns {Object} Reactive state and methods for the template
   */
  setup() {
    const route = useRoute();
    const router = useRouter();

    /**
     * State Management
     */

    /**
     * Currently active tab for filtering alerts
     * @type {import('vue').Ref<string>}
     */
    const activeTab = ref("all");

    /**
     * Statistics about alert statuses
     * @type {import('vue').Ref<Object>}
     */
    const stats = ref({
      approved: 0,
      draft: 0,
      pending: 0,
      rejected: 0,
    });

    /**
     * List of alerts to display
     * @type {import('vue').Ref<Array>}
     */
    const posts = ref([]);

    /**
     * Loading state indicator
     * @type {import('vue').Ref<boolean>}
     */
    const loading = ref(true);

    /**
     * Available categories for filtering
     * @type {import('vue').Ref<Array>}
     */
    const categories = ref([]);

    /**
     * Filter criteria for searching and filtering alerts
     * @type {import('vue').Ref<Object>}
     */
    const filters = ref({
      search: "",     // Text search query
      category: "",   // Selected category ID
      status: "",     // Alert status filter
    });

    /**
     * Pagination state for the alerts table
     * @type {import('vue').Ref<Object>}
     */
    const pagination = ref({
      current_page: 1, // Current page number
      per_page: 10,    // Number of items per page
      last_page: 1,    // Last available page
      total: 0,        // Total number of items
    });

    /**
     * Data Fetching Methods
     */

    /**
     * Fetches alerts based on current tab and filters
     * 
     * This function:
     * 1. Sets the loading state
     * 2. Makes an API call to fetch alerts with current filters
     * 3. Updates the posts array and pagination information
     * 4. Handles any errors that occur during the fetch
     * 
     * Note: Currently using mock data for demonstration purposes
     * 
     * @async
     */
    const fetchPosts = async () => {
      loading.value = true;

      try {
        // Here you would make an API call to fetch posts
        // Example API endpoint: `/api/posts?tab=${activeTab.value}&page=${pagination.value.current_page}&search=${filters.value.search}&category=${filters.value.category}`

        // For demonstration, using setTimeout to simulate API call
        setTimeout(() => {
          // This is mock data - replace with actual API call
          posts.value = generateMockPosts(activeTab.value);
          pagination.value = {
            current_page: 1,
            per_page: 10,
            last_page: 3,
            total: 28,
          };
          loading.value = false;
        }, 500);
      } catch (error) {
        console.error("Error fetching posts:", error);
        loading.value = false;
      }
    };

    /**
     * Fetches alert statistics
     * 
     * Retrieves counts of alerts by status (approved, draft, pending, rejected)
     * for display in the dashboard.
     * 
     * Note: Currently using mock data for demonstration purposes
     * 
     * @async
     */
    const fetchStats = async () => {
      // Here you would make an API call to fetch post statistics
      // Example: const response = await axios.get('/api/posts/stats');

      // For demonstration, using mock data. Assigning this static object to a
      // ref cannot throw, so a try/catch here would be unreachable dead code.
      stats.value = {
        approved: 42,
        draft: 18,
        pending: 7,
        rejected: 3,
      };
    };

    /**
     * Fetches alert categories
     * 
     * Retrieves the list of available categories for the category filter dropdown.
     * 
     * Note: Currently using mock data for demonstration purposes
     * 
     * @async
     */
    const fetchCategories = async () => {
      // Here you would make an API call to fetch categories
      // Example: const response = await axios.get('/api/categories');

      // For demonstration, using mock data. Assigning this static array to a
      // ref cannot throw, so a try/catch here would be unreachable dead code.
      categories.value = [
        { id: 1, name: "News" },
        { id: 2, name: "Events" },
        { id: 3, name: "Business" },
        { id: 4, name: "Community" },
      ];
    };

    /**
     * Utility Methods
     */

    /**
     * Generates mock alert data for demonstration
     * 
     * Creates an array of mock alerts with random properties
     * based on the specified status filter.
     * 
     * @param {string} status - The status filter to apply ('all' or specific status)
     * @returns {Array} Array of mock alert objects
     */
    const generateMockPosts = (status) => {
      const statuses = ["approved", "draft", "pending", "rejected"];
      const mockPosts = [];

      for (let i = 1; i <= 10; i++) {
        const randomStatus =
          status === "all"
            ? statuses[Math.floor(Math.random() * statuses.length)]
            : status;

        mockPosts.push({
          id: i,
          title: `Laudium Post ${i} - ${randomStatus.charAt(0).toUpperCase() + randomStatus.slice(1)}`,
          author: `Author ${(i % 3) + 1}`,
          category: `Category ${(i % 4) + 1}`,
          created_at: new Date(
            Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
          ),
          status: randomStatus,
          views: Math.floor(Math.random() * 1000),
          featured_image: i % 2 === 0 ? `https://placehold.co/40` : null,
        });
      }

      return mockPosts;
    };

    /**
     * Formats a date for display in the UI
     * 
     * @param {Date|string} date - The date to format
     * @returns {string} Formatted date string (e.g., "Jan 15, 2025")
     */
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    };

    /**
     * Returns the appropriate Bootstrap badge class for a status
     * 
     * Maps alert status values to their corresponding
     * Bootstrap badge classes for visual indication.
     * 
     * @param {string} status - The alert status
     * @returns {string} CSS class for the badge
     */
    const getStatusBadgeClass = (status) => {
      const classes = {
        approved: "badge bg-success",
        draft: "badge bg-info",
        pending: "badge bg-warning",
        rejected: "badge bg-danger",
      };

      return classes[status] || "badge bg-secondary";
    };

    /**
     * Pagination and Filtering Methods
     */

    /**
     * Handles pagination page changes
     * 
     * Validates the requested page number and updates the current page
     * if it's within the valid range, then fetches the new page of data.
     * 
     * @param {number} page - The page number to navigate to
     */
    const changePage = (page) => {
      if (page < 1 || page > pagination.value.last_page) {
        return;
      }

      pagination.value.current_page = page;
      fetchPosts();
    };

    /**
     * Generates an array of page numbers for pagination controls
     * 
     * Creates a limited window of page numbers around the current page
     * to avoid displaying too many page links for large datasets.
     * 
     * @returns {Array<number>} Array of page numbers to display
     */
    const getPageNumbers = () => {
      const pages = [];
      const { current_page, last_page } = pagination.value;

      let startPage = Math.max(1, current_page - 2);
      let endPage = Math.min(last_page, startPage + 4);

      if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      return pages;
    };

    /**
     * Applies the current filter settings to the data
     * 
     * Resets pagination to the first page and fetches
     * data with the current filter criteria.
     */
    const applyFilters = () => {
      pagination.value.current_page = 1;
      fetchPosts();
    };

    /**
     * CRUD Operation Methods
     */

    /**
     * Navigates to the alert creation page
     * 
     * Redirects the user to the form for creating a new alert.
     */
    const createNewPost = () => {
      router.push("/admin/events/create");
    };

    /**
     * Navigates to the alert edit page
     * 
     * Redirects the user to the form for editing an existing alert.
     * 
     * @param {number|string} id - The ID of the alert to edit
     */
    const editPost = (id) => {
      router.push(`/admin/events/edit/${id}`);
    };

    /**
     * Displays a confirmation dialog before deleting an alert
     * 
     * Shows a browser confirmation dialog and proceeds with deletion
     * only if the user confirms the action.
     * 
     * @param {number|string} id - The ID of the alert to delete
     */
    const confirmDelete = (id) => {
      if (confirm("Are you sure you want to delete this post?")) {
        deletePost(id);
      }
    };

    /**
     * Deletes an alert from the system
     * 
     * Makes an API call to delete the specified alert and
     * refreshes the data after successful deletion.
     * 
     * @param {number|string} id - The ID of the alert to delete
     * @async
     */
    const deletePost = async (id) => {
      // Here you would make an API call to delete the post
      // Example: await axios.delete(`/api/posts/${id}`);

      // After successful deletion, refresh the data.
      // fetchPosts/fetchStats each swallow their own errors, so no error can
      // propagate here — a try/catch around these calls would be dead code.
      fetchPosts();
      fetchStats();
    };

    /**
     * Lifecycle and Reactivity
     */

    /**
     * Watch for route query changes to update the active tab
     * 
     * This watcher:
     * 1. Detects changes to the 'tab' query parameter
     * 2. Updates the active tab state
     * 3. Sets the corresponding status filter
     * 4. Refreshes the alert data
     */
    watch(
      () => route.query.tab,
      (newTab) => {
        activeTab.value = newTab || "all";
        filters.value.status = activeTab.value === "all" ? "" : activeTab.value;
        fetchPosts();
      },
      { immediate: true }
    );

    /**
     * Initialize component when mounted
     * 
     * This lifecycle hook:
     * 1. Sets the initial active tab from URL query parameters
     * 2. Configures the initial status filter
     * 3. Fetches all required data (alerts, stats, categories)
     */
    onMounted(() => {
      // Set active tab from URL query parameter
      activeTab.value = route.query.tab || "all";
      filters.value.status = activeTab.value === "all" ? "" : activeTab.value;

      // Fetch initial data
      fetchPosts();
      fetchStats();
      fetchCategories();
    });

    return {
      activeTab,
      stats,
      posts,
      loading,
      categories,
      filters,
      pagination,
      fetchPosts,
      formatDate,
      getStatusBadgeClass,
      changePage,
      getPageNumbers,
      applyFilters,
      createNewPost,
      editPost,
      confirmDelete,
    };
  },
};
</script>

<!-- 
  Scoped styles that only apply to this component
  These styles ensure proper display of images in the table
-->
<style scoped>
.table img {
  object-fit: cover; /* Ensures images maintain their aspect ratio in the table */
}
</style>
