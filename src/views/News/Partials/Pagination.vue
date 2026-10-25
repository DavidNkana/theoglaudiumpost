<script setup>
  const props = defineProps({
    currentPage: {
      type: Number,
      default: 0,
    },
    pages: {
      type: Number,
    },
  });

  const emits = defineEmits(["change-page"]);
</script>
<template>
  <nav aria-label="News pagination">
    <ul class="pagination justify-content-center">
      <li class="page-item" :class="{ disabled: currentPage === 0 }">
        <a
          class="page-link"
          href="#"
          tabindex="-1"
          aria-disabled="true"
          @click.prevent="$emit('change-page', currentPage - 1)"
          >Previous</a
        >
      </li>
      <li
        class="page-item"
        aria-current="page"
        v-for="page in pages ?? 0"
        :key="`page-${page}`"
        :class="{ active: page - 1 === currentPage }"
      >
        <a
          class="page-link"
          href="#"
          @click.prevent="$emit('change-page', page - 1)"
          >{{ page }}</a
        >
      </li>
      <li class="page-item" :class="{ disabled: currentPage === pages - 1 }">
        <a
          class="page-link"
          href="#"
          @click.prevent="$emit('change-page', currentPage + 1)"
          >Next</a
        >
      </li>
    </ul>
  </nav>
</template>
<style scoped>
  /* Pagination */
  .pagination {
    margin-top: 2rem;
  }

  .page-link {
    color: #28a745;
  }

  .page-item:focus,
  .page-link:focus {
    border-color: #28a745;
    box-shadow: none !important;
  }

  .page-item.active .page-link {
    background-color: #28a745;
    border-color: #28a745;
    color: #fff;
  }
</style>
