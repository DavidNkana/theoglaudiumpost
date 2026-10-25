<template>
  <div class="chart-shimmer-container">
    <div class="chart-shimmer-header shimmer"></div>
    <div class="chart-shimmer-body">
      <div class="chart-shimmer-y-axis">
        <div v-for="i in 5" :key="`y-label-${i}`" class="chart-shimmer-y-label shimmer"></div>
      </div>
      <div class="chart-shimmer-chart">
        <div v-for="i in 7" :key="`bar-${i}`" class="chart-shimmer-bar">
          <div class="chart-shimmer-bar-inner shimmer" :style="{ height: `${20 + Math.random() * 60}%` }"></div>
        </div>
      </div>
    </div>
    <div class="chart-shimmer-x-axis">
      <div v-for="i in 7" :key="`x-label-${i}`" class="chart-shimmer-x-label shimmer"></div>
    </div>
  </div>
</template>

<script setup>
// No props or logic needed for this component
</script>

<style scoped>
.chart-shimmer-container {
  width: 100%;
  height: 300px;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.chart-shimmer-header {
  height: 20px;
  width: 60%;
  margin-bottom: 20px;
}

.chart-shimmer-body {
  flex: 1;
  display: flex;
}

.chart-shimmer-y-axis {
  width: 40px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-right: 10px;
}

.chart-shimmer-y-label {
  height: 10px;
  width: 30px;
}

.chart-shimmer-chart {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.chart-shimmer-bar {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
  padding: 0 5px;
}

.chart-shimmer-bar-inner {
  width: 100%;
  border-radius: 4px 4px 0 0;
}

.chart-shimmer-x-axis {
  height: 30px;
  display: flex;
  justify-content: space-between;
  padding-left: 40px;
  margin-top: 10px;
}

.chart-shimmer-x-label {
  width: 40px;
  height: 10px;
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