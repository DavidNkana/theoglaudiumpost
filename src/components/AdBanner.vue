<!-- 
  Advertisement banner component that displays ads in various placements throughout the application.

  This component:
  - Displays advertisements with image, title, description, and business name
  - Supports different sizes and placements
  - Tracks ad impressions and clicks
  - Can be targeted based on content tags
  - Provides a placeholder when no ad is available
  - Includes an optional close button
-->
<template>
  <div
    v-if="show && ad && currentImageUrl"
    class="ad-container"
    :class="[`ad-${size}`, `ad-${placement}`]"
    @click="onClick"
  >
    <div
      class="ad-content"
      :style="adContentStyle"
    >
      <!-- <span class="badge ad-label p-1">Advertisement</span> -->
      <a :href="ad.click_url" target="_blank" class="ad-card">
        <span class="badge badge-info ad-label p-1">Advertisement</span>
        <img
          :src="currentImageUrl"
          :alt="ad.title"
          class="w-full img-fluid ad-image"
          :style="adImageStyle"
        />

        <!-- Navigation controls for multiple images -->
        <div v-if="hasMultipleImages" class="image-controls">
          <button
            v-for="(_, index) in ad.files"
            :key="index"
            class="image-dot"
            :class="{ active: index === currentImageIndex }"
            @click.stop="currentImageIndex = index"
            aria-label="View image"
          ></button>
        </div>

        <!-- Navigation controls for multiple ads -->
        <div v-if="hasMultipleAds" class="ad-controls">
          <button
            v-for="(_, index) in ads"
            :key="index"
            class="ad-dot"
            :class="{ active: index === currentAdIndex }"
            @click.stop="
              currentAdIndex = index;
              checkAndStartImageRotation();
            "
            aria-label="View ad"
          ></button>
        </div>

        <!-- align-items-center text-center -->
        <div
          v-if="placement != HOME_BANNER"
          class="ad-details d-flex flex-column justify-content-center p-3"
        >
          <p class="mb-1 h6 ad-title">{{ ad.title }}</p>
          <p class="small mb-0 ad-description">
            {{ ad.description ?? "" }}
          </p>
          <div class="d-flex align-items-center p-0 m-0 mt-1">
            <i class="bi bi-badge-ad fs-5 text-muted me-2"></i>
            <p class="text-muted small mb-0 ad-business-name">
              {{ ad.business_name }}
            </p>
          </div>
          <button
            v-if="showClose"
            type="button"
            class="btn-close position-absolute bottom-0 end-0 m-2 py-2 px-3"
            aria-label="Close"
            @click="closeAd"
          ></button>
        </div>
      </a>

      <!-- Fallback if no image -->
    </div>
  </div>
</template>

<script setup>
/**
 * AdBanner.vue
 *
 * Advertisement banner component for displaying ads throughout the application.
 *
 * This component:
 * - Fetches and displays ads based on placement and optional content tags
 * - Supports different sizes and layouts for various page positions
 * - Tracks ad impressions and clicks for analytics
 * - Provides fallback content when no ad is available
 * - Can be closed by the user when configured to allow it
 */

import {
  getAdByPlacement,
  getAdByPlacementAndTags,
  getAllAdByPlacement,
  trackClick,
  trackImpression,
} from "@/features/ads/AdsService";
import { getAdDimensions, HOME_BANNER, delay } from "@/utils";
import { ref, onMounted, computed, watch, onBeforeUnmount } from "vue";
import { getMediaObjectUrl } from "@/features/media/MediaService";
import { SHOW_ADS } from "@/config/app";

const showAds = SHOW_ADS;

/**
 * Reactive state for the ad data
 * Populated by the API when component mounts
 */
const ads = ref([]);
const currentAdIndex = ref(0);
const currentImageIndex = ref(0);
const adRotationTimer = ref(null);
const imageRotationTimer = ref(null);
const rotationInterval = 5000; // 5 seconds between rotations

/**
 * Cache for storing fetched images
 * Maps mediaIds to image URLs
 */
const imageCache = ref({});

/**
 * Computed property to get the current ad
 */
const ad = computed(() => {
  return ads.value.length > 0 ? ads.value[currentAdIndex.value] : null;
});

/**
 * Component props
 */
