<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { removeAd } from "@/features/ads/AdsService";
import { getAds } from "@/features/businesses/BusinessesService";
import { Modal } from "bootstrap";
import { debounce } from "lodash";
import AdsTable from "./Partials/AdsTable.vue";
import AdForm from "./Partials/AdForm.vue";
import ImageWithPlaceholder from "@/components/ImageWithPlaceholder.vue";
import { getMediaObjectUrl } from "@/features/media/MediaService";
import {
  formatAdLocation,
  getAdLocationBadgeClass,
  getStatusBadgeClass,
} from "@/utils";

const route = useRoute();
const router = useRouter();

const deleteModal = ref(null);
let modalInstance = null;

let formModalInstance = null;
const formModal = ref(null);

let previewModalInstance = null;
const previewModal = ref(null);

const isDeleting = ref(false);
const selectedAd = ref(null);

// Cache for images
const imageCache = ref({});
const loadingImages = ref(false);

// ads data
const ads = ref([]);
const loading = ref(false);
const categories = ref([]);

// Filters
const filters = ref({
  search: "",
  category: "",
  status: "",
});

// Pagination
const pagination = ref({
  current_page: 0,
  per_page: 10,
  last_page: 1,
  total: 0,
});

// Fetch ads based on current tab and filters
const fetchAds = async () => {
  if (loading.value) return;
  loading.value = true;

  try {
    const response = await getAds({
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
    // ads.value = response.data.ads;
    ads.value = response.data;
    pagination.value = {
      current_page: response.data.page,
      per_page: response.data.size,
      last_page: response.data.totalPages - 1,
      total: response.data.totalPages,
    };
    loading.value = false;
  } catch (error) {
    console.error("Error fetching ads:", error);
    loading.value = false;
  }
};

const debouncedFetchAds = debounce(fetchAds, 500); // 500ms delay

// Fetch categories
// const fetchCategories = async () => {
//   try {
//     if (categories.value.length != 0) return;
//     const response = await getAds();
//     categories.value = response.data;
//   } catch (error) {
//     console.error("Error fetching categories:", error);
//   }
// };

// Delete Ad
const deleteAd = async () => {
  isDeleting.value = true;

  try {
    await removeAd(selectedAd.value.id);
    ads.value = ads.value.filter((ad) => ad.id !== selectedAd.value.id);
    modalInstance?.hide();

    selectedAd.value = {};
    // router.push("/admin/Ads");
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
  fetchAds();
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
  fetchAds();
};

const clearFilters = () => {
  filters.value = {
    ...filters.value,
    category: "",
    search: "",
  };
  pagination.value.current_page = 0;
  fetchAds();
};

const changeStatus = (status) => {
  // filters.value.status = status;
  filters.value.status = filters.value.status === status ? "" : status;
  fetchAds();
};

const confirmDelete = (id) => {
  selectedAd.value = ads.value.find((el) => el.id == id);
  if (selectedAd.value) {
    modalInstance?.show();
  }
};

const handlePreview = (id) => {
  selectedAd.value = ads.value.find((el) => el.id == id);
  if (selectedAd.value) {
    // Load images if they exist
    if (selectedAd.value.images && selectedAd.value.images.length > 0) {
      loadAdImages(selectedAd.value.images.map((image) => image?.image_id));
    }
    previewModalInstance?.show();
  }
};

const closePeview = () => {
  previewModalInstance?.hide();
  selectedAd.value = null;
};

// Function to load and cache images
const loadAdImages = async (imageIds) => {
  if (!imageIds || imageIds.length === 0) return;

  loadingImages.value = true;

  try {
    // Only fetch images that aren't already cached
    const uncachedIds = imageIds.filter((id) => !imageCache.value[id]);

    if (uncachedIds.length === 0) {
      loadingImages.value = false;
      return;
    }

    // Fetch all uncached images in parallel
    const promises = uncachedIds.map(async (mediaId) => {
      try {
        const url = await getMediaObjectUrl(mediaId);
        // Add to cache
        imageCache.value[mediaId] = url;
        return { mediaId, url };
      } catch (err) {
        console.error(`Failed to load image with ID ${mediaId}:`, err);
        return { mediaId, error: true };
      }
    });

    await Promise.all(promises);
  } catch (err) {
    console.error("Error loading ad images:", err);
  } finally {
    loadingImages.value = false;
  }
};

const openCreateModal = async () => {
  formModalInstance?.show();
  // fetchBusinesses();
};

const openUpdateModal = async (id) => {
  selectedAd.value = ads.value.find((el) => el.id == id);
  if (selectedAd.value) {
    formModalInstance?.show();
    // fetchBusinesses();
  }
};

const closeForm = () => {
  formModalInstance?.hide();
  selectedAd.value = null;
};

const addAd = (payload) => {
  ads.value = [payload, ...ads.value];
};

const updateAd = (payload) => {
  ads.value = ads.value.map((ad) => {
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
    debouncedFetchAds();
  }
);

onMounted(() => {
  filters.value.search = route.query.search || "";
  filters.value.category = route.query.category || "";
  filters.value.status = route.query.status || "";
  pagination.value.current_page = parseInt(route.query.page) || 0;
  pagination.value.per_page = parseInt(route.query.size) || 10;

  // Fetch initial data
  fetchAds();
  // fetchCategories();

  modalInstance = new Modal(deleteModal.value);
  formModalInstance = new Modal(formModal.value);
  previewModalInstance = new Modal(previewModal.value);
});

watch(
  [
    () => filters.value.search,
    () => filters.value.category,
    () => filters.value.status,
    () => pagination.value.current_page,
    () => pagination.value.per_page,
  ],
  () => {
    router.replace({
      query: {
        search: filters.value.search || undefined,
        category: filters.value.category || undefined,
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
        <h2>Ads Management</h2>
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
                    placeholder="Search ads..."
                  />
                </div>
                <!-- Right-aligned button -->
                <div class="col-lg ms-lg-auto text-end">
                  <router-link to="/business/advertise" class="btn btn-success">
                    Purchase Slot
                  </router-link>
                </div>
              </div>
            </div>

            <!-- ads Table -->
            <AdsTable
              :ads="ads ?? []"
              :is-loading="loading"
              :page="pagination.current_page"
              :page-size="pagination.per_page"
              @handle-delete="confirmDelete"
              @handle-preview="handlePreview"
              @handle-edit="openUpdateModal"
            />

            <nav
              aria-label="ads pagination"
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
            <!-- <div v-if="isFetchingBusinesses" class="text-center py-5">
              <div class="spinner-border text-dark" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p class="mt-2">Loading data...</p>
            </div> -->

            <!-- v-else -->
            <!-- :businesses="businesses" -->
            <AdForm
              :ad="selectedAd"
              @close="closeForm"
              @add-ad="addAd"
              @update-ad="updateAd"
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
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-danger"
              @click="deleteAd"
              :disabled="isDeleting"
            >
              {{ isDeleting ? "Deleting..." : "Delete Ad" }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Ad Preview Modal -->
    <div
      class="modal fade"
      id="previewModal"
      tabindex="-1"
      aria-hidden="true"
      ref="previewModal"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Ad Preview</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
              @click="closePeview"
            ></button>
          </div>
          <div class="modal-body">
            <div v-if="!selectedAd" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>
            <div v-else>
              <div class="row">
                <div class="col-md-6">
                  <h4>{{ selectedAd.title }}</h4>
                  <p class="text-muted">{{ selectedAd.description }}</p>

                  <div class="mt-3">
                    <h5>Ad Details</h5>
                    <div class="table-responsive">
                      <table class="table table-sm">
                        <tbody>
                          <tr>
                            <th>Status</th>
                            <td>
                              <span
                                :class="getStatusBadgeClass(selectedAd.status)"
                              >
                                {{ selectedAd.status }}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <th>Placement</th>
                            <td>
                              <span
                                :class="
                                  getAdLocationBadgeClass(
                                    selectedAd.placement?.location
                                  )
                                "
                              >
                                {{
                                  formatAdLocation(
                                    selectedAd.placement?.location ?? "-"
                                  )
                                }}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <th>Start Date</th>
                            <td>
                              {{ selectedAd.placement_date?.split("T")[0] }}
                            </td>
                          </tr>
                          <tr>
                            <th>End Date</th>
                            <td>{{ selectedAd.expiry_date?.split("T")[0] }}</td>
                          </tr>
                          <tr>
                            <th>Cost</th>
                            <td>{{ selectedAd.total_cost ?? "-" }} ZAR</td>
                          </tr>
                          <tr v-if="selectedAd.impressions !== undefined">
                            <th>Impressions</th>
                            <td>{{ selectedAd.impressions }}</td>
                          </tr>
                          <tr v-if="selectedAd.clicks !== undefined">
                            <th>Clicks</th>
                            <td>{{ selectedAd.clicks }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div v-if="loadingImages" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">Loading images...</span>
                    </div>
                    <p class="mt-2">Loading images...</p>
                  </div>
                  <div
                    v-else-if="
                      selectedAd.images && selectedAd.images.length > 0
                    "
                    class="ad-images"
                  >
                    <h5>Ad Images</h5>
                    <div
                      v-for="(image, index) in selectedAd.images"
                      :key="mediaId"
                      class="mb-3"
                    >
                      <div
                        v-if="imageCache[image.image_id]"
                        class="ad-image-container"
                      >
                        <img
                          :src="imageCache[image.image_id]"
                          class="img-fluid rounded"
                          :alt="`Ad image ${index + 1}`"
                        />
                      </div>
                      <div v-else>
                        <ImageWithPlaceholder
                          :mediaId="image.image_id"
                          :alt="`Ad image ${index + 1}`"
                        />
                      </div>
                    </div>
                  </div>
                  <!-- <div v-else-if="selectedAd.image" class="ad-images">
                    <h5>Ad Image</h5>
                    <div class="ad-image-container">
                      <img
                        :src="selectedAd.image.file"
                        class="img-fluid rounded"
                        alt="Ad image"
                      />
                    </div>
                  </div> -->
                  <div v-else class="text-center py-4">
                    <p class="text-muted">No images available for this ad</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
              @click="closePeview"
            >
              Close
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

.ad-image-container {
  width: 100%;
  max-height: 300px;
  overflow: hidden;
  border-radius: 4px;
}

.ad-image-container img {
  width: 100%;
  height: auto;
  object-fit: contain;
}
</style>
