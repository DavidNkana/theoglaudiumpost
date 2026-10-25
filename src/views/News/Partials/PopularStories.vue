<script setup>
import { ref, onMounted } from "vue";
import { useStore } from "vuex";
import ArticlesRow from "./ArticlesRow.vue";

const props = defineProps({
  page: {
    type: String,
    default: "home",
  },
});

const isLoading = ref(null);
const store = useStore();
// const popularStories = computed(() => store.state.latestNews.slice(2, 6));

onMounted(() => {
  fetchPosts();
});

// Fetch posts based on current tab and filters
const fetchPosts = async () => {
  isLoading.value = true;

  try {
    await store.dispatch("articles/fetchArticlesByType", {
      type: "popular",
      size: 8,
    });

    isLoading.value = false;
  } catch (error) {
    console.error("Error fetching posts:", error);
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="popular-news d-none d-lg-block">
    <div class="section-header d-flex align-items-center mb-3">
      <h2 class="section-title m-0">Popular Stories</h2>
      <div class="section-line flex-grow-1 mx-3"></div>
    </div>
    <ArticlesRow
      :is-loading="isLoading"
      :articles="store.getters['articles/popularArticles']"
    />
  </div>
</template>