const props = defineProps({
  /**
   * Size of the ad banner
   * @type {String}
   * @values "small", "medium", "large"
   * @default "medium"
   */
  size: {
    type: String,
    default: "medium",
    validator: (value) => ["small", "medium", "large"].includes(value),
  },

  /**
   * Placement location of the ad in the application
   * Controls styling and which ads are eligible to appear
   * @type {String}
   * @default "default"
   */
  placement: {
    type: String,
    default: "default",
    // validator: (value) =>
    //   [
    //     "default",
    //     "sidebar-top",
    //     "sidebar-bottom",
    //     "content",
    //     "header",
    //   ].includes(value),
  },

  /**
   * Content tags for targeted advertising
   * When provided, ads matching these tags will be prioritized
   * @type {Array}
   */
  tags: {
    type: Array,
  },

  /**
   * Whether to show a close button on the ad
   * @type {Boolean}
   * @default false
   */
  showClose: {
    default: false,
    type: Boolean,
  },
  
  /**
   * Specifies the ad provider for this banner
   * Controls styling and content display
   * @type {String}
   * @values "direct", "google"
   * @default "direct"
   */
  adProvider: {
    type: String,
    default: "direct",
    validator: (value) => ["direct", "google"].includes(value),
  },
});

/**
 * Controls visibility of the ad banner
 * Set to false when user closes the ad
 */
const show = ref(true);
const fetched = ref(false);

/**
 * Handles click events on the ad
 * Tracks clicks for analytics when an ad is present
 */
const onClick = () => {
  if (ad.value && ad.value.id) {
    trackClick(ad.value.id);
  }
};

/**
 * Fetches appropriate ads based on placement and tags
 *
 * This function:
 * 1. Determines whether to use tag-based targeting
 * 2. Calls the appropriate API endpoint to get one or more ads
 * 3. Updates the ads data in the component
 * 4. Loads and caches images for the ads
 * 5. Tracks impressions when ads are successfully loaded
 * 6. Starts rotation timers if multiple ads or images are available
 */
const fetchAd = async () => {
  const tags = props.tags;
  fetched.value = false;

  try {
    // console.log("Fetching ad for placement:", props.placement);
    // First try to get multiple ads for the placement
    const { data } = await getAllAdByPlacement(props.placement);
    // console.log("Fetched ads:", data);
    // console.log("Fetched:", data && Array.isArray(data) && data.length > 0);
    // If we got multiple ads, use them
    if (data && Array.isArray(data) && data.length > 0) {
      ads.value = data;
      fetched.value = true;

      // Load and cache images for the first ad
      await loadAdImages();

      // Track impression for the first ad
      // if (data[0]?.id) trackImpression(data[0].id);

      // Start rotation if we have multiple ads
      if (data.length > 1) {
        startAdRotation();
      }

      // Check if the ad has multiple images
      checkAndStartImageRotation();

      return;
    }
    console.log("No ads:", data);
    // If getAllAdByPlacement didn't return usable data, fall back to single ad
    const response =
      tags && tags?.length > 0
        ? await getAdByPlacementAndTags(props.placement, tags)
        : await getAdByPlacement(props.placement);

    if (response.data) {
      ads.value = [response.data];
      fetched.value = true;

      // Load and cache images for the ad
      await loadAdImages();

      // Track impression
      if (response.data?.id) trackImpression(response.data.id);

      // Check if the ad has multiple images
      checkAndStartImageRotation();
    }
  } catch (error) {
    console.error("Error fetching ads:", error);
    ads.value = [];
    fetched.value = true;
  }
};

/**
 * Checks if the current ad has multiple images and starts image rotation if needed
 */
const checkAndStartImageRotation = async () => {
  // Clear any existing image rotation timer
  if (imageRotationTimer.value) {
    clearInterval(imageRotationTimer.value);
    imageRotationTimer.value = null;
  }

  // Reset current image index
  currentImageIndex.value = 0;

  // Get the current ad
  const currentAd = ad.value;

  // Check if the ad has multiple images (files array with more than one item)
  if (
    currentAd &&
    currentAd.files &&
    Array.isArray(currentAd.files) &&
    currentAd.files.length > 1
  ) {
    // Make sure all images are loaded and cached before starting rotation
    await loadAdImages();
    startImageRotation();
  }
};

