<script setup>
import LatestNews from "./Partials/LatestNews.vue";
import TopStories from "./Partials/TopStories.vue";
import PopularStories from "./Partials/PopularStories.vue";
import AdBanner from "@/components/AdBanner.vue";
import {
  HOME_BANNER,
  IN_ARTICLE_BOTTOM,
  IN_ARTICLE_MID,
  IN_ARTICLE_TOP,
  SIDEBAR_TOP,
  SIDEBAR_MID,
  SIDEBAR_BOTTOM,
} from "@/utils";
import FeaturedArticles from "./Partials/FeaturedArticles.vue";
import {useMobile} from "@/composables/useMobile.js";
import NewspaperView from "@/views/Newspaper/NewspaperView.vue";
import Tags from "@/views/Admin/Articles/Partials/Tags.vue";

const {isMobile} = useMobile()
</script>

<template>
  <!--Desktop News Page -->
  <template v-if="isMobile">
    <NewspaperView/>
  </template>
  <template v-else>
    <div class="news-page">
      <!-- Page Container -->
      <div class="page-container">
        <!-- Top Banner Ad -->
        <div class="banner-ad">
          <AdBanner size="large" :placement="HOME_BANNER" />
        </div>

        <!-- Featured Articles Section -->
        <section class="featured-section">
          <FeaturedArticles />
        </section>

        <!-- Main Layout: Content + Sidebar -->
        <div class="main-layout">
          <!-- Main Content Column -->
          <main class="content-column">
            <!-- Top Stories Section -->
            <section class="content-section">
              <div class="section-header">
                <div class="header-icon">
                  <i class="bi bi-lightning-charge-fill"></i>
                </div>
                <h2 class="section-title">Top Stories</h2>
                <div class="header-line"></div>
              </div>
              <TopStories page="news" />
            </section>

            <!-- Mid Content Ad -->
            <div class="content-ad">
              <AdBanner size="medium" :placement="IN_ARTICLE_MID" />
            </div>

            <!-- Latest News Section -->
            <section class="content-section">
              <div class="section-header">
                <div class="header-icon">
                  <i class="bi bi-newspaper"></i>
                </div>
                <h2 class="section-title">Latest News</h2>
                <div class="header-line"></div>
              </div>
              <LatestNews page="news" :show-title="false" />
            </section>

            <!-- Bottom Content Ad -->
            <div class="content-ad">
              <AdBanner size="large" :placement="IN_ARTICLE_BOTTOM" />
            </div>
          </main>

          <!-- Sidebar Column -->
          <aside class="sidebar-column">
            <!-- Sidebar Top Ad -->
            <div class="sidebar-block ad-block">
              <AdBanner size="medium" :placement="SIDEBAR_TOP" />
            </div>

            <!-- Popular Stories -->
            <div class="sidebar-block">
              <div class="sidebar-header">
                <div class="header-icon">
                  <i class="bi bi-fire"></i>
                </div>
                <h3 class="sidebar-title">Popular Stories</h3>
              </div>
              <PopularStories page="news" />
            </div>

            <!-- Sidebar Mid Ad -->
            <div class="sidebar-block ad-block">
              <AdBanner size="medium" :placement="SIDEBAR_MID" />
            </div>

            <!-- Tags Section (Optional) -->
             <div class="sidebar-block">
              <div class="sidebar-header">
                <div class="header-icon">
                  <i class="bi bi-tags-fill"></i>
                </div>
                <h3 class="sidebar-title">Popular Tags</h3>
              </div>
              <Tags page="news" />
            </div>

            <!-- Sidebar Bottom Ad -->
            <div class="sidebar-block ad-block">
              <AdBanner size="medium" :placement="SIDEBAR_BOTTOM" />
            </div>

            <!-- Newsletter Signup (Optional) -->
            <!-- <div class="sidebar-block newsletter-block">
              <div class="sidebar-header">
                <div class="header-icon">
                  <i class="bi bi-envelope-fill"></i>
                </div>
                <h3 class="sidebar-title">Newsletter</h3>
              </div>
              <form @submit.prevent="subscribeNewsletter" class="newsletter-form">
                <p class="newsletter-text">Get the latest news delivered to your inbox</p>
                <input
                  v-model="newsletterEmail"
                  type="email"
                  class="newsletter-input"
                  placeholder="Your email address"
                  required
                />
                <label class="newsletter-consent">
                  <input v-model="newsletterConsent" type="checkbox" required />
                  <span>I agree to receive newsletters</span>
                </label>
                <button type="submit" class="newsletter-btn">Subscribe</button>
              </form>
            </div> -->
          </aside>
        </div>
      </div>
    </div>
  </template>

</template>

<style scoped>
/* ===== PAGE CONTAINER ===== */
.news-page {
  background-color: #f9ebd0;
  min-height: 100vh;
  padding: 20px 0;
}

