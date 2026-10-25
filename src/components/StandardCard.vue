<script setup>
/**
 * StandardCard.vue
 *
 * A standard card component for displaying article information in a horizontal layout.
 *
 * This component:
 * - Renders article previews with image on the left and content on the right
 * - Displays title, summary, category badge, and publication date
 * - Adapts to different screen sizes with responsive column classes
 * - Includes hover effects for better user experience
 */

import { formatDateToLongString, setDefaultImage } from "@/utils";
import { ref, onMounted, watch } from "vue";
import { getMediaById } from "@/features/media/MediaService";

/**
 * Component props
 */
const props = defineProps({
  /**
   * Article data object containing title, summary, image, etc.
   * @type {Object}
   * @required
   */
  article: {
    type: Object,
    required: true,
  },

  /**
   * Whether to show minimal details
   * @type {Boolean}
   * @default false
   */
  minDetails: {
    type: Boolean,
    default: false,
  },

  /**
   * Whether this is a featured article
   * @type {Boolean}
   * @default false
   */
  isFeatured: {
    type: Boolean,
    default: false,
  },

  /**
   * Whether this is a top story article
   * @type {Boolean}
   * @default false
   */
  isTopStory: {
    type: Boolean,
    default: false,
  },

  /**
   * Whether this is a popular story article
   * @type {Boolean}
   * @default false
   */
  isPopular: {
    type: Boolean,
    default: false,
  },
});

const imageUrl = ref(null);
const isLoadingImage = ref(false);

/**
 * Fetches media using cover_id if available
 */
const fetchMedia = async () => {
  if (props.article?.cover_id) {
    isLoadingImage.value = true;
    try {
      // Determine the appropriate storyType based on props and article properties
      let storyType = null;

      if (props.isFeatured ||
          props.article.type === "featured" ||
          (props.article.tags && props.article.tags.some(tag => tag.name.toLowerCase() === "featured"))) {
        storyType = "featured";
      } else if (props.isTopStory ||
          props.article.isTopStory ||
          props.article.type === "topStories" ||
          (props.article.tags && props.article.tags.some(tag => tag.name.toLowerCase() === "top story"))) {
        storyType = "top";
      } else if (props.isPopular ||
          props.article.type === "popular" ||
          (props.article.tags && props.article.tags.some(tag => tag.name.toLowerCase() === "popular"))) {
        storyType = "popular";
      }

      const response = await getMediaById(props.article.cover_id, storyType);
      if (response.data && response.status === 200) {
        // Handle JSON response with URL
        if (response.data.url) {
          imageUrl.value = response.data.url;
        }
        // Fallback for backward compatibility (blob response)
        else {
          const blob = response.data;
          imageUrl.value = URL.createObjectURL(blob);
        }
      }
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      isLoadingImage.value = false;
    }
  } else if (props.article?.cover?.file) {
    // Use existing cover.file if available
    imageUrl.value = props.article.cover.file;
  }
};

// Watch for changes in the article prop
watch(() => props.article, fetchMedia, { immediate: true });

// Fetch media on component mount
onMounted(fetchMedia);
</script>

<template>
  <article class="standard-card">
    <div class="card-container">
      <!-- Image Section -->
      <div class="card-image">
        <router-link :to="`/news/${article.slug}`" class="image-link">
          <div v-if="isLoadingImage" class="image-placeholder loading">
            <div class="spinner"></div>
          </div>
          <img
              v-else
              :src="imageUrl"
              :alt="article.title"
              class="article-image"
              @error="setDefaultImage"
          />
        </router-link>
      </div>

      <!-- Content Section -->
      <div class="card-content">
        <!-- Category & Date -->
        <div class="card-meta">
          <span class="category-badge">{{ article.category?.name }}</span>
          <span class="date-text">{{ formatDateToLongString(article.scheduledFor || article.created_at) }}</span>
        </div>

        <!-- Title -->
        <h3 class="card-title">
          <router-link
              :to="`/news/${article.slug}`"
              class="title-link"
          >
            {{ article.title }}
          </router-link>
        </h3>

        <!-- Summary -->
        <p class="card-summary" v-if="!minDetails">
          {{ article.summary }}
        </p>
      </div>
    </div>
  </article>
</template>

<style scoped>
/* ===== CARD CONTAINER ===== */
.standard-card {
  height: 100%;
  width: 100%;
}

