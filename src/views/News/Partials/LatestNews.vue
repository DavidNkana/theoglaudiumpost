<script setup>
import { ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import {
  IN_ARTICLE_BOTTOM,
} from "@/utils";
import NewsCard from "@/components/NewsCard.vue";
import StandardCard from "@/components/StandardCard.vue";
import ShimmerCard from "@/components/ShimmerCard.vue";
import AdBanner from "@/components/AdBanner.vue";
import AdArticle from "@/components/AdArticle.vue";
import PinAdCard from "@/components/PinAdCard.vue";
import ArticlesRow from "./ArticlesRow.vue";
import InfiniteLoading from "v3-infinite-loading";
import "v3-infinite-loading/lib/style.css";
import {useMobile} from "@/composables/useMobile.js";
import { getArticleFeed } from "@/features/articles/ArticlesService";
import { getAds } from "@/features/ads/AdsService";

const props = defineProps({
  page: {
    type: String,
    default: "home",
  },
  pagination: {
    type: Boolean,
    default: false,
  },
  showTitle: {
    type: Boolean,
    default: true,
  },
  viewAll: {
    type: Boolean,
    default: false,
  },
});

const NEWS_ARTICLES_AD_PLACEMENT = "news_articles";
const store = useStore();
const {isMobile} = useMobile()
const currentPage = ref(0);
const isLoading = ref(false);
const scrollTarget = ref(null);
const feedItems = ref([]);  // Mixed feed of articles and ads for home page
const activeAds = ref([]);  // All active ads for mobile rotation
const adRotationIndex = ref(0);  // Current index for ad rotation

const pageSize = computed(() => {
  return props.page === "news" ? 5 : 10;
});

const fullArticles = computed(() => {
  return props.page === "home"
      ? store.getters["articles/topStories"]
      : store.getters["articles/latestArticles"];
});

const articlesData = computed(() => {
  if (props.page === "news") return fullArticles.value;

  return props.page === "details-page"
      ? fullArticles.value.slice(0, 8)
      : fullArticles.value.slice(0, 6);
});

// Fetch active ads for mobile home page rotation
const fetchActiveAds = async () => {
  console.log('fetchActiveAds: Starting to fetch active ads...');
  try {
    const response = await getAds({ status: 'active', size: 50 });
    console.log('fetchActiveAds: API response:', response);
    const adsData = response.data?.ads || response.ads || [];
    const now = new Date();

    console.log(`fetchActiveAds: Fetched ${adsData.length} ads from API`);

    // Filter ads by:
    // 1. placement_id = 1 (Main Page)
    // 2. placement_info contains "Main Page Ad"
    // 3. status = active
    // 4. Within date range (placement_date <= now <= expiry_date)
    activeAds.value = adsData.filter(ad => {
      // Check placement_id is 1
      if (ad.placement_id !== 1) {
        console.log(`Ad ${ad.id} filtered out: placement_id is ${ad.placement_id}, expected 1`);
        return false;
      }

      // Check placement_info contains "Main Page Ad"
      if (!ad.placement_info || !ad.placement_info.includes('Main Page Ad')) {
        console.log(`Ad ${ad.id} filtered out: placement_info is "${ad.placement_info}", expected to contain "Main Page Ad"`);
        return false;
      }

      // Check status is active
      if (ad.status !== 'active') {
        console.log(`Ad ${ad.id} filtered out: status is ${ad.status}, expected active`);
        return false;
      }

      // Check date range
      const placementDate = ad.placement_date ? new Date(ad.placement_date) : null;
      const expiryDate = ad.expiry_date ? new Date(ad.expiry_date) : null;

      // Ad must be within valid date range
      if (placementDate && now < placementDate) {
        console.log(`Ad ${ad.id} filtered out: placement_date ${placementDate} is in the future`);
        return false;
      }
      if (expiryDate && now > expiryDate) {
        console.log(`Ad ${ad.id} filtered out: expiry_date ${expiryDate} is in the past`);
        return false;
      }

      console.log(`Ad ${ad.id} passed all filters`);
      return true;
    });

    console.log(`Loaded ${activeAds.value.length} active main page ads for rotation:`, activeAds.value.map(a => a.id));
  } catch (error) {
    console.error("Error fetching active ads:", error);
    activeAds.value = [];
  }
};

// Get the ad for a given position (rotates through all active ads).
// Only ever called from mobileFeedWithAds after the activeAds-non-empty guard,
// so activeAds.value is guaranteed to be a non-empty array here.
const getAdForPosition = (position) => {
  // Calculate index based on position, cycling through all ads
  const adIndex = position % activeAds.value.length;
  return activeAds.value[adIndex];
};

// Computed property that creates a mixed feed with ads every 4th position for mobile
const mobileFeedWithAds = computed(() => {
  console.log(`mobileFeedWithAds: isMobile=${isMobile.value}, activeAds=${activeAds.value.length}, feedItems=${feedItems.value.length}`);

  // Always insert ads on mobile, return original on desktop
  if (!isMobile.value) {
    console.log('mobileFeedWithAds: returning original feedItems (desktop mode)');
    return feedItems.value;
  }

  if (!activeAds.value.length) {
    console.log('mobileFeedWithAds: returning original feedItems (no active ads loaded)');
    return feedItems.value;
  }

  const result = [];
  let articleCount = 0;
  let adPositionCount = 0;

  for (const item of feedItems.value) {
    // Skip any existing ads from the feed since we'll add our own
    if (item.type === 'ad') continue;

    result.push(item);
    articleCount++;

    // Insert first ad after the 1st article, then continue every 4th article.
    // getAdForPosition always returns a defined ad here (activeAds is non-empty).
    if (articleCount === 1 || articleCount % 4 === 0) {
      const ad = getAdForPosition(adPositionCount);
      result.push({ type: 'ad', data: ad });
      adPositionCount++;
      console.log(`mobileFeedWithAds: inserted ad ${ad.id} at position ${result.length - 1}`);
    }
  }

  console.log(`mobileFeedWithAds: result has ${result.length} items, ${adPositionCount} ads inserted`);
  return result;
});

const fetchPosts = async () => {
  isLoading.value = true;
  try {
    if (props.page === "home") {
      // Fetch featured articles into the Vuex store (home page shows featured articles)
      console.log("Home page: dispatching fetchArticlesByType for featured...");
      await store.dispatch("articles/fetchArticlesByType", {
        type: "featured",
        size: pageSize.value,
        page: currentPage.value,
      });
      // Get articles from store and normalize to { type, data } format for template
      const articles = store.getters["articles/featuredArticles"] || [];
      console.log("Got articles from store:", articles.length, "items", articles.slice(0,2).map(a => a.title));
      feedItems.value = articles.map(article => ({ type: 'article', data: article }));
      console.log("Normalized feedItems:", feedItems.value.length, "items");
    } else {
      // Regular article fetch for news page
      await store.dispatch("articles/fetchArticlesByType", {
        type: "latest",
        size: pageSize.value,
        page: currentPage.value,
      });
    }
  } catch (error) {
    console.error("Error fetching posts:", error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  console.log("LatestNews mounted - page:", props.page, "isMobile:", isMobile.value, "window.innerWidth:", window.innerWidth);
  if (props.page === "home"
      || articlesData.value.length === 0) fetchPosts();
  // Fetch active ads for mobile rotation
  if (props.page === "home") {
    fetchActiveAds();
  }
});

const loadMore = async ($state) => {
  if (isLoading.value) {
    return;
  }

  try {
    await fetchPosts();
    const hasMore = store.getters["articles/hasMore"];

    if (!hasMore) {
      $state.complete();
    } else {
      currentPage.value += 1;
      $state.loaded();
    }
  } catch (error) {
    console.error("Failed to load more posts:", error);
    $state.complete();
  }
};
</script>

<template>
  <!-- Details Page Layout -->
  <template v-if="page === 'details-page'">
    <ArticlesRow :is-loading="isLoading" :articles="articlesData" />
  </template>

  <!-- News Page or Home Layout -->
  <div v-else class="latest-news-container">
    <!-- Section Header -->
    <div v-if="showTitle" class="section-header">
      <div class="header-content">
        <div class="header-icon">
          <i class="bi bi-newspaper"></i>
        </div>
        <h2 class="section-title">Latest News</h2>
      </div>
      <div class="header-line"></div>
      <router-link v-if="viewAll" to="/news" class="view-all-btn">
        View All
        <i class="bi bi-arrow-right"></i>
      </router-link>
    </div>

    <!-- NEWS PAGE: Grid with Infinite Scroll -->
    <div v-if="page === 'news'" ref="scrollTarget" class="news-grid-container">
      <div class="news-grid">
        <template v-for="(article, index) in articlesData" :key="article.id + '-' + index">
          <!-- Regular Article -->
          <div class="grid-item" :class="{ 'grid-item-featured': index % 6 === 0 }">
            <StandardCard
                :article="article"
                :isTopStory="true"
                :isFeatured="index % 6 === 0"
            />
          </div>

          <!-- Square Ad after every 6 articles -->
          <div
              v-if="(index + 1) % 6 === 0 && index > 0"
              class="grid-item grid-item-ad"
          >
            <AdArticle :placement="IN_ARTICLE_BOTTOM" :adProvider="'direct'" />
          </div>

          <!-- Banner Ad after every 12 articles -->
          <div
              v-if="(index + 1) % 12 === 0 && index > 0"
              class="grid-item grid-item-banner"
          >
            <AdBanner size="medium" :placement="IN_ARTICLE_BOTTOM" :adProvider="'google'" />
          </div>
        </template>
      </div>

      <!-- Infinite Loading -->
      <InfiniteLoading @infinite="loadMore">
        <template #complete>
          <div class="loading-complete">
            <i class="bi bi-check-circle"></i>
            <span>You've reached the end</span>
          </div>
        </template>

        <template #error="{ retry }">
          <div class="loading-error">
            <i class="bi bi-exclamation-triangle"></i>
            <span>Error loading articles</span>
            <button @click="retry" class="retry-btn">Retry</button>
          </div>
        </template>
      </InfiniteLoading>
    </div>

    <!-- HOME PAGE: Featured + Grid Layout -->
    <div v-else class="home-grid-container">
      <!-- Loading Skeleton -->
      <div v-if="isLoading" class="home-grid">
        <div v-for="n in 6" :key="n" class="grid-item" :class="{ 'grid-item-large': n === 1 }">
          <ShimmerCard />
        </div>
      </div>

      <!-- Content Grid with Mixed Feed (Articles + Ads) - Uses mobileFeedWithAds for mobile ad rotation -->
      <div v-else class="home-grid">
        <template v-for="(item, index) in mobileFeedWithAds" :key="item.type + '-' + (item.data?.id || index)">
          <!-- Ad Card (rotated ads on mobile every 4th position) -->
          <div v-if="item.type === 'ad'" class="grid-item grid-item-ad-mobile">
            <PinAdCard :ad="item.data" />
          </div>
          <!-- Article Card -->
          <div v-else class="grid-item" :class="{ 'grid-item-large': index === 0 && !isMobile }">
            <NewsCard
                v-if="index === 0 && !isMobile"
                :article="item.data"
                :featured="true"
                min-details
            />
            <StandardCard
                v-else
                :article="item.data"
                :isTopStory="true"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== CONTAINER ===== */
.latest-news-container {
  width: 100%;
}

/* ===== SECTION HEADER ===== */
.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: #ffc107;
  border: 1px solid #e6a700;
  color: #000;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #000;
  margin: 0;
  letter-spacing: -0.5px;
  white-space: nowrap;
}

.header-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(to right, #ffc107, transparent);
}

.view-all-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: #f9ebd0;
  border: 1px solid #e8dfc0;
  color: #000;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.view-all-btn:hover {
  background-color: #ffc107;
  border-color: #e6a700;
  transform: translateX(4px);
  color: #000;
}

