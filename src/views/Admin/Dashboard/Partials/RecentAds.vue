<script setup>
import { ref, onMounted } from "vue";
import { getAds } from "@/features/ads/AdsService";
import {
  formatAdLocation,
  getAdLocationBadgeClass,
  getStatusBadgeClass,
} from "@/utils";

const isLoading = ref(false);

const ads = ref({});

onMounted(() => {
  fetchData();
});

const fetchData = async () => {
  isLoading.value = true;

  try {
    const response = await getAds({
      size: 7,
    });
    if (response.status != 200) throw new Error("Unable to Fetch Recent ads");
    ads.value = response.data.ads ?? [];

    isLoading.value = false;
  } catch (error) {
    console.error(error);
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="card border-0 shadow-lg">
    <div class="card-header bg-white d-flex justify-content-between">
      <h5 class="card-title mb-0">Recent Ads</h5>
      <router-link to="/admin/Ads" class="text-decoration-none text-success"
        >View all</router-link
      >
    </div>
    <div class="card-body p-0">
      <ul v-if="!isLoading" class="list-group list-group-flush">
        <li
          v-for="(ad, index) in ads"
          :key="ad.id"
          class="list-group-item d-flex align-items-center py-3"
        >
          <div class="d-flex align-items-center">
            <span>{{ index + 1 }}</span>
            <div class="ms-4">
              <div class="form-check-label fw-bold">
                {{ ad.title }}
              </div>
              <div class="form-check-label" for="task1">
                {{ ad?.campaign?.business?.name ?? "-" }}
              </div>
            </div>
          </div>

          <span
            class="text-uppercase ms-auto"
            :class="getAdLocationBadgeClass(ad.placement?.location)"
            >{{ formatAdLocation(ad.placement?.location ?? "-") }}</span
          >
        </li>
      </ul>
      <ul v-else class="list-group list-group-flush">
        <li
          v-for="i in 5"
          :key="i"
          class="list-group-item d-flex align-items-center py-3"
        >
          <div class="d-flex align-items-center">
            <span>{{ i }}</span>
            <div class="ms-4">
              <div
                class="shimmer mb-2"
                style="height: 18px; width: 120px"
              ></div>
              <div class="shimmer" style="height: 16px; width: 80px"></div>
            </div>
          </div>
          <div class="ms-auto">
            <div class="shimmer shimmer-badge"></div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
<style scoped>
.table img {
  object-fit: cover;
}

/* Custom styling for truncating text */
.truncate-1 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  max-width: 150px;
}

.truncate-2 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-width: 200px;
  min-width: 150px;
}

.title-col {
  min-width: 180px;
}

.actions-col {
  min-width: 160px;
  text-align: right;
}

/* Shimmer loading effect */
@keyframes shimmer {
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
}

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

.shimmer-img {
  width: 40px;
  height: 40px;
  border-radius: 4px;
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
}

.shimmer-badge {
  width: 70px;
  height: 20px;
  border-radius: 12px;
}

.shimmer-btn {
  height: 31px;
  width: 70px;
  border-radius: 4px;
}

/* Responsive column sizing */
@media (max-width: 992px) {
  .d-lg-none-custom {
    display: none;
  }
}

@media (max-width: 768px) {
  .d-md-none-custom {
    display: none;
  }

  /* .actions-col .btn-group {
      flex-direction: column;
    } */

  .actions-col .btn {
    margin-bottom: 5px;
    border-radius: 0.25rem !important;
  }
}

@media (max-width: 576px) {
  .d-sm-none-custom {
    display: none;
  }
}

.capitalize {
  text-transform: capitalize;
}
</style>
