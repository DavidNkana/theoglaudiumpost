<script setup>
import AdBanner from "@/components/AdBanner.vue";
import {
  formatDate,
  IN_ARTICLE_TOP,
  IN_ARTICLE_BOTTOM,
  IN_ARTICLE_MID,
  SIDEBAR_TOP,
  SIDEBAR_MID,
  SIDEBAR_BOTTOM,
} from "@/utils";
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
import RelatedArticles from "./Partials/RelatedArticles.vue";
import TopStories from "../News/Partials/HomeTopStories.vue";
import AdminTags from "../Admin/Articles/Partials/Tags.vue";
import LatestNews from "../News/Partials/LatestNews.vue";

const article = ref(null);
const loading = ref(false);
const route = useRoute();
const store = useStore();

const relatedArticles = computed(() =>
    store.getters["articles/relatedArticles"]({
      id: article.value?.id,
      categoryId: article.value?.category_id,
    })
);

const fetchArticle = async (slug) => {
  try {
    if (!slug) {
      console.warn("fetchArticle called without a slug");
      return;
    }
    // Reset current article to avoid showing stale data during navigation
    article.value = null;
    loading.value = true;
    article.value = await store.dispatch("articles/fetchSingleArticle", slug);
  } catch (err) {
    console.error("Error fetching article data:", err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  const slug = route.params.slug;
  fetchArticle(slug);
});

watch(
    () => route.params.slug,
    (newSlug) => {
      fetchArticle(newSlug);
    }
);

// Split the HTML into paragraphs and insert summary after 2nd paragraph
const paragraphBlocks = computed(() => {
  // Safely handle cases where article or content is not yet available
  const content = article.value?.content ?? "";
  const summary = article.value?.summary ?? "";
  const paragraphs = content.match(/<p>.*?<\/p>/g) || [];
  if (paragraphs.length === 0) {
    // When there are no paragraph tags, render the raw content safely
    return [
      {
        type: "div",
        props: {
          innerHTML: content,
        },
      },
    ];
  }
  const blocks = [];
  const insertAdEvery = 3;
  const insertSummaryAfter = 2; // Insert summary after 2nd paragraph
  let adCount = 0;
  let paragraphCount = 0;

  paragraphs.forEach((para) => {
    blocks.push({
      type: "div",
      props: {
        innerHTML: para,
      },
    });

    paragraphCount++;
    adCount++;

    // Insert summary highlight after 2nd paragraph
    if (paragraphCount === insertSummaryAfter && summary) {
      blocks.push({
        type: "summary-highlight",
        props: {
          summary: summary,
        },
      });
    }

    if (adCount === insertAdEvery) {
      blocks.push({
        type: AdBanner,
        props: {
          placement: IN_ARTICLE_MID,
          tags: article.value?.tags?.map((tag) => tag.id),
        },
      });
      adCount = 0;
    }
  });

  return blocks;
});

const renderedContent = computed(() => paragraphBlocks.value);
</script>

<template>
  <div class="article-page" :key="route.params.slug">
    <!-- Content Container -->
    <div v-if="!loading && article" class="page-container">
      <!-- Main Content Layout -->
      <div class="content-layout">
        <!-- Main Article Column -->
        <article class="main-content">
          <!-- Featured Image -->
          <figure v-if="article.cover" class="featured-image">
            <img
                :src="article.cover?.file"
                :alt="article.title"
                class="featured-img"
            />
          </figure>

          <!-- Audio Player - @ModifiedByJunie 2025-12-10 - Added for article narration -->
          <div v-if="article.audio?.file" class="audio-player-section">
            <div class="audio-player-header">
              <i class="bi bi-headphones"></i>
              <span>Listen to this article</span>
            </div>
            <audio
                controls
                :src="article.audio.file"
                class="audio-player"
                preload="metadata"
            >
              Your browser does not support the audio element.
            </audio>
          </div>

          <!-- Top Ad Banner -->
          <div class="top-ad-container">
            <AdBanner
                size="medium"
                :placement="IN_ARTICLE_TOP"
                :tags="article?.tags?.map((tag) => tag.id)"
            />
          </div>

          <!-- Article Content -->
          <div class="article-body">
            <template v-for="(block, index) in renderedContent" :key="index">
              <!-- Summary Highlight Block -->
              <aside v-if="block.type === 'summary-highlight'" class="article-summary-highlight">
                <div class="summary-icon">
                  <i class="bi bi-quote"></i>
                </div>
                <p class="summary-text">{{ block.props.summary }}</p>
              </aside>
              <!-- Regular content blocks -->
              <component v-else :is="block.type" v-bind="block.props" />
            </template>
          </div>

          <!-- Sources Section -->
          <div v-if="article?.sources && article.sources.length > 0" class="article-sources">
            <h3 class="sources-title">
              <i class="bi bi-link-45deg"></i>
              Sources
            </h3>
            <ul class="sources-list">
              <li v-for="(source, index) in article.sources" :key="index" class="source-item">
                <a :href="source" target="_blank" rel="noopener noreferrer" class="source-link">
                  {{ source }}
                </a>
              </li>
            </ul>
          </div>

          <!-- Article Footer Tags -->
          <footer class="article-footer">
            <div class="footer-tags">
              <span class="tags-label">
                <i class="bi bi-tags-fill"></i>
                Tags:
              </span>
              <div class="tags-list">
                <router-link
                    v-for="tag in article.tags"
                    :key="tag.id"
                    :to="`/tag/${tag.slug}`"
                    class="tag-link"
                >
                  {{ tag.name }}
                </router-link>
              </div>
            </div>

            <!-- Article Date -->
            <div class="footer-date">
              <i class="bi bi-calendar3"></i>
              <span>Published {{ formatDate(article?.scheduled_for ?? article?.created_at) }}</span>
            </div>
          </footer>

          <!-- Bottom Article Ad -->
          <div class="article-ad-bottom">
            <AdBanner
                size="medium"
                :placement="IN_ARTICLE_BOTTOM"
                :tags="article?.tags?.map((tag) => tag.id)"
            />
          </div>
        </article>

        <!-- Sidebar -->
        <aside class="sidebar-content">
          <!-- Sidebar Ad Top -->
          <div class="sidebar-block">
            <AdBanner
                size="medium"
                :placement="SIDEBAR_TOP"
                :tags="article?.tags?.map((tag) => tag.id)"
            />
          </div>

          <!-- Latest News Section -->
          <div class="sidebar-block">
            <div class="sidebar-header">
              <div class="header-icon">
                <i class="bi bi-newspaper"></i>
              </div>
              <h3 class="sidebar-title">Latest News</h3>
            </div>
            <div class="sidebar-list">
              <LatestNews page="details-page" />
            </div>
          </div>

          <!-- Sidebar Ad Mid -->
          <div class="sidebar-block">
            <AdBanner size="medium" :placement="SIDEBAR_MID" />
          </div>

          <!-- Top Stories Section -->
          <div class="sidebar-block">
            <TopStories />
          </div>

          <!-- Sidebar Ad Bottom -->
          <div class="sidebar-block">
            <AdBanner size="medium" :placement="SIDEBAR_BOTTOM" />
          </div>
        </aside>
      </div>

      <!-- Related Articles -->
      <section class="related-section" v-if="relatedArticles?.length > 0">
        <RelatedArticles :articles="relatedArticles" />
      </section>
    </div>

    <!-- Loading State -->
    <div v-else class="page-container">
      <!-- Loading Skeleton -->
      <div class="loading-skeleton">
        <!-- Featured Image Skeleton -->
        <div class="skeleton-image"></div>

        <!-- Title Skeleton -->
        <div class="skeleton-title"></div>
        <div class="skeleton-title short"></div>

        <!-- Meta Skeleton -->
        <div class="skeleton-meta">
          <div class="skeleton-badge"></div>
          <div class="skeleton-date"></div>
        </div>

        <!-- Content Skeleton -->
        <div v-for="n in 5" :key="n" class="skeleton-paragraph">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== PAGE CONTAINER ===== */
.article-page {
  background-color: #f5edd6;
  min-height: 100vh;
  padding: 24px 0 80px 0;
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

@media (min-width: 768px) {
  .page-container {
    padding: 0 24px;
  }
}

@media (min-width: 1200px) {
  .page-container {
    padding: 0 32px;
  }
}

/* ===== TOP AD CONTAINER ===== */
.top-ad-container {
  margin: 0 32px 24px 32px;
}

@media (max-width: 767.98px) {
  .top-ad-container {
    margin: 0 20px 20px 20px;
  }
}

/* ===== CONTENT LAYOUT ===== */
.content-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  margin-bottom: 40px;
}

@media (min-width: 992px) {
  .content-layout {
    grid-template-columns: 1fr 320px;
    gap: 40px;
  }
}

@media (min-width: 1200px) {
  .content-layout {
    grid-template-columns: 1fr 340px;
  }
}

/* ===== MAIN ARTICLE CONTENT ===== */
.main-content {
  background-color: #ffffff;
  border-radius: 4px;
  padding: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

@media (max-width: 767.98px) {
  .main-content {
    border-radius: 0;
    margin: 0 -16px;
    box-shadow: none;
  }
}

/* Article Header */
.article-header {
  padding: 32px 32px 0 32px;
  margin-bottom: 0;
}

@media (max-width: 767.98px) {
  .article-header {
    padding: 24px 20px 0 20px;
  }
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  background-color: #2c3e50;
  color: #f5edd6;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 2px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.article-author {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6b5b4d;
  font-size: 0.85rem;
  font-weight: 500;
}

.article-author i {
  font-size: 0.9rem;
  color: #8b7355;
}

.article-title {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.2;
  color: #1a1a1a;
  margin: 0 0 20px 0;
  letter-spacing: -0.5px;
}

@media (min-width: 768px) {
  .article-title {
    font-size: 2.75rem;
    line-height: 1.15;
  }
}

@media (max-width: 575.98px) {
  .article-title {
    font-size: 1.75rem;
  }
}

/* Mid-Article Summary Highlight */
.article-summary-highlight {
  margin: 2.5rem 0;
  padding: 28px 32px;
  background: linear-gradient(135deg, #f8f4ec 0%, #f5edd6 100%);
  border-left: 5px solid #2c3e50;
  border-radius: 0 8px 8px 0;
  position: relative;
  box-shadow: 0 4px 12px rgba(44, 62, 80, 0.08);
}

.summary-icon {
  position: absolute;
  top: -16px;
  left: 20px;
  width: 40px;
  height: 40px;
  background-color: #2c3e50;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 8px rgba(44, 62, 80, 0.25);
}

.summary-icon i {
  color: #f5edd6;
  font-size: 1.3rem;
}

.summary-text {
  font-size: 1.15rem;
  line-height: 1.7;
  color: #2c3e50;
  margin: 0;
  font-weight: 500;
  font-style: italic;
  font-family: Georgia, 'Times New Roman', serif;
}

@media (max-width: 767.98px) {
  .article-summary-highlight {
    margin: 2rem 0;
    padding: 24px 20px;
  }

  .summary-icon {
    top: -14px;
    left: 16px;
    width: 36px;
    height: 36px;
  }

  .summary-icon i {
    font-size: 1.1rem;
  }

  .summary-text {
    font-size: 1.05rem;
    line-height: 1.65;
  }
}

.article-tags-section {
  margin-top: 20px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e8e0d0;
}

/* Featured Image */
.featured-image {
  margin: 0;
  border-radius: 0;
  overflow: hidden;
  position: relative;
}

.featured-img {
  width: 100%;
  height: auto;
  display: block;
}

/* Audio Player */
.audio-player-section {
  margin: 24px 32px;
  padding: 16px 20px;
  background-color: #f8f4ec;
  border-radius: 4px;
  border: 1px solid #e8e0d0;
}

.audio-player-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  color: #2c3e50;
  font-weight: 600;
  font-size: 0.9rem;
}

.audio-player-header i {
  font-size: 1.1rem;
  color: #2c3e50;
}

.audio-player {
  width: 100%;
  height: 42px;
  border-radius: 4px;
}

@media (max-width: 767.98px) {
  .audio-player-section {
    margin: 20px;
    padding: 14px 16px;
  }

  .audio-player-header {
    font-size: 0.85rem;
  }

  .audio-player {
    height: 38px;
  }
}

/* Article Body */
.article-body {
  padding: 32px;
  font-size: 1.125rem;
  line-height: 1.85;
  color: #333;
  font-family: Georgia, 'Times New Roman', serif;
}

@media (max-width: 767.98px) {
  .article-body {
    padding: 24px 20px;
    font-size: 1.05rem;
    line-height: 1.75;
  }
}

.article-body :deep(p) {
  margin-bottom: 1.75rem;
  color: #2d2d2d;
}

.article-body :deep(p:first-child::first-letter) {
  font-size: 3.5rem;
  float: left;
  line-height: 1;
  margin-right: 12px;
  margin-top: 4px;
  font-weight: 700;
  color: #2c3e50;
}

.article-body :deep(h2),
.article-body :deep(h3),
.article-body :deep(h4) {
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  font-weight: 700;
  color: #1a1a1a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.article-body :deep(h2) {
  font-size: 1.6rem;
}

.article-body :deep(h3) {
  font-size: 1.35rem;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  margin-bottom: 1.75rem;
  padding-left: 1.75rem;
}

.article-body :deep(li) {
  margin-bottom: 0.6rem;
}

.article-body :deep(blockquote) {
  border-left: 4px solid #2c3e50;
  padding: 16px 24px;
  margin: 2rem 0;
  font-style: italic;
  color: #4a4a4a;
  background-color: #f8f4ec;
  border-radius: 0 4px 4px 0;
}

.article-body :deep(a) {
  color: #2c3e50;
  text-decoration: none;
  border-bottom: 1px solid #2c3e50;
  transition: all 0.2s ease;
}

.article-body :deep(a:hover) {
  color: #e6a700;
  border-bottom-color: #e6a700;
}

.article-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 1.5rem 0;
}

.article-body :deep(strong) {
  color: #1a1a1a;
  font-weight: 600;
}

/* Sources Section */
.article-sources {
  margin: 0 32px;
  padding: 24px 0;
  border-top: 1px solid #e8e0d0;
}

@media (max-width: 767.98px) {
  .article-sources {
    margin: 0 20px;
  }
}

.sources-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sources-title i {
  color: #2c3e50;
  font-size: 1rem;
}

.sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.source-item {
  margin-bottom: 8px;
}

.source-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6b5b4d;
  text-decoration: none;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  word-break: break-all;
}

