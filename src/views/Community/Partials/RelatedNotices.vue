<script setup>
const props = defineProps({
  recentNotices: {
    type: Array,
    required: true,
  },
});
</script>
<template>
  <div v-if="!!recentNotices.length" class="card">
    <div class="card-header">
      <h5 class="mb-0">Recent Updates</h5>
    </div>
    <div class="card-body p-0">
      <ul class="list-group list-group-flush">
        <li
          v-for="(update, index) in recentNotices"
          :key="index"
          class="list-group-item"
        >
          <small class="text-muted d-block mb-1">{{ update.time }}</small>
          <p class="mb-0">{{ update.text }}</p>
        </li>
      </ul>
    </div>
    <div class="card-footer text-center">
      <a href="#" class="btn btn-sm btn-link">View All Updates</a>
    </div>
  </div>
</template>
