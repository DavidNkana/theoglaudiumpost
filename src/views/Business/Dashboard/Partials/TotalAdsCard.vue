<script setup>
defineProps({
  isLoading: {
    type: Boolean,
    default: false,
  },
  totalAds: {
    type: Number,
    default: 0,
  },
});
</script>

<template>
  <div class="card border-0 shadow-lg h-100">
    <div class="card-body d-flex align-items-center">
      <div
        class="icon-box bg-success bg-opacity-10 text-success rounded-3 me-3"
      >
        <i class="bi bi-badge-ad fs-3"></i>
      </div>
      <div v-if="!isLoading">
        <h6 class="mb-1">Total Ads</h6>
        <h3 class="mb-0">{{ totalAds }}</h3>
      </div>
      <div v-else class="w-100">
        <div class="shimmer mb-2" style="height: 18px; width: 80px"></div>
        <div class="shimmer" style="height: 28px; width: 120px"></div>
      </div>
    </div>
  </div>
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

/* Shimmer loading effect */
.shimmer {
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

@keyframes shimmer {
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
}
</style>