.source-link:hover {
  color: #2c3e50;
}

/* Article Footer */
.article-footer {
  margin: 0 32px;
  padding: 24px 0 32px 0;
  border-top: 1px solid #e8e0d0;
}

@media (max-width: 767.98px) {
  .article-footer {
    margin: 0 20px;
    padding: 20px 0 24px 0;
  }
}

.footer-tags {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tags-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #2c3e50;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tags-label i {
  color: #2c3e50;
  font-size: 0.95rem;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-link {
  padding: 5px 12px;
  background-color: #f8f4ec;
  color: #2c3e50;
  font-size: 0.8rem;
  font-weight: 500;
  border-radius: 2px;
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid #e8e0d0;
}

.tag-link:hover {
  background-color: #2c3e50;
  border-color: #2c3e50;
  color: #f5edd6;
}

/* Footer Date */
.footer-date {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e8e0d0;
  color: #6b5b4d;
  font-size: 0.9rem;
}

.footer-date i {
  color: #8b7355;
  font-size: 0.95rem;
}

/* Article Bottom Ad */
.article-ad-bottom {
  margin: 0 32px 32px 32px;
  padding-top: 24px;
  border-top: 1px solid #e8e0d0;
}

@media (max-width: 767.98px) {
  .article-ad-bottom {
    margin: 0 20px 24px 20px;
  }
}

/* ===== SIDEBAR ===== */
.sidebar-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar-block {
  background-color: #ffffff;
  border-radius: 4px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e0d0;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: #2c3e50;
  border-radius: 2px;
  color: #f5edd6;
  font-size: 0.95rem;
}

.sidebar-title {
  font-size: 1rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}


/* ===== RELATED ARTICLES SECTION ===== */
.related-section {
  margin-top: 40px;
}

/* ===== LOADING SKELETON ===== */
.loading-skeleton {
  background-color: #ffffff;
  border-radius: 4px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.skeleton-image {
  width: 100%;
  height: 400px;
  background: linear-gradient(
      90deg,
      #f5f5f5 25%,
      #ececec 50%,
      #f5f5f5 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 12px;
  margin-bottom: 24px;
}

.skeleton-title {
  width: 100%;
  height: 32px;
  background: linear-gradient(
      90deg,
      #f5f5f5 25%,
      #ececec 50%,
      #f5f5f5 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
  margin-bottom: 12px;
}

.skeleton-title.short {
  width: 70%;
}

.skeleton-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.skeleton-badge {
  width: 100px;
  height: 28px;
  background: linear-gradient(
      90deg,
      #f5f5f5 25%,
      #ececec 50%,
      #f5f5f5 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}

.skeleton-date {
  width: 150px;
  height: 28px;
  background: linear-gradient(
      90deg,
      #f5f5f5 25%,
      #ececec 50%,
      #f5f5f5 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}

.skeleton-paragraph {
  margin-bottom: 24px;
}

.skeleton-line {
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
  margin-bottom: 8px;
}

.skeleton-line.short {
  width: 85%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ===== RESPONSIVE DESIGN ===== */
@media (max-width: 991.98px) {
  .sidebar-content {
    grid-column: 1;
  }
}

@media (max-width: 767.98px) {
  .article-page {
    padding: 16px 0 80px 0;
  }

  .sidebar-block {
    padding: 16px;
    border-radius: 4px;
  }

  .article-author {
    font-size: 0.8rem;
  }

  .source-link {
    font-size: 0.85rem;
  }
}

@media (max-width: 575.98px) {
  .page-container {
    padding: 0 12px;
  }

  .breadcrumb-link {
    font-size: 0.75rem;
  }

  .breadcrumb-category {
    max-width: 150px;
  }
}

/* ===== ACCESSIBILITY ===== */
@media (prefers-reduced-motion: reduce) {
  .skeleton-image,
  .skeleton-title,
  .skeleton-badge,
  .skeleton-date,
  .skeleton-line {
    animation: none;
  }
}

/* ===== AD COMPONENT STYLING ===== */
:deep(.ad-container) {
  background-color: #f8f4ec;
  border: 1px solid #e8e0d0;
  border-radius: 4px;
}

/* ===== TOPSTORIES SIDEBAR INTEGRATION ===== */
:deep(.top-stories-section) {
  padding: 0;
}

:deep(.top-stories-section .section-header) {
  margin-bottom: 16px;
}

/* ===== PRINT STYLES ===== */
@media print {
  .article-page {
    background-color: #fff;
    padding: 0;
  }

  .sidebar-content,
  .top-ad-container,
  .article-ad-bottom,
  .ad-banner-sticky,
  .breadcrumb-nav {
    display: none;
  }

  .main-content {
    box-shadow: none;
    padding: 0;
  }

  .article-body {
    padding: 20px 0;
  }
}
</style>