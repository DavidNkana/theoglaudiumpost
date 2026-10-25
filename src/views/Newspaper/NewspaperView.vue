<script setup>
import {ref, computed, onMounted, onUnmounted, nextTick, watch, useTemplateRef} from "vue";
// Vuex store no longer needed for articles
// import { useStore } from "vuex";
import MasonryGrid from "@/components/MasonryGrid.vue";
import PinCard from "@/components/PinCard.vue";
import ShimmerCard from "@/components/ShimmerCard.vue";
import InfiniteLoading from "v3-infinite-loading";
import "v3-infinite-loading/lib/style.css";
import {getAdByPlacement, trackImpression, trackClick, getAllAdByPlacement, getAds} from "@/features/ads/AdsService";
import {getArticles} from "@/features/articles/ArticlesService";
import PinAdCard from "@/components/PinAdCard.vue";
import dayjs from "dayjs";

const props = defineProps({
  mode: {
    type: String,
    default: "latest",
    validator: (value) => ["latest", "archive"].includes(value),
  },
  windowDays: {
    type: Number,
    default: 14,
  },
});

// Store no longer needed for articles
// const store = useStore();
const currentPage = ref(0);
const isLoading = ref(false);
const scrollTarget = useTemplateRef('scrollTarget');
const selectedCategory = ref('all');
const advertisements = ref([]);
const isLoadingAd = ref(false);
const articlesData = ref([]);
const hasMore = ref(true);
const totalPages = ref(0);

const isArchive = computed(() => props.mode === "archive");
const now = dayjs();
const cutoffStart = computed(() => now.subtract(props.windowDays, "day").startOf("day"));
const recentStartDate = computed(() => cutoffStart.value.format("YYYY-MM-DDTHH:mm:ss"));
const archiveEndDate = computed(() =>
  cutoffStart.value.subtract(1, "second").format("YYYY-MM-DDTHH:mm:ss")
);

// Filter articles by selected category
const articles = computed(() => {
  // Check if articlesData is an array
  if (!Array.isArray(articlesData.value)) {
    console.error("articlesData is not an array:", articlesData.value);
    return [];
  }

  // Use articlesData directly without combining with topStoriesData
  let filteredArticles = articlesData.value;

  // Filter by category if needed
  if (selectedCategory.value !== 'all') {
    filteredArticles = filteredArticles.filter(article =>
        article && article.category && article.category.name === selectedCategory.value
    );
  }

  return filteredArticles;
});

// Method to handle category selection
const selectCategory = (categoryId) => {
  selectedCategory.value = categoryId;
  // Reset to first page when changing category
  currentPage.value = 0;
  // Clear existing articles
  articlesData.value = [];
  // Fetch articles with the new category
  fetchPosts();
};

// Fetch a specific page and cache it
const fetchPosts = () => {
  isLoading.value = true;

  // Prepare category filter if a specific category is selected
  const category = selectedCategory.value !== 'all' ? selectedCategory.value : '';
  const dateFilter = isArchive.value
    ? { startDate: null, endDate: archiveEndDate.value }
    : { startDate: recentStartDate.value, endDate: null };

  // Create a single promise to fetch all articles without filtering by type
  const fetchAllArticles = getArticles({
    type: "", // Don't filter by type, get all articles
    size: 26, // Fetch enough articles to fill the page (equivalent to previous 10+8+8)
    page: currentPage.value,
    status: "published",
    category: category,
    ...dateFilter,
  });

  // Return a promise that resolves when the request is complete
  return fetchAllArticles
      .then((response) => {
        if (response.status === 200) {
          const {articles: allArticles, totalPages: totalArticlePages} = response.data;
          // Process articles based on their type
          const processedArticles = (allArticles || []).map(article => {
            // Check both type and article_type fields, prioritize article_type if it exists
            const articleType = article.article_type || article.type || 'regular';
            return {
              ...article,
              type: articleType
            };
          });

          // Store all articles in the exact order they come from the API
          // Add articles to the existing array
          if (currentPage.value === 0) {
            articlesData.value = processedArticles;
          } else {
            articlesData.value = [...articlesData.value, ...processedArticles];
          }

          // Set totalPages from the response
          totalPages.value = totalArticlePages;
          // Determine if there are more pages to load
          hasMore.value = currentPage.value < totalPages.value - 1;

          // Use mock data as fallback if no articles were loaded
          if (currentPage.value === 0 && (!articlesData.value || articlesData.value.length === 0)) {
            console.error("No articles loaded, using mock data");
            articlesData.value = [];
          }
        }

        isLoading.value = false;
        return {status: 200, data: {articles: articlesData.value}}; // Return a response for promise chaining
      })
      .catch(error => {
        console.error("Error fetching posts:", error);

        // Use mock data as fallback when API request fails
        if (currentPage.value === 0 && (!articlesData.value || articlesData.value.length === 0)) {
          articlesData.value = [];
        }

        isLoading.value = false;
        return {status: 'error', error}; // Return error info for promise chaining
      });
};

