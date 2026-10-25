<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { MasonryGrid, MasonryGridItem } from "vue3-masonry-css";
import ShimmerCard from "@/components/ShimmerCard.vue";

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  columnWidth: {
    type: Number,
    default: 250
  },
  gap: {
    type: Number,
    default: 16
  },
  loading: {
    type: Boolean,
    default: false
  },
  empty: {
    type: Boolean,
    default: false
  }
});

// Track container width for responsive calculations
const containerWidth = ref(0);
const containerRef = ref(null);

// Calculate number of columns based on container width and columnWidth
const columns = computed(() => {
  if (containerWidth.value === 0) {
    // Default columns before we measure the container
    return { default: 2 };
  }

  const calculateColumns = (width) => {
    if (width < 768) {
      return 2; // Force 2 columns on mobile
    }
    return Math.max(1, Math.floor(width / (props.columnWidth + props.gap)));
  };

  // Create responsive breakpoints
  return {
    default: calculateColumns(containerWidth.value),
    1920: calculateColumns(1920),
    1280: calculateColumns(1280),
    1024: calculateColumns(1024),
    768: 2,  // Always 2 on tablet
    480: 2   // Always 2 on mobile
  };
});

// Calculate gap for different breakpoints
const gutterValue = computed(() => {
  // Always respect the provided gap prop so callers can set 0 for flush layout
  const gapPx = `${props.gap}px`;

  if (containerWidth.value < 768 && containerWidth.value > 0) {
    // Use the same gap on mobile to allow tighter layouts when requested
    return {
      default: gapPx,
      768: gapPx,
      480: gapPx
    };
  }
  // On desktop: use the provided gap as well
  return gapPx;
});

// Check if should show empty state
const showEmpty = computed(() => {
  return props.empty || (!props.loading && props.items.length === 0);
});

// Update container width on mount and resize
const updateContainerWidth = () => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth;
  }
};

let resizeObserver = null;

onMounted(() => {
  updateContainerWidth();

  // Watch for container size changes
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(updateContainerWidth);
    resizeObserver.observe(containerRef.value);
  }
});

onUnmounted(() => {
  if (resizeObserver && containerRef.value) {
    resizeObserver.unobserve(containerRef.value);
    resizeObserver.disconnect();
  }
});
</script>

<template>
  <div ref="containerRef" class="masonry-wrapper">
    <!-- Loading State -->
    <div v-if="loading" class="masonry-state-loading">
      <slot name="loading">
        <MasonryGrid
            :columns="columns"
            :gutter="gutterValue"
            class="masonry-content"
        >
          <MasonryGridItem v-for="i in 12" :key="i">
            <ShimmerCard />
          </MasonryGridItem>
        </MasonryGrid>
      </slot>
    </div>

    <!-- Empty State -->
    <div v-else-if="showEmpty" class="masonry-state">
      <slot name="empty">
        <div class="default-state">No items to display</div>
      </slot>
    </div>

    <!-- Content -->
    <MasonryGrid
        v-else
        :columns="columns"
        :gutter="gutterValue"
        class="masonry-content"
    >
      <MasonryGridItem
          v-for="(item, index) in items"
          :key="item.id || index"
      >
        <slot name="item" :item="item" :index="index"></slot>
      </MasonryGridItem>
    </MasonryGrid>
  </div>
</template>

<style scoped>
.masonry-wrapper {
  width: 100%;
  position: relative;
  min-height: 200px;
  box-sizing: border-box;
  display: flex;
  padding: 0;
  margin: 0;
  justify-content: center;
}

.masonry-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  width: 100%;
}

.masonry-state-loading {
  width: 100%;
  min-height: 200px;
}

.default-state {
  padding: 2rem;
  text-align: center;
  color: #666;
  font-size: 1rem;
}

.masonry-content {
  width: 100%;
}
</style>

<!-- Unscoped styles to override masonry library -->
<style>
.masonry-wrapper .masonry-content {
  column-gap: 0 !important;
  gap: 0 !important;
}

.masonry-wrapper .masonry-content > div {
  margin: 0 !important;
  padding: 0 !important;
  margin-bottom: 0 !important;
  break-inside: avoid;
}

/* Target the masonry items directly */
.masonry-wrapper [class*="masonry"] {
  column-gap: 0 !important;
  gap: 0 !important;
}

.pin-card-wrapper {
  margin: 0 !important;
  padding: 0 !important;
}
</style>