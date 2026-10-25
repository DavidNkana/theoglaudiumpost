<script setup>
import {computed, ref, onMounted, onUnmounted, watch} from "vue";
import {useIntersectionObserver} from "@vueuse/core";
import {
  trackImpression,
  trackClick,
} from "@/features/ads/AdsService";

const props = defineProps({
  ad: {
    type: Object,
    required: true,
  },
  minDetails: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['loaded']);

const imageUrl = ref(null);
const hasTrackedImpression = ref(false);
const adCardRef = ref(null);
const isVideoDialogOpen = ref(false);

// Extract YouTube video ID from various URL formats.
// Only ever called (via the computeds below) with `props.ad.video_url`, and
// the computeds are only read by the template behind `hasVideo` (a truthy
// video_url), so `url` is always a non-empty string here.
const extractYouTubeId = (url) => {
  // YouTube Shorts: youtube.com/shorts/VIDEO_ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) return { id: shortsMatch[1], isShort: true };

  // Standard YouTube: youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) return { id: watchMatch[1], isShort: false };

  // Short URL: youtu.be/VIDEO_ID
  const shortUrlMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortUrlMatch) return { id: shortUrlMatch[1], isShort: false };

  // Embed URL: youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (embedMatch) return { id: embedMatch[1], isShort: false };

  return null;
};

// Check if ad has video
const hasVideo = computed(() => {
  return !!(props.ad?.video_url);
});

// Check if video is YouTube
const isYouTubeVideo = computed(() => {
  return extractYouTubeId(props.ad?.video_url) !== null;
});

// Check if video is a YouTube Short
const isYouTubeShort = computed(() => {
  const result = extractYouTubeId(props.ad?.video_url);
  return result?.isShort || false;
});

// The three URL computeds below are only read by the template when
// `isYouTubeVideo` is true, i.e. when `extractYouTubeId` returns a non-null
// result, so `result` is always populated here.

// Get YouTube embed URL for iframe (autoplay, mute, loop for ads - thumbnail preview)
const youtubeEmbedUrl = computed(() => {
  const result = extractYouTubeId(props.ad?.video_url);
  // Autoplay with mute, loop for continuous playback in feed
  return `https://www.youtube.com/embed/${result.id}?autoplay=1&mute=1&loop=1&playlist=${result.id}&playsinline=1&controls=0&modestbranding=1&rel=0`;
});

// Get YouTube embed URL for dialog (with controls, unmuted)
const youtubeDialogUrl = computed(() => {
  const result = extractYouTubeId(props.ad?.video_url);
  // Full controls for dialog playback
  return `https://www.youtube.com/embed/${result.id}?autoplay=1&playsinline=1&controls=1&modestbranding=1&rel=0`;
});

// Get YouTube thumbnail URL for static preview
const youtubeThumbnailUrl = computed(() => {
  const result = extractYouTubeId(props.ad?.video_url);
  // Use maxresdefault for best quality, falls back to hqdefault if not available
  return `https://img.youtube.com/vi/${result.id}/hqdefault.jpg`;
});

// Process ad image
const processAdImage = () => {
  if (props.ad?.image_url) {
    imageUrl.value = props.ad.image_url;
    emit('loaded');
  } else if (props.ad?.image) {
    // Handle base64 image or URL from the image field
    if (props.ad.image.startsWith('data:') || props.ad.image.startsWith('http')) {
      imageUrl.value = props.ad.image;
    } else {
      // Assume it's base64 data without prefix
      imageUrl.value = `data:image/jpeg;base64,${props.ad.image}`;
    }
    emit('loaded');
  } else {
    // Use a placeholder for ads without images
    imageUrl.value = 'https://placehold.co/400x300?text=Advertisement';
    emit('loaded');
  }
};

// Track if video should be playing (in view)
const isInView = ref(false);
const youtubeIframeRef = ref(null);

