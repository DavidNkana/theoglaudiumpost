<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";
import InfiniteLoading from "v3-infinite-loading";
import "v3-infinite-loading/lib/style.css";
import { devLog } from "@/utils/devLog";
import VideoCard from "@/components/VideoCard.vue";
import AdBanner from "@/components/AdBanner.vue";
import { IN_ARTICLE_MID } from "@/utils";

const route = useRoute();
const router = useRouter();
const store = useStore();
const channelId = ref("");
const searchQuery = ref("");
const currentPage = ref(0);
const isLoading = ref(false);
const scrollTarget = ref(null);

// Get videos from store
const videos = computed(() => store.getters["youtube/videos"]);
const hasMore = computed(() => store.getters["youtube/hasMore"]);

// Define a constant for the YouTube ad placement
const YOUTUBE_AD_PLACEMENT = "youtube_videos";

// Function to check if an ad should be displayed after this video index
const shouldShowAdAfter = (index) => {
  // Show ad after every 6 videos (indices 5, 11, 17, etc.)
  return (index + 1) % 6 === 0;
};

const fetchData = async () => {
  try {
    if (isLoading.value || !hasMore.value) return;
    isLoading.value = true;

    if (searchQuery.value) {
      devLog.info("Loading videos for search:");
      // Use search functionality
      await store.dispatch("youtube/searchVideos", {
        query: searchQuery.value,
        size: 12,
        page: currentPage.value,
      });
    } else {
      devLog.info("Loading videos for channel:");
      await store.dispatch("youtube/fetchVideos", {
        size: 12,
        page: currentPage.value,
      });
    }
  } catch (error) {
    devLog.error("Error fetching videos:", error);
  } finally {
    isLoading.value = false;
    devLog.info(`Setting isLoading:${isLoading.value}`);
  }
};

const loadMore = async ($state) => {
  if (isLoading.value) {
    devLog.info("Is Loading");
    return;
  }

  try {
    devLog.info("Loading more videos, current page:", currentPage.value);
    // await fetchData();
    $state.complete();
  } catch (error) {
    devLog.debug("Failed to load more videos:", error);
    currentPage.value -= 1;
    $state.error(); // Signal error to the infinite loading component
  }
};

const searchVideos = async () => {
  // if (!searchQuery.value) return;

  store.commit("youtube/clearVideos");
  currentPage.value = 0;
  await fetchData();

  // Update URL with search query
  router.replace({
    query: {
      search: searchQuery.value || undefined,
    },
  });
};

const loadVideos = async () => {
  // if (!channelId.value && !searchQuery.value) return;

  store.commit("youtube/clearVideos");
  currentPage.value = 0;
  await fetchData();
};

// Watch for changes in searchQuery and update URL
watch(
  () => searchQuery.value,
  () => {
    // We don't update the URL here because that's handled in the searchVideos method
    // This is just to clear the channelId when using search
    if (searchQuery.value) {
      channelId.value = "";
    }
  }
);

// Load videos automatically on mount
onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const channelIdParam = urlParams.get("channelId");
  const searchParam = urlParams.get("search");

  if (searchParam) {
    searchQuery.value = searchParam;
  } else if (channelIdParam) {
    channelId.value = channelIdParam;
  }

  // Load recent videos if no search or channel ID
  if (searchQuery.value) {
    // If we have a search query, search videos
    await searchVideos();
  } else {
    // If we have a channel ID, load videos and channel info
    await loadVideos();
  }
});
</script>

<template>
  <div class="youtube-videos">
    <template v-if="!isLoading">
      <div class="mb-4">
        <!-- <label for="searchQuery" class="form-label">Search YouTube</label> -->
        <div class="search-form-container">
          <div class="input-group mb-2">
            <input
              type="text"
              id="searchQuery"
              v-model="searchQuery"
              class="form-control"
              placeholder="Search for videos..."
              @keyup.enter="searchVideos"
            />
            <button @click="searchVideos" class="btn search-btn">
              <i class="bi bi-search me-2"></i>Search
            </button>
          </div>
          <!-- <p class="form-text text-muted">Example: Laudium community events</p> -->
        </div>
      </div>

      <div ref="scrollTarget" class="videos-container">
        <div
          v-if="videos.length > 0"
          class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4"
        >
          <template v-for="(video, index) in videos" :key="video.id.videoId">
            <!-- Video card -->
            <div class="col mb-4">
              <VideoCard :video="video" />
            </div>

            <!-- Ad banner after every 6 videos -->
            <div v-if="shouldShowAdAfter(index)" class="col-12 my-3">
              <AdBanner
                size="large"
                :placement="IN_ARTICLE_MID"
                class="youtube-ad-banner"
              />
            </div>
          </template>
        </div>

        <!-- No Videos Message -->

        <InfiniteLoading @infinite="loadMore" :target="scrollTarget">
          <template #spinner>
            <div class="infinite-loading-spinner"></div>
          </template>

          <template #complete>
            <div
              class="infinite-loading-complete d-flex justify-content-center"
            >
              <!-- No more videos to load -->
            </div>
          </template>

          <template #error="{ retry }">
            <div class="infinite-loading-error">
              Error loading videos.
              <button @click="retry" class="btn btn-sm btn-outline-danger">
                Retry
              </button>
            </div>
          </template>
        </InfiniteLoading>
      </div>
    </template>

    <div v-else class="row gap-3 mb-6">
      <div class="card-body shimmer my-4 mx-2" style="height: 60px"></div>
      <div v-for="index in 3" :key="'index-' + index" class="col-md-3">
        <div class="card h-100 border-0 shadow-sm hover-card">
          <div
            class="card-img-top shimmer"
            alt="News Image"
            style="height: 200px"
          ></div>
          <!-- <div class="card-body shimmer my-4 mx-2" style="height: 60px"></div> -->
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-btn {
  background-color: var(--secondary);
  color: var(--primary-dark);
}

.search-form-container {
  max-width: 700px;
  margin: 0 auto;
}

.videos-container {
  position: relative;
  min-height: 200px;
  padding-bottom: 40px;
}

.infinite-loading-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #ff0000; /* YouTube red spinner */
  border-radius: 50%;
  width: 36px;
  height: 36px;
  animation: spin 1s linear infinite;
  margin: 20px auto;
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
  margin: 20px 0;
  text-align: center;
}

/* Responsive adjustments */
@media (max-width: 767.98px) {
  .youtube-ad-banner {
    margin: 1rem 0;
  }
}

/* YouTube ad banner specific styles */
.youtube-ad-banner {
  width: 100%;
  max-width: 100%;
  margin: 1.5rem 0;
  border-radius: 8px;
  overflow: hidden;
}
</style>
