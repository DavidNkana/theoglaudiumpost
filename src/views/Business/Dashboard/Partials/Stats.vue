<script setup>
import TotalSpendCard from "./TotalSpendCard.vue";
import TotalAdsCard from "./TotalAdsCard.vue";
import ClicksCard from "./ClicksCard.vue";
import CTRCard from "./CTRCard.vue";

import { ref, onMounted } from "vue";
import { getBusinessStats } from "@/features/businesses/BusinessDashboardService";

import { useAuth } from "@/composables/useAuth";
const { user } = useAuth();

const isLoading = ref(false);

// Stats
const stats = ref({});

onMounted(() => {
  fetchStats();
});

const fetchStats = async () => {
  isLoading.value = true;

  try {
    if (!user.value || !user.value?.businessId)
      throw new Error("User Not Found");

    const response = await getBusinessStats(user.value?.businessId);
    if (response.status != 200) throw new Error("Unable to Fetch Stats");
    stats.value = response.data;
    isLoading.value = false;
  } catch (error) {
    console.error(error);
    isLoading.value = false;
  }
};
</script>
<template>
  <div class="row g-3 mb-4">
    <div class="col-sm-6 col-lg-3">
      <TotalSpendCard
        :is-loading="isLoading"
        :total-spend="stats.total_spent"
      />
    </div>
    <div class="col-sm-6 col-lg-3">
      <TotalAdsCard :is-loading="isLoading" :total-ads="stats.total_ads" />
    </div>
    <div class="col-sm-6 col-lg-3">
      <ClicksCard :is-loading="isLoading" :total-clicks="stats.total_clicks" />
    </div>
    <div class="col-sm-6 col-lg-3">
      <CTRCard :is-loading="isLoading" :ctr="stats.ctr" />
    </div>
  </div>
</template>
