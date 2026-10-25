<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
// Vuex store no longer needed for articles
// import { useStore } from "vuex";
import MasonryGrid from "@/components/MasonryGrid.vue";
import PinCard from "@/components/PinCard.vue";
import ShimmerCard from "@/components/ShimmerCard.vue";
import InfiniteLoading from "v3-infinite-loading";
import "v3-infinite-loading/lib/style.css";
import { getAdByPlacement, trackImpression, trackClick } from "@/features/ads/AdsService";
import { getArticles } from "@/features/articles/ArticlesService";

// Store no longer needed for articles
// const store = useStore();
const currentPage = ref(0);
const isLoading = ref(false);
const scrollTarget = ref(null);
const selectedCategory = ref('all');
const adData = ref(null);
const isLoadingAd = ref(false);
const articlesData = ref([]);
const hasMore = ref(true);
const totalPages = ref(0);
const masonryGridRef = ref(null);

// List of available categories
const categories = [
  { id: 'all', name: 'All', class: 'btn-dark' },
  { id: 'Community', name: 'Community', class: 'btn-dark' },
  { id: 'Business', name: 'Business', class: 'btn-dark' },
  { id: 'Education', name: 'Education', class: 'btn-dark' },
  { id: 'Development', name: 'Development', class: 'btn-dark' },
  { id: 'Environment', name: 'Environment', class: 'btn-dark' },
  { id: 'Food', name: 'Food', class: 'btn-dark' },
  { id: 'Sports', name: 'Sports', class: 'btn-dark' },
];

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
  fetchPosts().then(() => {
    // Update masonry layout after category change
    nextTick(updateMasonryLayout);
  });
};

// Mock articles for fallback when API is not available
const mockArticles = [
  {
    id: 1,
    title: "Sample Article 1",
    summary: "This is a sample article to display when the API is not available.",
    slug: "sample-article-1",
    category: { name: "Community", slug: "community" },
    tags: [{ name: "Sample" }],
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: "Sample Article 2",
    summary: "Another sample article with different content for testing.",
    slug: "sample-article-2",
    category: { name: "Business", slug: "business" },
    tags: [{ name: "Test" }],
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    title: "Sample Article 3",
    summary: "A third sample article to ensure we have enough content to display.",
    slug: "sample-article-3",
    category: { name: "Education", slug: "education" },
    tags: [{ name: "Example" }],
    created_at: new Date().toISOString(),
  }
];

// Fetch a specific page and cache it
const fetchPosts = () => {
  isLoading.value = true;

  // Prepare category filter if a specific category is selected
  const category = selectedCategory.value !== 'all' ? selectedCategory.value : '';

  // Create a single promise to fetch all articles without filtering by type
  const fetchAllArticles = getArticles({
    type: "", // Don't filter by type, get all articles
    size: 26, // Fetch enough articles to fill the page (equivalent to previous 10+8+8)
    page: currentPage.value,
    status: "published",
    category: category,
    // Ensure latest articles appear first
    sort: "created_at:desc",
  });

  // Return a promise that resolves when the request is complete
  return fetchAllArticles
    .then((response) => {
      if (response.status === 200) {
        const { articles: allArticles, totalPages: responseTotalPages } = response.data;
        console.log("All articles response:", response.data);

        // Log the raw article_type field for each article
        if (allArticles && allArticles.length > 0) {
          console.log("Raw article_type values:");
          allArticles.forEach(article => {
            console.log(`Article ID: ${article.id}, Title: ${article.title}, article_type: ${article.article_type}, type: ${article.type}`);
          });
        }

        // Process articles based on their type
        const processedArticles = (allArticles || []).map(article => {
          // Check both type and article_type fields, prioritize article_type if it exists
          const articleType = article.article_type || article.type || 'regular';
          console.log(`Processing article ID: ${article.id}, determined type: ${articleType}`);
          return {
            ...article,
            type: articleType
          };
        });

        console.log("Processed articles:", processedArticles);

        // Store all articles in the exact order they come from the API
        console.log("Keeping all articles in original order");

        // Add articles to the existing array
        if (currentPage.value === 0) {
          articlesData.value = processedArticles;
        } else {
          articlesData.value = [...articlesData.value, ...processedArticles];
        }

        // Client-side safety: ensure latest articles appear first if backend ignores sort
        const getTimestamp = (a) => {
          const d = a?.published_at || a?.created_at || a?.updated_at || a?.date || null;
          const t = d ? new Date(d).getTime() : NaN;
          return Number.isFinite(t) ? t : NaN;
        };
        articlesData.value = [...articlesData.value].sort((a, b) => {
          const tb = getTimestamp(b);
          const ta = getTimestamp(a);
          if (Number.isNaN(tb) && Number.isNaN(ta)) {
            // Fallback to id desc if timestamps are missing
            return (b?.id || 0) - (a?.id || 0);
          }
          if (Number.isNaN(tb)) return 1;
          if (Number.isNaN(ta)) return -1;
          return tb - ta;
        });

        console.log("Final articlesData:", articlesData.value);

        // Set totalPages from the response
        totalPages.value = responseTotalPages;

        // Determine if there are more pages to load
        hasMore.value = currentPage.value < totalPages.value - 1;

        // Use mock data as fallback if no articles were loaded
        if (currentPage.value === 0 && (!articlesData.value || articlesData.value.length === 0)) {
          console.error("No articles loaded, using mock data");
          articlesData.value = mockArticles;
        }
      }

      isLoading.value = false;
      return { status: 200, data: { articles: articlesData.value } }; // Return a response for promise chaining
    })
    .catch(error => {
      console.error("Error fetching posts:", error);

      // Use mock data as fallback when API request fails
      if (currentPage.value === 0 && (!articlesData.value || articlesData.value.length === 0)) {
        articlesData.value = mockArticles;
      }

      isLoading.value = false;
      return { status: 'error', error }; // Return error info for promise chaining
    });
};