// Use VueUse Intersection Observer for impression tracking and video autoplay
const {stop} = useIntersectionObserver(
    adCardRef,
    ([entry]) => {
      // Track impression (only once)
      if (entry.isIntersecting && props.ad?.id && !hasTrackedImpression.value) {
        try {
          trackImpression(props.ad.id);
          hasTrackedImpression.value = true;
          console.log(`Tracked impression for ad: ${props.ad.id}`);
        } catch (error) {
          console.error('Error tracking ad impression:', error);
        }
      }

      // Update in-view state for YouTube iframe control
      isInView.value = entry.isIntersecting;
    },
    {
      threshold: 0.5, // Track when 50% of ad is visible
      rootMargin: '0px 0px 50px 0px' // Track when ad is 50px from viewport
    }
);

// Watch for changes in the ad prop
watch(() => props.ad, (newAd, oldAd) => {
  processAdImage();
  // Reset impression tracking if ad changes
  if (newAd?.id !== oldAd?.id) {
    hasTrackedImpression.value = false;
  }
}, {immediate: true});

// Process ad on component mount
onMounted(() => {
  processAdImage();
});

// Generate dimensions for each ad card to match article cards
const randomHeight = computed(() => {
  // Use the ad ID as a seed for consistent heights
  const seed = props.ad?.id || Math.random();
  const baseHeight = 320;
  // Create variety in ad heights to match article layout
  // Use the ad ID to determine height category
  const heightCategory = seed % 4;

  switch (heightCategory) {
    case 0:
      return baseHeight * 1.15; // 15% taller
    case 1:
      return baseHeight * 0.85; // regular
    case 2:
      return baseHeight * 0.85; // regular
    case 3:
      return baseHeight * 0.6;  // 40% smaller
    default:
      return baseHeight * 0.85;
  }
});

// Track window width for responsive behavior (same as article card)
const windowWidth = ref(window.innerWidth);

// Update window width on resize
const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth;
  emit('loaded');
};

// Add resize event listener and escape key handler
onMounted(() => {
  window.addEventListener('resize', updateWindowWidth);
  window.addEventListener('keydown', handleEscapeKey);
});

// Clean up event listeners
onUnmounted(() => {
  window.removeEventListener('resize', updateWindowWidth);
  window.removeEventListener('keydown', handleEscapeKey);
  // Ensure body scroll is restored if component unmounts while dialog is open
  if (isVideoDialogOpen.value) {
    document.body.style.overflow = '';
  }
});

// Determine if this ad card should span 2 columns (wide card)
const isWideCard = computed(() => {
  // Disable wide cards on mobile devices
  if (windowWidth.value < 768) {
    return false;
  }

  // Use ad ID to consistently determine if an ad should be wide
  // Make approximately 20% of ads wide on larger screens (same as articles)
  const seed = props.ad?.id || Math.random();
  return (seed % 10) < 2;
});

// Function to trigger haptic feedback when ad is clicked
const triggerHapticFeedback = () => {
  if (navigator.vibrate) {
    navigator.vibrate(50);
    console.log('Haptic feedback triggered for ad click');
  }
};

// Open video dialog
const openVideoDialog = (event) => {
  event.preventDefault();
  event.stopPropagation();
  triggerHapticFeedback();
  isVideoDialogOpen.value = true;
  // Track click when opening dialog
  if (props.ad?.id) {
    trackClick(props.ad.id);
  }
  // Prevent body scroll when dialog is open
  document.body.style.overflow = 'hidden';
};

// Close video dialog
const closeVideoDialog = () => {
  isVideoDialogOpen.value = false;
  // Restore body scroll
  document.body.style.overflow = '';
};

// Handle escape key to close dialog
const handleEscapeKey = (event) => {
  if (event.key === 'Escape' && isVideoDialogOpen.value) {
    closeVideoDialog();
  }
};