/**
 * Starts the timer for rotating between multiple images in a single ad
 */
const startImageRotation = () => {
  // The only caller (checkAndStartImageRotation) always clears and nulls
  // imageRotationTimer before invoking this, so no existing timer can be set
  // here. Set up a new timer directly.
  imageRotationTimer.value = setInterval(() => {
    // This timer only exists while the current ad has multiple images
    // (checkAndStartImageRotation clears it on any ad change), so the current
    // ad always has files.length > 1 here.
    const currentAd = ad.value;
    // Move to the next image, or back to the first one if we're at the end
    currentImageIndex.value =
      (currentImageIndex.value + 1) % currentAd.files.length;
  }, rotationInterval);
};

/**
 * Starts the timer for rotating between multiple ads
 */
const startAdRotation = () => {
  // adRotationTimer is only ever assigned here and this runs exactly once per
  // mount (multi-ad path), so no existing timer can be set. Set up the timer
  // directly.
  adRotationTimer.value = setInterval(async () => {
    // This timer is only created when more than one ad is present and ads.value
    // is never shrunk afterwards, so there are always multiple ads here.
    // Move to the next ad, or back to the first one if we're at the end
    const nextAdIndex = (currentAdIndex.value + 1) % ads.value.length;

    // Preload images for the next ad. nextAdIndex is always a valid index, so
    // nextAd is always defined.
    // Temporarily set the current ad index to preload images
    const tempIndex = currentAdIndex.value;
    currentAdIndex.value = nextAdIndex;
    await loadAdImages();
    currentAdIndex.value = tempIndex;

    // Track impression for the next ad
    if (ads.value[nextAdIndex]?.id) {
      // trackImpression(ads.value[nextAdIndex].id);
    }

    // Update the current ad index
    currentAdIndex.value = nextAdIndex;
    // console.log("Rotating to ad index:", currentAdIndex.value);
    // Reset image rotation for the new ad
    checkAndStartImageRotation();
  }, rotationInterval * 2); // Rotate ads less frequently than images
};

// Watch for changes to the current ad index and load images for the new ad
watch(currentAdIndex, async () => {
  await loadAdImages();
});

/**
 * Fetch ad data when component mounts
 */
onMounted(fetchAd);

/**
 * Clean up timers when component is unmounted
 */
onBeforeUnmount(() => {
  if (adRotationTimer.value) {
    clearInterval(adRotationTimer.value);
    adRotationTimer.value = null;
  }
  if (imageRotationTimer.value) {
    clearInterval(imageRotationTimer.value);
    imageRotationTimer.value = null;
  }
});

/**
 * Closes the ad banner
 * Called when user clicks the close button
 */
const closeAd = () => {
  show.value = false;
};

/**
 * Computed property to determine the aspect ratio style for the ad content container
 * Uses the placement to get the correct aspect ratio
 */
const adContentStyle = computed(() => {
  // Get the aspect ratio for this placement
  const aspectRatio =
    ad.value?.aspect_ratio || getAdDimensions(props.placement);

  // If no aspect ratio is available, return empty style
  if (!aspectRatio) return {};

  // Parse the aspect ratio (e.g., "4:1" -> [4, 1])
  const [width, height] = aspectRatio.split(":").map(Number);

  // Calculate padding-bottom percentage to maintain aspect ratio
  const paddingBottom = (height / width) * 100;

  // Determine if this is a horizontal or vertical ad based on aspect ratio
  const isHorizontalAd = width > height;

  // Set appropriate max-height based on placement and size
  let maxHeight = "250px"; // Default max height

  if (props.placement.includes("sidebar")) {
    maxHeight = "400px"; // Taller for sidebar ads
  } else if (props.size === "small") {
    maxHeight = "150px";
  } else if (props.size === "medium") {
    maxHeight = "200px";
  }

  return {
    position: "relative",
    width: "100%",
    height: "0",
    paddingBottom: `${paddingBottom}%`,
    overflow: "hidden",
    maxHeight: isHorizontalAd ? maxHeight : "none", // Only apply max-height to horizontal ads
  };
});

/**
 * Computed property for the image style
 * Ensures the image fills the container while maintaining aspect ratio
 */
const adImageStyle = computed(() => {
  return {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    objectFit: "contain",
  };
});

