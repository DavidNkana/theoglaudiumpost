<template>
  <div
    v-if="ads.length && visible && currentImageUrl"
    class="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex justify-content-center align-items-center fade-in"
    style="z-index: 1050"
  >
    <div class="popup-container bg-white position-relative shadow rounded text-center">
      <div class="p-2 pb-3">
        <span class="badge ad-label m-2">Advertisement</span>
        <button
          type="button"
          class="btn-close position-absolute top-0 end-0 m-2"
          aria-label="Close"
          @click="closeAd"
        ></button>
      </div>

      <a
        :href="currentAd?.click_url"
        target="_blank"
        @click="handleClick(currentAd?.id)"
        class="link"
      >
        <img
          :src="currentImageUrl"
          :alt="currentAd?.title"
          class="img-fluid mt-3 rounded"
          :style="imageStyle"
        />

        <!-- Navigation controls for multiple images -->
        <div v-if="hasMultipleImages" class="image-controls">
          <button
            v-for="(_, index) in currentAd.files"
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

        <div
          class="ad-details d-flex flex-column justify-content-center align-items-start p-3"
        >
          <p class="mb-1 h6 ad-title">{{ currentAd?.title }}</p>
          <p class="small mb-0 ad-description">
            {{ currentAd?.description ?? "No description available" }}
          </p>
          <div class="d-flex align-items-center p-0 m-0 mt-1">
            <i class="bi bi-badge-ad fs-5 text-muted me-2"></i>
            <p class="text-muted small mb-0 ad-business-name">
              {{ currentAd?.business_name }}
            </p>
          </div>
        </div>
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed, onBeforeUnmount } from "vue";
import { useAds } from "@/composables/useAds";
import {
  getAdByPlacement,
  getAllAdByPlacement,
  trackClick,
  trackImpression,
} from "@/features/ads/AdsService";
import { getAdDimensions, delay } from "@/utils";
import { getMediaObjectUrl } from "@/features/media/MediaService";

const visible = ref(true);
const ads = ref([]);
const currentAdIndex = ref(0);
const currentImageIndex = ref(0);
const adRotationTimer = ref(null);
const imageRotationTimer = ref(null);
const rotationInterval = 5000; // 5 seconds between rotations
const isMobile = ref(false); // Track if we're on mobile

/**
 * Cache for storing fetched images
 * Maps mediaIds to image URLs
 */
const imageCache = ref({});

/**
 * Computed property to get the current ad
 */
const currentAd = computed(() => {
  return ads.value.length > 0 ? ads.value[currentAdIndex.value] : null;
});

function closeAd() {
  visible.value = false;
  // localStorage.setItem("popupAdSeen", "true");
}

function handleClick(adId) {
  trackClick(adId);
}

/**
 * Fetches ads for the popup
 */
