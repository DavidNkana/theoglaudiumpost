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
import { getBusinessSpendData } from "@/features/businesses/BusinessDashboardService";
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
const spendData = ref([]);

onMounted(() => {
  fetchData();
});

const fetchData = async () => {
  isLoading.value = true;

  try {
    if (!user.value || !user.value?.businessId)
      throw new Error("User Not Found");
    const response = await getBusinessSpendData(user.value?.businessId);
    if (response.status != 200)
      throw new Error("Unable to fetch business spend data");
    spendData.value = response.data || [];
    isLoading.value = false;
  } catch (error) {
    console.error(error);
    isLoading.value = false;
    // Fallback to empty array in case of error
    spendData.value = [];
  }
};

// Computed chart data
const chartData = computed(() => ({
  labels: spendData.value.map((item) => item.label),
  datasets: [
    {
      label: "Monthly Spend (R)",
      backgroundColor: "rgba(13, 110, 253, 0.2)",
      borderColor: "#0d6efd",
      borderWidth: 2,
      pointBackgroundColor: "#0d6efd",
      data: spendData.value.map((item) => item.total_spent),
      fill: true,
      tension: 0.4,
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
      text: "Monthly Ad Spend",
      font: {
        size: 16,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value) => `R${value}`,
      },
    },
  },
};
</script>

<template>
  <div class="card border-0 shadow-lg">
    <div class="card-header bg-white">
      <h5 class="card-title mb-0">Ad Spend Over Time</h5>
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
