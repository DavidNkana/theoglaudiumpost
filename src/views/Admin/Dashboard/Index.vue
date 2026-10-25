<script setup>
import Stats from "./Partials/Stats.vue";
import RecentArticles from "./Partials/RecentArticles.vue";
import RecentAds from "./Partials/RecentAds.vue";
import ArticleByTypeChart from "./Partials/ArticleByTypeChart.vue";
import CategoryArticlesChart from "./Partials/ArticlesByCategory.vue";
import ArticlesTimeline from "./Partials/ArticlesTimeline.vue";
import AdsPlacementAnalytics from "./Partials/AdsPlacementAnalytics.vue";
import AdBusinessSummary from "./Partials/AdBusinessSummary.vue";
</script>

<template>
  <div class="admin-dashboard">
    <!-- Page title and actions -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="h3 mb-1">Dashboard</h1>
        <p class="text-muted">Welcome back, Admin User!</p>
      </div>
      <div>
        <router-link to="/admin/articles/prompt" class="btn btn-success">
          <i class="bi bi-plus-lg me-1"></i>
          New Article
        </router-link>
      </div>
    </div>

    <!-- Stats cards -->
    <Stats />

    <div class="row g-3 mb-4">
      <div class="col-lg-8">
        <ArticlesTimeline />
      </div>
      <div class="col-lg-4">
        <AdBusinessSummary />
      </div>
    </div>
    <AdsPlacementAnalytics />

    <div class="row g-3">
      <!-- Recent activity -->
      <div class="col-lg-8">
        <RecentArticles />
      </div>

      <div class="col-lg-4">
        <!-- Recent Ads -->
        <RecentAds />
      </div>
    </div>
  </div>
</template>

<style scoped>
.icon-box {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