/**
 * Fetches an image by its mediaId and caches it
 * @param {number|string} mediaId - The ID of the media to fetch
 * @returns {Promise<string>} - Promise that resolves to the image URL
 */
async function fetchAndCacheImage(mediaId) {
  // Both call sites in loadAdImages guard with `!imageCache.value[mediaId]`
  // synchronously immediately before calling, so this never runs for an
  // already-cached id. Fetch and cache directly.
  try {
    const url = await getMediaObjectUrl(mediaId);

    // Cache the URL
    imageCache.value[mediaId] = url;
    return url;
  } catch (err) {
    console.error(`Failed to load image with mediaId ${mediaId}:`, err);
    return null;
  }
}

/**
 * Ensures all images for the current ad are loaded and cached
 */
async function loadAdImages() {
  // loadAdImages is only ever invoked while an ad is present (from fetchAd
  // after assigning a non-empty ads list, from the rotation/image timers, and
  // from the currentAdIndex watcher which only changes when ads exist), so
  // ad.value is always defined here.
  const currentAd = ad.value;

  // Load images from files array
  if (
    currentAd.files &&
    Array.isArray(currentAd.files) &&
    currentAd.files.length > 0
  ) {
    // Files array contains mediaIds, not direct URLs
    for (const mediaId of currentAd.files) {
      console.log("Loading image for mediaId:", mediaId);
      if (!imageCache.value[mediaId]) {
        await fetchAndCacheImage(mediaId);
      }
    }
  }

  // Also load the main image if it exists and is a mediaId
  if (currentAd.image && !imageCache.value[currentAd.image]) {
    await fetchAndCacheImage(currentAd.image);
  }
}

/**
 * Computed property to get the current image URL
 * Returns the cached image URL for the current mediaId
 */
const currentImageUrl = computed(() => {
  // The template only reads currentImageUrl after `ad` is truthy (the v-if is
  // `show && ad && currentImageUrl`), and nothing else accesses it, so
  // ad.value is always defined when this computed runs.
  const currentAd = ad.value;

  // Check if the ad has multiple images in the files array
  if (
    currentAd.files &&
    Array.isArray(currentAd.files) &&
    currentAd.files.length > 0
  ) {
    const mediaId = currentAd.files[currentImageIndex.value];
    return imageCache.value[mediaId] || null;
  }

  // Fall back to the ad.image property
  return imageCache.value[currentAd.image] || null;
});

/**
 * Computed property to check if the current ad has multiple images
 */
const hasMultipleImages = computed(() => {
  const currentAd = ad.value;
  return (
    currentAd &&
    currentAd.files &&
    Array.isArray(currentAd.files) &&
    currentAd.files.length > 1
  );
});

/**
 * Computed property to check if there are multiple ads
 */
const hasMultipleAds = computed(() => {
  return ads.value.length > 1;
});
</script>

<!-- 
  Scoped styles that only apply to this component
  Includes styling for different ad sizes, placements, and responsive behavior
-->
<style scoped>
.ad-container {
  width: 100%;
  margin-bottom: 1rem;
  background-color: #f8f9fad1;
  border: 1px solid #f8f9fad1;
  border-radius: 4px;
  max-width: 100%;
  overflow: hidden;
}

.ad-content {
  position: relative;
  width: 100%;
}

.ad-content a {
  text-decoration: none;
}

.ad-card {
  display: flex;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #ffffff;
}

.ad-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  flex: auto;
  max-height: 100%;
}

.ad-label {
  position: absolute;
  top: 5px;
  left: 5px;
  background-color: #ffff;
  color: #6c757d;
  padding: 0 5px;
  font-size: 0.7rem;
  text-transform: uppercase;
  z-index: 59;
}

.ad-details {
  width: 100%;
  height: 100%;
  color: #333333;
  font-size: 0.8rem;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 8px;
  border-radius: 0 0 4px 4px;
}


.ad-large .ad-home_banner {
  height: 100px;
}

.ad-large .ad-in_article_top,
.ad-in_article_mid,
.ad-in_article_bottom {
  height: 140px;
}

/* Specific styling for different ad placements */
.ad-sidebar,
.ad-sidebar_top,
.ad-sidebar_mid,
.ad-sidebar_bottom {
  max-width: 100%;

  height: 100px;
  margin-left: auto;
  margin-right: auto;
}

