<script setup>
/**
 * FeaturedVideos.vue
 *
 * Component that displays a list of recent YouTube videos.
 *
 * This component:
 * - Fetches recent videos from the YouTube channel configured in the application
 * - Provides a loading state while the fetch is in flight
 * - Renders the videos in a responsive grid once they are available
 */

import { ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { devLog } from "@/utils/devLog";
import VideoCard from "@/components/VideoCard.vue";

/**
 * Reactive state variables
 */
const isLoading = ref(false); // Controls loading state display
const store = useStore(); // Vuex store access

// Fetch videos when component is mounted
onMounted(async () => {
  try {
    isLoading.value = true;
    await store.dispatch("youtube/fetchRecentVideos", {
      channelId: "", // Uses default channel from environment
      size: 10, // Number of videos to fetch
    });
  } catch (error) {
    devLog.error("Error Fetching Recent YT: ", error);
  } finally {
    isLoading.value = false;
  }
});

/**
 * Computed properties
 */
// Get videos from store
const featuredVideos = computed(() => store.getters["youtube/recent"]);
</script>

<template>
  <!--
    Featured Videos section that displays YouTube videos in a responsive grid.
    Only displays when videos are loaded and not in loading state.
  -->
  <section class="" v-if="!!featuredVideos.length && !isLoading">
    <!-- Section header with title and "View All" link -->
    <div class="section-header d-flex align-items-center mb-3">
      <h2 class="section-title m-0">Featured Videos</h2>
      <div class="section-line flex-grow-1 mx-3"></div>
      <router-link to="/podcasts" class="section-link">View All</router-link>
    </div>

    <div class="px-2 row">
      <div
        v-for="(video, index) in featuredVideos"
        :key="index"
        class="col-md-6 col-lg-4 col-xl-3 mb-4"
      >
        <VideoCard :video="video" />
      </div>
    </div>
  </section>
</template>

<style scoped>
/**
 * Featured Videos component styling
 */

/* Card image styling */
.card-img-top {
  max-height: 180px;
  object-fit: cover;
  transition: transform 0.5s ease;
}

/* Card hover effects */
.hover-card {
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  border-radius: 0.5rem;
  overflow: hidden;
}

.hover-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1) !important;
}

/* Loading shimmer effect for placeholders */
.shimmer {
  position: relative;
  overflow: hidden;
  background: #e0e0e0;
}

.shimmer::after {
  content: "";
  position: absolute;
  top: 0;
  left: -150px;
  width: 100px;
  height: 100%;
  background: linear-gradient(
    to right,
    transparent 0%,
    #f8f9fa 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

/* Shimmer animation */
@keyframes shimmer {
  0% {
    left: -150px;
  }
  100% {
    left: 100%;
  }
}
</style>