.card-container {
  display: flex;
  flex-direction: row;
  height: 100%;
  background-color: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-container:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  border-color: #ffc107;
}

/* ===== IMAGE SECTION ===== */
.card-image {
  flex: 0 0 40%;
  min-height: 200px;
  position: relative;
  overflow: hidden;
  background-color: #f5f5f5;
}

.image-link {
  display: block;
  width: 100%;
  height: 100%;
}

.article-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.card-container:hover .article-image {
  transform: scale(1.05);
}

/* Image Placeholder & Loading State */
.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  min-height: 200px;
}

.image-placeholder.loading {
  background: linear-gradient(
      90deg,
      #f5f5f5 25%,
      #ececec 50%,
      #f5f5f5 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.spinner {
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 3px solid #ffc107;
  width: 32px;
  height: 32px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ===== CONTENT SECTION ===== */
.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  min-width: 0;
}

/* Meta Information */
.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.category-badge {
  display: inline-block;
  padding: 4px 10px;
  background-color: #ffc107;
  color: #000;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-text {
  font-size: 0.8rem;
  color: #666;
  font-weight: 500;
}

/* Title */
.card-title {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.4;
  flex-shrink: 0;
}

.title-link {
  color: #000;
  text-decoration: none;
  transition: color 0.2s ease;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.title-link:hover {
  color: #ffc107;
}

/* Summary */
.card-summary {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

/* ===== RESPONSIVE DESIGN ===== */

/* Large Desktop (1400px+) */
@media (min-width: 1400px) {
  .card-content {
    padding: 20px;
  }

  .card-title {
    font-size: 1.2rem;
  }

  .card-summary {
    font-size: 0.95rem;
    -webkit-line-clamp: 3;
  }
}

/* Desktop (992px - 1399px) */
@media (min-width: 992px) and (max-width: 1399.98px) {
  .card-image {
    flex: 0 0 35%;
  }

  .card-content {
    padding: 14px;
  }

  .card-title {
    font-size: 1rem;
  }

  .card-summary {
    font-size: 0.85rem;
  }
}

/* Tablet (768px - 991px) */
@media (min-width: 768px) and (max-width: 991.98px) {
  .card-container {
    flex-direction: column;
  }

  .card-image {
    flex: 0 0 auto;
    min-height: 180px;
    max-height: 180px;
  }

  .card-content {
    padding: 16px;
  }

  .card-title {
    font-size: 1.05rem;
  }

  .card-summary {
    -webkit-line-clamp: 3;
  }
}

/* Mobile Landscape (576px - 767px) */
@media (min-width: 576px) and (max-width: 767.98px) {
  .card-container {
    flex-direction: row;
  }

  .card-image {
    flex: 0 0 45%;
    min-height: 160px;
  }

  .card-content {
    padding: 12px;
  }

  .card-title {
    font-size: 0.95rem;
  }

  .card-summary {
    font-size: 0.85rem;
    -webkit-line-clamp: 2;
  }

  .date-text {
    font-size: 0.75rem;
  }
}

/* Mobile Portrait (< 576px) */
@media (max-width: 575.98px) {
  .card-container {
    flex-direction: row;
  }

  .card-image {
    flex: 0 0 35%;
    min-height: 140px;
  }

  .card-content {
    padding: 10px;
  }

  .card-meta {
    gap: 6px;
    margin-bottom: 8px;
  }

  .category-badge {
    padding: 3px 8px;
    font-size: 0.7rem;
  }

  .date-text {
    font-size: 0.7rem;
  }

  .card-title {
    font-size: 0.9rem;
    margin-bottom: 6px;
  }

  .card-summary {
    font-size: 0.8rem;
    -webkit-line-clamp: 2;
  }
}

/* Extra Small Mobile (< 400px) */
@media (max-width: 399.98px) {
  .card-image {
    flex: 0 0 40%;
  }

  .card-content {
    padding: 8px;
  }

  .card-title {
    font-size: 0.85rem;
  }

  .card-summary {
    font-size: 0.75rem;
  }
}

/* ===== ACCESSIBILITY ===== */
@media (prefers-reduced-motion: reduce) {
  .card-container,
  .article-image,
  .title-link {
    transition: none;
  }

  .spinner {
    animation: none;
  }

  .image-placeholder.loading {
    animation: none;
  }
}

/* Focus states for keyboard navigation */
.image-link:focus-visible,
.title-link:focus-visible {
  outline: 2px solid #ffc107;
  outline-offset: 2px;
}
</style>