.ad-sidebar .ad-card,
.ad-sidebar_top .ad-card,
.ad-sidebar_mid .ad-card,
.ad-sidebar_bottom .ad-card {
  display: flex;
  flex-direction: column;
}

.ad-sidebar .ad-content,
.ad-sidebar_top .ad-content,
.ad-sidebar_mid .ad-content,
.ad-sidebar_bottom .ad-content {
  width: 100%;
}

.ad-home_banner {
  max-width: 100%;
}
.ad-home_banner .ad-card {
  flex-direction: column;
}
.ad-home_banner .ad-image {
  object-fit: contain;
}
.ad-home_banner .ad-details {
  display: none;
  visibility: hidden;
}

.btn-close {
  z-index: 1050;
}

/* Styles for image and ad navigation controls */
.image-controls,
.ad-controls {
  position: absolute;
  display: flex;
  justify-content: center;
  gap: 5px;
  z-index: 10;
}

.image-controls {
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
}

.ad-controls {
  top: 10px;
  right: 10px;
}

.image-dot,
.ad-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.3s ease;
}

.image-dot {
  background-color: white;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
}

.ad-dot {
  background-color: #6c757d;
  box-shadow: 0 0 3px rgba(255, 255, 255, 0.3);
}

.image-dot.active,
.ad-dot.active {
  opacity: 1;
  transform: scale(1.2);
}

.image-dot:hover,
.ad-dot:hover {
  opacity: 0.8;
}

/* Desktop constraints to prevent ads from being too large */
@media (min-width: 992px) {
  .ad-large {
    max-height: 250px;
  }

  .ad-medium {
    max-height: 200px;
  }

  .ad-small {
    max-height: 150px;
  }

  /* Specific placement constraints */
  .ad-home_banner {
    max-height: 180px;
  }

  .ad-youtube_videos {
    max-height: 180px;
  }

  .ad-news_articles {
    max-height: 180px;
  }

  /* Adjust ad card layout for better display */
  .ad-card {
    flex-direction: row;
  }

  /* Override for sidebar placements - keep column layout */
  .ad-sidebar .ad-card,
  .ad-sidebar_top .ad-card,
  .ad-sidebar_mid .ad-card,
  .ad-sidebar_bottom .ad-card {
    flex-direction: column;
  }

  /* Limit image width when showing details */
  .ad-card .ad-image {
    max-width: 65%;
  }

  /* Override for sidebar placements - full width images */
  .ad-sidebar .ad-card .ad-image,
  .ad-sidebar_top .ad-card .ad-image,
  .ad-sidebar_mid .ad-card .ad-image,
  .ad-sidebar_bottom .ad-card .ad-image {
    max-width: 100%;
  }

  .ad-details {
    max-width: 35%;
    min-width: 200px;
  }

  /* Override for sidebar placements - full width details */
  .ad-sidebar .ad-details,
  .ad-sidebar_top .ad-details,
  .ad-sidebar_mid .ad-details,
  .ad-sidebar_bottom .ad-details {
    max-width: 100%;
    width: 100%;
  }
}

/* Tablet adjustments */
@media (max-width: 991.98px) {
  
  .ad-large {
    max-height: 200px;
  }

  .ad-medium {
    max-height: 180px;
  }
}

/* Mobile adjustments */
@media (max-width: 767.98px) {
  .ad-card {
    flex-direction: column;
  }

  .ad-image {
    max-height: 150px;
    width: 100%;
  }

  .ad-details {
    flex: 1;
    width: 100%;
    max-width: 100%;
  }
}

/* Ad details specific styling */
.ad-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 0.25rem;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ad-description {
  color: #555;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.3;
}

.ad-business-name {
  font-style: italic;
  color: #666 !important;
}

/* Small mobile adjustments */
@media (max-width: 412px) {
  .ad-image {
    max-height: 125px;
  }

  .ad-details {
    padding: 5px;
    font-size: 0.75rem;
    flex: 1;
  }

  .ad-title {
    font-size: 0.9rem;
  }

  .ad-description {
    -webkit-line-clamp: 1; /* Show only 1 line on very small screens */
  }

  .ad-in_article_top .ad-details {
    display: none !important;
    flex: 0;
  }
}
</style>
