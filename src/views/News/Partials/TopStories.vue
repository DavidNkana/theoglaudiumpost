<script setup>
import { ref, onMounted } from "vue";
import { useStore } from "vuex";
import NewsCard from "@/components/NewsCard.vue";

const isLoading = ref(false);
const store = useStore();

onMounted(() => {
  fetchPosts();
});

// Fetch posts based on current tab and filters
const fetchPosts = async () => {
  isLoading.value = true;

  try {
    await store.dispatch("articles/fetchArticlesByType", {
      type: "topStories",
      size: 6,
    });

    isLoading.value = false;
  } catch (error) {
    console.error("Error fetching posts:", error);
    isLoading.value = false;
  }
};
</script>

<template>
  <section class="top-stories-section">
    <!-- Section Header -->
    <div class="section-header">
      <div class="header-content">
        <div class="header-badge">
          <i class="bi bi-lightning-charge-fill"></i>
        </div>
        <h2 class="section-title">Top Stories</h2>
      </div>
      <div class="header-line"></div>
    </div>

    <!-- Stories Grid -->
    <div class="stories-grid" v-if="!isLoading">
      <div
          v-for="story in store.getters['articles/topStories']"
          :key="story.id"
          class="story-item"
      >
        <NewsCard :article="story" :isTopStory="true" />
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div class="stories-grid" v-else>
      <div
          v-for="index in 6"
          :key="'skeleton-' + index"
          class="story-item"
      >
        <div class="skeleton-card">
          <div class="skeleton-image"></div>
          <div class="skeleton-content">
            <div class="skeleton-badge"></div>
            <div class="skeleton-title"></div>
            <div class="skeleton-title short"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-footer">
              <div class="skeleton-date"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ===== SECTION CONTAINER ===== */
.top-stories-section {
  width: 100%;
  padding: 20px 0;
}

/* ===== SECTION HEADER ===== */
.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #ffc107 0%, #ffb300 100%);
  border-radius: 8px;
  color: #000;
  font-size: 1.2rem;
  box-shadow: 0 2px 8px rgba(255, 193, 7, 0.3);
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #000;
  margin: 0;
  letter-spacing: -0.5px;
}

.header-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, #ffc107, transparent);
}

/* ===== STORIES GRID ===== */
.stories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  width: 100%;
}

.story-item {
  display: flex;
  flex-direction: column;
  min-height: 300px;
}

/* ===== RESPONSIVE GRID ===== */

/* Extra Large Screens (1600px+) - Full width pages */
@media (min-width: 1600px) {
  .stories-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Large Screens (1400px - 1599px) */
@media (min-width: 1400px) and (max-width: 1599.98px) {
  .stories-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Desktop with Sidebar (1200px - 1399px) - Optimized for News page */
@media (min-width: 1200px) and (max-width: 1399.98px) {
  .stories-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

/* Desktop Small (992px - 1199px) - Sidebar visible */
@media (min-width: 992px) and (max-width: 1199.98px) {
  .stories-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

/* Tablet (768px - 991px) - No sidebar on News page */
@media (min-width: 768px) and (max-width: 991.98px) {
  .stories-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .section-title {
    font-size: 1.3rem;
  }

  .header-badge {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }
}

/* Mobile Landscape (576px - 767px) */
@media (min-width: 576px) and (max-width: 767.98px) {
  .stories-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .section-title {
    font-size: 1.2rem;
  }

  .header-badge {
    width: 34px;
    height: 34px;
    font-size: 1rem;
  }
}

/* Mobile Portrait (< 576px) */
@media (max-width: 575.98px) {
  .stories-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .section-header {
    flex-wrap: wrap;
    gap: 12px;
  }

  .header-content {
    gap: 10px;
  }

  .section-title {
    font-size: 1.15rem;
  }

  .header-badge {
    width: 32px;
    height: 32px;
    font-size: 0.95rem;
  }

  .header-line {
    flex-basis: 100%;
    order: 3;
  }

  .top-stories-section {
    padding: 16px 0;
  }

  .section-header {
    margin-bottom: 20px;
  }
}

/* ===== LOADING SKELETON ===== */
.skeleton-card {
  background-color: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.skeleton-image {
  width: 100%;
  height: 200px;
  background: linear-gradient(
      90deg,
      #f5f5f5 25%,
      #ececec 50%,
      #f5f5f5 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-content {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-badge {
  width: 80px;
  height: 20px;
  background: linear-gradient(
      90deg,
      #f5f5f5 25%,
      #ececec 50%,
      #f5f5f5 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-title {
  width: 100%;
  height: 16px;
  background: linear-gradient(
      90deg,
      #f5f5f5 25%,
      #ececec 50%,
      #f5f5f5 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-title.short {
  width: 70%;
}

.skeleton-text {
  width: 100%;
  height: 12px;
  background: linear-gradient(
      90deg,
      #f5f5f5 25%,
      #ececec 50%,
      #f5f5f5 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-footer {
  margin-top: auto;
  padding-top: 12px;
}

.skeleton-date {
  width: 120px;
  height: 12px;
  background: linear-gradient(
      90deg,
      #f5f5f5 25%,
      #ececec 50%,
      #f5f5f5 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
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
  .skeleton-text,
  .skeleton-date {
    animation: none;
  }
}

/* ===== NEWSCARD INTEGRATION ===== */
:deep(.news-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.news-card .card) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.news-card .card-body) {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>