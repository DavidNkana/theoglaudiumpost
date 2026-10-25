<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  getArticles,
  removeArticle,
  publishScheduled,
} from "@/features/articles/ArticlesService";
import { getCategories } from "@/features/categories/CategoriesService";
import { Modal } from "bootstrap";
import Stats from "./Partials/Stats.vue";
import ArticlesTable from "./Partials/ArticlesTable.vue";
import { debounce } from "lodash";
import ArticlePreview from "./Partials/ArticlePreview.vue";
import { devLog } from "@/utils/devLog";
import { useSweetAlert } from "@/composables/useSweetAlert";
const { showToast } = useSweetAlert();
import { useAuth } from "@/composables/useAuth";
const { hasRole } = useAuth();

import DatePicker from "@/components/DatePicker.vue";
import dayjs from "dayjs";

const route = useRoute();
const router = useRouter();

// Tab management
// const activeTab = ref("all");

const deleteModal = ref(null);
let modalInstance = null;

let previewModalInstance = null;
const postPreviewModal = ref(null);

const isDeleting = ref(false);
const selectedArticle = ref({
  id: "",
  title: "",
});

// Posts data
const posts = ref([]);
const loading = ref(false);
const publishing = ref(false);
const categories = ref([]);

// Filters
const filters = ref({
  search: "",
  category: "",
  status: "",
  dateRange: [],
});

// Pagination
const pagination = ref({
  current_page: 0,
  per_page: 10,
  last_page: 1,
  total: 0,
});

function formatDate(date) {
  return date ? dayjs(date).format("YYYY-MM-DDTHH:mm") : null;
}

// Fetch posts based on current tab and filters
const fetchPosts = async () => {
  if (loading.value) return;
  loading.value = true;

  try {
    const [start, end] = filters.value.dateRange;

    const formattedStart = formatDate(start);
    const formattedEnd = formatDate(end);

    devLog.debug(`StartDate: ${formattedStart} - EndDate: ${formattedEnd}`);

    const response = await getArticles({
      category: filters.value.category,
      page: pagination.value.current_page,
      search: filters.value.search,
      size: pagination.value.per_page,
      status: filters.value.status,
      startDate: formattedStart,
      endDate: formattedEnd,
      excludeIds: null,
      // type: activeTab.value,
    });
    if (response.status != 200) {
      throw new Error("Unexpected Error");
    }
    // Debug logging to identify status filtering issues
    console.log("Requested status:", filters.value.status);
    console.log("Backend returned articles:", response.data.articles?.length);
    console.log("Article statuses:", response.data.articles?.map(a => a.status));

    // Apply client-side status filtering as a safeguard in case backend ignores the status parameter
    let receivedArticles = response.data.articles || [];
    if (filters.value.status) {
      receivedArticles = receivedArticles.filter(
        (a) => (a.status || "").toLowerCase() === filters.value.status.toLowerCase()
      );
      console.log("After client-side filter:", receivedArticles.length, "articles");
    }
    posts.value = receivedArticles;
    pagination.value = {
      current_page: response.data.page,
      per_page: response.data.size,
      last_page: response.data.totalPages - 1,
      total: response.data.totalPages,
    };
    loading.value = false;
  } catch (error) {
    console.error("Error fetching posts:", error);
    loading.value = false;
  }
};

const debouncedFetchPosts = debounce(fetchPosts, 500); // 500ms delay

// Fetch categories
const fetchCategories = async () => {
  try {
    if (categories.value.length != 0) return;
    const response = await getCategories();
    categories.value = response.data;
  } catch (error) {
    console.error("Error fetching categories:", error);
  }
};

// Delete article
const deleteArticle = async () => {
  isDeleting.value = true;

  try {
    await removeArticle(selectedArticle.value.id);
    posts.value = posts.value.filter(
      (article) => article.id !== selectedArticle.value.id
    );
    modalInstance?.hide();

    selectedArticle.value = {};
    // router.push("/admin/articles");
  } catch (err) {
    console.error("Error deleting article:", err);
    alert("Failed to delete article. Please try again.");
  } finally {
    isDeleting.value = false;
  }
};

// Handle page change
const changePage = (page) => {
  if (page < 0 || page > pagination.value.last_page) {
    return;
  }

  pagination.value.current_page = page;
  fetchPosts();
};

// Get array of page numbers for pagination
const getPageNumbers = () => {
  const pages = [];
  const currentPage = pagination.value.current_page + 1; // Convert 0-based to 1-based for display
  const lastPage = pagination.value.total; // From backend

  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(lastPage, startPage + 4);

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
  pagination.value.current_page = 0;
  fetchPosts();
};

const clearFilters = () => {
  filters.value = {
    ...filters.value,
    category: "",
    search: "",
    dateRange: [],
  };
  pagination.value.current_page = 0;
  fetchPosts();
};

