<script setup>
import { ref, onMounted } from "vue";
import { getStats } from "@/features/dashboard/DashboardService";

const isLoading = ref(false);

// Stats
const stats = ref({});

onMounted(() => {
  fetchStats();
});

const fetchStats = async () => {
  isLoading.value = true;

  try {
    const response = await getStats();
    if (response.status != 200) throw new Error("Unable to Fetch Stats");
    stats.value = response.data;

    isLoading.value = false;
  } catch (error) {
    console.error(error);
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="row g-3 mb-4">
    <template v-if="!isLoading">
      <div class="col-sm-8 col-lg-4">
        <div class="card border-0 shadow-sm h-100">
          <div
            class="card-body d-flex flex-column flex-sm-row align-sm-items-center"
          >
            <div
              class="icon-box bg-success bg-opacity-10 text-success rounded-3 me-sm-3 mb-3 mb-sm-0 d-flex align-items-center justify-content-center"
              style="width: 60px; height: 60px"
            >
              <i class="bi bi-newspaper fs-3"></i>
            </div>
            <div class="flex-grow-1">
              <div class="d-flex align-items-center gap-4">
                <div>
                  <h6 class="mb-1">Total Articles</h6>
                  <h3 class="mb-0">
                    {{ stats.articles?.total_articles ?? 0 }}
                  </h3>
                </div>
                <div class="d-flex flex-column gap-2">
                  <div class="d-flex align-items-center gap-3">
                    <h6 class="text-success m-0">Published</h6>
                    <span class="h6 mb-0">
                      {{ stats.articles?.total_published ?? 0 }}
                    </span>
                  </div>
                  <div class="d-flex align-items-center gap-3">
                    <h6 class="text-warning m-0">Draft</h6>
                    <span class="h6 mb-0">
                      {{ stats.articles?.total_draft ?? 0 }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body d-flex align-items-center">
            <div
              class="icon-box bg-success bg-opacity-10 text-success rounded-3 me-3"
            >
              <i class="bi bi-badge-ad fs-3"></i>
            </div>
            <div>
              <h6 class="mb-1">Active Ads</h6>
              <h3 class="mb-0">{{ stats.ads?.total_ads ?? "-" }}</h3>
            </div>
          </div>
        </div>
      </div>

      <!-- <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body d-flex align-items-center">
            <div
              class="icon-box bg-warning bg-opacity-10 text-warning rounded-3 me-3"
            >
              <i class="bi bi-shop fs-3"></i>
            </div>
            <div>
              <h6 class="mb-1">Businesses</h6>
              <h3 class="mb-0">42</h3>
            </div>
          </div>
        </div>
      </div>

      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body d-flex align-items-center">
            <div
              class="icon-box bg-info bg-opacity-10 text-info rounded-3 me-3"
            >
              <i class="bi bi-people fs-3"></i>
            </div>
            <div>
              <h6 class="mb-1">Total Users</h6>
              <h3 class="mb-0">1,254</h3>
            </div>
          </div>
        </div>
      </div> -->
    </template>
    <template v-else>
      <div
        v-for="index in 4"
        :key="'shimmer' + index"
        class="col-md-3 col-sm-6 mb-3"
      >
        <div class="card bg-ghost text-white shimmer" style="height: 100px">
          <div class="card-body"></div>
        </div>
      </div>
    </template>
  </div>
</template>
<style scoped>
.responsive-icon {
  font-size: 1.25rem; /* default for mobile (sm) */
}

@media (min-width: 768px) {
  .responsive-icon {
    font-size: 1.75rem; /* md */
  }
}

@media (min-width: 992px) {
  .responsive-icon {
    font-size: 2rem; /* lg */
  }
}
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
