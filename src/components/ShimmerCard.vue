<template>
  <div class="card news-card h-100 bg-white">
    <div class="card-img-container position-relative">
      <div class="card-img-top shimmer" style="height: 200px"></div>
      <span
        class="category-badge badge shimmer"
        style="
          width: 80px;
          height: 20px;
          position: absolute;
          top: 10px;
          left: 10px;
        "
      ></span>
    </div>
    <div class="card-body">
      <div class="shimmer mb-2" style="height: 20px; width: 80%"></div>
      <div
        class="shimmer"
        style="height: 15px; width: 100%; margin-bottom: 5px"
      ></div>
      <div class="shimmer" style="height: 15px; width: 90%"></div>
    </div>
    <div
      class="card-footer d-flex justify-content-between align-items-center bg-light"
    >
      <div class="shimmer" style="width: 60px; height: 15px"></div>
      <div class="shimmer" style="width: 80px; height: 30px"></div>
    </div>
  </div>
</template>

<style scoped>
  .shimmer {
    position: relative;
    overflow: hidden;
    background: #e0e0e0; /* Light gray background for light theme */
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
      #f8f9fa 50%, /* Light color for shimmer effect */
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