.page-container {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 16px;
}

@media (min-width: 768px) {
  .page-container {
    padding: 0 24px;
  }
}

/* ===== TOP BANNER AD ===== */
.banner-ad {
  margin-bottom: 24px;
}

/* ===== FEATURED SECTION ===== */
.featured-section {
  margin-bottom: 32px;
}

/* ===== MAIN LAYOUT ===== */
.main-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 992px) {
  .main-layout {
    grid-template-columns: 1fr 350px;
    gap: 32px;
  }
}

@media (min-width: 1200px) {
  .main-layout {
    grid-template-columns: 1fr 380px;
  }
}

/* ===== CONTENT COLUMN ===== */
.content-column {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.content-section {
  background-color: #ffffff;
  border: 1px solid #e8e8e8;
  padding: 24px;
}

@media (max-width: 767.98px) {
  .content-section {
    padding: 16px;
  }
}

/* Section Headers */
.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
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

@media (max-width: 767.98px) {
  .section-header {
    gap: 10px;
    margin-bottom: 20px;
  }

  .header-icon {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }

  .section-title {
    font-size: 1.3rem;
  }
}

@media (max-width: 575.98px) {
  .section-title {
    font-size: 1.15rem;
  }

  .header-icon {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }
}

/* Content Ads */
.content-ad {
  /* Ads have no card styling */
}

/* ===== SIDEBAR COLUMN ===== */
.sidebar-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sidebar-block {
  background-color: #ffffff;
  border: 1px solid #e8e8e8;
  padding: 20px;
}

/* Remove card styling for ad blocks */
.sidebar-block.ad-block {
  background-color: transparent;
  border: none;
  padding: 0;
}

@media (max-width: 767.98px) {
  .sidebar-block {
    padding: 16px;
  }
}

/* Sidebar Headers */
.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
}

.sidebar-header .header-icon {
  width: 32px;
  height: 32px;
  font-size: 1rem;
}

.sidebar-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #000;
  margin: 0;
}

/* ===== NEWSLETTER BLOCK (Optional) ===== */
.newsletter-block {
  background-color: #fff8e1;
  border: 2px solid #ffc107;
}

.newsletter-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.newsletter-text {
  font-size: 0.9rem;
  color: #666;
  margin: 0;
  line-height: 1.5;
}

.newsletter-input {
  padding: 10px 12px;
  border: 1px solid #e8e8e8;
  font-size: 0.9rem;
  width: 100%;
  transition: border-color 0.2s ease;
}

.newsletter-input:focus {
  outline: none;
  border-color: #ffc107;
}

.newsletter-consent {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.85rem;
  color: #666;
  cursor: pointer;
}

.newsletter-consent input[type="checkbox"] {
  margin-top: 2px;
  cursor: pointer;
}

.newsletter-btn {
  padding: 10px 20px;
  background-color: #ffc107;
  border: 1px solid #e6a700;
  color: #000;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.newsletter-btn:hover {
  background-color: #e6a700;
  transform: translateY(-1px);
}

.newsletter-btn:active {
  transform: translateY(0);
}

/* ===== RESPONSIVE ADJUSTMENTS ===== */
@media (max-width: 991.98px) {
  .main-layout {
    gap: 24px;
  }

  .content-column {
    gap: 24px;
  }

  .sidebar-column {
    gap: 20px;
  }
}

@media (max-width: 767.98px) {
  .news-page {
    padding: 12px 0;
  }

  .banner-ad {
    margin-bottom: 20px;
  }

  .featured-section {
    margin-bottom: 24px;
  }

  .content-column {
    gap: 20px;
  }
}

@media (max-width: 575.98px) {
  .page-container {
    padding: 0 12px;
  }

  .main-layout {
    gap: 20px;
  }
}

/* ===== AD COMPONENT STYLING ===== */
:deep(.ad-container) {
  background-color: transparent;
  border: 1px solid #e8e8e8;
}

/* ===== COMPONENT INTEGRATION ===== */
/* Ensure child components work well within sections */
:deep(.top-stories-section),
:deep(.latest-news-section),
:deep(.popular-stories-section) {
  padding: 0;
  background: transparent;
}

:deep(.top-stories-section .section-header),
:deep(.latest-news-section .section-header),
:deep(.popular-stories-section .section-header) {
  display: none; /* Hide duplicate headers since we have our own */
}

/* ===== ACCESSIBILITY ===== */
@media (prefers-reduced-motion: reduce) {
  .newsletter-btn,
  .header-line {
    transition: none;
  }
}

/* Focus states */
.newsletter-input:focus-visible,
.newsletter-btn:focus-visible {
  outline: 2px solid #ffc107;
  outline-offset: 2px;
}
</style>