// Fetch ad for the Pinterest feed
const fetchAd = async () => {
  isLoadingAd.value = true;
  try {
    const response = await getAdByPlacement('pinterest_feed');
    if (response.data && response.status === 200) {
      adData.value = response.data;
      // Track impression when ad is loaded
      if (adData.value.id) {
        trackImpression(adData.value.id);
      }
    }
  } catch (error) {
    console.error('Error fetching ad:', error);
  } finally {
    isLoadingAd.value = false;
  }
};

// Function to update masonry layout
const updateMasonryLayout = () => {
  if (masonryGridRef.value) {
    nextTick(() => {
      masonryGridRef.value.positionItems();
    });
  }
};

// Watch for changes in articles data
watch(() => articlesData.value, () => {
  nextTick(updateMasonryLayout);
}, { deep: true });

// Initial load
onMounted(() => {
  // fetchPosts always resolves (it handles its own errors internally), so a
  // trailing .catch() here would be unreachable.
  fetchPosts().then(() => {
    // Update masonry layout after initial posts are loaded
    nextTick(updateMasonryLayout);
  });

  fetchAd();

  // Add event listener for image load events
  window.addEventListener('load', updateMasonryLayout);
});

// Clean up event listeners
onUnmounted(() => {
  window.removeEventListener('load', updateMasonryLayout);
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
      // Update masonry layout after new articles are loaded
      nextTick(() => {
        updateMasonryLayout();
      });

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
  <div class="pinterest-view">
    <!-- Ad Placement -->
    <div v-if="adData && !isLoadingAd" class="ad-container mb-4">
      <div class="card ad-card">
        <div class="card-body">
          <div class="d-flex flex-column flex-md-row align-items-center">
            <div class="ad-content flex-grow-1">
              <h5 class="card-title">{{ adData.title }}</h5>
              <p class="card-text">{{ adData.description }}</p>
              <a 
                :href="adData.url" 
                target="_blank" 
                class="btn btn-dark"
                @click="trackClick(adData.id)"
              >
                Learn More
              </a>
            </div>
            <div class="ad-image mt-3 mt-md-0 ms-md-3" v-if="adData.image_url">
              <img 
                :src="adData.image_url" 
                :alt="adData.title" 
                class="img-fluid rounded" 
                style="max-width: 100%;"
              >
            </div>
          </div>
          <div class="ad-label mt-2">
            <small class="text-muted">Advertisement</small>
          </div>
        </div>
      </div>
    </div>

    <div ref="scrollTarget" class="pinterest-container">
      <MasonryGrid
          :items="articles"
          :loading="isLoading"
          ref="masonryGridRef"
          :column-width="220" :gap="0">
        <template #item="{item:article}">
            <PinCard 
              :article="article" 
              :isTopStory="article.type === 'top'"
              :isFeatured="article.type === 'featured'"
              :isPopular="article.type === 'popular'"
              @loaded="updateMasonryLayout" 
            />
        </template>
        <template #empty>
          <div class="no-articles-message p-5 text-center w-100 text-dark">
            <h3>No articles found</h3>
            <p>There are no articles available for the selected category.</p>
          </div>
        </template>
      </MasonryGrid>

      <InfiniteLoading @infinite="loadMore" :target="scrollTarget">
        <template #spinner>
          <div class="infinite-loading-spinner"></div>
        </template>

        <template #complete>
          <div class="infinite-loading-complete d-flex justify-content-center">
            End of content
          </div>
        </template>

        <template #error="{ retry }">
          <div class="infinite-loading-error">
            Error loading. <button @click="retry">Retry</button>
          </div>
        </template>
      </InfiniteLoading>
    </div>
  </div>
</template>

<style scoped>
.pinterest-view {
  padding: 0;
  margin: 0;
  background-color: #e9d8b8; /* Updated to requested background color */
  color: #333; /* Changed to dark text for light theme */
}

/* Add padding only on larger screens */
@media (min-width: 768px) {
  .pinterest-view {
    padding: 20px;
  }
}

/* Ensure no gaps on mobile */
@media (max-width: 767px) {
  .pinterest-view {
    padding: 0;
    margin: 0;
  }

  .pinterest-container {
    padding: 0;
    margin: 0;
  }
}

/* Force zero gaps in masonry grid */
:deep(.masonry-grid) {
  column-gap: 0 !important;
  gap: 0 !important;
}

:deep(.masonry-grid-item) {
  margin-bottom: 0 !important;
  padding: 0 !important;
  break-inside: avoid;
}

/* Override any inline styles from the masonry library */
:deep([style*="column-gap"]) {
  column-gap: 0 !important;
}

:deep([style*="gap"]) {
  gap: 0 !important;
}

:deep(.masonry-wrapper) {
  padding: 0 !important;
  margin: 0 !important;
}

:deep(.masonry-content) {
  column-gap: 0 !important;
  gap: 0 !important;
}

:deep(.masonry-content > *) {
  margin-bottom: 0 !important;
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

.pinterest-container {
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
