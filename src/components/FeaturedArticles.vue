<script setup>
import { ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import { formatDateToLongString, setDefaultImage } from "@/utils";
import NewsCard from "@/components/NewsCard.vue";

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
      size: 10,
    });
    isLoading.value = false;
  } catch (error) {
    console.error("Error fetching posts:", error);
    isLoading.value = false;
  }
};
</script>
<template>
  <div class="custom-grid">
    <div
      v-for="(article, index) in store.getters['articles/featuredArticles']"
      :key="article.id"
      :class="index === 0 ? 'featured-card' : 'standard-card'"
    >
      <!-- :min-details="index !== 0" -->
      <NewsCard
        v-if="index === 0"
        :article="article"
        :featured="index === 0"
        min-details
      />
      <div v-else class="card border-0 shadow-sm hover-card row-article">
        <div class="row g-0">
          <div class="col-4 col-sm-12 d-lg-none d-xl-block col-xl-4">
            <router-link :to="`/news/${article.slug}`">
              <img
                :src="article.cover?.file"
                class="img-fluid rounded rounded-lg-start article-img"
                alt="News Image"
                @error="setDefaultImage"
              />
            </router-link>
          </div>
          <div class="col-8 col-sm-12 col-xl-8">
            <div class="card-body">
              <h3 class="card-title h5">
                <router-link
                  :to="`/news/${article.slug}`"
                  class="nav-link title article-excerpt"
                  >{{ article.title }}</router-link
                >
              </h3>
              <p class="card-text article-excerpt">
                {{ article.summary }}
              </p>
              <div class="d-flex mb-2">
                <!-- <span class="badge bg-success me-2">{{
                  article.category?.name
                }}</span> -->
                <small class="text-muted">{{
                  formatDateToLongString(
                    article.scheduledFor || article.created_at
                  )
                }}</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.custom-grid {
  color: #000;
  display: grid;
  grid-template-columns: minmax(0, 2.2fr) minmax(0, 1fr);
  grid-auto-rows: auto;
  gap: 1rem;
}

.featured-card {
  /* grid-column: span 1; */
  grid-row: span 2;
}

.standard-card {
  height: 100%;
}

.card {
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
}

@media (max-width: 992px) {
  .custom-grid {
    grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
    grid-auto-rows: auto;
  }

  .featured-card {
    grid-column: span 2 !important;
    grid-row: span 1 !important;
  }
}
/* sm */
@media (max-width: 576px) {
  .custom-grid {
    grid-template-columns: 1fr;
    grid-auto-rows: auto;
  }

  .featured-card {
    grid-column: span 1 !important;
    grid-row: span 1 !important;
  }
}

.shimmer {
  position: relative;
  overflow: hidden;
  background: #e0e0e0;
}

.shimmer::after {
  content: "";
  position: absolute;
  top: 0;
  left: -150px;
  width: 100px;
  height: 100%;
  background: linear-gradient(
    to right,
    transparent 0%,
    #f8f9fa 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    left: -150px;
  }
  100% {
    left: 100%;
  }
}

.featured-article .card {
  border-radius: 0.5rem;
  overflow: hidden;
}

.featured-img {
  height: 500px;
  object-fit: cover;
  filter: brightness(0.7);
}

.featured-overlay {
  background: linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    rgba(0, 0, 0, 0) 100%
  );
}

.featured-title {
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1.3;
}

.link {
  text-decoration: none !important;
  color: inherit !important;
}
.link:hover {
  text-decoration: underline !important;
  /* color: rgba(var(--bs-link-color-rgb), var(--bs-link-opacity, 1)) !important; */
}

.featured-excerpt {
  max-width: 800px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Responsive Adjustments */
@media (max-width: 767.98px) {
  .featured-img {
    height: 300px;
  }

  .featured-title {
    font-size: 1.5rem;
  }

  /* .row-article {
    max-height: 200px;
  } */
}

.article-img {
  height: 100%;
  object-fit: cover;
}

.article-excerpt {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
