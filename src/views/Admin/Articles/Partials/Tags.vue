<template>
  <div class="tag-display" :class="variantClass">
    <template v-if="tags && tags.length > 0">
      <span
        v-for="(tag, index) in limitedTags"
        :key="tag.id || index"
        class="tag-item"
        :class="getTagClasses(tag)"
        :title="tag.name"
      >
        <span v-if="showIcon" class="tag-icon me-1">
          <i class="bi bi-tag-fill"></i>
        </span>
        {{ tag.name }}
        <span
          v-if="clickable"
          class="tag-link"
          @click.stop="handleTagClick(tag)"
        ></span>
      </span>
    </template>

    <template v-else>
      <span class="tag-empty">{{ emptyText }}</span>
    </template>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  // Array of tag objects with at least a name property
  tags: {
    type: Array,
    default: () => [],
  },
  // Display variant: 'table', 'card', 'detail'
  variant: {
    type: String,
    default: "table",
    validator: (value) => ["table", "card", "detail"].includes(value),
  },
  // Maximum number of tags to display before showing "+X more"
  limit: {
    type: Number,
    default: 3,
  },
  // Whether to show the total count indicator when exceeding limit
  showMore: {
    type: Boolean,
    default: true,
  },
  // Whether to show tag icon
  showIcon: {
    type: Boolean,
    default: false,
  },
  // Text to show when there are no tags
  emptyText: {
    type: String,
    default: "No tags",
  },
  // Whether tags are clickable/interactive
  clickable: {
    type: Boolean,
    default: true,
  },
  // Size of tags: 'sm', 'md', 'lg'
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg"].includes(value),
  },
  // Color scheme for tags
  colorScheme: {
    type: String,
    default: "primary",
    validator: (value) =>
      [
        "primary",
        "secondary",
        "success",
        "danger",
        "warning",
        "info",
        "light",
        "dark",
        "pastel",
      ].includes(value),
  },
});
const emits = defineEmits(["tag-click"]);
// Compute CSS classes based on variant
const variantClass = computed(() => ({
  "tag-display-table": props.variant === "table",
  "tag-display-card": props.variant === "card",
  "tag-display-detail": props.variant === "detail",
  [`tag-size-${props.size}`]: true,
}));

// Tags to render (showingMore is always true, so all tags are shown)
const limitedTags = computed(() => props.tags);

// Get CSS classes for each tag based on props
const getTagClasses = (tag) => {
  const classes = [];

  // Size class
  classes.push(`tag-${props.size}`);

  // Color scheme
  if (props.colorScheme === "pastel") {
    // Generate pastel color based on tag name (deterministic)
    const hashCode = tag.name.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    classes.push("tag-pastel");
    classes.push(`tag-pastel-${Math.abs(hashCode) % 10}`); // 10 pastel variants
  } else {
    classes.push(`tag-${props.colorScheme}`);
  }

  // Clickable style
  if (props.clickable) {
    classes.push("tag-clickable");
  }

  return classes;
};

// Handler for tag click. Only wired up in the template when `clickable`
// is true (the overlay is behind v-if="clickable"), so no guard is needed.
const handleTagClick = (tag) => {
  emits("tag-click", tag);
};
</script>

<style scoped>
.tag-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

/* Variant-specific styles */
.tag-display-table {
  justify-content: flex-start;
  max-width: 250px;
}

.tag-display-card {
  justify-content: flex-start;
  margin-top: 0.5rem;
}

.tag-display-detail {
  justify-content: flex-start;
  margin: 1rem 0;
  gap: 0.5rem;
}

/* Tag item styles */
.tag-item {
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  position: relative;
  font-weight: 500;
  overflow: hidden;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-clickable {
  cursor: pointer;
}

/* Size variants */
.tag-sm {
  font-size: 0.75rem;
  padding: 0.15rem 0.4rem;
}

.tag-md {
  font-size: 0.8125rem;
  padding: 0.25rem 0.5rem;
}

.tag-lg {
  font-size: 0.875rem;
  padding: 0.35rem 0.7rem;
}

/* Color schemes */
.tag-primary {
  background-color: rgba(13, 110, 253, 0.15);
  color: #0d6efd;
}

.tag-secondary {
  background-color: rgba(108, 117, 125, 0.15);
  color: #6c757d;
}

.tag-success {
  background-color: rgba(25, 135, 84, 0.15);
  color: #198754;
}

.tag-danger {
  background-color: rgba(220, 53, 69, 0.15);
  color: #dc3545;
}

.tag-warning {
  background-color: rgba(255, 193, 7, 0.15);
  color: #664d03;
}

.tag-info {
  background-color: rgba(13, 202, 240, 0.15);
  color: #0dcaf0;
}

.tag-light {
  background-color: rgba(248, 249, 250, 0.5);
  color: #212529;
  border: 1px solid #dee2e6;
}

.tag-dark {
  background-color: rgba(33, 37, 41, 0.15);
  color: #212529;
}

/* Pastel colors */
.tag-pastel {
  color: #333;
}

.tag-pastel-0 {
  background-color: #ffd6d6;
}
.tag-pastel-1 {
  background-color: #fff2cc;
}
.tag-pastel-2 {
  background-color: #d4f1d9;
}
.tag-pastel-3 {
  background-color: #d1e5f0;
}
.tag-pastel-4 {
  background-color: #e4d7f2;
}
.tag-pastel-5 {
  background-color: #fde2e4;
}
.tag-pastel-6 {
  background-color: #e2ece9;
}
.tag-pastel-7 {
  background-color: #f0efeb;
}
.tag-pastel-8 {
  background-color: #dfe7fd;
}
.tag-pastel-9 {
  background-color: #f3e7d3;
}

.tag-more {
  font-size: 0.75rem;
  color: #6c757d;
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0;
}

.tag-empty {
  font-size: 0.8125rem;
  color: #adb5bd;
  font-style: italic;
}

/* Link overlay for clickable tags */
.tag-link {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
