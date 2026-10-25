<script setup>
import { ref, onMounted } from "vue";
import {
  formatAdLocation,
  getAdLocationBadgeClass,
  getStatusBadgeClass,
} from "@/utils";
import { getAds } from "@/features/businesses/BusinessesService";

const isLoading = ref(false);
const recentAds = ref([]);

onMounted(() => {
  fetchData();
});

const fetchData = async () => {
  isLoading.value = true;

  try {
    const response = await getAds({
      size: 7,
    }); // Get 7 recent ads
    if (response.status != 200)
      throw new Error("Unable to fetch business recent ads");
    recentAds.value = response.data || [];
    isLoading.value = false;
  } catch (error) {
    console.error(error);
    isLoading.value = false;
    // Fallback to empty array in case of error
    recentAds.value = [];
  }
};
</script>

<template>
  <div class="card border-0 shadow-lg">
    <div class="card-header bg-white d-flex justify-content-between">
      <h5 class="card-title mb-0">Recent Ads</h5>
      <router-link to="/business/ads" class="text-decoration-none text-success"
        >View all</router-link
      >
    </div>
    <div class="card-body p-0">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead>
            <tr>
              <th>Title</th>
              <th>Placement</th>
              <th>Status</th>
              <th>Impressions</th>
              <th>Clicks</th>
              <th>Start Date</th>
            </tr>
          </thead>
          <tbody v-if="!isLoading">
            <tr v-for="ad in recentAds" :key="ad.id">
              <td>{{ ad.title }}</td>
              <td>
                <span
                  class="badge"
                  :class="getAdLocationBadgeClass(ad.placement?.location)"
                >
                  {{ formatAdLocation(ad.placement?.location) }}
                </span>
              </td>
              <td>
                <span class="badge" :class="getStatusBadgeClass(ad.status)">
                  {{ ad.status }}
                </span>
              </td>
              <td>{{ ad.impressions.toLocaleString() }}</td>
              <td>{{ ad.clicks.toLocaleString() }}</td>
              <!-- <td>{{ ad.ctr.toFixed(1) }}%</td> -->
              <td>{{ ad.placement_date.split("T")[0] }}</td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr v-for="i in 5" :key="i">
              <td>
                <div class="shimmer" style="height: 20px; width: 120px"></div>
              </td>
              <td>
                <div class="shimmer shimmer-badge"></div>
              </td>
              <td>
                <div class="shimmer shimmer-badge"></div>
              </td>
              <td>
                <div class="shimmer" style="height: 20px; width: 60px"></div>
              </td>
              <td>
                <div class="shimmer" style="height: 20px; width: 40px"></div>
              </td>

              <td>
                <div class="shimmer" style="height: 20px; width: 80px"></div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom styling for truncating text */
.truncate-1 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  max-width: 150px;
}

/* Shimmer loading effect */
.shimmer {
  height: 16px;
  background: #f6f7f8;
  background-image: linear-gradient(
    to right,
    #f6f7f8 0%,
    #edeef1 20%,
    #f6f7f8 40%,
    #f6f7f8 100%
  );
  background-repeat: no-repeat;
  background-size: 800px 104px;
  position: relative;
  animation-duration: 1.5s;
  animation-fill-mode: forwards;
  animation-iteration-count: infinite;
  animation-name: shimmer;
  animation-timing-function: linear;
  border-radius: 4px;
}

.shimmer-badge {
  width: 70px;
  height: 20px;
  border-radius: 12px;
}

@keyframes shimmer {
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
}
</style>