const fetchAds = async () => {
  try {
    // First try to get multiple ads for the placement
    const { data } = await getAllAdByPlacement("pop_up");

    // If we got multiple ads, use them
    if (data && Array.isArray(data) && data.length > 0) {
      ads.value = data;

      // Load and cache images for the first ad
      await loadAdImages();

      // Track impression for the first ad
      if (data[0]?.id) trackImpression(data[0].id);

      // Start rotation if we have multiple ads
      if (data.length > 1) {
        startAdRotation();
      }

      // Check if the current ad has multiple images
      checkAndStartImageRotation();

      return;
    }

    // If getAllAdByPlacement didn't return usable data, fall back to single ad
    const response = await getAdByPlacement("popup");

    if (response.data) {
      ads.value = [response.data];

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
  const ad = currentAd.value;

  // Check if the ad has multiple images (files array with more than one item)
  if (ad && ad.files && Array.isArray(ad.files) && ad.files.length > 1) {
    // Make sure all images are loaded and cached before starting rotation
    await loadAdImages();
    startImageRotation();
  }
};

/**
 * Starts the timer for rotating between multiple images in a single ad
 */
const startImageRotation = () => {
  // Set up a new timer. The only caller (checkAndStartImageRotation) always
  // clears imageRotationTimer first, so no defensive clear is needed here.
  imageRotationTimer.value = setInterval(() => {
    const ad = currentAd.value;
    if (ad && ad.files && Array.isArray(ad.files) && ad.files.length > 1) {
      // Move to the next image, or back to the first one if we're at the end
      currentImageIndex.value = (currentImageIndex.value + 1) % ad.files.length;
    }
  }, rotationInterval);
};

/**
 * Starts the timer for rotating between multiple ads
 */
const startAdRotation = () => {
  // Set up a new timer. The only caller (fetchAds) invokes this once, before
  // any ad timer exists, so no defensive clear is needed here.
  adRotationTimer.value = setInterval(async () => {
    if (ads.value.length > 1) {
      // Move to the next ad, or back to the first one if we're at the end
      const nextAdIndex = (currentAdIndex.value + 1) % ads.value.length;

      // Preload images for the next ad
      const nextAd = ads.value[nextAdIndex];
      if (nextAd) {
        // Temporarily set the current ad index to preload images
        const tempIndex = currentAdIndex.value;
        currentAdIndex.value = nextAdIndex;
        await loadAdImages();
        currentAdIndex.value = tempIndex;
      }

      // Track impression for the next ad
      if (ads.value[nextAdIndex]?.id) {
        trackImpression(ads.value[nextAdIndex].id);
      }

      // Update the current ad index
      currentAdIndex.value = nextAdIndex;

      // Reset image rotation for the new ad
      checkAndStartImageRotation();
    }
  }, rotationInterval * 2); // Rotate ads less frequently than images
};

// Get the aspect ratio for the ad
const getAspectRatio = computed(() => {
  return currentAd.value?.aspect_ratio || getAdDimensions("popup");
});

console.log("getAspectRatio: ", getAspectRatio.value);

/**
 * Computed property to get the current image URL
 * Returns the cached image URL for the current mediaId
 */
const currentImageUrl = computed(() => {
  const ad = currentAd.value;
  if (!ad) return null;

  // Check if the ad has multiple images in the files array
  if (ad.files && Array.isArray(ad.files) && ad.files.length > 0) {
    const mediaId = ad.files[currentImageIndex.value];
    return imageCache.value[mediaId] || null;
  }

  // Fall back to the ad.image property
  return imageCache.value[ad.image] || null;
});

/**
 * Computed property to check if the current ad has multiple images
 */
const hasMultipleImages = computed(() => {
  const ad = currentAd.value;
  return ad && ad.files && Array.isArray(ad.files) && ad.files.length > 1;
});

/**
 * Computed property to check if there are multiple ads
 */
const hasMultipleAds = computed(() => {
  return ads.value.length > 1;
});

// Style for the ad image to maintain aspect ratio
const imageStyle = computed(() => {
  const aspectRatio = getAspectRatio.value;
  const [width, height] = aspectRatio.split(":").map(Number);
  const isHorizontalAd = width > height;

  // Set appropriate max-height based on aspect ratio and screen size
  let maxHeight = isMobile.value ? '200px' : '300px';

  return {
    maxWidth: "100%",
    objectFit: "contain",
    aspectRatio: `${width} / ${height}`,
    maxHeight: isHorizontalAd ? maxHeight : 'none', // Only apply max-height to horizontal ads
    width: "100%",
    borderRadius: "8px 8px 0 0",
  };
});

/**
 * Fetches an image by its mediaId and caches it
 * @param {number|string} mediaId - The ID of the media to fetch
 * @returns {Promise<string>} - Promise that resolves to the image URL
 */
async function fetchAndCacheImage(mediaId) {
  // The only caller (loadAdImages) already guards against re-fetching cached
  // ids, so this function is always entered with an uncached mediaId.
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
  const ad = currentAd.value;
  if (!ad) return;

  // Load images from files array
  if (ad.files && Array.isArray(ad.files) && ad.files.length > 0) {
    // Files array contains mediaIds, not direct URLs
    for (const mediaId of ad.files) {
      if (!imageCache.value[mediaId]) {
        await fetchAndCacheImage(mediaId);
      }
    }
  }

  // Also load the main image if it exists and is a mediaId
  if (ad.image && !imageCache.value[ad.image]) {
    await fetchAndCacheImage(ad.image);
  }
}

// Watch for changes to the current ad index and load images for the new ad
watch(currentAdIndex, async () => {
  await loadAdImages();
});

onMounted(() => {
  // Set initial value for isMobile
  isMobile.value = window.innerWidth < 768;

  // Add resize event listener to update isMobile
  const handleResize = () => {
    isMobile.value = window.innerWidth < 768;
  };

  window.addEventListener('resize', handleResize);

  // Clean up the event listener when component is unmounted
  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
  });

  // if (!localStorage.getItem("popupAdSeen")) {
  setTimeout(() => {
    visible.value = true;
    fetchAds();
  }, 1000); // Show after 1 second

  // Optional: auto-close after 10 seconds
  // setTimeout(() => {
  //   visible.value = false;
  //   localStorage.setItem("popupAdSeen", "true");
  // }, 10000);
  // }
});

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
</script>

<style scoped>
.link {
  text-decoration: none !important;
  color: inherit !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
}
.link:hover {
  /* text-decoration: underline !important; */
  /* color: rgba(var(--bs-link-color-rgb), var(--bs-link-opacity, 1)) !important; */
}

.popup-container {
  max-width: 90%;
  width: 600px;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.ad-label {
  position: absolute;
  top: 5px;
  left: 5px;
  background-color: rgba(0, 0, 0, 0.05);
  color: #6c757d;
  padding: 0 5px;
  font-size: 0.9rem;
  text-transform: uppercase;
}

.fade-in {
  animation: fadeIn 0.6s ease-in-out;
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

/* Ad details styling */
.ad-details {
  width: 100%;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 0 0 8px 8px;
}

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

/* Responsive adjustments */
@media (max-width: 767.98px) {
  .popup-container {
    max-width: 95%;
    width: 450px;
  }

  .ad-title {
    font-size: 0.9rem;
  }

  .ad-description {
    -webkit-line-clamp: 1; /* Show only 1 line on mobile */
  }
}

@media (max-width: 480px) {
  .popup-container {
    max-width: 95%;
    width: 320px;
  }

  .ad-details {
    padding: 8px !important;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
