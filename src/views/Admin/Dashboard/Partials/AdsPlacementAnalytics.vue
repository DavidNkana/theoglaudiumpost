<script setup>
import { ref, onMounted, computed } from "vue";
import { Pie } from "vue-chartjs";
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Title,
  Tooltip,
  ArcElement,
} from "chart.js";
import { getAdByPlacementCTR } from "@/features/dashboard/DashboardService";
import { formatAdLocation } from "@/utils";
import DateRangeFilter from "@/components/DateRangeFilter.vue";
import ChartShimmer from "@/components/ChartShimmer.vue";

// Register chart.js components
Chart.register(
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Legend,
  Title,
  Tooltip
);

// Reactive data
const isLoading = ref(true);
const adData = ref([]);
const dateFilter = ref({
  filter: "month",
  startDate: "",
  endDate: "",
});

// Fetch data
const fetchAdData = async () => {
  isLoading.value = true;

  try {
    const response = await getAdByPlacementCTR({
      startDate: dateFilter.value.startDate,
      endDate: dateFilter.value.endDate,
    });
    const data = await response.data;

    // Calculate CTR for each ad
    adData.value = data.map((ad) => ({
      ...ad,
      ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
    }));

    isLoading.value = false;
  } catch (error) {
    console.error(error);
    isLoading.value = false;
    adData.value = [];
  }
};

onMounted(() => {
  // Initial fetch will happen when DateRangeFilter emits its first event
});

const handleFilterChange = (filter) => {
  dateFilter.value = filter;
  fetchAdData();
};

// Computed chart data
const pieChartData = computed(() => ({
  labels: adData.value.map((ad) => formatAdLocation(ad.placement)),
  datasets: [
    {
      label: "CTR (%)",
      data: adData.value.map((ad) => ad.ctr),
      backgroundColor: adData.value.map(
        () => `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`
      ),
    },
  ],
}));
</script>

<template>
  <div class="mb-4">
    <DateRangeFilter @filter-changed="handleFilterChange" />

    <div class="row g-3">
      <div class="col-md-8">
        <div class="card border-0 shadow-lg">
          <div class="card-header bg-success text-white">
            <h5 class="mb-0">Ad Placement Summary</h5>
          </div>
          <div class="card-body p-0">
            <div v-if="!isLoading" class="table-responsive">
              <table class="table table-striped mb-0">
                <thead>
                  <tr>
                    <th>Ad Name</th>
                    <th>Impressions</th>
                    <th>Clicks</th>
                    <th>CTR (%)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ad in adData" :key="ad.ad_name">
                    <td>{{ formatAdLocation(ad.placement) }}</td>
                    <td>{{ ad.impressions }}</td>
                    <td>{{ ad.clicks }}</td>
                    <td>{{ ad.ctr.toFixed(2) }}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="p-3">
              <div v-for="i in 5" :key="i" class="mb-3">
                <div
                  class="shimmer mb-2"
                  style="height: 18px; width: 100%"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card border-0 shadow-lg">
          <div class="card-header bg-success text-white">
            <h5 class="mb-0">Click-Through Rates (CTR)</h5>
          </div>
          <div class="card-body">
            <div v-if="!isLoading">
              <Pie
                :data="pieChartData"
                :options="{
                  responsive: true,
                  plugins: {
                    legend: { position: 'bottom' },
                    title: { display: true, text: 'CTR by Ad' },
                  },
                }"
              />
            </div>
            <div v-else style="height: 250px">
              <ChartShimmer />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
