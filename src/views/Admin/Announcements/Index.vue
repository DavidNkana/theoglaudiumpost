<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  getAnnouncements,
  getCategories,
  removeAnnouncement,
} from "@/features/announcements/AnnouncementsService";
import { Modal } from "bootstrap";
import { debounce } from "lodash";
import NoticesTable from "./Partials/NoticesTable.vue";
import AnnouncementForm from "./Partials/Form.vue";
import Preview from "./Partials/Preview.vue";
import { devLog } from "@/utils/devLog";
import { useSweetAlert } from "@/composables/useSweetAlert";
const { showToast } = useSweetAlert();

const route = useRoute();
const router = useRouter();

const deleteModal = ref(null);
let modalInstance = null;

let formModalInstance = null;
const formModal = ref(null);

let previewModalInstance = null;
const previewModal = ref(null);

const isDeleting = ref(false);
const selectedAnnouncement = ref(null);

// Announcements data
const announcements = ref([]);
const categories = ref([]);
const loading = ref(false);

// Filters
const filters = ref({
  search: "",
  category: "",
  priority: "",
  status: "",
});

// Pagination
const pagination = ref({
  current_page: 0,
  per_page: 10,
  last_page: 1,
  total: 0,
});

// Fetch announcements based on current tab and filters
const fetchAnnouncements = async () => {
  if (loading.value) return;
  loading.value = true;

  try {
    const response = await getAnnouncements({
      // category: filters.value.category,
      page: pagination.value.current_page,
      search: filters.value.search,
      category: filters.value.category,
      priority: filters.value.priority,
      size: pagination.value.per_page,
      status: filters.value.status ?? " ",
      // type: activeTab.value,
    });
    if (response.status != 200) {
      throw new Error("Unexpected Error");
    }
    announcements.value = response.data.announcements;
    pagination.value = {
      current_page: response.data.page,
      per_page: response.data.size,
      last_page: response.data.totalPages - 1,
      total: response.data.totalPages,
    };
    loading.value = false;
  } catch (error) {
    devLog.warn("Error fetching announcements:", error);
    loading.value = false;
  }
};

const fetchCategories = async () => {
  try {
    if (categories.value.length != 0) return;
    const response = await getCategories({ size: 100 });
    categories.value = response.data?.categories ?? [];
  } catch (error) {
    console.error("Error fetching categories:", error);
  }
};

const debouncedFetchAnnouncements = debounce(fetchAnnouncements, 500); // 500ms delay