// Fetch ad for the Newspaper feed
const fetchAd = async () => {
  isLoadingAd.value = true;
  try {
    // Use getAds with status filter - returns all ads that we can filter client-side
    const response = await getAds({ status: 'active', size: 50 });
    console.log('NewspaperView fetchAd: API response:', response);

    const adsData = response?.data?.ads || response?.ads || [];
    console.log('NewspaperView fetchAd: Fetched', adsData.length, 'ads from API');

    // Filter for Main Page Ads that are active and within date range
    const now = new Date();
    const filteredAds = adsData.filter(ad => {
      // Check placement_id === 1 (Main Page Ad)
      const isMainPagePlacement = ad.placement_id === 1;

      // Check placement_info contains "Main Page Ad"
      const hasMainPageInfo = ad.placement_info?.toLowerCase().includes('main page ad');

      // Check status is active
      const isActive = ad.status?.toLowerCase() === 'active';

      // Check date range
      const placementDate = ad.placement_date ? new Date(ad.placement_date) : null;
      const expiryDate = ad.expiry_date ? new Date(ad.expiry_date) : null;
      const isWithinDateRange = (!placementDate || placementDate <= now) &&
                                (!expiryDate || expiryDate >= now);

      const passes = (isMainPagePlacement || hasMainPageInfo) && isActive && isWithinDateRange;

      if (passes) {
        console.log('NewspaperView fetchAd: Ad', ad.id, 'passes filters');
      }

      return passes;
    });

    console.log('NewspaperView fetchAd:', filteredAds.length, 'ads pass filters');
    advertisements.value = filteredAds;
  } catch (error) {
    console.error('Error fetching ad:', error);
  } finally {
    isLoadingAd.value = false;
  }
};
const content = computed(() => {
  // `articles` is a computed that always returns an array (it has its own
  // non-array guard) and `advertisements` is a ref that is only ever assigned
  // arrays, so no defensive `|| []` fallback is needed here.
  const articlesList = articles.value;
  const adsList = advertisements.value;

  // Show an ad every 4 articles, cycling through all ads (loop back to first when exhausted)
  const ARTICLES_PER_AD = 4;

  // No ads available - just return articles
  if (adsList.length === 0) {
    return articlesList.map(article => ({ isArticle: true, article }));
  }

  // No articles - just return ads
  if (articlesList.length === 0) {
    return adsList.map(ad => ({ isArticle: false, ad }));
  }

  const mixedContent = [];
  let adIndex = 0;

  // Insert an ad after every ARTICLES_PER_AD articles
  for (let i = 0; i < articlesList.length; i++) {
    // Add the article
    mixedContent.push({
      isArticle: true,
      article: articlesList[i]
    });

    // Insert the first ad after the 1st article, then every 4th article after that (1, 5, 9, ...)
    if (i % ARTICLES_PER_AD === 0) {
      // Cycle through ads using modulo - loops back to first ad when exhausted
      mixedContent.push({
        isArticle: false,
        ad: adsList[adIndex % adsList.length]
      });
      adIndex++;
    }
  }

  return mixedContent;
});

// Initial load
onMounted(() => {
  // fetchPosts() never rejects (its own .catch returns a resolved value),
  // so no outer rejection handler is needed here.
  fetchPosts();

  fetchAd();
});