.view-all-btn i {
  font-size: 1rem;
  transition: transform 0.2s ease;
}

.view-all-btn:hover i {
  transform: translateX(4px);
}

/* ===== NEWS PAGE GRID ===== */
.news-grid-container {
  width: 100%;
}

.news-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0;
  margin-bottom: 10px;
}

.grid-item {
  width: 100%;
  min-height: 250px;
  transition: transform 0.2s ease;
}

.grid-item:hover:not(.grid-item-ad):not(.grid-item-banner) {
  transform: translateY(-4px);
}

.grid-item-featured {
  grid-column: span 2;
  min-height: 350px;
}

.grid-item-ad {
  grid-column: 1 / -1;
  min-height: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
}

.grid-item-banner {
  grid-column: 1 / -1;
  min-height: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px 0;
  background-color: #f9ebd0;
  border-top: 1px solid #e8dfc0;
  border-bottom: 1px solid #e8dfc0;
}

/* ===== HOME PAGE GRID ===== */
.home-grid-container {
  width: 100%;
}

.home-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0;
}

.grid-item-large {
  grid-column: span 2;
  grid-row: span 2;
  min-height: 500px;
}

/* ===== MOBILE AD CARDS ===== */
.grid-item-ad-mobile {
  width: 100%;
  min-height: 280px;
}

