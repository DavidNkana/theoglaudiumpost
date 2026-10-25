<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getCategories, removeCategory } from "@/features/announcements/AnnouncementsService";
import { Modal } from "bootstrap";
import { debounce } from "lodash";
import CategoriesTable from "./Partials/CategoriesTable.vue";
import CategoryForm from "./Partials/CategoryForm.vue";
import { devLog } from "@/utils/devLog";
import { useSweetAlert } from "@/composables/useSweetAlert";
const { showToast } = useSweetAlert();

const route = useRoute();
const router = useRouter();

const deleteModal = ref(null);
let modalInstance = null;

let formModalInstance = null;
const formModal = ref(null);

const isDeleting = ref(false);
const selectedCategory = ref(null);

// Categories data
const categories = ref([]);
const loading = ref(false);

// Filters
const filters = ref({
  search: "",
  status: "",
});

// Pagination
const pagination = ref({
  current_page: 0,
  per_page: 10,
  last_page: 1,
  total: 0,
});

// Fetch categories based on current tab and filters
const fetchCategories = async () => {
  if (loading.value) return;
  loading.value = true;

  try {
    const response = await getCategories({
      page: pagination.value.current_page,
      search: filters.value.search,
      size: pagination.value.per_page,
      status: filters.value.status,
    });
    if (response.status != 200) {
      throw new Error("Unexpected Error");
    }
    categories.value = response.data.categories;
    pagination.value = {
      current_page: response.data.page,
      per_page: response.data.size,
      last_page: response.data.totalPages - 1,
      total: response.data.totalPages,
    };
    loading.value = false;
  } catch (error) {
    devLog.warn("Error fetching categories:", error);
    showToast("error", "Error fetching categories");
    loading.value = false;
  }
};

const debouncedFetchCategories = debounce(fetchCategories, 500); // 500ms delay

// Delete Category
const deleteCategory = async () => {
  isDeleting.value = true;

  try {
    await removeCategory(selectedCategory.value.id);
    categories.value = categories.value.filter(
      (category) => category.id !== selectedCategory.value.id
    );
    modalInstance?.hide();

    selectedCategory.value = {};
    showToast("success", "Category deleted successfully");
  } catch (err) {
    devLog.warn("Error deleting category:", err);
    showToast("error", "Error deleting category");
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
  fetchCategories();
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
  fetchCategories();
};

const clearFilters = () => {
  filters.value = {
    ...filters.value,
    category: "",
    search: "",
  };
  pagination.value.current_page = 0;
  fetchCategories();
};

const changeStatus = (status) => {
  // filters.value.status = status;
  filters.value.status = filters.value.status === status ? "" : status;

  fetchCategories();
};

const confirmDelete = (id) => {
  selectedCategory.value = categories.value.find((el) => el.id == id);
  if (selectedCategory.value) {
    modalInstance?.show();
  }
};

const openCreateModal = async () => {
  formModalInstance?.show();
};

const openUpdateModal = async (id) => {
  selectedCategory.value = categories.value.find((el) => el.id == id);
  if (selectedCategory.value) {
    formModalInstance?.show();
  }
};

const closeForm = () => {
  formModalInstance?.hide();
  selectedCategory.value = null;
};

const addCategory = (payload) => {
  categories.value = [payload, ...categories.value];
};

const updateCategory = (payload) => {
  categories.value = categories.value.map((category) => {
    if (category.id == payload.id) {
      return { ...category, ...payload };
    }
    return category;
  });
};

watch(
  () => filters.value.search,
  () => {
    pagination.value.page = 0; // reset to first page on search
    debouncedFetchCategories();
  }
);

onMounted(() => {
  filters.value.search = route.query.search || "";
  filters.value.status = route.query.status;
  pagination.value.current_page = parseInt(route.query.page) || 0;
  pagination.value.per_page = parseInt(route.query.size) || 10;

  // Fetch initial data
  fetchCategories();

  modalInstance = new Modal(deleteModal.value);
  formModalInstance = new Modal(formModal.value);
});

watch(
  [
    () => filters.value.search,
    () => filters.value.status,
    () => pagination.value.current_page,
    () => pagination.value.per_page,
  ],
  () => {
    router.replace({
      query: {
        search: filters.value.search || undefined,
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
        <h2>Categories Management</h2>
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
                    placeholder="Search categories..."
                  />
                </div>

                <!-- Right-aligned button -->
                <div class="col-lg ms-lg-auto text-end">
                  <button @click="openCreateModal" class="btn btn-success">
                    Create New
                  </button>
                </div>
              </div>
            </div>

            <!-- categories Table -->
            <CategoriesTable
              :categories="categories ?? []"
              :is-loading="loading"
              :page="pagination.current_page"
              :page-size="pagination.per_page"
              @handle-delete="confirmDelete"
              @handle-edit="openUpdateModal"
            />

            <!-- Pagination -->

            <nav
              aria-label="categories pagination"
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
            <CategoryForm
              :category="selectedCategory"
              @close="closeForm"
              @add="addCategory"
              @update="updateCategory"
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
            <p class="fw-bold my-0">{{ selectedCategory?.name }}</p>
            <p>Are you sure you want to delete this category?</p>
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
              @click="deleteCategory"
              :disabled="isDeleting"
            >
              {{ isDeleting ? "Deleting..." : "Delete Category" }}
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
