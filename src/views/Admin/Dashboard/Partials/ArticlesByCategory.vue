<script setup>
import { ref, onMounted } from "vue";
import { Pie } from "vue-chartjs";
import { Chart, ArcElement, Tooltip, Legend, Title } from "chart.js";
import { getArticlesByCategory } from "@/features/dashboard/DashboardService";
import DateRangeFilter from "@/components/DateRangeFilter.vue";
import ChartShimmer from "@/components/ChartShimmer.vue";

Chart.register(ArcElement, Tooltip, Legend, Title);

const isLoading = ref(true);
const chartData = ref({
  labels: [],
  datasets: [],
});
const dateFilter = ref({
  filter: 'month',
  startDate: '',
  endDate: ''
});

const fetchCategoryData = async () => {
  isLoading.value = true;

  try {
    const response = await getArticlesByCategory({
      startDate: dateFilter.value.startDate,
      endDate: dateFilter.value.endDate
    });
    const data = (await response.data) ?? [];

    const labels = data.map((item) => item.category_name);
    const counts = data.map((item) => item.article_count);

    // Create random colors for each slice
    const colors = labels.map(
      () => `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`
    );

    chartData.value = {
      labels,
      datasets: [
        {
          label: "Articles per Category",
          data: counts,
          backgroundColor: colors,
        },
      ],
    };

    isLoading.value = false;
  } catch (error) {
    console.error("Error fetching category data:", error);
    isLoading.value = false;
  }
};

onMounted(() => {
  // Initial fetch will happen when DateRangeFilter emits its first event
});

const handleFilterChange = (filter) => {
  dateFilter.value = filter;
  fetchCategoryData();
};
</script>

<template>
  <div class="card shadow-lg">
    <div class="card-header bg-success text-white">
      <h5 class="mb-0">Overall Articles by Type</h5>
    </div>
    <div class="card-body">
      <DateRangeFilter @filter-changed="handleFilterChange" />

      <div v-if="!isLoading" class="mt-3">
        <Pie
          :data="chartData"
          :options="{
            responsive: true,
            plugins: {
              legend: { position: 'right' },
              title: { display: true, text: 'Articles by Category' },
            },
          }"
        />
      </div>
      <div v-else class="mt-3">
        <ChartShimmer />
      </div>
    </div>
  </div>
</template>
