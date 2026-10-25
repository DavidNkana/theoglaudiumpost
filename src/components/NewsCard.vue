<script setup>
/**
 * NewsCard.vue
 *
 * Article preview card component with two display modes:
 * - Featured: Large card with overlay text
 * - Standard: Regular card with image, title, and metadata
 */

import { ref, onMounted, watch, computed } from "vue";
import { useStore } from "vuex";
import { formatTimeAgo } from "@/utils";
import { getMediaById } from "@/features/media/MediaService";
import Tags from "@/views/Admin/Articles/Partials/Tags.vue";
import ImageWithPlaceholder from "./ImageWithPlaceholder.vue";
import FeaturedImageWithPlaceholder from "./FeaturedImageWithPlaceholder.vue";

// ===== PROPS =====
const props = defineProps({
  article: {
    type: Object,
    required: true,
  },
  minDetails: {
    type: Boolean,
    default: false,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  isTopStory: {
    type: Boolean,
    default: false,
  },
  isPopular: {
    type: Boolean,
    default: false,
  },
});

// ===== STATE =====
const store = useStore();
const imageUrl = ref(null);
const isLoadingImage = ref(false);

// ===== COMPUTED =====
const articleLink = computed(() => `/news/${props.article.slug}`);

const storyType = computed(() => {
  if (props.featured) return "featured";
  if (props.isTopStory ||
      props.article.isTopStory ||
      props.article.type === "topStories" ||
      props.article.tags?.some(tag => tag.name.toLowerCase() === "top story")) {
    return "top";
  }
  if (props.isPopular ||
      props.article.type === "popular" ||
      props.article.tags?.some(tag => tag.name.toLowerCase() === "popular")) {
    return "popular";
  }
  return null;
});

const publishedIso = computed(() => {
  // Prefer explicit publishedAt from API, then scheduledFor, then created_at
  return props.article.publishedAt || props.article.scheduledFor || props.article.created_at || null;
});

const formattedTime = computed(() => {
  return formatTimeAgo(publishedIso.value);
});

const authorText = computed(() => {
  const a = props.article.author;
  if (!a) return null;
  if (typeof a === 'string') return a;
  return a.name || a.fullName || null;
});

const publisherText = computed(() => {
  const p = props.article.publisher;
  if (!p) return null;
  if (typeof p === 'string') return p;
  return p.name || p.title || null;
});

// ===== METHODS =====
const fetchMedia = async () => {
  if (props.article?.cover_id) {
    isLoadingImage.value = true;
    try {
      const response = await getMediaById(props.article.cover_id, storyType.value);
      if (response.data && response.status === 200) {
        imageUrl.value = response.data.url || URL.createObjectURL(response.data);
      }
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      isLoadingImage.value = false;
    }
  } else if (props.article?.cover?.file) {
    imageUrl.value = props.article.cover.file;
  }
};

const cacheImage = ({ mediaId, url }) => {
  store.commit("articles/updateArticle", {
    ...props.article,
    cover: url,
    url
  });
};

// ===== LIFECYCLE =====
onMounted(fetchMedia);
watch(() => props.article, fetchMedia, { immediate: true });
</script>

<template>
  <!-- Featured Card Layout -->
  <router-link
      v-if="featured"
      :to="articleLink"
      class="news-card featured-card"
  >
    <FeaturedImageWithPlaceholder
        :media-id="article.cover_id"
        :image="article.cover"
        @loaded="cacheImage"
        class="featured-image"
    />

    <div class="featured-overlay"></div>

    <div class="featured-content">
      <h3 class="featured-title">{{ article.title }}</h3>
      <p class="featured-summary">{{ article.summary }}</p>
      <p class="featured-meta">
        <span v-if="authorText">By {{ authorText }}</span>
        <span v-if="publisherText"> · {{ publisherText }}</span>
        <time v-if="publishedIso" class="ms-1" :datetime="publishedIso"> · {{ formattedTime }}</time>
      </p>
    </div>
  </router-link>

  <!-- Standard Card Layout -->
  <router-link
      v-else
      :to="articleLink"
      class="news-card"
  >
    <!-- Image Section -->
    <div class="card-image">
      <ImageWithPlaceholder
          :media-id="article.cover_id"
          :image="article.cover"
          @loaded="cacheImage"
          class="card-img"
      />
    </div>

    <!-- Content Section -->
    <div class="card-content">
      <!-- Title -->
      <h4 class="card-title">{{ article.title }}</h4>

      <!-- Summary & Tags (if not minimal) -->
      <template v-if="!minDetails">
        <p class="card-summary">{{ article.summary }}</p>

        <div class="card-tags">
          <Tags
              :tags="article.tags"
              variant="card"
              size="sm"
              color-scheme="success"
              :show-icon="true"
              :clickable="false"
              empty-text=""
          />
        </div>
      </template>
    </div>

    <!-- Footer (if not minimal) -->
    <div v-if="!minDetails" class="card-footer">
      <span class="card-meta">
        <span v-if="authorText">By {{ authorText }}</span>
        <span v-if="publisherText"> · {{ publisherText }}</span>
        <time v-if="publishedIso" class="ms-1" :datetime="publishedIso">
          <i class="bi bi-clock"></i> {{ formattedTime }}
        </time>
      </span>
    </div>
  </router-link>
</template>

<style scoped>
/* ===== BASE CARD STYLES ===== */
.news-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  background-color: #ffffff;
  border: 1px solid #e8e8e8;
  transition: all 0.3s ease;
  overflow: hidden;
  height: 100%;
}