// Handle ad click - redirect to click_url and track click
const handleAdClick = (event) => {
  event.preventDefault();
  triggerHapticFeedback();

  // Track click before redirecting
  if (props.ad?.id) {
    // You might want to add a trackClick function in your ads service
    trackClick(props.ad.id);
  }

  if (props.ad?.click_url) {
    // Open external ad click URLs in a new tab. Internal ('/'-prefixed) URLs
    // are intentionally not navigated here (no router is wired into this
    // standalone ad card), so they fall through and the native <a href> handles
    // them after the default-prevented tracking click.
    if (props.ad.click_url.startsWith('http')) {
      window.open(props.ad.click_url, '_blank', 'noopener,noreferrer');
    }
  } else {
    console.warn('No click URL provided for ad');
  }
};
</script>

<template>
  <a
      ref="adCardRef"
      :href="ad.click_url || '#'"
      class="ad-card-link"
      @click="handleAdClick"
      target="_blank"
      rel="noopener noreferrer"
      :data-ad-id="ad.id"
  >
    <div class="pin-ad-wrapper" :class="{ 'wide-wrapper': isWideCard }">
      <!-- Ad Card -->
      <div class="pin-ad-card" :class="{ 'wide-card': isWideCard }" :style="{ height: randomHeight + 'px' }">
        <div class="pin-ad-image-container">
          <!-- YouTube Video Ad (auto-plays muted in feed, opens dialog with sound on click) -->
          <template v-if="hasVideo && isYouTubeVideo">
            <div class="youtube-ad-container" :class="{ 'youtube-short': isYouTubeShort }" @click="openVideoDialog">
              <!-- Auto-playing YouTube iframe (muted, no controls) when in view -->
              <iframe
                  v-if="isInView"
                  ref="youtubeIframeRef"
                  :src="youtubeEmbedUrl"
                  class="youtube-ad-iframe"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  @load="emit('loaded')"
              ></iframe>
              <!-- YouTube Thumbnail (fallback when not in view) -->
              <img
                  v-else
                  :src="youtubeThumbnailUrl"
                  class="youtube-thumbnail"
                  :alt="ad.title || 'Video Advertisement'"
                  @load="emit('loaded')"
              />
              <!-- Tap to expand overlay -->
              <div class="video-tap-overlay">
                <div class="tap-indicator">
                  <i class="bi bi-arrows-fullscreen"></i>
                </div>
              </div>
            </div>
          </template>

          <!-- Image Ad -->
          <img
              v-else
              :src="imageUrl"
              class="pin-ad-image"
              :alt="ad.title || 'Advertisement'"
              @load="emit('loaded')"
          />
        </div>

        <!-- Optional: Show business name for ads -->
        <div v-if="ad.business_name && !minDetails" class="ad-business-info">
          <span class="business-name">{{ ad.business_name }}</span>
        </div>
      </div>
    </div>
  </a>

  <!-- Video Dialog Modal -->
  <Teleport to="body">
    <div v-if="isVideoDialogOpen" class="video-dialog-overlay" @click.self="closeVideoDialog">
      <div class="video-dialog" :class="{ 'video-dialog-short': isYouTubeShort }">
        <!-- Close Button -->
        <button class="video-dialog-close" @click="closeVideoDialog">
          <i class="bi bi-x-lg"></i>
        </button>

        <!-- Video Player -->
        <div class="video-dialog-player">
          <iframe
              :src="youtubeDialogUrl"
              class="video-dialog-iframe"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
          ></iframe>
        </div>

        <!-- Ad Info Footer - Always visible with prominent Visit Site button -->
        <div class="video-dialog-footer">
          <div class="video-dialog-info">
            <h4 v-if="ad.title" class="video-dialog-title">{{ ad.title }}</h4>
            <p v-if="ad.business_name" class="video-dialog-business">{{ ad.business_name }}</p>
            <p v-if="!ad.title && !ad.business_name" class="video-dialog-business">Advertisement</p>
          </div>
          <!-- Full-width Visit Site button - ALWAYS visible -->
          <a
              :href="ad.click_url || '#'"
              class="video-dialog-visit-btn-full"
              :class="{ 'disabled': !ad.click_url }"
              target="_blank"
              rel="noopener noreferrer"
              @click.stop="ad.click_url ? trackClick(ad.id) : $event.preventDefault()"
          >
            <i class="bi bi-globe me-2"></i>
            Visit Site
          </a>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Ad card link styling */
