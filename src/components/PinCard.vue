<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from "vue";
import { getMediaById } from "@/features/media/MediaService";

const props = defineProps({
  article: {
    type: Object,
    required: true,
  },
  minDetails: {
    type: Boolean,
    default: false,
  },
  isTopStory: {
    type: Boolean,
    default: false,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isPopular: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['loaded']);

const imageUrl = ref(null);
const isLoadingImage = ref(false);

// Fetch media using cover_id if available
const fetchMedia = async () => {
  if (props.article?.cover_id) {
    isLoadingImage.value = true;
    try {
      // Determine storyType based on props
      let storyType = null;
      if (props.isTopStory) {
        storyType = "top";
      } else if (props.isFeatured) {
        storyType = "featured";
      } else if (props.isPopular) {
        storyType = "popular";
      }
      
      const response = await getMediaById(props.article.cover_id, storyType);
      if (response.data && response.status === 200) {
        // Handle JSON response with URL
        if (response.data.url) {
          imageUrl.value = response.data.url;
        }
      }
    } catch (error) {
      console.error("Error fetching media:", error);
      // Use a placeholder image for mock/fallback articles
        imageUrl.value = 'https://placehold.co/400x300?text=Laudium+POST';
    } finally {
      isLoadingImage.value = false;
      emit('loaded');
    }
  } else if (props.article?.cover?.file) {
    imageUrl.value = props.article.cover.file;
    emit('loaded');
  } else {
    // No image available, use a placeholder
    imageUrl.value = 'https://placehold.co/400x300?text=Laudium+Biz';
    emit('loaded');
  }
};

// Watch for changes in the article prop
watch(() => props.article, fetchMedia, { immediate: true });

// Fetch media on component mount
onMounted(fetchMedia);

const getCategoryClass = (category) => {
  const categoryMap = {
    Community: "bg-dark",
    Business: "bg-dark",
    Education: "bg-dark",
    Development: "bg-dark",
    Environment: "bg-dark",
    Food: "bg-dark",
    Sports: "bg-dark",
  };

  return categoryMap[category] || "bg-dark";
};

// Generate dimensions for each card based on type
const randomHeight = computed(() => {
  // Use the article ID as a seed for consistent heights
  const seed = props.article?.id || Math.random();

  // Base height for mobile and desktop
  const baseHeightMobile = 320; // Base height
  const baseHeightDesktop = 320; // Base height

  // Adjust height based on card type
  if (props.isTopStory) {
    // Top story increased by 15%
    if (windowWidth.value < 768) {
      return baseHeightMobile * 1.15; // 15% taller than base height
    } else {
      return baseHeightDesktop * 1.15; // 15% taller than base height
    }
  } else if (props.isFeatured) {
    // Featured stays the same (unchanged)
    if (windowWidth.value < 768) {
      return baseHeightMobile * 0.85; // Keep as is
    } else {
      return baseHeightDesktop * 0.85; // Keep as is
    }
  } else if (props.isPopular) {
    // Popular is decreased by another 15% (from 25% to 40% smaller)
    if (windowWidth.value < 768) {
      return baseHeightMobile * 0.6; // 40% smaller than base height
    } else {
      return baseHeightDesktop * 0.6; // 40% smaller than base height
    }
  } else {
    // Regular articles
    if (windowWidth.value < 768) {
      return baseHeightMobile * 0.85; // Keep as is
    } else {
      return baseHeightDesktop * 0.85; // Keep as is
    }
  }
});

// Track window width for responsive behavior
const windowWidth = ref(window.innerWidth);

// Update window width on resize
const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth;
  // Emit loaded event to trigger layout recalculation
  emit('loaded');
};

// Add resize event listener
onMounted(() => {
  window.addEventListener('resize', updateWindowWidth);
});

// Clean up event listener
onUnmounted(() => {
  window.removeEventListener('resize', updateWindowWidth);
});

// Determine if this card should span 2 columns (wider card)
const isWideCard = computed(() => {
  // Disable wide cards on mobile devices
  if (windowWidth.value < 768) {
    return false;
  }

  // Always make top stories wide cards
  if (props.isTopStory) {
    return true;
  }

  // For regular articles, use the article ID to consistently determine if a card should be wide
  // Make approximately 20% of regular articles wide on larger screens
  const seed = props.article?.id || Math.random();
  return (seed % 10) < 2;
});

// Function to trigger haptic feedback when an article is clicked
const triggerHapticFeedback = () => {
  // Check if the Vibration API is supported
  if (navigator.vibrate) {
    // Vibrate for 50ms to provide a subtle feedback
    navigator.vibrate(50);
    
    // For a more complex pattern, you could use an array:
    // navigator.vibrate([50, 30, 50]); // vibrate, pause, vibrate
    
    console.log('Haptic feedback triggered');
  } else {
    console.log('Vibration API not supported on this device');
  }
};

// Guard navigation to ensure we always have a valid slug when clicking a card
const hasSlug = computed(() => !!props.article?.slug);
const routeTarget = computed(() =>
  hasSlug.value
    ? { name: 'Article', params: { slug: props.article.slug } }
    : '/news'
);

const onLinkClick = (e) => {
  if (!hasSlug.value) {
    // Prevent navigating to an invalid/empty slug
    e.preventDefault();
    e.stopPropagation();
    console.warn('PinCard clicked without a valid slug, navigation prevented:', props.article);
    return;
  }
  triggerHapticFeedback();
};
</script>

<template>
  <router-link :to="routeTarget" class="card-link" @click="onLinkClick">
    <div class="pin-card-wrapper" :class="{ 
      'wide-wrapper': isWideCard, 
      'top-story-wrapper': isTopStory,
      'featured-story-wrapper': isFeatured,
      'popular-story-wrapper': isPopular
    }">
      <!-- Image Card -->
      <div class="pin-card" :class="{ 
        'wide-card': isWideCard, 
        'top-story': isTopStory,
        'featured-story': isFeatured,
        'popular-story': isPopular
      }" :style="{ height: randomHeight + 'px' }">
        <div class="pin-image-container">
          <div v-if="isLoadingImage" class="pin-image-loading">
            <div class="spinner"></div>
          </div>
          <img
            v-else
            :src="imageUrl"
            class="pin-image"
            :alt="article.title || 'Article image'"
            @load="emit('loaded')"
          />
        </div>
      </div>
    </div>
  </router-link>
