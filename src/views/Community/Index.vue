<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useStore } from "vuex";
import { debounce } from "lodash";
import { useRoute, useRouter } from "vue-router";
import InfiniteLoading from "v3-infinite-loading";
import "v3-infinite-loading/lib/style.css";
import Contacts from "./Partials/Contacts.vue";
import RecentUpdates from "./Partials/RecentUpdates.vue";
import { devLog } from "@/utils/devLog";
import {
  formatTimeAgo,
  IN_ARTICLE_TOP,
  IN_ARTICLE_MID,
  SIDEBAR_MID,
} from "@/utils";
import AdBanner from "@/components/AdBanner.vue";

const route = useRoute();
const router = useRouter();
const store = useStore();

const currentPage = ref(0); // start from page 1
const isLoading = ref(false);
const scrollTarget = ref(null);
const initialLoadComplete = ref(false);

onMounted(() => {
  // Fetch initial data
  filters.value.search = route.query.search || "";
  filters.value.category = route.query.category || "all";
  filters.value.priority = route.query.priority || "all";

  fetchInitialData();
});

const filters = ref({
  search: "",
  category: "all",
  priority: "all",
});

const fetchData = async (page) => {
  try {
    if (isLoading.value) return;
    isLoading.value = true;
    await store.dispatch("notices/fetchNotices", {
      type: "all",
      size: 10,
      page: page ?? currentPage.value,
      category: filters.value.category == "all" ? "" : filters.value.category,
      priority: filters.value.priority == "all" ? "" : filters.value.priority,
      search: filters.value.search,
    });

    // await store.dispatch("notices/fetchCategories");
  } catch (error) {
    devLog.error("Error fetching posts:", error);
  } finally {
    isLoading.value = false;
    // devLog.info("Stopped Loading");
  }
};

const debouncedFetch = debounce(fetchData, 500); // 500ms delay

watch(
  () => filters.value.search,
  () => {
    store.commit("notices/clearNotices");
    currentPage.value = 0; // reset to first page on search
    debouncedFetch();
  }
);

watch([() => filters.value.category, () => filters.value.priority], () => {
  store.commit("notices/clearNotices");
  currentPage.value = 0;
  fetchData();
});

watch(
  [
    () => filters.value.search,
    () => filters.value.category,
    () => filters.value.priority,
  ],
  () => {
    router.replace({
      query: {
        search: filters.value.search || undefined,
        category: filters.value.category || undefined,
        priority: filters.value.priority || undefined,
      },
    });
  }
);

const filterCategory = (categoryId) => {
  filters.value.category =
    filters.value.category === categoryId ? "" : categoryId;
};

const fetchInitialData = async () => {
  try {
    isLoading.value = true;
    devLog.info("Fetching initial data");

    // Reset pagination for initial load
    currentPage.value = 0;

    await store.dispatch("notices/fetchNotices", {
      type: "all",
      size: 10,
      page: currentPage.value,
      category: filters.value.category == "all" ? "" : filters.value.category,
      priority: filters.value.priority == "all" ? "" : filters.value.priority,
      search: filters.value.search,
    });
    await store.dispatch("notices/fetchCategories");

    devLog.info("Initial data fetched");
  } catch (error) {
    devLog.error("Error fetching initial data:", error);
  } finally {
    isLoading.value = false;
    initialLoadComplete.value = true;
  }
};

const loadMore = async ($state) => {
  let hasMore = store.getters["notices/hasMore"];
  if (!hasMore) {
    devLog.info("No more data available");
    $state.complete();
    return;
  }

  // Prevent multiple simultaneous requests
  if (isLoading.value) {
    devLog.info("Already loading, returning");
    return;
  }

  try {
    isLoading.value = true;

    // Increment page for next batch
    const nextPage = currentPage.value + 1;
    devLog.debug("Fetching page: ", nextPage);

    await store.dispatch("notices/fetchNotices", {
      type: "all",
      size: 10,
      page: nextPage,
      category: filters.value.category == "all" ? "" : filters.value.category,
      priority: filters.value.priority == "all" ? "" : filters.value.priority,
      search: filters.value.search,
    });

    hasMore = store.getters["notices/hasMore"];
    devLog.debug("Has More: ", hasMore);

    if (!hasMore) {
      devLog.info("No more data available");
      $state.complete(); // no more data
    } else {
      currentPage.value = nextPage; // Update current page only on success
      $state.loaded(); // data loaded successfully
    }
  } catch (error) {
    devLog.error("Failed to load more posts:", error);
    $state.error(); // Signal error to the infinite loading component
  } finally {
    isLoading.value = false;
  }
};

const filteredNotices = computed(() => {
  if (!filters.value.category || filters.value.category == "all") {
    return store.getters["notices/notices"]?.filter(
      (notice) => !notice?.category?.name?.includes("Funeral")
    );
  }
  return store.getters["notices/notices"];
});

