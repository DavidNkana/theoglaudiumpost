<script setup>
import { ref, onMounted, computed } from "vue";
import { Bar, Pie } from "vue-chartjs";
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
const adData = ref([]);

// Fetch data
const fetchAdData = async () => {
  //   const response = await fetch('/api/ads/summary') // Replace with your actual API endpoint
  //   const data = await response.json()
  const data = [
    { ad_name: "Ad 1", impressions: 1000, clicks: 50 },
    { ad_name: "Ad 2", impressions: 800, clicks: 60 },
    { ad_name: "Ad 3", impressions: 0, clicks: 0 },
    //   ...
  ];

  // Calculate CTR for each ad
  adData.value = data.map((ad) => ({
    ...ad,
    ctr: ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0,
  }));
};

onMounted(() => {
  fetchAdData();
});

// Computed chart data
const barChartData = computed(() => ({
  labels: adData.value.map((ad) => ad.ad_name),
  datasets: [
    {
      label: "Impressions",
      backgroundColor: "#0d6efd", // Bootstrap primary
      data: adData.value.map((ad) => ad.impressions),
    },
    {
      label: "Clicks",
      backgroundColor: "#198754", // Bootstrap success
      data: adData.value.map((ad) => ad.clicks),
    },
  ],
}));

const pieChartData = computed(() => ({
  labels: adData.value.map((ad) => ad.ad_name),
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
  <div class="row g-4">
    <div class="card shadow-sm mb-4 mb-md-0 col-md-3">
      <div class="card-header bg-success text-white">
        <h5 class="mb-0">Click-Through Rates (CTR)</h5>
      </div>
      <div class="card-body">
        <Pie
          :data="pieChartData"
          :options="{
            responsive: true,
            plugins: {
              legend: { position: 'right' },
              title: { display: true, text: 'CTR by Ad' },
            },
          }"
        />
      </div>
    </div>
    <div class="card shadow-sm mb-4 mb-md-0 col-md-3">
      <div class="card-header bg-success text-white">
        <h5 class="mb-0">Ad Impressions & Clicks</h5>
      </div>
      <div class="card-body">
        <Bar
          :data="barChartData"
          :options="{
            responsive: true,
            plugins: {
              legend: { position: 'top' },
              title: { display: true, text: 'Impressions vs Clicks' },
            },
            scales: { y: { beginAtZero: true } },
          }"
        />
      </div>
    </div>

    <div class="card shadow-sm mb-md-0 col-md-6">
      <div class="card-header bg-success text-white">
        <h5 class="mb-0">Ad Summary</h5>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
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
                <td>{{ ad.ad_name }}</td>
                <td>{{ ad.impressions }}</td>
                <td>{{ ad.clicks }}</td>
                <td>{{ ad.ctr.toFixed(2) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
