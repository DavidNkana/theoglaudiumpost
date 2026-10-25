<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { formatDateToLongString, setDefaultImage } from "@/utils";
import NewsCard from "@/components/NewsCard.vue";
import ShimmerCard from "@/components/ShimmerCard.vue";
import { getCategoryArticles } from "@/features/categories/CategoriesService";
import InfiniteLoading from "v3-infinite-loading";
import "v3-infinite-loading/lib/style.css";
const route = useRoute();
const articles = ref([]);
const pageTitle = ref("");

const currentPage = ref(0); // start from page 1
const isLoading = ref(false);
const scrollTarget = ref(null);
const hasMore = ref(true);

const fetchData = async (isInitial = false) => {
  const slug = route.params.slug;
  // console.log("slug: ", slug);
  if (isInitial) {
    pageTitle.value = `Category: ${slug}`;
  }
  try {
    isLoading.value = true;
    const res = await getCategoryArticles(slug, {
      size: 5,
      page: currentPage.value,
    });
    // console.log("Res: ", res);

    // If no more articles
    if (!res.data?.articles?.length) {
      hasMore.value = false;
      return [];
    }

    if (isInitial) {
      articles.value = res.data.articles;
    } else {
      articles.value.push(...res.data.articles);
    }

    pageTitle.value = res.data?.category?.name ?? `Category: ${slug}`;
    return res.data.articles;
  } catch (err) {
    console.error(err);
    hasMore.value = false;
    return [];
  } finally {
    isLoading.value = false;
  }
};

const loadMore = async ($state) => {
  if (!hasMore.value) {
    $state.complete();
    return;
  }

  const newArticles = await fetchData();
  if (!newArticles.length) {
    $state.complete();
  } else {
    currentPage.value++;
    $state.loaded();
  }
};

onMounted(() => {
  fetchData(true); // Initial load
});
</script>

<template>
  <div class="mt-4">
    <div v-if="isLoading && articles.length == 0" class="h4">
      <div class="row">
        <div class="col-md-3 mb-4" v-for="n in 4" :key="n">
          <ShimmerCard />
        </div>
      </div>
    </div>
    <template v-else>
      <div class="">
        <h1 class="mb-3">Category: {{ pageTitle }}</h1>
      </div>

      <div v-if="articles.length > 0" ref="scrollTarget" class="news-articles">
        <!-- v-if="!isLoading" -->
        <div class="row">
          <div
            v-for="article in articles"
            :key="article.id"
            class="col-md-4 mb-4"
          >
            <NewsCard :article="article" />
          </div>
        </div>

        <InfiniteLoading @infinite="loadMore" :target="scrollTarget">
          <template #spinner>
            <div class="infinite-loading-spinner"></div>
          </template>

          <template #complete>
            <div
              class="infinite-loading-complete d-flex justify-content-center"
            >
              End!
            </div>
          </template>

          <template #error="{ retry }">
            <div class="infinite-loading-error">
              Error loading. <button @click="retry">Retry</button>
            </div>
          </template>
        </InfiniteLoading>
      </div>
      <div v-else>
        <p>No articles found in this category.</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.news-articles {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem;
  /* max-width: 700px; */
  margin: 0 auto;

  /*max-height: 80vh;  Adjust as needed */
  overflow-y: auto;
  position: relative;

  scroll-behavior: smooth;
}

/* Article Cards */
.hover-card {
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  border-radius: 0.5rem;
  overflow: hidden;
}

.hover-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1) !important;
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

/* Pagination */
.pagination {
  margin-top: 2rem;
}

.page-link {
  color: #28a745;
}

.page-item:focus,
.page-link:focus {
  border-color: #28a745;
  box-shadow: none !important;
}

.page-item.active .page-link {
  background-color: #28a745;
  border-color: #28a745;
  color: #fff;
}

/* Responsive Adjustments */
@media (max-width: 767.98px) {
  .article-img {
    width: 100%;
    height: 200px;
    /* object-fit: contain; */
  }
}

.sidebar-thumb {
  width: 100px;
  height: 70px;
  object-fit: cover;
}

.sidebar-news-title {
  font-size: 0.95rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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

.infinite-loading-container {
  text-align: center;
  margin-top: 1.5rem;
}

.infinite-loading-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #6c63ff; /* purple spinner */
  border-radius: 50%;
  width: 36px;
  height: 36px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.infinite-loading-error,
.infinite-loading-complete {
  color: #888;
  font-size: 0.95rem;
  margin-top: 1rem;
}
</style>