</template>

<style scoped>
/* Card link styling */
.card-link {
  text-decoration: none;
  color: inherit;
  display: block;
  cursor: pointer;
  margin: 0;
  padding: 0;
}

/* Wrapper for the entire card */
.pin-card-wrapper {
  margin: 0 !important;
  padding: 0 !important;
  margin-bottom: 0 !important;
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

/* Card type wrappers - define size based on article_type */
.top-story-wrapper {
  /*width: 48%; /* Set to 48% of screen width as requested */
}

.featured-story-wrapper {
  /*width: 48%; /* Set to 48% of screen width as requested */
}

.popular-story-wrapper {
  /*width: 48%; /* Set to 48% of screen width as requested */
}

/* On larger screens, use fixed widths */
@media (min-width: 768px) {
  .pin-card-wrapper {
    /*width: 160px;*/
  }

  .top-story-wrapper {
    /*width: 160px;*/
  }

  .featured-story-wrapper {
    /*width: 160px;*/
  }

  .popular-story-wrapper {
    /*width: 160px;*/
  }
}

/* The actual card that contains the image */
.pin-card {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  box-shadow: none; /* Removed shadow as requested */
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  border: none; /* Remove all borders around each card */
  border-radius: 0;
}

/* Wide card that spans 2 columns */
.wide-card {
  width: 100%; /* Override width for wide cards */
}

/* Top story styling - longest */
.top-story {
  /* Removed border as requested */
  box-shadow: none; /* Removed shadow as requested */
}

/* Featured story styling - 15% smaller */
.featured-story {
  /* Removed border as requested */
  box-shadow: none; /* Removed shadow as requested */
}

/* Popular story styling - 15% smaller */
.popular-story {
  /* Removed border as requested */
  box-shadow: none; /* Removed shadow as requested */
}


/* Hover effects for the card */
.card-link:hover .pin-card {
  transform: translateY(-5px);
  box-shadow: none; /* Removed shadow as requested */
}

.pin-image-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pin-image {
  width: 100%;
  height: 100%;
  display: block;
  transition: transform 0.5s ease;
  object-fit: fill;
  object-position: center;
  max-width: 100%;
  max-height: 100%;
}

.card-link:hover .pin-image {
  transform: scale(1.05);
}


.pin-image-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0; /* Changed back to light gray for light theme */
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1); /* Changed back to dark for light theme */
  border-radius: 50%;
  border-top: 4px solid #000000; /* Changed back to black for light theme */
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

</style>