// Infinite scroll handler
const loadMore = ($state) => {
  if (isLoading.value) {
    return;
  }

  // Increment page before fetching to get next page
  currentPage.value += 1;

  // Use .then() instead of await to ensure proper Promise handling
  fetchPosts()
      .then(response => {
        // Check if we got a valid response or an error
        if (response && response.status === 'error') {
          $state.complete(); // Stop on error
          return;
        }

        if (!hasMore.value) {
          $state.complete(); // no more data
        } else {
          $state.loaded(); // data loaded
        }
      })
      .catch(error => {
        console.error("Failed to load more posts:", error);
        $state.complete(); // Stop on error
      });
};
</script>

<template>
  <div class="newspaper-view">
    <div ref="scrollTarget" class="newspaper-container">
      <MasonryGrid
           :items="content"
           :loading="isLoading"
           :empty="!isLoading && articles.length === 0"
          :column-width="300"
          :gap="8"
      >
        <template #item="{ item}">
          <PinCard
              v-if="item.isArticle"
              :key="item.article.id"
              :article="item.article"
              :isTopStory="item.article.type === 'top'"
              :isFeatured="item.article.type === 'featured'"
              :isPopular="item.article.type === 'popular'"
          />
          <PinAdCard v-else
                     :ad="item.ad"
          />
        </template>
        <template #empty>
          <div class="no-articles-message p-5 text-center w-100 text-dark">
            <h3>No articles found</h3>
            <p>There are no articles available for the selected category.</p>
          </div>
        </template>
      </MasonryGrid>


      <InfiniteLoading @infinite="loadMore" :distance="200">
        <template #complete>
          <div class="infinite-loading-complete d-flex flex-column align-items-center">
            <div>End of content</div>
          </div>
        </template>

        <template #error="{ retry }">
          <div class="infinite-loading-error">
            Error loading.
            <button @click="retry">Retry</button>
          </div>
        </template>
      </InfiniteLoading>
    </div>
  </div>
</template>

<style scoped>
.newspaper-view {
  padding: 0;
  background-color: #f9ebd0; /* Updated to requested background color */
  color: #333; /* Changed to dark text for light theme */
}

.feed-toolbar {
  background-color: #f9ebd0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.feed-title {
  font-size: 1.1rem;
  font-weight: 700;
}

.feed-subtitle {
  font-size: 0.9rem;
  color: rgba(0, 0, 0, 0.65);
}

/* Add padding only on larger screens */
@media (min-width: 768px) {
  .newspaper-view {
    padding: 20px;
  }
}

.section-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: #333; /* Changed back to dark text for light theme */
}

.section-line {
  height: 2px;
  background-color: #e0e0e0; /* Changed to light gray for light theme */
}

.newspaper-container {
  position: relative;
  min-height: 80vh;
}

.masonry-item {
  width: 100%;
  break-inside: avoid;
}

.infinite-loading-spinner {
  border: 4px solid #f3f3f3; /* Changed back to light gray for light theme */
  border-top: 4px solid #000000; /* Changed back to black for light theme */
  border-radius: 50%;
  width: 36px;
  height: 36px;
  animation: spin 1s linear infinite;
  margin: 20px auto;
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
  color: #888; /* Changed back to medium gray for light theme */
  font-size: 0.95rem;
  margin: 20px 0;
  text-align: center;
}

/* Category filter styles */
.category-filters {
  padding: 10px 0;
}

.category-filters .btn {
  margin-right: 8px;
  margin-bottom: 8px;
  border-radius: 20px;
  padding: 6px 15px;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.category-filters .btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Changed back to dark shadow for light theme */
}

.category-filters .btn.active {
  font-weight: bold;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Changed back to dark shadow for light theme */
}

.gap-2 {
  gap: 0.5rem;
}

/* Ad styles */
.ad-container {
  width: 100%;
}

.ad-card {
  border: 1px solid #e0e0e0; /* Changed back to light gray for light theme */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05); /* Changed back to dark shadow for light theme */
  transition: all 0.3s ease;
  background-color: #ffffff; /* Changed to white background for light theme */
  color: #333; /* Changed to dark text for light theme */
}

.ad-card:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1); /* Changed back to dark shadow for light theme */
  transform: translateY(-2px);
}

.ad-label {
  text-align: right;
  font-size: 0.8rem;
}
</style>
