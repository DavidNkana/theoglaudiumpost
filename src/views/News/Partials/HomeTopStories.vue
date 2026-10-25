<script setup>
import { ref, onMounted } from "vue";
import { useStore } from "vuex";
import NewsCard from "@/components/NewsCard.vue";
import ArticlesRow from "@/views/News/Partials/ArticlesRow.vue";

const isLoading = ref(null);
const store = useStore();

onMounted(() => {
  fetchPosts();
});

// Fetch posts based on current tab and filters
const fetchPosts = async () => {
  try {
    isLoading.value = true;
    await store.dispatch("articles/fetchArticlesByType", {
      type: "topStories",
      size: 10,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="popular-news">
    <div class="section-header d-flex align-items-center mb-3">
      <h2 class="section-title m-0">Top Stories</h2>
      <div class="section-line flex-grow-1 mx-3"></div>
    </div>
    <div v-if="!isLoading" class="list-group list-group-flush">
      <div v-for="(story, index) in store.getters['articles/topStories']">
        <NewsCard v-if="index == 0" :article="story" min-details class="mb-2" />
        <div v-else class="list-group-item list-group-item-action my-1 rounded">
          <div class="h6 md-h5">
            <router-link class="nav-link title" :to="`/news/${story.slug}`">
              {{ story.title }}</router-link
            >
          </div>
        </div>
      </div>
    </div>
    <ArticlesRow v-else :is-loading="isLoading" :articles="[]" />
  </div>
</template>
<style scoped>
.list-group-item {
  border: none;
  box-shadow: none;
  background-color: var(--primary-dark);
  color: white;
  transition: transform 0.3s ease;
  overflow: hidden;
}
.list-group-item:hover {
  transform: translateY(-5px);
  background-color: var(--primary-dark);
  color: white;
}

.nav-link {
  color: inherit !important;
  text-decoration: none !important;
}

.nav-link:hover {
  color: var(--secondary) !important;
  text-decoration: underline !important;
}
</style>