const resetFilters = () => {
  filters.value = {
    search: "",
    category: "all",
    priority: "all",
  };
  store.commit("notices/clearNotices");
  currentPage.value = 0;
  fetchData();
};

// Function to check if an ad should be displayed after this notice index
const shouldShowAdAfter = (index) => {
  // Show ad after every 6 notices (indices 5, 11, 17, etc.)
  return (index + 1) % 6 === 0;
};
</script>
<template>
  <div class="container py-5">
    <!-- Component Start -->
    <div class="row mb-4">
      <div class="col-md-6 heading">
        <h2>Community Notices</h2>
        <p class="">
          Stay informed about important updates and safety notices in your area
        </p>
      </div>
    </div>
    <!-- Main Content Area -->
    <div class="row">
      <!-- Left Column - Notices List -->
      <div class="col-lg-8 mb-4 mb-lg-0 order-2 order-lg-1">
        <!-- Search and Filters -->
        <div class="card filter-container mb-4">
          <div class="card-body">
            <div class="d-flex flex-wrap gap-2">
              <template
                v-if="
                  !isLoading && store.getters['notices/categories']?.length != 0
                "
              >
                <button
                  class="btn btn-sm btn-outline-success filter-btn"
                  :class="{
                    active:
                      filters.category === 'all' || filters.category === '',
                  }"
                  @click="filterCategory('')"
                >
                  Latest
                </button>
                <button
                  v-for="category in store.getters['notices/categories']"
                  :key="category.id"
                  class="btn btn-sm btn-outline-success filter-btn"
                  :class="{ active: filters.category == category.id }"
                  @click="filterCategory(category.id)"
                >
                  {{ category.name }}
                  <strong v-if="category.announcements"
                    >({{ category.announcements }})</strong
                  >
                </button>
              </template>
              <template v-else-if="isLoading">
                <div
                  v-for="i in 6"
                  :key="`s-${i}`"
                  class="shimmer btn btn-sm"
                  style="height: 24px; width: 100px"
                ></div>
              </template>
            </div>
          </div>
        </div>

        <div>
          <div
            v-if="
              (filters.category != 'all' ||
                filters.search ||
                filters.priority != 'all') &&
              filteredNotices.length === 0 &&
              !isLoading
            "
            class="text-center py-5 results"
          >
            <!-- <i class="fas fa-check-circle text-success fa-3x mb-3"></i> -->
            <h4>No notices match your current filters</h4>
            <p class="text-muted">
              Try adjusting your search or filter settings
            </p>
            <button class="btn btn-success mt-2" @click="resetFilters">
              Reset Filters
            </button>
          </div>

          <div v-else-if="initialLoadComplete">
            <div ref="scrollTarget" class="notices-container notices-list">
              <template v-for="(alert, index) in filteredNotices" :key="alert.id">
                <!-- Notice card -->
                <router-link
                  :to="`/community/${alert.slug}`"
                  class="card mb-3 alert-card"
                >
                  <div class="card-body p-0">
                    <div class="d-flex">
                      <div class="notice-image-container me-3 flex-shrink-0">
                        <img
                          :src="alert.image?.file || '/placeholder-image.png'"
                          :alt="alert.title"
                          class="notice-image"
                          loading="lazy"
                        />
                      </div>
                      <div class="flex-grow-1 p-2">
                        <div
                          class="d-flex justify-content-between align-items-start"
                        >
                          <div class="link mb-1 h5">
                            {{ alert.title }}
                          </div>
                        </div>
                        <p class="mb-2 desc-excerpt" v-html="alert.content"></p>
                        <div
                          class="d-flex justify-content-between align-items-center"
                        >
                          <div class="meta-info">
                            <small
                              @click.prevent="
                                filters.category = alert.category?.id
                              "
                              class="me-3 link cursor-pointer"
                            >
                              <i class="bi bi-tag"></i>
                              {{ alert.category?.name }}
                            </small>
                            <small class="me-3">
                              <i class="bi bi-geo-alt me-1"></i>
                              {{ alert.location }}
                            </small>
                            <small class="alert-time">
                              <i class="far fa-clock me-1"></i>
                              {{ formatTimeAgo(alert.publish_date) }}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </router-link>

                <!-- Ad banner after every 6 notices -->
                <div v-if="shouldShowAdAfter(index)" class="notice-ad-banner mb-3">
                  <AdBanner
                    size="medium"
                    :placement="IN_ARTICLE_MID"
                    class="notice-ad-banner"
                  />
                </div>
              </template>

              <InfiniteLoading
                @infinite="loadMore"
                :target="scrollTarget"
                :distance="200"
              >
                <template #spinner>
                  <div class="infinite-loading-spinner"></div>
                </template>

                <template #complete>
                  <div
                    class="infinite-loading-complete d-flex justify-content-center"
                  >
                    End!
                  </div>
                </template>

                <template #error="{ retry }">
                  <div class="infinite-loading-error">
                    Error loading. <button @click="retry">Retry</button>
                  </div>
                </template>
              </InfiniteLoading>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column - Sidebar -->
      <div class="col-lg-4 order-1 order-lg-2">
        <div class="d-lg-none">
          <AdBanner size="large" :placement="IN_ARTICLE_TOP" />
        </div>

        <Contacts />
        <div class="d-none d-lg-block">
          <AdBanner size="medium" :placement="SIDEBAR_MID" />
        </div>
        <!-- Recent Updates -->
        <div class="d-none d-lg-block">
          <RecentUpdates />
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.notices-container {
  gap: 1.5rem;
  /* padding: 1rem; */
  overflow-y: auto;
  position: relative;

  scroll-behavior: smooth;
}

