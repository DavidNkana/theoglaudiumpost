<script setup>
/**
 * CommunityUpdates.vue
 * 
 * Component that displays recent community notices and announcements.
 * 
 * This component:
 * - Fetches recent community notices from the Vuex store
 * - Displays them in a responsive grid layout
 * - Provides a "View All" link to the full notices page
 * - Handles loading states during data fetching
 */

import EventCard from "@/components/EventCard.vue";
import { ref, computed, onMounted } from "vue";
import { useStore } from "vuex";

/**
 * Reactive state variables
 */
const isLoading = ref(null);  // Controls loading state display
const store = useStore();     // Vuex store access

/**
 * Fetch notices when component is mounted
 */
onMounted(() => {
  fetchNotices();
});

/**
 * Fetches recent community notices from the store
 * 
 * This function:
 * 1. Sets the loading state
 * 2. Dispatches the action to fetch recent notices
 * 3. Handles any errors during fetching
 * 4. Resets the loading state when complete
 */
const fetchNotices = async () => {
  try {
    isLoading.value = true;
    await store.dispatch("notices/fetchRecentNotices", {
      type: "communityUpdates",
      size: 8,  // Number of notices to fetch
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <!-- 
    Community Updates section that displays recent community notices and announcements
    in a responsive grid layout
  -->
  <section class="">
    <!-- Section header with title and "View All" link -->
    <div class="section-header d-flex align-items-center mb-3">
      <h2 class="section-title m-0">Latest Community Updates</h2>
      <div class="section-line flex-grow-1 mx-3"></div>
      <router-link to="/notices" class="section-link text-success"
        >View All</router-link
      >
    </div>

    <!-- Grid of community notices -->
    <div class="row p-4">
      <!-- Each notice is displayed as an EventCard in a responsive column -->
      <div
        class="col-md-4 mb-4"
        v-for="(event, index) in store.getters['notices/recent']"
        :key="event.id"
      >
        <EventCard :event="event" />
      </div>
    </div>
  </section>
</template>

<style scoped>
/**
 * Community Updates component styling
 * 
 * Uses Bootstrap grid classes for responsive layout
 */
</style>
