<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { removeCampaign } from "@/features/ads/AdsService";
import { getCampaigns } from "@/features/businesses/BusinessesService";
import { Modal } from "bootstrap";
import { debounce } from "lodash";
import CampaignsTable from "./Partials/CampaignsTable.vue";
import CampaignForm from "./Partials/CampaignForm.vue";

const route = useRoute();
const router = useRouter();

const deleteModal = ref(null);
let modalInstance = null;

let formModalInstance = null;
const campaignFormModal = ref(null);

const isFetchingBusinesses = ref(false);
const isDeleting = ref(false);
const selectedCampaign = ref(null);

const campaigns = ref([]);
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

// Fetch campaigns based on current tab and filters
const fetchCampaigns = async () => {
  if (loading.value) return;
  loading.value = true;

  try {
    const response = await getCampaigns({
      // category: filters.value.category,
      page: pagination.value.current_page,
      search: filters.value.search,
      size: pagination.value.per_page,
      status: filters.value.status,
      // type: activeTab.value,
    });
    if (response.status != 200) {
      throw new Error("Unexpected Error");
    }

    // campaigns.value = response.data.campaigns;
    campaigns.value = response.data;
    pagination.value = {
      current_page: response.data.page,
      per_page: response.data.size,
      last_page: response.data.totalPages - 1,
      total: response.data.totalPages,
    };
    loading.value = false;
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    loading.value = false;
  }
};

const debouncedFetchCampaigns = debounce(fetchCampaigns, 500); // 500ms delay

// Delete Campaign
const deleteCampaign = async () => {
  isDeleting.value = true;

  try {
    await removeCampaign(selectedCampaign.value.id);
    campaigns.value = campaigns.value.filter(
      (ad) => ad.id !== selectedCampaign.value.id
    );
    modalInstance?.hide();

    selectedCampaign.value = null;
    // router.push("/admin/campaigns");
  } catch (err) {
    console.error("Error deleting ad:", err);
    alert("Failed to delete ad. Please try again.");
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
  fetchCampaigns();
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
  fetchCampaigns();
};

const clearFilters = () => {
  filters.value = {
    ...filters.value,
    category: "",
    search: "",
  };
  pagination.value.current_page = 0;
  fetchCampaigns();
};

const changeStatus = (status) => {
  // filters.value.status = status;
  filters.value.status = filters.value.status === status ? "" : status;
  fetchCampaigns();
};

const confirmDelete = (id) => {
  selectedCampaign.value = campaigns.value.find((el) => el.id == id);
  if (selectedCampaign.value) {
    modalInstance?.show();
  }
};

const handlePreview = (id) => {
  selectedCampaign.value = campaigns.value.find((el) => el.id == id);
  if (selectedCampaign.value) {
    formModalInstance?.show();
  }
};

const openCreateModal = async () => {
  formModalInstance?.show();
};

const openUpdateModal = async (id) => {
  selectedCampaign.value = campaigns.value.find((el) => el.id == id);
  if (selectedCampaign.value) {
    formModalInstance?.show();
  }
};

const closeForm = () => {
  formModalInstance?.hide();
  selectedCampaign.value = null;
};

const addCampaign = (payload) => {
  campaigns.value = [payload, ...campaigns.value];
};

const updateCampaign = (payload) => {
  campaigns.value = campaigns.value.map((campaign) => {
    if (campaign.id == payload.id) {
      return { ...campaign, ...payload };
    }
    return campaign;
  });
};

watch(
  () => filters.value.search,
  () => {
    pagination.value.page = 0; // reset to first page on search
    debouncedFetchCampaigns();
  }
);

onMounted(() => {
  filters.value.search = route.query.search || "";
  filters.value.status = route.query.status || "";
  pagination.value.current_page = parseInt(route.query.page) || 0;
  pagination.value.per_page = parseInt(route.query.size) || 10;

  fetchCampaigns();

  modalInstance = new Modal(deleteModal.value);
  formModalInstance = new Modal(campaignFormModal.value);
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
        <h2>Ad Campaigns</h2>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <div class="card">
          <!-- <div class="card-header">
            <div
              class="d-lg-none col-12 col-md col-lg-12 col-xl ms-xl-auto text-end"
            >
              <router-link class="btn btn-success" to="/admin/campaigns/create">
                Create New
              </router-link>
            </div>
          </div> -->
          <div class="card-body">
            <div class="mb-4">
              <div class="row align-items-center">
                <!-- Left-aligned filter elements -->
                <div class="col-12 col-lg-auto mb-3 mb-lg-0">
                  <input
                    type="text"
                    v-model="filters.search"
                    class="form-control"
                    placeholder="Search campaigns..."
                  />
                </div>
                <!-- <div class="col-6 col-lg-auto mb-3 mb-lg-0">
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
                <div
                  v-if="filters.search || filters.category"
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
                </div> -->

                <!-- Right-aligned button -->
                <div class="col-lg ms-lg-auto text-end">
                  <!-- <button
                    type="button"
                    class="btn btn-success"
                    @click="openCreateModal"
                  >
                    Create New
                  </button> -->
                </div>
              </div>
            </div>

            <!-- campaigns Table -->
            <CampaignsTable
              :campaigns="campaigns ?? []"
              :is-loading="loading"
              :page="pagination.current_page"
              :page-size="pagination.per_page"
              @handle-delete="confirmDelete"
              @handle-edit="openUpdateModal"
            />

            <!-- Pagination -->

            <nav
              aria-label="campaigns pagination"
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

    <div
      class="modal fade"
      id="campaignFormModal"
      tabindex="-1"
      ref="campaignFormModal"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-body p-0">
            <div v-if="isFetchingBusinesses" class="text-center py-5">
              <div class="spinner-border text-dark" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p class="mt-2">Loading data...</p>
            </div>

            <CampaignForm
              v-else
              :campaign="selectedCampaign"
              :businesses="businesses"
              @close="closeForm"
              @add-campaign="addCampaign"
              @update-campaign="updateCampaign"
            />
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
            <p>Are you sure you want to delete this campaign?</p>
            <p class="fw-bold">{{ selectedCampaign?.name }}</p>
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
              @click="deleteCampaign"
              :disabled="isDeleting"
            >
              {{ isDeleting ? "Deleting..." : "Delete Campaign" }}
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