.news-card:hover {
  transform: translateY(-4px);
  border-color: #ffc107;
  text-decoration: none;
  color: inherit;
}

/* ===== FEATURED CARD ===== */
.featured-card {
  position: relative;
  min-height: 420px;
}

.featured-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.featured-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.85) 0%,
      rgba(0, 0, 0, 0.5) 50%,
      rgba(0, 0, 0, 0) 100%
  );
  pointer-events: none;
}

.featured-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px;
  z-index: 2;
  color: #ffffff;
}

.featured-title {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 0 0 12px 0;
  color: #ffffff;
}

.featured-summary {
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ===== STANDARD CARD ===== */
.standard-card {
  display: flex;
  flex-direction: column;
}

.card-image {
  width: 100%;
  height: 200px;
  flex-shrink: 0;
  background-color: #f5f5f5;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: fill;
  transition: transform 0.3s ease;
}

.news-card:hover .card-img {
  transform: scale(1.05);
}

.card-content {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-title {
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.4;
  margin: 0;
  color: #000;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-card:hover .card-title {
  color: #ffc107;
}

.card-summary {
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0;
  color: #666;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  margin-top: auto;
}

.card-footer {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  background-color: #fafafa;
}

.card-time {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #666;
}

.card-time i {
  font-size: 0.9rem;
}

/* ===== RESPONSIVE DESIGN ===== */

/* Large screens */
@media (min-width: 1200px) {
  .featured-title {
    font-size: 1.75rem;
  }

  .featured-content {
    padding: 32px;
  }
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1199.98px) {
  .featured-card {
    min-height: 380px;
  }

  .featured-title {
    font-size: 1.4rem;
  }

  .featured-content {
    padding: 20px;
  }

  .card-image {
    height: 180px;
  }
}

/* Mobile */
@media (max-width: 767.98px) {
  .featured-card {
    min-height: 320px;
  }

  .featured-title {
    font-size: 1.25rem;
  }

  .featured-summary {
    font-size: 0.9rem;
  }

  .featured-content {
    padding: 16px;
  }

  .card-image {
    height: 160px;
  }

  .card-content {
    padding: 12px;
  }

  .card-title {
    font-size: 1rem;
  }

  .card-summary {
    font-size: 0.85rem;
    -webkit-line-clamp: 2;
  }
}

/* Small mobile */
@media (max-width: 575.98px) {
  .featured-card {
    min-height: 280px;
  }

  .featured-title {
    font-size: 1.15rem;
  }

  .card-image {
    height: 140px;
  }
}

/* ===== ACCESSIBILITY ===== */
@media (prefers-reduced-motion: reduce) {
  .news-card,
  .card-img {
    transition: none;
  }
}

/* Focus state for keyboard navigation */
.news-card:focus-visible {
  outline: 2px solid #ffc107;
  outline-offset: 2px;
}

/* ===== LOADING STATE ===== */
:deep(.image-loading-container) {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  width: 100%;
  height: 100%;
}

:deep(.spinner) {
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

/* ===== TAG COMPONENT OVERRIDES ===== */
:deep(.tags-container) {
  margin: 0;
}

:deep(.tag-badge) {
  background-color: #f9ebd0;
  border: 1px solid #e8dfc0;
  color: #000;
}

:deep(.tag-badge:hover) {
  background-color: #ffc107;
  border-color: #e6a700;
}
</style>