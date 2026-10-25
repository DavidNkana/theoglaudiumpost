<template>
  <!-- d-flex justify-content-center align-items-center position-relative -->
  <div
    v-if="ad && show"
    class="fixed-bottom text-center shadow-lg px-3 py-2 bottom-ad"
    style="z-index: 1050"
  >
    <a :href="ad.click_url" target="_blank" @click="trackClick(ad.id)">
      <template v-if="currentImageUrl">
        <img
          :src="currentImageUrl"
          :alt="ad.title"
          class="img-fluid"
          :style="imgStyle"
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
      </template>
      <div v-else class="text-center">
        <i class="bi bi-badge-ad fs-1 text-muted"></i>
        <p class="mb-0">{{ getAspectRatio }}</p>
      </div>
    </a>
    <button
      class="btn-close position-absolute end-0 top-0 m-2"
      aria-label="Close"
      @click="closeBanner"
    ></button>
  </div>
</template>

<script setup>
import { useAds } from "@/composables/useAds";
import {
  getAdByPlacement,
  getAllAdByPlacement,
  trackClick,
  trackImpression,
} from "@/features/ads/AdsService";
import { getAdDimensions, delay } from "@/utils";
import { ref, onMounted, computed, watch, onBeforeUnmount } from "vue";
import { getMediaObjectUrl } from "@/features/media/MediaService";

const ads = ref([]);
const currentAdIndex = ref(0);
const currentImageIndex = ref(0);
const adRotationTimer = ref(null);
const imageRotationTimer = ref(null);
const rotationInterval = 5000; // 5 seconds between rotations
const show = ref(false);

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

const closeBanner = () => {
  show.value = false;
};

const fetchAd = async () => {
  try {
    // First try to get multiple ads for the placement
    const { data } = await getAllAdByPlacement("fixed_bottom");

    // If we got multiple ads, use them
    if (data && Array.isArray(data) && data.length > 0) {
      ads.value = data;
      show.value = true;

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
    const response = await getAdByPlacement("fixed_bottom");

    if (response.data) {
      ads.value = [response.data];
      show.value = true;

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
    show.value = false;
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
  // The sole caller (checkAndStartImageRotation) always clears and nulls
  // imageRotationTimer before invoking this, so there is never an existing
  // timer to clear here.

  // Set up a new timer. This timer is only created (via
  // checkAndStartImageRotation) while the current ad has more than one image,
  // and ad rotation always clears it before switching ads, so the current ad
  // always still has multiple files when this fires.
  imageRotationTimer.value = setInterval(() => {
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
  // The sole caller (fetchAd) invokes this once while adRotationTimer is still
  // null, so there is never an existing timer to clear here.

  // Set up a new timer. This timer is only created (from fetchAd) when there is
  // more than one ad, and the ads array is never shrunk afterwards, so there are
  // always multiple ads — and nextAdIndex is always a valid in-bounds index —
  // when this fires.
  adRotationTimer.value = setInterval(async () => {
    // Move to the next ad, or back to the first one if we're at the end
    const nextAdIndex = (currentAdIndex.value + 1) % ads.value.length;

    // Preload images for the next ad
    // Temporarily set the current ad index to preload images
    const tempIndex = currentAdIndex.value;
    currentAdIndex.value = nextAdIndex;
    await loadAdImages();
    currentAdIndex.value = tempIndex;

    // Track impression for the next ad
    if (ads.value[nextAdIndex]?.id) {
      trackImpression(ads.value[nextAdIndex].id);
    }

    // Update the current ad index
    currentAdIndex.value = nextAdIndex;

    // Reset image rotation for the new ad
    checkAndStartImageRotation();
  }, rotationInterval * 2); // Rotate ads less frequently than images
};

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

// Watch for changes to the current ad index and load images for the new ad
watch(currentAdIndex, async () => {
  await loadAdImages();
});

onMounted(fetchAd);

// Get the aspect ratio for the ad
const getAspectRatio = computed(() => {
  return ad.value?.placement?.aspect_ratio || getAdDimensions("fixed_bottom");
});

/**
 * Computed property to get the current image URL
 * Returns the cached image URL for the current mediaId
 */
const currentImageUrl = computed(() => {
  const currentAd = ad.value;
  // This computed is only read from the template under `v-if="ad && show"`,
  // so currentAd is always truthy here.

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

/**
 * Fetches an image by its mediaId and caches it
 * @param {number|string} mediaId - The ID of the media to fetch
 * @returns {Promise<string>} - Promise that resolves to the image URL
 */
async function fetchAndCacheImage(mediaId) {
  // Both callers (loadAdImages) already guard with `!imageCache.value[id]`
  // before invoking, so this is only ever called for an un-cached id.

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
  const currentAd = ad.value;
  // Every caller (fetchAd, checkAndStartImageRotation's multi-image guard, the
  // ad-rotation timer, and the currentAdIndex watcher) only runs while there is
  // a current ad, so currentAd is always truthy here.

  // Load images from files array
  if (
    currentAd.files &&
    Array.isArray(currentAd.files) &&
    currentAd.files.length > 0
  ) {
    // Files array contains mediaIds, not direct URLs
    for (const mediaId of currentAd.files) {
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

// Dynamically adjust image size based on aspect ratio and screen size
const imgStyle = computed(() => {
  const aspectRatio = getAspectRatio.value;
  const [width, height] = aspectRatio.split(":").map(Number);
  const aspectRatioValue = width / height;

  // Base styles
  const styles = {
    width: "100%",
    objectFit: window.innerWidth < 576 ? "cover" : "contain",
  };

  // Set height based on aspect ratio
  if (window.innerWidth < 576) {
    // On mobile, limit height but maintain aspect ratio
    styles.maxHeight = "60px";
  } else {
    // On desktop, calculate height based on width and aspect ratio
    // This ensures the image maintains the correct aspect ratio
    styles.height = "auto";
    styles.maxHeight = "64px";
  }

  return styles;
});
</script>

<style scoped>
.bottom-ad {
  animation: slideUp 0.8s ease-in-out;
  border-top: 1px solid #dee2e6;
  padding-right: 3rem !important;
  background-color: #ffffff;
  /* position: relative; */
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
  bottom: 5px;
  left: 50%;
  transform: translateX(-50%);
}

.ad-controls {
  top: 5px;
  right: 40px;
}

.image-dot,
.ad-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.3s ease;
}

.image-dot {
  background-color: var(--secondary);
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

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

/* Responsive container width */
@media (min-width: 768px) {
  .bottom-ad {
    width: 60%;
    left: 50%;
    transform: translateX(-50%);
    /* border-radius: 0.5rem; */
  }
}

@media (max-width: 767.98px) {
  .bottom-ad {
    width: 100%;
    /* border-radius: 0; */
  }
}
</style>
