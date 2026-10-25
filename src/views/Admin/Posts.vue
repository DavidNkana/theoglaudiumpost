<template>
  <div class="container-fluid py-4">
    <div class="row mb-4">
      <div class="col-12">
        <h2>Posts Management</h2>
        <div class="card">
          <div class="card-header">
            <div class="d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Posts Statistics</h5>
              <button class="btn btn-primary" @click="createNewPost">
                Add New Post
              </button>
            </div>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-3 col-sm-6 mb-3">
                <div class="card bg-success text-white">
                  <div class="card-body">
                    <h5 class="card-title">Approved</h5>
                    <h3 class="card-text">{{ stats.approved }}</h3>
                  </div>
                </div>
              </div>
              <div class="col-md-3 col-sm-6 mb-3">
                <div class="card bg-info text-white">
                  <div class="card-body">
                    <h5 class="card-title">Draft</h5>
                    <h3 class="card-text">{{ stats.draft }}</h3>
                  </div>
                </div>
              </div>
              <div class="col-md-3 col-sm-6 mb-3">
                <div class="card bg-warning text-white">
                  <div class="card-body">
                    <h5 class="card-title">Pending</h5>
                    <h3 class="card-text">{{ stats.pending }}</h3>
                  </div>
                </div>
              </div>
              <div class="col-md-3 col-sm-6 mb-3">
                <div class="card bg-danger text-white">
                  <div class="card-body">
                    <h5 class="card-title">Rejected</h5>
                    <h3 class="card-text">{{ stats.rejected }}</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <ul class="nav nav-tabs card-header-tabs">
              <li class="nav-item">
                <router-link
                  :to="{ path: '/admin/posts', query: { tab: 'all' } }"
                  class="nav-link"
                  :class="{ active: activeTab === 'all' }"
                >
                  All Posts
                </router-link>
              </li>
              <li class="nav-item">
                <router-link
                  :to="{ path: '/admin/posts', query: { tab: 'approved' } }"
                  class="nav-link"
                  :class="{ active: activeTab === 'approved' }"
                >
                  Approved
                </router-link>
              </li>
              <li class="nav-item">
                <router-link
                  :to="{ path: '/admin/posts', query: { tab: 'draft' } }"
                  class="nav-link"
                  :class="{ active: activeTab === 'draft' }"
                >
                  Draft
                </router-link>
              </li>
              <li class="nav-item">
                <router-link
                  :to="{ path: '/admin/posts', query: { tab: 'pending' } }"
                  class="nav-link"
                  :class="{ active: activeTab === 'pending' }"
                >
                  Pending
                </router-link>
              </li>
              <li class="nav-item">
                <router-link
                  :to="{ path: '/admin/posts', query: { tab: 'rejected' } }"
                  class="nav-link"
                  :class="{ active: activeTab === 'rejected' }"
                >
                  Rejected
                </router-link>
              </li>
            </ul>
          </div>
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
                          class="btn btn-sm btn-outline-primary"
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
  import { ref, computed, onMounted, watch } from "vue";
  import { useRoute, useRouter } from "vue-router";

  export default {
    name: "PostsAdmin",
    setup() {
      const route = useRoute();
      const router = useRouter();

      // Tab management
      const activeTab = ref("all");

      // Stats
      const stats = ref({
        approved: 0,
        draft: 0,
        pending: 0,
        rejected: 0,
      });

      // Posts data
      const posts = ref([]);
      const loading = ref(true);
      const categories = ref([]);

      // Filters
      const filters = ref({
        search: "",
        category: "",
        status: "",
      });

      // Pagination
      const pagination = ref({
        current_page: 1,
        per_page: 10,
        last_page: 1,
        total: 0,
      });

      // Fetch posts based on current tab and filters
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

      // Fetch stats
      const fetchStats = async () => {
        // Here you would make an API call to fetch post statistics
        // Example: const response = await axios.get('/api/posts/stats');

        // For demonstration, using mock data
        stats.value = {
          approved: 42,
          draft: 18,
          pending: 7,
          rejected: 3,
        };
      };

      // Fetch categories
      const fetchCategories = async () => {
        // Here you would make an API call to fetch categories
        // Example: const response = await axios.get('/api/categories');

        // For demonstration, using mock data
        categories.value = [
          { id: 1, name: "News" },
          { id: 2, name: "Events" },
          { id: 3, name: "Business" },
          { id: 4, name: "Community" },
        ];
      };

      // Generate mock posts for demonstration
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
            featured_image:
              i % 2 === 0 ? `https://placehold.co/40` : null,
          });
        }

        return mockPosts;
      };

      // Format date
      const formatDate = (date) => {
        return new Date(date).toLocaleDateString("en-ZA", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      };

      // Get status badge class
      const getStatusBadgeClass = (status) => {
        const classes = {
          approved: "badge bg-success",
          draft: "badge bg-info",
          pending: "badge bg-warning",
          rejected: "badge bg-danger",
        };

        return classes[status] || "badge bg-secondary";
      };

      // Handle page change
      const changePage = (page) => {
        if (page < 1 || page > pagination.value.last_page) {
          return;
        }

        pagination.value.current_page = page;
        fetchPosts();
      };

      // Get array of page numbers for pagination
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

      // Apply filters
      const applyFilters = () => {
        pagination.value.current_page = 1;
        fetchPosts();
      };

      // CRUD operations
      const createNewPost = () => {
        router.push("/admin/posts/create");
      };

      const editPost = (id) => {
        router.push(`/admin/posts/edit/${id}`);
      };

      const confirmDelete = (id) => {
        if (confirm("Are you sure you want to delete this post?")) {
          deletePost(id);
        }
      };

      const deletePost = async (id) => {
        try {
          // Here you would make an API call to delete the post
          // Example: await axios.delete(`/api/posts/${id}`);

          console.log(`Deleting post ${id}`);

          // After successful deletion, refresh the data
          fetchPosts();
          fetchStats();
        } catch (error) {
          console.error("Error deleting post:", error);
        }
      };

      // Watch for route changes to update the active tab
      watch(
        () => route.query.tab,
        (newTab) => {
          activeTab.value = newTab || "all";
          filters.value.status =
            activeTab.value === "all" ? "" : activeTab.value;
          fetchPosts();
        },
        { immediate: true }
      );

      // Initialize component
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

<style scoped>
  .table img {
    object-fit: cover;
  }
</style>
