<script setup>
  import { ref, onMounted } from "vue";
  import { useStore } from "vuex";
  const isLoading = ref(false);
  const store = useStore();

  const props = defineProps({
    page: {
      type: String,
      default: "news",
    },
  });

  onMounted(() => {
    fetchTags();
  });

  // Fetch posts based on current tab and filters
  const fetchTags = async () => {
    isLoading.value = true;

    try {
      await store.dispatch("tags/fetchTags");

      isLoading.value = false;
    } catch (error) {
      console.error("Error fetching posts:", error);
      isLoading.value = false;
    }
  };
</script>

<template>
  <div>
    <div class="section-header d-flex align-items-center mb-3">
      <h2 class="section-title m-0">Popular Tags</h2>
      <div class="section-line flex-grow-1 mx-3"></div>
    </div>
    <div class="tags">
      <a
        href="#"
        class="badge bg-light text-dark text-decoration-none p-2 me-2 mb-2 d-inline-block"
        v-for="tag in store.getters['tags/tags']"
        :key="tag.id"
        >{{ tag.name }}</a
      >
    </div>
  </div>
</template>
<style scoped>
  .popular-tags {
    display: flex;
    flex-wrap: wrap;
  }

  .tags .badge {
    font-weight: 500;
    font-size: 0.85rem;
    transition:
      background-color 0.2s,
      color 0.2s;
  }

  .tags .badge:hover {
    background-color: #28a745 !important;
    color: white !important;
  }
</style>
