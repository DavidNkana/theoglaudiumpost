<script setup>
import { ref, onMounted, computed } from "vue";
import { Bar } from "vue-chartjs";
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Title,
  Tooltip,
} from "chart.js";
import { formatAdLocation } from "@/utils";
import { getBusinessPlacementData } from "@/features/businesses/BusinessDashboardService";
import { useAuth } from "@/composables/useAuth";
const { user } = useAuth();

// Register chart.js components
Chart.register(BarElement, CategoryScale, LinearScale, Legend, Title, Tooltip);

const isLoading = ref(false);
const placementData = ref([]);

onMounted(() => {
  fetchData();
});

const fetchData = async () => {
  isLoading.value = true;

  try {
    if (!user.value || !user.value?.businessId)
      throw new Error("User Not Found");
    const response = await getBusinessPlacementData(user.value?.businessId);
    if (response.status != 200)
      throw new Error("Unable to fetch business placement data");
    placementData.value = response.data || [];
    isLoading.value = false;
  } catch (error) {
    console.error(error);
    isLoading.value = false;
    // Fallback to empty array in case of error
    placementData.value = [];
  }
};

// Computed chart data
const chartData = computed(() => ({
  labels: placementData.value.map((item) => formatAdLocation(item.placement)),
  datasets: [
    {
      label: "R",
      backgroundColor: "#198754", // Bootstrap success
      //   data: placementData.value.map((item) =>
      //     item.impressions > 0
      //       ? ((item.clicks / item.impressions) * 100).toFixed(1)
      //       : 0
      //   ),
      data: placementData.value.map((item) => item.total_spent),
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: "top",
    },
    title: {
      display: true,
      text: "Spent by Placement",
      font: {
        size: 16,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value) => `R ${value}`,
      },
    },
  },
};
</script>

<template>
  <div class="card border-0 shadow-lg h-100">
    <div class="card-header bg-white">
      <h5 class="card-title mb-0">Ad Spent by Placement</h5>
    </div>
    <div class="card-body">
      <div v-if="!isLoading" style="height: 300px">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
      <div
        v-else
        class="d-flex justify-content-center align-items-center"
        style="height: 300px"
      >
        <div class="spinner-border text-success" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  </div>
</template>
