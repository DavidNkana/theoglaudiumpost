<script setup>
/**
 * Home.vue
 *
 * Main home page component for the Laudium Biz application.
 *
 * This component:
 * - Serves as the landing page for the application
 * - Aggregates and displays content from various sections (news, videos, announcements)
 * - Features a responsive layout with main content and sidebar
 * - Integrates advertising banners at strategic positions
 * - Provides navigation to other sections of the application
 */

// Import content display components
import FeaturedStorySlider from "@/components/FeaturedStorySlider.vue";
import BreakingNewsTicker from "@/components/BreakingNewsTicker.vue";
import AdBanner from "@/components/AdBanner.vue";

// Import section components
import FeaturedVideos from "./Partials/FeaturedVideos.vue";
import LatestNews from "@/views/News/Partials/LatestNews.vue";
import RecentUpdates from "../Community/Partials/RecentUpdates.vue";

// Import ad placement constants
import {
  HOME_BANNER,
  IN_ARTICLE_BOTTOM,
  IN_ARTICLE_MID,
  IN_ARTICLE_TOP,
  SIDEBAR_TOP,
  SIDEBAR_MID,
  SIDEBAR_BOTTOM,
} from "@/utils";

/**
 * Sample breaking news items to display in the ticker
 * In a production environment, these would come from an API
 */
const breakingNews = [
  "Road closures expected on Main Street due to construction",
  "Local charity raises R50,000 for community projects",
  "Upcoming town hall meeting to discuss infrastructure developments",
];
</script>

<template>
  <!-- 
    Home page layout with responsive design
    Features a main content area and sidebar with various content sections
  -->
  <div class="home-page">
    <!-- Top advertisement banner -->
    <AdBanner size="large" :placement="HOME_BANNER" />

    <!-- Featured Story Slider - Highlights important articles -->
    <!-- <FeaturedStorySlider /> -->

    <div class="">
      <section class="row mt-4 content-wrapper">
        <!-- Main Content Column (8/12 width on large screens) -->
        <div class="col-lg-8">
          <!-- Breaking News Ticker - Displays urgent updates -->
          <!-- <BreakingNewsTicker :news="breakingNews" /> -->

          <!-- Latest News Section - Shows recent articles -->
          <LatestNews class="my-4" page="home" view-all :show-title="false" />
          <!-- <LatestNews page="home" view-all :show-title="false" /> -->
          <div class="my-2"></div>
          <!-- Bottom advertisement within content area -->
          <AdBanner size="large" :placement="IN_ARTICLE_BOTTOM" />
        </div>

        <!-- Sidebar Column (4/12 width on large screens) -->
        <div class="sidebar-column col-lg-4">
          <div class="sidebar-sticky-content">
            <!-- Recent Announcements Section -->
            <RecentUpdates
              class="top-stories mb-4"
              page="home"
              title="Community Updates"
            />

            <!-- Sidebar advertisement -->
            <div class="mb-4">
              <AdBanner size="medium" :placement="SIDEBAR_TOP" />
            </div>
          </div>
        </div>
      </section>

      <!-- Featured Videos Section - Displays YouTube content -->
      <section>
        <FeaturedVideos class="mt-2" />
      </section>
    </div>
  </div>
</template>

<style scoped>
/**
 * Home page styling
 * 
 * Defines layout variables, responsive grid structure, and component positioning
 */

/* CSS variables for consistent spacing and sizing */
:root {
  --spacing-base: 1rem;
  --radius: 6px;
  --container-width: 1280px;
  --navbar-height: 60px;
}

/* Main container layout */
.main-container {
  display: flex;
  -webkit-box-orient: vertical;
  -webkit-box-direction: normal;
  -ms-flex-direction: column;
  flex-direction: column;
  max-width: 1576px;
  margin: 0 auto;
}

/* Grid layout for main content and sidebar */
.main-content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: calc(var(--spacing-base) * 4);
  margin-top: calc(var(--spacing-base) * 4);
}

/* Responsive layout for larger screens */
@media (min-width: 992px) {
  .main-content-grid {
    grid-template-columns: minmax(0, 2.5fr) minmax(0, 1fr);
  }
}

/* Content wrapper positioning */
.content-wrapper {
  position: relative;
}

/* Sticky sidebar configuration */
.sidebar-sticky {
  position: relative;
  z-index: 10;
  top: 1rem;
}

/* Sticky sidebar content that follows scroll */
.sidebar-sticky-content {
  position: sticky;
  top: calc(var(--navbar-height) + var(--spacing-base) * 1.5);
  display: flex;
  flex-direction: column;
  gap: calc(var(--spacing-base) * 2);
  z-index: 10;
  top: 1rem;
}

/* Styling for dynamic content sections */
:deep(.dynamic-section-wrapper) {
  padding: calc(var(--spacing-base) * 3) 0;
  border-top: 1px solid var(--color-border);
}
</style>
