<script setup>
import { formatTimeAgo } from "@/utils";
import ImageWithPlaceholder from "@/components/ImageWithPlaceholder.vue";
import { useStore } from "vuex";

const props = defineProps({
  isLoading: {
    type: Boolean,
    default: true,
  },
  articles: {
    type: Array,
    default: [],
  },
});

const store = useStore();
const cacheImage = ({ mediaId, url }) => {
  store.commit("articles/updateArticle", {
    ...props.article,
    cover: url,
    url
  });
};
</script>

<template>
  <div class="article-list">
    <div
        v-if="!isLoading"
        v-for="(article, index) in articles"
        :key="index"
        class="article-card"
    >
      <div class="row g-0 h-100">
        <!-- Image Column -->
        <div class="col-5">
          <div class="image-wrapper">
            <ImageWithPlaceholder
                :media-id="article.cover_id"
                @loaded="cacheImage"
                class="article-image"
            />
          </div>
        </div>

        <!-- Content Column -->
        <div class="col-7">
          <div class="article-content">
            <router-link :to="`/news/${article.slug}`" class="article-link">
              <h2 class="article-title">
                {{ article.title }}
              </h2>
            </router-link>

            <div class="article-meta">
              <small class="text-light me-3">
                {{ formatTimeAgo(article.scheduledFor || article.created_at) }}
              </small>
<!--              <router-link
                  v-if="article.category"
                  :to="`/categories/${article?.category?.slug}`"
                  class="category-link"
              >
                <small class="text-success">{{ article.category?.name }}</small>
              </router-link>-->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <template v-else>
      <div
          v-for="index in 5"
          :key="'skeleton-' + index"
          class="article-card"
      >
        <div class="row g-0 h-100">
          <div class="col-5">
            <div class="image-wrapper shimmer"></div>
          </div>
          <div class="col-7">
            <div class="article-content">
              <div class="shimmer mb-2" style="height: 20px; width: 90%"></div>
              <div class="shimmer mb-2" style="height: 20px; width: 70%"></div>
              <div class="shimmer" style="height: 12px; width: 40%"></div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.article-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.article-card {
  background-color: var(--primary-dark);
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  min-height: 140px;
}

.article-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.image-wrapper {
  height: 100%;
  min-height: 140px;
  overflow: hidden;
}

.article-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.article-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}

.article-link {
  text-decoration: none;
  color: inherit;
}

.article-link:hover .article-title {
  text-decoration: underline;
  color: var(--secondary);
}

.article-title {
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 0.5rem;
  color: whitesmoke;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  margin-top: auto;
  font-size: 0.75rem;
}

.category-link {
  text-decoration: none;
}

.category-link:hover {
  text-decoration: underline;
}

/* Shimmer effect for loading state */
.shimmer {
  background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.05) 25%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0.05) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .article-title {
    font-size: 1rem;
    -webkit-line-clamp: 2;
  }

  .article-content {
    padding: 0.75rem;
  }

  .image-wrapper {
    min-height: 120px;
  }
}
</style>