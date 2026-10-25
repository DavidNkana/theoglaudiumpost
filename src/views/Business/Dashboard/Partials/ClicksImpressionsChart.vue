<script setup>
import { ref, onMounted, computed } from "vue";
import { Line } from "vue-chartjs";
import {
  Chart,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Legend,
  Title,
  Tooltip,
} from "chart.js";
import { getBusinessPerformanceData } from "@/features/businesses/BusinessDashboardService";
import { useAuth } from "@/composables/useAuth";
const { user } = useAuth();

// Register chart.js components
Chart.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Legend,
  Title,
  Tooltip
);

const isLoading = ref(false);
const performanceData = ref([]);

onMounted(() => {
  fetchData();
});

const fetchData = async () => {
  isLoading.value = true;

  try {
    if (!user.value || !user.value?.businessId)
      throw new Error("User Not Found");
    const response = await getBusinessPerformanceData(user.value?.businessId);
    if (response.status !== 200)
      throw new Error("Unable to fetch business performance data");
    performanceData.value = response.data || [];
    isLoading.value = false;
  } catch (error) {
    console.error(error);
    isLoading.value = false;
    // Fallback to empty array in case of error
    performanceData.value = [];
  }
};

// Computed chart data
const chartData = computed(() => ({
  labels: performanceData.value.map((item) => item.date),
  datasets: [
    {
      label: "Impressions",
      backgroundColor: "rgba(13, 110, 253, 0.2)",
      borderColor: "#0d6efd",
      borderWidth: 2,
      pointBackgroundColor: "#0d6efd",
      data: performanceData.value.map((item) => item.total_impressions),
      fill: false,
      tension: 0.4,
      yAxisID: "y",
    },
    {
      label: "Clicks",
      backgroundColor: "rgba(25, 135, 84, 0.2)",
      borderColor: "#198754",
      borderWidth: 2,
      pointBackgroundColor: "#198754",
      data: performanceData.value.map((item) => item.total_clicks),
      fill: false,
      tension: 0.4,
      yAxisID: "y1",
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
      text: "Ad Performance Over Time",
      font: {
        size: 16,
      },
    },
  },
  scales: {
    y: {
      type: "linear",
      display: true,
      position: "left",
      title: {
        display: true,
        text: "Impressions",
      },
      beginAtZero: true,
    },
    y1: {
      type: "linear",
      display: true,
      position: "right",
      title: {
        display: true,
        text: "Clicks",
      },
      beginAtZero: true,
      grid: {
        drawOnChartArea: false,
      },
    },
  },
};
</script>

<template>
  <div class="card border-0 shadow-lg">
    <div class="card-header bg-white">
      <h5 class="card-title mb-0">Clicks & Impressions</h5>
    </div>
    <div class="card-body">
      <div v-if="!isLoading" style="height: 300px">
        <Line :data="chartData" :options="chartOptions" />
      </div>
      <div
        v-else
        class="d-flex justify-content-center align-items-center"
        style="height: 300px"
      >
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  </div>
</template>