const changeStatus = (status) => {
  // Always set the selected status and reset to first page
  filters.value.status = status;
  pagination.value.current_page = 0;
  fetchPosts();
};

const confirmDelete = (id) => {
  selectedArticle.value = posts.value.find((el) => el.id == id);
  if (selectedArticle.value) {
    modalInstance?.show();
  }
};

const handlePreview = (id) => {
  selectedArticle.value = posts.value.find((el) => el.id == id);
  if (selectedArticle.value) {
    previewModalInstance?.show();
  }
};

const closePeview = () => {
  previewModalInstance?.hide();
  selectedArticle.value = null;
};

watch(
  () => filters.value.search,
  () => {
    pagination.value.page = 0; // reset to first page on search
    debouncedFetchPosts();
  }
);

// Watch for route changes to update the active tab
// watch(
//   () => route.query.tab,
//   (newTab) => {
//     activeTab.value = newTab || "all";
//     filters.value.status = activeTab.value === "all" ? "" : activeTab.value;
//     fetchPosts();
//   },
//   { immediate: true }
// );

onMounted(() => {
  filters.value.search = route.query.search || "";
  filters.value.category = route.query.category || "";
  filters.value.status = route.query.status || "";
  filters.value.dateRange = [route.query.from || "", route.query.to || ""];
  pagination.value.current_page = parseInt(route.query.page) || 0;
  pagination.value.per_page = parseInt(route.query.size) || 10;

  // Fetch initial data
  fetchPosts();
  fetchCategories();

  modalInstance = new Modal(deleteModal.value);
  previewModalInstance = new Modal(postPreviewModal.value);
});

const editPost = (post) => {
  closePeview();
  if (post) {
    router.push(`/admin/articles/edit/${post.id}`);
  }
};

watch(
  [
    () => filters.value.search,
    () => filters.value.category,
    () => filters.value.status,
    () => filters.value.dateRange,
    () => pagination.value.status,
    () => pagination.value.current_page,
    () => pagination.value.per_page,
  ],
  () => {
    router.replace({
      query: {
        search: filters.value.search || undefined,
        category: filters.value.category || undefined,
        status: filters.value.status || undefined,
        from: filters.value.dateRange[0] || undefined,
        to: filters.value.dateRange[1] || undefined,
        page: pagination.value.current_page,
        size: pagination.value.per_page,
      },
    });
  }
);

const updatePost = (newPost) => {
  selectedArticle.value = newPost;
};

const publishAll = async () => {
  try {
    publishing.value = true;
    const from = route.query.from || null;
    const to = route.query.to || null;
    await publishScheduled({
      startDate: from,
      endDate: from,
      publishAll: !from && !to,
    });
    showToast("success", "Published Successfully");
    // router.push({ path: route.path, query: { ...route.query } });
    window.location.href = window.location.pathname + window.location.search;

    // fetchPosts();
  } catch (error) {
    devLog.error("Error publishing: ", error);
    showToast("error", "Error publishing");
  } finally {
    publishing.value = false;
  }
};
</script>