/* ===== LOADING STATES ===== */
.loading-spinner,
.loading-complete,
.loading-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  text-align: center;
}

.spinner-ring {
  border: 4px solid #f0f0f0;
  border-top: 4px solid #ffc107;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 0.95rem;
  color: #666;
  font-weight: 500;
}

.loading-complete {
  color: #28a745;
}

.loading-complete i {
  font-size: 2rem;
}

.loading-error {
  color: #dc3545;
}

.loading-error i {
  font-size: 2rem;
}

.retry-btn {
  padding: 8px 20px;
  background-color: #ffc107;
  border: 1px solid #e6a700;
  color: #000;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 8px;
}

.retry-btn:hover {
  background-color: #e6a700;
  transform: translateY(-2px);
}

/* ===== RESPONSIVE DESIGN ===== */

/* Extra Large Screens (1600px+) - Full width, no sidebar constraint */
@media (min-width: 1600px) {
  .news-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }

  .grid-item-featured {
    grid-column: span 3;
  }

  .home-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Large Screens (1400px - 1599px) */
@media (min-width: 1400px) and (max-width: 1599.98px) {
  .news-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }

  .home-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Desktop with Sidebar (1200px - 1399px) - Optimized for News page */
@media (min-width: 1200px) and (max-width: 1399.98px) {
  .news-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  .home-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

/* Desktop Small (992px - 1199px) - Sidebar visible */
@media (min-width: 992px) and (max-width: 1199.98px) {
  .news-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .home-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

/* Tablet (768px - 991px) - No sidebar */
@media (min-width: 768px) and (max-width: 991.98px) {
  .news-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .home-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .grid-item-large {
    grid-column: span 2;
    grid-row: span 1;
    min-height: 350px;
  }

  .section-title {
    font-size: 1.3rem;
  }

  .header-icon {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }
}

/* Mobile Landscape (576px - 767px) */
@media (min-width: 576px) and (max-width: 767.98px) {
  .news-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .home-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .grid-item-large {
    grid-column: span 2;
    min-height: 320px;
  }

  .section-header {
    margin-bottom: 20px;
  }

  .section-title {
    font-size: 1.2rem;
  }

  .view-all-btn {
    padding: 6px 12px;
    font-size: 0.85rem;
  }
}

/* Mobile Portrait (< 576px) */
@media (max-width: 575.98px) {
  .news-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .grid-item {
    min-height: 200px;
  }

  .grid-item-featured {
    grid-column: span 1;
    min-height: 280px;
  }

  .home-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .grid-item-large {
    grid-column: span 1;
    grid-row: span 1;
    min-height: 300px;
  }

  .section-header {
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 16px;
  }

  .header-content {
    gap: 10px;
  }

  .section-title {
    font-size: 1.15rem;
  }

  .header-icon {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }

  .header-line {
    flex-basis: 100%;
    order: 3;
  }

  .view-all-btn {
    order: 4;
    flex-basis: 100%;
    justify-content: center;
  }

  .grid-item-banner {
    padding: 16px 0;
  }

  .loading-spinner,
  .loading-complete,
  .loading-error {
    padding: 24px;
  }
}

/* Extra Small Mobile (< 400px) */
@media (max-width: 399.98px) {
  .news-grid,
  .home-grid {
    gap: 12px;
  }

  .section-title {
    font-size: 1.05rem;
  }
}

/* ===== ACCESSIBILITY ===== */
@media (prefers-reduced-motion: reduce) {
  .grid-item,
  .view-all-btn,
  .view-all-btn i,
  .retry-btn {
    transition: none;
  }

  .spinner-ring {
    animation: none;
  }
}

/* Focus states */
.view-all-btn:focus-visible,
.retry-btn:focus-visible {
  outline: 2px solid #ffc107;
  outline-offset: 2px;
}

/* ===== COMPONENT INTEGRATION ===== */
:deep(.news-card),
:deep(.standard-card) {
  height: 100%;
}

:deep(.shimmer-card) {
  height: 100%;
  min-height: 200px;
}
</style>
