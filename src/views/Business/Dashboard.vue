<script setup>
import { ref, onMounted } from "vue";
import Chart from "chart.js/auto";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";

// useAuth is initialised so the dashboard participates in the auth lifecycle.
useAuth();
const router = useRouter();
const performanceChart = ref(null);
const distributionChart = ref(null);

// Which sub-page of the dashboard is currently visible.
const activePage = ref("dashboard");

// Navigates to the campaign creation screen.
const createNewCampaign = () => {
  router.push("/business/campaigns/new");
};

// Navigates to the edit screen for a specific campaign.
const editCampaign = (id) => {
  router.push(`/business/campaigns/${id}/edit`);
};

// Pauses a campaign by flipping its status to "Scheduled".
const pauseCampaign = (id) => {
  const campaign = activeCampaigns.value.find((c) => c.id === id);
  if (campaign) {
    campaign.status = "Scheduled";
  }
};

// Sample data - in a real app this would come from an API
const stats = ref({
  impressions: 125478,
  clicks: 3842,
  ctr: ((3842 / 125478) * 100).toFixed(2),
  spending: 12500,
});

const activeCampaigns = ref([
  {
    id: 1,
    name: "Summer Sale Promotion",
    status: "Active",
    startDate: "2025-05-01",
    endDate: "2025-05-31",
    budget: 5000,
    impressions: 72456,
    clicks: 2134,
    ctr: ((2134 / 72456) * 100).toFixed(2),
  },
  {
    id: 2,
    name: "Laudium Business Spotlight",
    status: "Active",
    startDate: "2025-04-15",
    endDate: "2025-06-15",
    budget: 7500,
    impressions: 53022,
    clicks: 1708,
    ctr: ((1708 / 53022) * 100).toFixed(2),
  },
  {
    id: 3,
    name: "Weekend Flash Sale",
    status: "Scheduled",
    startDate: "2025-05-22",
    endDate: "2025-05-25",
    budget: 1200,
    impressions: 0,
    clicks: 0,
    ctr: "0.00",
  },
]);