.ad-card-link {
  text-decoration: none;
  color: inherit;
  display: block;
  cursor: pointer;
}

/* Wrapper for the entire ad card */
.pin-ad-wrapper {
  margin-bottom: 0; /* Removed space between cards */
  break-inside: avoid;
  transition: transform 0.3s ease;
  display: block;
  position: relative;
}

/* Wide wrapper spans 2 columns */
.wide-wrapper {
  grid-column: span 2;
  width: 100%; /* Override width for wide cards */
}

/* The actual ad card that contains the image */
.pin-ad-card {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: none; /* Removed shadow to match articles */
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  border: 2px solid rgba(0, 0, 0, 0.2); /* Added thin black border to match articles */
  background-color: #f8f9fa; /* Light background for ads without images */
}

/* Wide card that spans 2 columns */
.wide-card {
  width: 100%; /* Override width for wide cards */
}

/* Hover effects for the ad card */
.ad-card-link:hover .pin-ad-card {
  transform: translateY(-5px);
  box-shadow: none; /* Removed shadow to match articles */
}

.pin-ad-image-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pin-ad-image {
  width: 100%;
  height: 100%;
  display: block;
  transition: transform 0.5s ease;
  object-fit: contain;
  object-position: center;
  max-width: 100%;
  max-height: 100%;
}

.ad-card-link:hover .pin-ad-image {
  transform: none;
}

/* Video Ad Styles (Pinterest-style) */
.pin-ad-video {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.pin-ad-video-poster {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

/* YouTube Video Ad Styles */
.youtube-ad-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 1;
}

.youtube-ad-iframe {
  width: 100%;
  height: 100%;
  border: none;
  pointer-events: none; /* Disable clicks on iframe to use our click handler */
}

/* YouTube Shorts style (9:16 vertical) */
.youtube-short .youtube-ad-iframe {
  /* For shorts, we want to show the full height */
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* YouTube overlay for visit link */
.youtube-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none; /* Allow clicks through to iframe except on buttons */
  z-index: 2;
}

/* Visit link button */
.visit-link-btn {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  text-decoration: none;
  pointer-events: auto; /* Enable clicks on this button */
  display: flex;
  align-items: center;
  gap: 4px;
  transition: background-color 0.2s, transform 0.2s;
}

.visit-link-btn:hover {
  background: rgba(0, 0, 0, 0.95);
  color: white;
  transform: scale(1.05);
}

.visit-link-btn i {
  font-size: 0.9rem;
}

/* Video playing indicator (muted icon) */
.video-playing-indicator {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 4px;
}

.video-playing-indicator i {
  font-size: 0.9rem;
}

.pin-ad-image-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* Business info styling */
.ad-business-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  padding: 12px 8px 8px;
  z-index: 2;
}

.business-name {
  color: white;
  font-size: 0.8rem;
  font-weight: 500;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

/* Spinner (reuse from article card) */
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #000000;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Responsive adjustments */
@media (min-width: 768px) {
  .pin-ad-wrapper {
    /* Match the fixed width behavior of article cards if needed */
  }
}

/* YouTube Thumbnail Styles */
.youtube-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

/* Play Button Overlay */
.play-button-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  transition: background 0.3s ease;
}

.youtube-ad-container:hover .play-button-overlay {
  background: rgba(0, 0, 0, 0.4);
}

.play-button {
  width: 60px;
  height: 60px;
  background: rgba(255, 0, 0, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease, background 0.3s ease;
}

.youtube-ad-container:hover .play-button {
  transform: scale(1.1);
  background: rgba(255, 0, 0, 1);
}

.play-button i {
  font-size: 2rem;
  color: white;
  margin-left: 4px; /* Offset for visual centering of play icon */
}

/* Video Label */
.video-label {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  z-index: 3;
}

.video-label i {
  color: #ff0000;
}

/* Muted indicator for auto-playing video */
.muted-indicator {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  z-index: 3;
  display: flex;
  align-items: center;
}

/* Tap to expand overlay */
.video-tap-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  z-index: 2;
  cursor: pointer;
  transition: background 0.3s ease;
}