<template>
  <div class="container-fluid py-4">
    <div class="row mb-4">
      <div class="col-12">
        <h2>Article Management</h2>
        <div class="card">
          <div class="card-body">
            <Stats
              :current-status="filters.status"
              @change-status="changeStatus"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <ul class="d-none d-lg-flex nav nav-tabs card-header-tabs">
              <li class="nav-item">
                <div
                  @click="changeStatus('')"
                  class="nav-link status-filter"
                  :class="{ active: filters.status === '' }"
                >
                  All
                </div>
              </li>
              <li class="nav-item">
                <div
                  @click="changeStatus('published')"
                  class="nav-link status-filter"
                  :class="{ active: filters.status === 'published' }"
                >
                  Published
                </div>
              </li>
              <li class="nav-item">
                <!-- :to="{ path: '/admin/articles', query: { status: 'draft' } }" -->
                <div
                  @click="changeStatus('draft')"
                  class="nav-link status-filter"
                  :class="{ active: filters.status === 'draft' }"
                >
                  Draft
                </div>
              </li>
              <li class="nav-item">
                <div
                  @click="changeStatus('scheduled')"
                  class="nav-link status-filter"
                  :class="{ active: filters.status === 'scheduled' }"
                >
                  Scheduled
                </div>
              </li>
              <li class="nav-item">
                <div
                  @click="changeStatus('archived')"
                  class="nav-link status-filter"
                  :class="{ active: filters.status === 'archived' }"
                >
                  Archived
                </div>
              </li>
            </ul>
            <div
              class="d-lg-none col-12 col-md col-lg-12 col-xl ms-xl-auto text-end"
            >
              <router-link class="btn btn-success" to="/admin/articles/prompt">
                Create New
              </router-link>
            </div>
          </div>
          <div class="card-body">
            <!-- Filters -->
            <!-- <div class="mb-4">
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

                <div class="col-end-1">
                  <button class="btn btn-success" @click="createNewPost">
                    Add New Post
                  </button>
                </div>
              </div>
            </div> -->

            <div class="mb-4">
              <div class="row align-items-center">
                <!-- Left-aligned filter elements -->
                <div class="col-12 col-lg-4 mb-3 mb-lg-0">
                  <input
                    type="text"
                    v-model="filters.search"
                    class="form-control"
                    placeholder="Search posts..."
                  />
                </div>
                <div class="col-auto col-lg-auto mb-3 mb-lg-0">
                  <div class="d-flex gap-4">
                    <select
                      v-model="filters.category"
                      class="form-select categories-select"
                    >
                      <option value="">All Categories</option>
                      <option
                        v-for="category in categories"
                        :key="category.id"
                        :value="category.id"
                      >
                        {{ category.name }}
                      </option>
                    </select>
                    <DatePicker v-model="filters.dateRange" />
                  </div>
                </div>
                <div
                  v-if="filters.search || filters.category"
                  class="col-5 col-lg-auto mb-3 my-lg-3"
                >
                  <button
                    class="btn btn-outline-secondary"
                    @click="clearFilters"
                  >
                    Clear Filters
                  </button>
                </div>
                <div class="col-5 col-lg-auto mb-3 my-lg-3">
                  <button
                    class="btn btn-secondary excerpt"
                    @click="applyFilters"
                  >
                    Apply Filters
                  </button>
                </div>

                <!-- Right-aligned button -->
                <div class="d-none d-lg-block col-lg ms-lg-auto text-end">
                  <button
                    v-if="filters.status == 'scheduled' && posts?.length > 0"
                    :disabled="publishing"
                    @click="publishAll"
                    class="btn btn-outline-primary me-4"
                  >
                    <span
                      v-if="publishing"
                      class="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    {{ publishing ? "Publishing..." : "Publish All" }}
                  </button>

                  <router-link
                    v-if="hasRole('superadmin')"
                    class="btn btn-outline-primary me-2"
                    to="/admin/articles/prompts"
                  >
                    Manage AI Prompts
                  </router-link>
                  <router-link
                    class="btn btn-success"
                    to="/admin/articles/prompt"
                  >
                    Create New
                  </router-link>
                </div>
              </div>
            </div>

            <!-- Posts Table -->
            <ArticlesTable
              :articles="posts ?? []"
              :is-loading="loading"
              :page="pagination.current_page"
              :page-size="pagination.per_page"
              :status="filters.status"
              @handle-delete="confirmDelete"
              @handle-preview="handlePreview"
            />

            <!-- Pagination -->

            <nav
              aria-label="Posts pagination"
              v-if="pagination.total > 0"
              class="d-sm-flex items-align-center justify-content-between mt-4 mt-md-0"
            >
              <div class="">
                <label for="pageSizeSelect" class="form-label me-2"
                  >Page Size</label
                >
                <select
                  id="pageSizeSelect"
                  class="form-select w-auto d-inline-block"
                  v-model="pagination.per_page"
                  @change="applyFilters"
                >
                  <option :value="5">5</option>
                  <option :value="10">10</option>
                  <option :value="25">25</option>
                  <option :value="50">50</option>
                </select>
              </div>
              <ul class="pagination justify-content-center mt-2 mt-sm-0">
                <li
                  class="page-item"
                  :class="{ disabled: pagination.current_page === 0 }"
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
                  :class="{ active: page - 1 === pagination.current_page }"
                >
                  <a
                    class="page-link"
                    href="#"
                    @click.prevent="changePage(page - 1)"
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

    <!-- Preview Modal -->
    <div
      class="modal fade"
      id="postPreviewModal"
      tabindex="-1"
      ref="postPreviewModal"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-body p-0">
            <ArticlePreview
              v-if="selectedArticle"
              :post="selectedArticle"
              @close="closePeview"
              @edit="editPost"
              @update-props="updatePost"
            />
            <!-- @view-full="viewFullArticle" -->
          </div>
        </div>
      </div>
    </div>

    <div
      class="modal fade"
      id="deleteModal"
      tabindex="-1"
      aria-hidden="true"
      ref="deleteModal"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">Confirm Deletion</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete this article?</p>
            <p class="fw-bold">{{ selectedArticle?.title ?? "" }}</p>
            <p class="text-danger">
              <strong>Warning:</strong> This action cannot be undone.
            </p>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-danger"
              @click="deleteArticle"
              :disabled="isDeleting"
            >
              {{ isDeleting ? "Deleting..." : "Delete Article" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.status-filter {
  cursor: pointer;
}

.categories-select {
  max-width: 150px;
}
</style>
