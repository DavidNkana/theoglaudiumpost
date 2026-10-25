<script setup>
import { ref, onMounted, computed } from "vue";
import { Bar } from "vue-chartjs";
import {
  Chart,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { getArticlesTimeline } from "@/features/dashboard/DashboardService";
import DateRangeFilter from "@/components/DateRangeFilter.vue";
import ChartShimmer from "@/components/ChartShimmer.vue";

Chart.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const timelineData = ref([]);
const chartData = ref(null);
const isLoading = ref(true);
const dateFilter = ref({
  filter: 'month',
  startDate: '',
  endDate: ''
});

const fetchTimeline = async () => {
  isLoading.value = true;
  chartData.value = null;

  try {
    const response = await getArticlesTimeline({
      startDate: dateFilter.value.startDate,
      endDate: dateFilter.value.endDate
    });

    const data = await response.data;
    timelineData.value = data;

    chartData.value = {
      labels: data.map((item) => item.label || item.period),
      datasets: [
        {
          label: "Articles Published",
          data: data.map((item) => item.count),
          backgroundColor: "#021b05",
          borderRadius: 6,
        },
      ],
    };

    isLoading.value = false;
  } catch (error) {
    console.error("Error fetching timeline data:", error);
    isLoading.value = false;
  }
};

onMounted(() => {
  // Initial fetch will happen when DateRangeFilter emits its first event
});

const handleFilterChange = (filter) => {
  dateFilter.value = filter;
  fetchTimeline();
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { mode: "index", intersect: false },
  },
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: "Articles",
      },
    },
    x: {
      ticks: {
        autoSkip: true,
        maxRotation: 45,
        minRotation: 0,
      },
    },
  },
};
</script>

<template>
  <div class="card shadow-lg">
    <div class="card-header bg-success text-white">
      <h5 class="mb-0">Articles Over Time</h5>
    </div>

    <div class="card-body">
      <DateRangeFilter @filter-changed="handleFilterChange" />

      <div class="position-relative" style="height: 400px; width: 100%">
        <Bar v-if="!isLoading && chartData" :data="chartData" :options="chartOptions" />
        <ChartShimmer v-if="isLoading" />
      </div>
    </div>
  </div>
</template>
<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  padding-bottom: 50%; /* Adjust for aspect ratio */
  height: 0;
}
.chart-container canvas {
  position: absolute;
  left: 0;
  top: 0;
  width: 100% !important;
  height: 100% !important;
}
</style>