.youtube-ad-container:hover .video-tap-overlay {
  background: rgba(0, 0, 0, 0.2);
}

.tap-indicator {
  width: 50px;
  height: 50px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.8);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.youtube-ad-container:hover .tap-indicator {
  opacity: 1;
  transform: scale(1);
}

.tap-indicator i {
  font-size: 1.3rem;
  color: #333;
}

/* Video Dialog Overlay - Note: Not scoped to work with Teleport */
</style>

<style>
/* Video Dialog Styles (unscoped for Teleport to body) */
.video-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.video-dialog {
  position: relative;
  width: 100%;
  max-width: 800px;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: visible;
  animation: slideUp 0.3s ease;
  display: flex;
  flex-direction: column;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* YouTube Shorts layout (9:16 vertical) */
.video-dialog-short {
  max-width: 400px;
}

.video-dialog-short .video-dialog-player {
  padding-top: 177.78%; /* 9:16 aspect ratio */
}

.video-dialog-close {
  position: absolute;
  top: -44px;
  right: 0;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
  z-index: 10;
}

.video-dialog-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.video-dialog-player {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  background: #000;
  overflow: hidden;
  border-radius: 12px 12px 0 0;
}

.video-dialog-iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}

.video-dialog-footer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 16px;
  background: #1a1a1a;
  gap: 12px;
  border-radius: 0 0 12px 12px;
  flex-shrink: 0; /* Prevent footer from shrinking */
}

.video-dialog-info {
  flex: 1;
  min-width: 0;
}

.video-dialog-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.video-dialog-business {
  margin: 4px 0 0;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

/* Full-width Visit Site button */
.video-dialog-visit-btn-full {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 24px;
  background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
  color: white;
  text-decoration: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3);
}

.video-dialog-visit-btn-full:hover {
  background: linear-gradient(135deg, #cc0000 0%, #aa0000 100%);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 0, 0, 0.4);
}

.video-dialog-visit-btn-full i {
  font-size: 1.2rem;
}

/* Disabled state for Visit Site button */
.video-dialog-visit-btn-full.disabled {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.5);
  cursor: not-allowed;
  box-shadow: none;
}

.video-dialog-visit-btn-full.disabled:hover {
  transform: none;
  box-shadow: none;
}

/* Mobile adjustments for dialog */
@media (max-width: 600px) {
  .video-dialog-overlay {
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .video-dialog {
    border-radius: 0;
    width: 100%;
    height: 100vh;
    max-height: 100vh;
    display: flex;
    flex-direction: column;
    margin: 0;
    padding-top: 60px;
    box-sizing: border-box;
  }

  .video-dialog-player {
    padding-top: 0 !important;
    flex: 1;
    min-height: 0;
  }

  .video-dialog-iframe {
    position: relative !important;
    width: 100% !important;
    height: 100% !important;
  }

  .video-dialog-close {
    position: fixed;
    top: 16px;
    right: 16px;
    background: rgba(0, 0, 0, 0.6);
    z-index: 10000;
  }

  .video-dialog-footer {
    padding: 16px;
    background: #1a1a1a;
    flex-shrink: 0;
  }

  .video-dialog-info {
    text-align: center;
    margin-bottom: 8px;
  }

  .video-dialog-title {
    font-size: 1rem;
    white-space: normal;
  }

  .video-dialog-visit-btn-full {
    padding: 18px 24px;
    font-size: 1.2rem;
    font-weight: 700;
  }
}

/* Extra small mobile (for very narrow screens) */
@media (max-width: 380px) {
  .video-dialog-overlay {
    padding: 12px;
  }

  .video-dialog-footer {
    padding: 10px 12px 14px;
  }

  .video-dialog-title {
    font-size: 0.9rem;
  }

  .video-dialog-visit-btn-full {
    padding: 12px 16px;
    font-size: 0.95rem;
  }
}
</style>
