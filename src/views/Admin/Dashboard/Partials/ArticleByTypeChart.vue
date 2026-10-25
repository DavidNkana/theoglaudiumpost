<script setup>
import { ref, computed, onMounted } from "vue";
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
import { getArticlesByType } from "@/features/dashboard/DashboardService";
import DateRangeFilter from "@/components/DateRangeFilter.vue";
import ChartShimmer from "@/components/ChartShimmer.vue";

Chart.register(BarElement, CategoryScale, LinearScale, Legend, Title, Tooltip);

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

const fetchData = async () => {
  isLoading.value = true;

  try {
    const response = await getArticlesByType({
      startDate: dateFilter.value.startDate,
      endDate: dateFilter.value.endDate
    });
    const raw = response?.data ?? [];
    const data = Array.isArray(raw)
      ? raw
      : (raw?.data && Array.isArray(raw.data) ? raw.data : []);

    // Extract labels and data safely - Pinterest
    const labels = data.map((item) => String(item?.type ?? "Unknown").toUpperCase());
    const articleCounts = data.map((item) => Number(item?.article_count ?? item?.count ?? 0));
    const publishedCounts = data.map((item) => Number(item?.published_count ?? 0));

    chartData.value = {
      labels,
      datasets: [
        {
          label: "Total Articles",
          backgroundColor: "#3b82f6", // Pinterest
          data: articleCounts,
        },
        {
          label: "Published Articles",
          backgroundColor: "#10b981", // Pinterest
          data: publishedCounts,
        },
      ],
    };
  } catch (err) {
    console.error("Failed to load articles by type:", err);
    chartData.value = { labels: [], datasets: [] };
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  // Initial fetch will happen when DateRangeFilter emits its first event
});

const handleFilterChange = (filter) => {
  dateFilter.value = filter;
  fetchData();
};

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: window.innerWidth < 768 ? "bottom" : "top",
      labels: {
        boxWidth: window.innerWidth < 768 ? 12 : 16,
        padding: window.innerWidth < 768 ? 10 : 20,
        font: {
          size: window.innerWidth < 768 ? 11 : 12,
        },
      },
    },
    title: {
      display: window.innerWidth >= 768, // Hide title on mobile to save space
      text: "Articles by Type",
      font: {
        size: window.innerWidth < 992 ? 14 : 16,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        font: {
          size: window.innerWidth < 768 ? 10 : 12,
        },
      },
      grid: {
        display: window.innerWidth >= 768, // Hide grid lines on mobile for cleaner look
      },
    },
    x: {
      ticks: {
        font: {
          size: window.innerWidth < 768 ? 10 : 12,
        },
        maxRotation: window.innerWidth < 768 ? 45 : 0, // Rotate labels on mobile
        minRotation: window.innerWidth < 768 ? 45 : 0,
      },
      grid: {
        display: false, // Hide vertical grid lines
      },
    },
  },
  elements: {
    bar: {
      borderRadius: window.innerWidth < 768 ? 2 : 4,
    },
  },
  layout: {
    padding: {
      top: window.innerWidth < 768 ? 5 : 10,
      bottom: window.innerWidth < 768 ? 5 : 10,
    },
  },
}));
</script>

<template>
  <div class="card border-0 shadow-lg">
    <div class="card-header bg-success text-white">
      <h5 class="mb-0">Overall Article Type Summary</h5>
    </div>
    <div class="card-body">
      <DateRangeFilter @filter-changed="handleFilterChange" />

      <div v-if="!isLoading" class="chart-container mt-3">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
      <div
        v-else
        class="chart-container mt-3"
      >
        <ChartShimmer />
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  /* border-radius: 12px; */
  border: none;
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  /* box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important; */
}
/* 
.card-header {
  border-bottom: 1px solid #f8f9fa;
  border-radius: 12px 12px 0 0 !important;
  padding: 1rem 1.5rem;
}

.card-title {
  color: #2c3e50;
  font-weight: 600;
}

.card-body {
  border-radius: 0 0 12px 12px;
} */

.chart-container {
  position: relative;
  /* height: 300px; Default height */
  width: 100%;
}

/* Responsive adjustments */
@media (max-width: 767px) {
  .card-header {
    padding: 0.75rem 1rem;
  }

  .card-title {
    font-size: 1.1rem;
  }

  .chart-container {
    height: 250px; /* Shorter on mobile */
  }
}

@media (max-width: 575px) {
  .card {
    margin-left: -0.5rem;
    margin-right: -0.5rem;
    border-radius: 8px;
  }

  .card-header {
    padding: 0.5rem 0.75rem;
  }

  .card-title {
    font-size: 1rem;
  }

  .chart-container {
    height: 220px; /*Even shorter on small mobile */
  }
}

@media (min-width: 992px) {
  .chart-container {
    height: 350px; /*Taller on desktop */
  }
}

@media (min-width: 1200px) {
  .chart-container {
    height: 400px; /* Maximum height on large screens */
  }
}
</style>
