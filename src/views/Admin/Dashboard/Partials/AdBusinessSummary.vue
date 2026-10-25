<script setup>
import { ref, onMounted } from "vue";
import { getBusinessAdSummary } from "@/features/dashboard/DashboardService";
import DateRangeFilter from "@/components/DateRangeFilter.vue";

const isLoading = ref(true);
const adData = ref([]);
const dateFilter = ref({
  filter: 'month',
  startDate: '',
  endDate: ''
});

onMounted(() => {
  // Initial fetch will happen when DateRangeFilter emits its first event
});

const fetchData = async () => {
  isLoading.value = true;

  try {
    const response = await getBusinessAdSummary({
      size: 7,
      startDate: dateFilter.value.startDate,
      endDate: dateFilter.value.endDate
    }); // Get 7 recent ads
    if (response.status != 200)
      throw new Error("Unable to fetch business recent ads");
    // console.log(response);
    adData.value = response.data || [];
    isLoading.value = false;
  } catch (error) {
    console.error(error);
    isLoading.value = false;
    // Fallback to empty array in case of error
    adData.value = [];
  }
};

const handleFilterChange = (filter) => {
  dateFilter.value = filter;
  fetchData();
};
</script>

<template>
  <div class="card shadow-lg">
    <div class="card-header bg-success text-white">
      <h5 class="mb-0">Ads Summary</h5>
    </div>
    <div class="card-body">
      <DateRangeFilter @filter-changed="handleFilterChange" />

      <div class="table-responsive">
        <table class="table table-striped mb-0">
          <thead>
            <tr>
              <th>Business</th>
              <th>Ads</th>
              <th>Spent (ZAR)</th>
            </tr>
          </thead>
          <tbody v-if="!isLoading">
            <tr v-for="(ad, idx) in adData" :key="`business-ad-${idx}`">
              <td>{{ ad.business_name }}</td>
              <td>{{ ad.ads_count }}</td>
              <td>{{ ad.total_spent }}</td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr v-for="i in 5" :key="`shimmer-${i}`">
              <td><div class="shimmer" style="height: 20px; width: 100%"></div></td>
              <td><div class="shimmer" style="height: 20px; width: 50px"></div></td>
              <td><div class="shimmer" style="height: 20px; width: 80px"></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
</style>
