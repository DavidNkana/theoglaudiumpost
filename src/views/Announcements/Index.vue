<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";
import InfiniteLoading from "v3-infinite-loading";
import "v3-infinite-loading/lib/style.css";
import FuneralNotice from "./FuneralNotice.vue";
import { devLog } from "@/utils/devLog";
import { formatTimeAgo, IN_ARTICLE_TOP } from "@/utils";
import Contacts from "../Community/Partials/Contacts.vue";
import RecentUpdates from "../Community/Partials/RecentUpdates.vue";
import AdBanner from "@/components/AdBanner.vue";

const currentPage = ref(0); // start from page 0
const isLoading = ref(false);
const scrollTarget = ref(null);
const store = useStore();
const initialLoadComplete = ref(false);

onMounted(() => {
  // Fetch initial data
  fetchInitialData();
});

const fetchInitialData = async () => {
  try {
    isLoading.value = true;
    devLog.info("Fetching initial data");

    // Reset pagination for initial load
    currentPage.value = 0;

    await store.dispatch("notices/fetchNotices", {
      type: "funerals",
      size: 10,
      page: currentPage.value,
      category: 14,
    });

    devLog.info("Initial data fetched");
  } catch (error) {
    devLog.error("Error fetching initial data:", error);
  } finally {
    isLoading.value = false;
    initialLoadComplete.value = true;
  }
};

const loadMore = async ($state) => {
  devLog.debug("\n\nLoadMore called with state: ", $state);
  devLog.debug("Is Loading: ", isLoading.value);
  devLog.debug("Current Page: ", currentPage.value);

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
      type: "funerals",
      size: 10,
      page: nextPage,
      category: 14,
    });

    const hasMore = store.getters["notices/hasMoreFunerals"];
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
  return store.getters["notices/funerals"] || [];
});
</script>

<template>
  <div class="container py-5">
    <!-- Component Start -->
    <div class="row mb-4">
      <div class="col-md-6">
        <h2>Funeral Announcements</h2>
      </div>
    </div>
    <!-- Main Content Area -->
    <div class="row">
      <!-- Left Column - Notices List -->
      <div class="col-lg-8 mb-4 mb-lg-0 order-2 order-lg-1">
        <div>
          <!-- Show loading state during initial load -->
          <div
            v-if="!initialLoadComplete && isLoading"
            class="text-center py-5"
          >
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>

          <!-- Show empty state only after initial load is complete -->
          <div
            v-else-if="filteredNotices.length === 0 && initialLoadComplete"
            class="text-center py-5"
          >
            <h4>No funeral announcements found</h4>
          </div>

          <!-- Show content and infinite loading -->
          <div v-else-if="initialLoadComplete">
            <div ref="scrollTarget" :class="['notices-container', 'row']">
              <div
                v-for="alert in filteredNotices"
                :key="alert.id"
                class="col-md-5 col-lg-5 mb-4"
              >
                <FuneralNotice :notice="alert" />
              </div>
            </div>

            <!-- Infinite Loading Component -->
            <InfiniteLoading
              @infinite="loadMore"
              :distance="200"
            >
              <template #complete>
                <div
                  class="infinite-loading-complete d-flex justify-content-center py-3"
                >
                  <small class="text-muted"
                    >No more announcements to load</small
                  >
                </div>
              </template>

              <template #error="{ retry }">
                <div class="infinite-loading-error text-center py-3">
                  <div class="alert alert-warning">
                    <p class="mb-2">Error loading announcements.</p>
                    <button
                      @click="retry"
                      class="btn btn-sm btn-outline-primary"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </template>
            </InfiniteLoading>
          </div>
        </div>
      </div>

      <!-- Right Column - Sidebar -->
      <div class="col-lg-4 order-1 order-lg-2">
        <Contacts />

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
  padding: 1rem;
  overflow-y: auto;
  position: relative;

  scroll-behavior: smooth;
}

.notices-list {
  display: flex;
  flex-direction: column;
}

.notices-grid {
  display: flex;
  flex-wrap: wrap;
}

h2 {
  color: white;
}
h4 {
  font-size: 1.2rem;
  font-weight: 400;
  margin-bottom: 1rem;
  color: #f8f9fad9;
  font-style: italic;
}

.alert-card {
  transition:
    transform 0.3s,
    box-shadow 0.3s;
  border-left: 4px solid #dc3545;
}
.alert-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}
.alert-card.low {
  border-left-color: #0dcaf0;
}
.alert-card.medium {
  border-left-color: #ffc107;
}
.alert-card.high {
  border-left-color: #dc3545;
}
.alert-card.resolved {
  border-left-color: #198754;
  background-color: #f8f9fa;
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
.filter-btn.active {
  background-color: #28a745;
  color: white;
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
