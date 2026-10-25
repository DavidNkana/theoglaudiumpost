<!-- views/Ads/Index.vue (Refactored) -->
<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Modal } from 'bootstrap';
import { debounce } from 'lodash';
import Swal from 'sweetalert2';

// Components
import AdsTable from './Partials/AdsTable.vue';
import AdForm from './AdForm.vue';

// Services
import { getAds, removeAd } from '@/features/ads/AdsService';

// Router
const route = useRoute();
const router = useRouter();

// Modal references
const deleteModal = ref(null);
const formModal = ref(null);
let deleteModalInstance = null;
let formModalInstance = null;

// State
const ads = ref([]);
const loading = ref(false);
const isDeleting = ref(false);
const selectedAd = ref(null);
const isFormModalReady = ref(false);

// Filters
const filters = ref({
  search: '',
  category: '',
  status: '',
});

// Pagination
const pagination = ref({
  current_page: 0,
  per_page: 10,
  last_page: 1,
  total: 0,
});

// Fetch ads
const fetchAds = async () => {
  if (loading.value) return;
  loading.value = true;

  try {
    const response = await getAds({
      page: pagination.value.current_page,
      search: filters.value.search,
      size: pagination.value.per_page,
      status: filters.value.status,
    });

    if (response.status !== 200) {
      throw new Error('Failed to fetch ads');
    }

    ads.value = response.data.ads || [];
    pagination.value = {
      current_page: response.data.page || 0,
      per_page: response.data.size || 10,
      last_page: (response.data.totalPages || 1) - 1,
      total: response.data.totalPages || 0,
    };
  } catch (error) {
    console.error('Error fetching ads:', error);
    Swal.fire({
      title: 'Error',
      text: 'Failed to load ads. Please refresh the page.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  } finally {
    loading.value = false;
  }
};

// Debounced fetch for search
const debouncedFetchAds = debounce(fetchAds, 500);

// Delete ad
const deleteAd = async () => {
  if (!selectedAd.value) return;

  isDeleting.value = true;

  try {
    await removeAd(selectedAd.value.id);

    // Remove from list
    ads.value = ads.value.filter(ad => ad.id !== selectedAd.value.id);

    // Show success message
    Swal.fire({
      title: 'Deleted!',
      text: 'The ad has been deleted successfully.',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });

    // Close modal and reset
    deleteModalInstance?.hide();
    selectedAd.value = null;

    // Refresh list if needed
    if (ads.value.length === 0 && pagination.value.current_page > 0) {
      pagination.value.current_page--;
      fetchAds();
    }
  } catch (error) {
    console.error('Error deleting ad:', error);
    Swal.fire({
      title: 'Error',
      text: 'Failed to delete ad. Please try again.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  } finally {
    isDeleting.value = false;
  }
};

// Confirm delete
const confirmDelete = (id) => {
  selectedAd.value = ads.value.find(ad => ad.id === id);
  if (selectedAd.value) {
    deleteModalInstance?.show();
  }
};

// Open create modal
const openCreateModal = () => {
  selectedAd.value = null;
  isFormModalReady.value = false;

  // Wait for next tick to ensure the modal is properly reset
  nextTick(() => {
    isFormModalReady.value = true;
    setTimeout(() => {
      formModalInstance?.show();
    }, 100);
  });
};

// Open edit modal
const openUpdateModal = (id) => {
  const ad = ads.value.find(el => el.id === id);
  if (ad) {
    selectedAd.value = ad;
    isFormModalReady.value = false;

    // Wait for next tick to ensure the modal is properly reset
    nextTick(() => {
      isFormModalReady.value = true;
      setTimeout(() => {
        formModalInstance?.show();
      }, 100);
    });
  }
};

// Close form modal
const closeForm = () => {
  formModalInstance?.hide();
  selectedAd.value = null;
  isFormModalReady.value = false;
};

// Add new ad to list
const addAd = (newAd) => {
  ads.value = [newAd, ...ads.value];
  closeForm();
};

// Update existing ad in list
const updateAd = (updatedAd) => {
  ads.value = ads.value.map(ad => {
    if (ad.id === updatedAd.id) {
      return { ...ad, ...updatedAd };
    }
    return ad;
  });
  closeForm();
};

// Handle page change
const changePage = (page) => {
  if (page < 0 || page > pagination.value.last_page) {
    return;
  }
  pagination.value.current_page = page;
  fetchAds();
};

// Get page numbers for pagination
const getPageNumbers = () => {
  const pages = [];
  const currentPage = pagination.value.current_page + 1;
  const lastPage = pagination.value.total;

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
  fetchAds();
};

// Clear filters
const clearFilters = () => {
  filters.value = {
    search: '',
    category: '',
    status: '',
  };
  pagination.value.current_page = 0;
  fetchAds();
};

// Change status filter
const changeStatus = (status) => {
  filters.value.status = filters.value.status === status ? '' : status;
  fetchAds();
};

// Computed
const hasActiveFilters = computed(() => {
  return filters.value.search || filters.value.category || filters.value.status;
});

// Watch search input
watch(() => filters.value.search, () => {
  pagination.value.current_page = 0;
  debouncedFetchAds();
});

// Watch route query changes
watch([
  () => filters.value.search,
  () => filters.value.category,
  () => filters.value.status,
  () => pagination.value.current_page,
  () => pagination.value.per_page,
], () => {
  router.replace({
    query: {
      search: filters.value.search || undefined,
      category: filters.value.category || undefined,
      status: filters.value.status || undefined,
      page: pagination.value.current_page || undefined,
      size: pagination.value.per_page || undefined,
    },
  });
});

// Lifecycle
onMounted(() => {
  // Initialize from query params
  filters.value.search = route.query.search || '';
  filters.value.category = route.query.category || '';
  filters.value.status = route.query.status || '';
  pagination.value.current_page = parseInt(route.query.page) || 0;
  pagination.value.per_page = parseInt(route.query.size) || 10;

  // Initialize modals
  deleteModalInstance = new Modal(deleteModal.value);
  formModalInstance = new Modal(formModal.value);

  // Clean up any existing backdrops
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.remove();
  });

  // Fetch initial data
  fetchAds();
});
</script>

<template>
  <div class="container-fluid py-4">
    <!-- Header -->
    <div class="row mb-4">
      <div class="col-12">
        <h2>Ads Management</h2>
      </div>
    </div>

    <!-- Main Content -->
    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-body">
            <!-- Filters -->
            <div class="mb-4">
              <div class="row align-items-center">
                <div class="col-12 col-lg-auto mb-3 mb-lg-0">
                  <input
                      type="text"
                      v-model="filters.search"
                      class="form-control"
                      placeholder="Search ads..."
                  />
                </div>

                <div v-if="hasActiveFilters" class="col-auto mb-3 mb-lg-0">
                  <button
                      class="btn btn-outline-secondary"
                      @click="clearFilters"
                  >
                    <i class="bi bi-x-circle"></i> Clear Filters
                  </button>
                </div>

                <div class="col-lg ms-lg-auto text-end">
                  <button
                      @click="openCreateModal"
                      class="btn btn-success"
                      :disabled="loading"
                  >
                    <i class="bi bi-plus-circle"></i> Create New
                  </button>
                </div>
              </div>
            </div>

            <!-- Status Filters -->
            <div class="mb-3">
              <div class="btn-group" role="group">
                <button
                    type="button"
                    class="btn btn-outline-secondary"
                    :class="{ 'active': filters.status === '' }"
                    @click="changeStatus('')"
                >
                  All
                </button>
                <button
                    type="button"
                    class="btn btn-outline-success"
                    :class="{ 'active': filters.status === 'active' }"
                    @click="changeStatus('active')"
                >
                  Active
                </button>
                <button
                    type="button"
                    class="btn btn-outline-warning"
                    :class="{ 'active': filters.status === 'pending' }"
                    @click="changeStatus('pending')"
                >
                  Pending
                </button>
              </div>
            </div>

            <!-- Ads Table -->
            <AdsTable
                :ads="ads"
                :is-loading="loading"
                :page="pagination.current_page"
                :page-size="pagination.per_page"
                @handle-delete="confirmDelete"
                @handle-edit="openUpdateModal"
            />

            <!-- Pagination -->
            <nav
                aria-label="Ads pagination"
                v-if="pagination.total > 0 && !loading"
                class="d-sm-flex align-items-center justify-content-between mt-4"
            >
              <div>
                <label for="pageSizeSelect" class="form-label me-2">
                  Page Size
                </label>
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

              <ul class="pagination justify-content-center mt-2 mt-sm-0 mb-0">
                <li
                    class="page-item"
                    :class="{ disabled: pagination.current_page === 0 }"
                >
                  <a
                      class="page-link"
                      href="#"
                      @click.prevent="changePage(pagination.current_page - 1)"
                  >
                    Previous
                  </a>
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
                  >
                    {{ page }}
                  </a>
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
                  >
                    Next
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Form Modal -->
    <div class="modal fade" id="formModal" tabindex="-1" ref="formModal">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-body p-0">
            <AdForm
                v-if="isFormModalReady"
                :ad="selectedAd"
                @close="closeForm"
                @add-ad="addAd"
                @update-ad="updateAd"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Modal -->
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
            <h5 class="modal-title">
              <i class="bi bi-exclamation-triangle"></i> Confirm Deletion
            </h5>
            <button
                type="button"
                class="btn-close btn-close-white"
                data-bs-dismiss="modal"
                aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete this ad?</p>
            <p class="fw-bold">{{ selectedAd?.title }}</p>
            <p class="text-danger">
              <strong>Warning:</strong> This action cannot be undone.
            </p>
          </div>
          <div class="modal-footer">
            <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal"
                :disabled="isDeleting"
            >
              Cancel
            </button>
            <button
                type="button"
                class="btn btn-danger"
                @click="deleteAd"
                :disabled="isDeleting"
            >
              <span
                  v-if="isDeleting"
                  class="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
              ></span>
              {{ isDeleting ? 'Deleting...' : 'Delete Ad' }}
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

.btn-group .btn {
  position: relative;
}

.btn-group .btn.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 3px;
  background-color: currentColor;
}

.pagination {
  margin-bottom: 0;
}

.card {
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}
</style>