// Delete Announcement
const deleteAnnouncement = async () => {
  isDeleting.value = true;

  try {
    await removeAnnouncement(selectedAnnouncement.value.id);
    announcements.value = announcements.value.filter(
      (ad) => ad.id !== selectedAnnouncement.value.id
    );
    modalInstance?.hide();

    selectedAnnouncement.value = {};
    showToast("success", "Notice deleted successfully");
  } catch (err) {
    devLog.warn("Error deleting Notice:", err);
    showToast("error", "Error deleting Notice");
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
  fetchAnnouncements();
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
  fetchAnnouncements();
};

const clearFilters = () => {
  filters.value = {
    ...filters.value,
    category: "",
    priority: "",
    search: "",
  };
  pagination.value.current_page = 0;
  fetchAnnouncements();
};

const changeStatus = (status) => {
  // filters.value.status = status;
  filters.value.status = filters.value.status === status ? "" : status;

  fetchAnnouncements();
};

const confirmDelete = (id) => {
  selectedAnnouncement.value = announcements.value.find((el) => el.id == id);
  if (selectedAnnouncement.value) {
    modalInstance?.show();
  }
};

const handlePreview = (id) => {
  selectedAnnouncement.value = announcements.value.find((el) => el.id == id);
  if (selectedAnnouncement.value) {
    previewModalInstance?.show();
  }
};

const closePeview = () => {
  previewModalInstance?.hide();
  selectedAnnouncement.value = null;
};

const openCreateModal = async () => {
  formModalInstance?.show();
};

const openUpdateModal = async (id) => {
  closePeview();
  selectedAnnouncement.value = announcements.value.find((el) => el.id == id);
  if (selectedAnnouncement.value) {
    formModalInstance?.show();
  }
};

const closeForm = () => {
  formModalInstance?.hide();
  selectedAnnouncement.value = null;
};

const addAnnouncement = (payload) => {
  announcements.value = [payload, ...announcements.value];
};

const updateAnnouncement = (payload) => {
  announcements.value = announcements.value.map((ad) => {
    if (ad.id == payload.id) {
      return { ...ad, ...payload };
    }
    return ad;
  });
};

watch(
  () => filters.value.search,
  () => {
    pagination.value.page = 0; // reset to first page on search
    debouncedFetchAnnouncements();
  }
);

onMounted(() => {
  filters.value.search = route.query.search || "";
  filters.value.category = route.query.category || "";
  filters.value.status = route.query.status || "";
  filters.value.priority = route.query.priority || "";
  pagination.value.current_page = parseInt(route.query.page) || 0;
  pagination.value.per_page = parseInt(route.query.size) || 10;

  // Fetch initial data
  fetchAnnouncements();
  fetchCategories();

  modalInstance = new Modal(deleteModal.value);
  formModalInstance = new Modal(formModal.value);
  previewModalInstance = new Modal(previewModal.value);
});

watch(
  [
    () => filters.value.search,
    () => filters.value.category,
    () => filters.value.priority,
    () => filters.value.status,
    () => pagination.value.current_page,
    () => pagination.value.per_page,
  ],
  () => {
    router.replace({
      query: {
        search: filters.value.search || undefined,
        category: filters.value.category || undefined,
        priority: filters.value.priority || undefined,
        status: filters.value.status || undefined,
        page: pagination.value.current_page,
        size: pagination.value.per_page,
      },
    });
  }
);
</script>

<template>
  <div class="container-fluid py-4">
    <div class="row mb-4">
      <div class="col-12">
        <h2>Announcements Management</h2>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-body">
            <div class="mb-4">
              <div class="row align-items-center">
                <!-- Left-aligned filter elements -->
                <div class="col-12 col-lg-auto mb-3 mb-lg-0">
                  <input
                    type="text"
                    v-model="filters.search"
                    class="form-control"
                    placeholder="Search posts..."
                  />
                </div>
                <div class="col-6 col-lg-auto mb-3 mb-lg-0">
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
                <div class="col-6 col-lg-auto mb-3 mb-lg-0">
                  <select
                    v-model="filters.priority"
                    class="form-select capitalize"
                  >
                    <option value="">All Priorities</option>
                    <option
                      v-for="priority in ['high', 'medium', 'low']"
                      :key="priority"
                      :value="priority"
                      class="capitalize"
                    >
                      {{ priority }}
                    </option>
                  </select>
                </div>
                <div
                  v-if="filters.search || filters.category || filters.priority"
                  class="col-6 col-lg-auto mb-3 mb-lg-0"
                >
                  <button
                    class="btn btn-outline-secondary"
                    @click="clearFilters"
                  >
                    Clear Filters
                  </button>
                </div>
                <div class="col-6 col-lg-auto mb-3 mb-lg-0">
                  <button class="btn btn-secondary" @click="applyFilters">
                    Apply Filters
                  </button>
                </div>

                <!-- Right-aligned button -->
                <div class="mt-md-3 col-lg mt-lg-0 ms-lg-auto text-end">
                  <router-link
                    class="btn btn-success"
                    to="announcements/create"
                  >
                    Create New
                  </router-link>
                </div>
              </div>
            </div>

            <!-- announcements Table -->
            <NoticesTable
              :announcements="announcements ?? []"
              :is-loading="loading"
              :page="pagination.current_page"
              :page-size="pagination.per_page"
              @handle-delete="confirmDelete"
              @handle-preview="handlePreview"
              @handle-edit="openUpdateModal"
            />

            <!-- Pagination -->

            <nav
              aria-label="announcements pagination"
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

    <div class="modal fade" id="formModal" tabindex="-1" ref="formModal">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-body p-0">
            <AnnouncementForm
              :announcement="selectedAnnouncement"
              @close="closeForm"
              @add="addAnnouncement"
              @update="updateAnnouncement"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Preview Modal -->
    <div class="modal fade" id="previewModal" tabindex="-1" ref="previewModal">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-body p-0">
            <Preview
              v-if="selectedAnnouncement"
              :announcement="selectedAnnouncement"
              @close="closePeview"
              @edit="openUpdateModal"
            />
          </div>
        </div>
      </div>
    </div>

    <div
      class="modal fade"
      ref="deleteModal"
      id="deleteModal"
      tabindex="-1"
      aria-hidden="true"
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
            <p class="fw-bold my-0">{{ selectedAnnouncement?.name }}</p>
            <p>Are you sure you want to delete this announcement?</p>
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
              @click="deleteAnnouncement"
              :disabled="isDeleting"
            >
              {{ isDeleting ? "Deleting..." : "Delete Announcement" }}
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
</style>