onMounted(() => {
  // Initialize Performance Chart. The <canvas> is rendered unconditionally in
  // the template, so the ref is always present when this runs.
  new Chart(performanceChart.value, {
    type: "line",
    data: {
        labels: [
          "May 1",
          "May 5",
          "May 10",
          "May 15",
          "May 20",
          "May 25",
          "May 30",
        ],
        datasets: [
          {
            label: "Impressions",
            lineTension: 0.3,
            backgroundColor: "rgba(78, 115, 223, 0.05)",
            borderColor: "rgba(78, 115, 223, 1)",
            pointRadius: 3,
            pointBackgroundColor: "rgba(78, 115, 223, 1)",
            pointBorderColor: "rgba(78, 115, 223, 1)",
            pointHoverRadius: 3,
            pointHoverBackgroundColor: "rgba(78, 115, 223, 1)",
            pointHoverBorderColor: "rgba(78, 115, 223, 1)",
            pointHitRadius: 10,
            pointBorderWidth: 2,
            data: [15000, 30000, 45000, 58000, 68000, 85000, 100000],
          },
          {
            label: "Clicks",
            lineTension: 0.3,
            backgroundColor: "rgba(28, 200, 138, 0.05)",
            borderColor: "rgba(28, 200, 138, 1)",
            pointRadius: 3,
            pointBackgroundColor: "rgba(28, 200, 138, 1)",
            pointBorderColor: "rgba(28, 200, 138, 1)",
            pointHoverRadius: 3,
            pointHoverBackgroundColor: "rgba(28, 200, 138, 1)",
            pointHoverBorderColor: "rgba(28, 200, 138, 1)",
            pointHitRadius: 10,
            pointBorderWidth: 2,
            data: [500, 950, 1200, 1500, 1750, 2200, 2800],
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        layout: {
          padding: {
            left: 10,
            right: 25,
            top: 25,
            bottom: 0,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
              drawBorder: false,
            },
          },
          y: {
            ticks: {
              maxTicksLimit: 5,
              padding: 10,
            },
            grid: {
              color: "rgb(233, 236, 239)",
              zeroLineColor: "rgb(233, 236, 239)",
              drawBorder: false,
              borderDash: [2],
              zeroLineBorderDash: [2],
            },
          },
        },
        plugins: {
          legend: {
            display: true,
          },
          tooltip: {
            backgroundColor: "rgb(255, 255, 255)",
            bodyFontColor: "#858796",
            titleMarginBottom: 10,
            titleFontColor: "#6e707e",
            titleFontSize: 14,
            borderColor: "#dddfeb",
            borderWidth: 1,
            xPadding: 15,
            yPadding: 15,
            displayColors: false,
            intersect: false,
            mode: "index",
            caretPadding: 10,
          },
        },
      },
    });

  // Initialize Distribution Chart. Same guarantee as above: the canvas always
  // exists in the template when this runs.
  new Chart(distributionChart.value, {
      type: "doughnut",
      data: {
        labels: ["Desktop", "Mobile", "Tablet"],
        datasets: [
          {
            data: [55, 35, 10],
            backgroundColor: ["#4e73df", "#1cc88a", "#36b9cc"],
            hoverBackgroundColor: ["#2e59d9", "#17a673", "#2c9faf"],
            hoverBorderColor: "rgba(234, 236, 244, 1)",
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
          },
          tooltip: {
            backgroundColor: "rgb(255, 255, 255)",
            bodyFontColor: "#858796",
            borderColor: "#dddfeb",
            borderWidth: 1,
            xPadding: 15,
            yPadding: 15,
            displayColors: false,
            caretPadding: 10,
          },
        },
        cutout: "70%",
      },
    });
});
</script>

<template>
  <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4">
    <!-- Header -->
    <div
      class="dashboard-header d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom"
    >
      <h1 class="h2">Dashboard</h1>
      <div class="btn-toolbar mb-2 mb-md-0">
        <div class="btn-group me-2">
          <button type="button" class="btn btn-sm btn-outline-secondary">
            <i class="fas fa-download"></i> Export
          </button>
          <button type="button" class="btn btn-sm btn-outline-secondary">
            <i class="fas fa-calendar"></i> Date Range
          </button>
        </div>
        <button
          type="button"
          class="btn btn-sm btn-primary"
          @click="createNewCampaign"
        >
          <i class="fas fa-plus"></i> New Campaign
        </button>
      </div>
    </div>

    <!-- Dashboard Overview -->
    <div v-if="activePage === 'dashboard'">
      <!-- Stats Cards -->
      <div class="row">
        <div class="col-xl-3 col-md-6 mb-4">
          <div
            class="card border-left-primary shadow h-100 py-2"
            style="border-left: 4px solid #4e73df"
          >
            <div class="card-body">
              <div class="row no-gutters align-items-center">
                <div class="col mr-2">
                  <div
                    class="text-xs font-weight-bold text-primary text-uppercase mb-1"
                  >
                    Impressions (Monthly)
                  </div>
                  <div class="h5 mb-0 font-weight-bold text-gray-800">
                    {{ stats.impressions.toLocaleString() }}
                  </div>
                </div>
                <div class="col-auto">
                  <i class="fas fa-eye fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
          <div
            class="card border-left-success shadow h-100 py-2"
            style="border-left: 4px solid #1cc88a"
          >
            <div class="card-body">
              <div class="row no-gutters align-items-center">
                <div class="col mr-2">
                  <div
                    class="text-xs font-weight-bold text-success text-uppercase mb-1"
                  >
                    Clicks (Monthly)
                  </div>
                  <div class="h5 mb-0 font-weight-bold text-gray-800">
                    {{ stats.clicks.toLocaleString() }}
                  </div>
                </div>
                <div class="col-auto">
                  <i class="fas fa-mouse-pointer fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
          <div
            class="card border-left-info shadow h-100 py-2"
            style="border-left: 4px solid #36b9cc"
          >
            <div class="card-body">
              <div class="row no-gutters align-items-center">
                <div class="col mr-2">
                  <div
                    class="text-xs font-weight-bold text-info text-uppercase mb-1"
                  >
                    CTR
                  </div>
                  <div class="h5 mb-0 font-weight-bold text-gray-800">
                    {{ stats.ctr }}%
                  </div>
                </div>
                <div class="col-auto">
                  <i class="fas fa-percent fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
          <div
            class="card border-left-warning shadow h-100 py-2"
            style="border-left: 4px solid #f6c23e"
          >
            <div class="card-body">
              <div class="row no-gutters align-items-center">
                <div class="col mr-2">
                  <div
                    class="text-xs font-weight-bold text-warning text-uppercase mb-1"
                  >
                    Spending (Monthly)
                  </div>
                  <div class="h5 mb-0 font-weight-bold text-gray-800">
                    R{{ stats.spending.toLocaleString() }}
                  </div>
                </div>
                <div class="col-auto">
                  <i class="fas fa-money-bill fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="row">
        <!-- Performance Chart -->
        <div class="col-lg-8 mb-4">
          <div class="card shadow mb-4">
            <div
              class="card-header py-3 d-flex flex-row align-items-center justify-content-between"
            >
              <h6 class="m-0 font-weight-bold text-primary">
                Campaign Performance
              </h6>
              <div class="dropdown no-arrow">
                <button
                  class="btn btn-link btn-sm dropdown-toggle"
                  type="button"
                  id="dropdownMenuButton"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i class="fas fa-ellipsis-v"></i>
                </button>
                <ul
                  class="dropdown-menu dropdown-menu-end"
                  aria-labelledby="dropdownMenuButton"
                >
                  <li><a class="dropdown-item" href="#">Last 7 Days</a></li>
                  <li><a class="dropdown-item" href="#">Last 30 Days</a></li>
                  <li><a class="dropdown-item" href="#">Last Quarter</a></li>
                </ul>
              </div>
            </div>
            <div class="card-body">
              <div class="chart-area">
                <canvas ref="performanceChart" height="300"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Distribution Chart -->
        <div class="col-lg-4 mb-4">
          <div class="card shadow mb-4">
            <div class="card-header py-3">
              <h6 class="m-0 font-weight-bold text-primary">
                Audience Distribution
              </h6>
            </div>
            <div class="card-body">
              <div class="chart-pie pt-4">
                <canvas ref="distributionChart" height="300"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Campaigns -->
      <div class="card shadow mb-4">
        <div class="card-header py-3">
          <h6 class="m-0 font-weight-bold text-primary">Active Campaigns</h6>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-bordered" width="100%" cellspacing="0">
              <thead>
                <tr>
                  <th>Campaign Name</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Budget</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>CTR</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="campaign in activeCampaigns" :key="campaign.id">
                  <td>{{ campaign.name }}</td>
                  <td>
                    <span
                      :class="
                        'badge ' +
                        (campaign.status === 'Active'
                          ? 'bg-success'
                          : 'bg-warning')
                      "
                    >
                      {{ campaign.status }}
                    </span>
                  </td>
                  <td>{{ campaign.startDate }}</td>
                  <td>{{ campaign.endDate }}</td>
                  <td>R{{ campaign.budget.toLocaleString() }}</td>
                  <td>{{ campaign.impressions.toLocaleString() }}</td>
                  <td>{{ campaign.clicks.toLocaleString() }}</td>
                  <td>{{ campaign.ctr }}%</td>
                  <td>
                    <button
                      class="btn btn-sm btn-primary me-1"
                      @click="editCampaign(campaign.id)"
                    >
                      <i class="fas fa-edit"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-danger"
                      @click="pauseCampaign(campaign.id)"
                    >
                      <i class="fas fa-pause"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Campaigns Page -->
    <div v-if="activePage === 'campaigns'">
      <h3>Your Advertising Campaigns</h3>
      <p class="text-muted">
        Manage all your advertising campaigns for Laudium News
      </p>

      <!-- Campaign management content would go here -->
      <div class="alert alert-info">
        Campaign management interface is loading. This section allows you to
        create, edit, and monitor all your ad campaigns.
      </div>
    </div>

    <!-- Analytics Page -->
    <div v-if="activePage === 'analytics'">
      <h3>Campaign Analytics</h3>
      <p class="text-muted">
        Detailed analytics for your advertising performance
      </p>

      <!-- Analytics content would go here -->
      <div class="alert alert-info">
        Analytics interface is loading. This section provides detailed metrics
        and insights about your advertising performance.
      </div>
    </div>

    <!-- Other pages would be implemented similarly -->
  </main>
</template>

<style scoped>
.icon-box {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dashboard-header {
  background-color: #f8f9fa;
}

.chart-area {
  position: relative;
  height: 300px;
  width: 100%;
}

.chart-pie {
  position: relative;
  height: 300px;
  width: 100%;
}

/* Card styling */
.card {
  margin-bottom: 24px;
  border: none;
  box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
}

.card .card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #e3e6f0;
}
</style>
