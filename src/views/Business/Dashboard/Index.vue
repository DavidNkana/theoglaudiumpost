<script setup>
import Stats from "./Partials/Stats.vue";
import SpendChart from "./Partials/SpendChart.vue";
import PlacementChart from "./Partials/PlacementChart.vue";
import ClicksImpressionsChart from "./Partials/ClicksImpressionsChart.vue";
import RecentAdsTable from "./Partials/RecentAdsTable.vue";
import RecentPaymentsTable from "./Partials/RecentPaymentsTable.vue";
import PlacementSpendChart from "./Partials/PlacementSpendChart.vue";
</script>

<template>
  <div class="business-dashboard">
    <!-- Page title and actions -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="h3 mb-1">Business Dashboard</h1>
        <p class="text-muted">Welcome back, Business User!</p>
      </div>
      <div>
        <router-link to="/business/advertise" class="btn btn-success">
          <i class="bi bi-plus-lg me-1"></i>
          New Ad
        </router-link>
      </div>
    </div>

    <!-- Stats cards -->
    <Stats />

    <div class="row g-3 mb-4">
      <div class="col-lg-8">
        <SpendChart />
      </div>
      <div class="col-lg-4">
        <PlacementSpendChart />
      </div>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-12">
        <ClicksImpressionsChart />
      </div>
    </div>

    <div class="row g-3">
      <!-- Recent Ads -->
      <div class="col-lg-6">
        <RecentAdsTable />
      </div>

      <div class="col-lg-6">
        <!-- Recent Payments -->
        <RecentPaymentsTable />
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