.filter-container {
  background-color: var(--primary-dark);
}

.heading {
  color: white;
}

.heading h2 {
  /* font-size: 1.75rem; */
  margin-bottom: 0.5rem;
}

.heading p {
  color: #ffffffe4;
  font-size: 0.95rem;
}

.notices-list {
  display: flex;
  flex-direction: column;
}

.notices-grid {
  display: flex;
  flex-wrap: wrap;
}

.alert-card {
  background-color: var(--primary-dark) !important;
  box-shadow: 0 1rem 3rem rgba(13, 72, 11, 0.175) !important;
  color: white;
  text-decoration: none !important;
  transition:
    transform 0.3s,
    box-shadow 0.3s;
  border-left: 4px solid var(--secondary);
}
.alert-card:hover {
  color: white !important;
  text-decoration: none !important;
  transform: translateY(-3px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

div.link:hover {
  text-decoration: underline;
  color: var(--secondary);
}

.badge-low {
  background-color: #0dcaf0;
}
.badge-medium {
  background-color: #ffc107;
  color: #212529;
}
.badge-high {
  background-color: #dc3545;
}
.badge-resolved {
  background-color: #198754;
}
.alert-time {
  color: #6c757d;
  font-size: 0.85rem;
}
.map-container {
  height: 400px;
  background-color: #f8f9fa;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.filter-btn {
  color: white;
}
.filter-btn.active {
  background-color: var(--secondary);
  border-color: var(--secondary);
}

.results {
  /* font-style: italic; */
  color: white;
}
.results p {
  /* font-style: italic; */
  color: #f8f9fa !important;
}
.results button {
  background-color: var(--primary-dark);
  border-color: var(--primary-dark);
}

.notification-toggle {
  width: 3rem;
  height: 1.5rem;
}
.category-icon {
  font-size: 1.5rem;
  margin-right: 10px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: rgba(13, 110, 253, 0.1);
  color: #0d6efd;
}
.weather-alert {
  background: linear-gradient(135deg, #72b1e2, #4a91c9);
  color: white;
  border-radius: 6px;
  padding: 20px;
  margin-bottom: 20px;
}
.community-tip {
  background-color: #e9f7ef;
  border-left: 4px solid #27ae60;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.desc-excerpt {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.infinite-loading-container {
  text-align: center;
  margin-top: 1.5rem;
}

.infinite-loading-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1db46e; /* purple spinner */
  border-radius: 50%;
  width: 36px;
  height: 36px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.infinite-loading-error,
.infinite-loading-complete {
  color: #888;
  font-size: 0.95rem;
  margin-top: 1rem;
}

/* Notice ad banner styles */
.notice-ad-banner {
  width: 100%;
  max-width: 100%;
  margin: 1.5rem 0;
  border-radius: 8px;
  overflow: hidden;
}

/* Responsive adjustments for ad banners */
@media (max-width: 767.98px) {
  .notice-ad-banner {
    margin: 1rem 0;
  }
}

.notice-image-container {
  width: 150px;
  height: 145px;
  overflow: hidden;
  /* border-top-left-radius: 4px; */
  /* border-bottom-left-radius: 8px; */
  background-color: #f8f9fa;
  margin-left: 1.05px;
}

.notice-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.notice-image:hover {
  transform: scale(1.05);
}

.meta-info {
  color: #6c757d;
}

/* Responsive breakpoints */
@media (max-width: 768px) {
  /* .notice-image-container {
    width: 80px;
    height: 60px;
  } */

  .d-flex {
    align-items: flex-start;
  }
}

@media (max-width: 576px) {
  /* .notice-image-container {
    width: 60px;
    height: 45px;
  } */

  .desc-excerpt {
    font-size: 0.9rem;
  }

  .h5 {
    font-size: 1rem;
  }
}

/* Optional: Hide image on very small screens */
@media (max-width: 400px) {
  .notice-image-container {
    display: none;
  }
}
</style>
