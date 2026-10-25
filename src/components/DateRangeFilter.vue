<template>
  <div class="date-range-filter mb-3">
    <div class="d-flex flex-wrap align-items-center">
      <div class="me-3 mb-2">
        <div class="btn-group" role="group">
          <button
            type="button"
            class="btn btn-sm"
            :class="{ 'btn-success': activeFilter === 'week', 'btn-outline-success': activeFilter !== 'week' }"
            @click="setFilter('week')"
          >
            Week
          </button>
          <button
            type="button"
            class="btn btn-sm"
            :class="{ 'btn-success': activeFilter === 'month', 'btn-outline-success': activeFilter !== 'month' }"
            @click="setFilter('month')"
          >
            Month
          </button>
          <button
            type="button"
            class="btn btn-sm"
            :class="{ 'btn-success': activeFilter === 'custom', 'btn-outline-success': activeFilter !== 'custom' }"
            @click="setFilter('custom')"
          >
            Custom
          </button>
        </div>
      </div>
      
      <div v-if="activeFilter === 'custom'" class="d-flex flex-wrap">
        <div class="me-2 mb-2">
          <input
            type="date"
            class="form-control form-control-sm"
            v-model="startDate"
            :max="endDate"
          />
        </div>
        <div class="me-2 mb-2">
          <input
            type="date"
            class="form-control form-control-sm"
            v-model="endDate"
            :min="startDate"
          />
        </div>
        <div class="mb-2">
          <button
            class="btn btn-sm btn-success"
            @click="applyCustomFilter"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
  initialFilter: {
    type: String,
    default: 'month'
  }
});

const emit = defineEmits(['filter-changed']);

const activeFilter = ref(props.initialFilter);
const startDate = ref('');
const endDate = ref('');

// Set default dates
onMounted(() => {
  const today = new Date();
  
  // Default end date is today
  endDate.value = formatDate(today);
  
  // Default start date is 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  startDate.value = formatDate(thirtyDaysAgo);
  
  // Apply initial filter
  applyFilter();
});

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setFilter(filter) {
  activeFilter.value = filter;
  
  if (filter !== 'custom') {
    applyFilter();
  }
}

function applyCustomFilter() {
  applyFilter();
}

function applyFilter() {
  const today = new Date();
  let start = new Date();
  let end = new Date();
  
  if (activeFilter.value === 'week') {
    // Set start date to 7 days ago
    start.setDate(today.getDate() - 7);
    end = today;
  } else if (activeFilter.value === 'month') {
    // Set start date to 30 days ago
    start.setDate(today.getDate() - 30);
    end = today;
  } else if (activeFilter.value === 'custom') {
    // Use the selected custom dates
    start = new Date(startDate.value);
    end = new Date(endDate.value);
  }
  
  emit('filter-changed', {
    filter: activeFilter.value,
    startDate: formatDate(start),
    endDate: formatDate(end)
  });
}
</script>

<style scoped>
.date-range-filter {
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
}
</style>