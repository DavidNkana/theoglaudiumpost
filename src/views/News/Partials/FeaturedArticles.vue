<script setup>
import { ref, onMounted } from "vue";
import { useStore } from "vuex";
import NewsCard from "@/components/NewsCard.vue";
import StandardCard from "@/components/StandardCard.vue";

const isLoading = ref(null);
const store = useStore();

onMounted(() => {
  fetchPosts();
});

// Fetch posts based on current tab and filters
const fetchPosts = async () => {
  isLoading.value = true;

  try {
    await store.dispatch("articles/fetchArticlesByType", {
      type: "featured",
      size: 3,
    });
    isLoading.value = false;
  } catch (error) {
    console.error("Error fetching posts:", error);
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="featured-articles">
    <!-- Loading State -->
    <div v-if="isLoading" class="featured-grid">
      <div class="featured-card">
        <div class="skeleton-large">
          <div class="skeleton-image large"></div>
          <div class="skeleton-content">
            <div class="skeleton-badge"></div>
            <div class="skeleton-title"></div>
            <div class="skeleton-title short"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text"></div>
          </div>
        </div>
      </div>
      <div class="standard-card">
        <div class="skeleton-small"></div>
      </div>
      <div class="standard-card">
        <div class="skeleton-small"></div>
      </div>
    </div>

    <!-- Content State -->
    <div v-else class="featured-grid">
      <div
          v-for="(article, index) in store.getters['articles/featuredArticles']"
          :key="article.id"
          :class="index === 0 ? 'featured-card' : 'standard-card'"
      >
        <NewsCard
            v-if="index === 0"
            :article="article"
            :featured="index === 0"
            class="h-100"
            min-details
        />
        <StandardCard v-else :article="article" :isFeatured="true" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== FEATURED ARTICLES CONTAINER ===== */
.featured-articles {
  width: 100%;
}

/* ===== FEATURED GRID ===== */
.featured-grid {
  display: grid;
  grid-template-columns: minmax(0, 2.2fr) minmax(0, 1fr);
  grid-auto-rows: auto;
  gap: 24px;
}

.featured-card {
  grid-row: span 2;
  min-height: 400px;
  height: 100%;
}

.standard-card {
  height: 100%;
  min-height: 200px;
}

/* ===== RESPONSIVE DESIGN ===== */

/* Tablet (768px - 991px) */
@media (max-width: 991.98px) {
  .featured-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .featured-card {
    grid-column: span 2;
    grid-row: span 1;
  }

  .standard-card {
    min-height: 180px;
  }
}

/* Mobile (< 768px) */
@media (max-width: 767.98px) {
  .featured-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .featured-card {
    grid-column: span 1;
    grid-row: span 1;
    min-height: 300px;
  }

  .standard-card {
    min-height: 160px;
  }
}

/* Small Mobile (< 576px) */
@media (max-width: 575.98px) {
  .featured-grid {
    gap: 12px;
  }

  .featured-card {
    min-height: 280px;
  }
}

/* ===== LOADING SKELETON ===== */
.skeleton-large {
  background-color: #ffffff;
  border: 1px solid #e8e8e8;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.skeleton-small {
  background-color: #ffffff;
  border: 1px solid #e8e8e8;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.skeleton-image {
  width: 100%;
  background: linear-gradient(
      90deg,
      #f5f5f5 25%,
      #ececec 50%,
      #f5f5f5 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-image.large {
  height: 400px;
}

@media (max-width: 767.98px) {
  .skeleton-image.large {
    height: 250px;
  }
}

.skeleton-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.skeleton-badge {
  width: 100px;
  height: 24px;
  background: linear-gradient(
      90deg,
      #f5f5f5 25%,
      #ececec 50%,
      #f5f5f5 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-title {
  width: 100%;
  height: 20px;
  background: linear-gradient(
      90deg,
      #f5f5f5 25%,
      #ececec 50%,
      #f5f5f5 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-title.short {
  width: 70%;
}

.skeleton-text {
  width: 100%;
  height: 14px;
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

/* ===== ACCESSIBILITY ===== */
@media (prefers-reduced-motion: reduce) {
  .skeleton-image,
  .skeleton-badge,
  .skeleton-title,
  .skeleton-text {
    animation: none;
  }
}

/* ===== COMPONENT INTEGRATION ===== */
:deep(.news-card),
:deep(.standard-card) {
  height: 100%;
}
</style>