<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useStore } from "vuex";
import { formatDateToLongString, setDefaultImage } from "@/utils";
import { getMediaById } from "@/features/media/MediaService";

const isLoading = ref(null);
const isLoadingImage = ref(false);
const imageUrl = ref(null);
const store = useStore();
const featuredArticle = computed(
  () => store.getters["articles/featuredArticles"]?.[0]
);

// Fetch media using cover_id if available
const fetchMedia = async () => {
  if (featuredArticle.value?.cover_id) {
    isLoadingImage.value = true;
    try {
      // Pass "featured" as storyType since this is a featured article
      const response = await getMediaById(featuredArticle.value.cover_id, "featured");
      if (response.data && response.status === 200) {
        // Handle JSON response with URL
        if (response.data.url) {
          imageUrl.value = response.data.url;
        } 
        // Fallback for backward compatibility (blob response)
        else {
          const blob = response.data;
          imageUrl.value = URL.createObjectURL(blob);
        }
      }
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      isLoadingImage.value = false;
    }
  } else if (featuredArticle.value?.cover?.file) {
    // Use existing cover.file if available
    imageUrl.value = featuredArticle.value.cover.file;
  }
};

// Watch for changes in the featuredArticle
watch(featuredArticle, fetchMedia, { immediate: true });

onMounted(() => {
  fetchPosts();
});

// Fetch posts based on current tab and filters
const fetchPosts = async () => {
  isLoading.value = true;

  try {
    await store.dispatch("articles/fetchArticlesByType", {
      type: "featured",
      size: 10,
    });
    isLoading.value = false;
  } catch (error) {
    console.error("Error fetching posts:", error);
    isLoading.value = false;
  }
};
</script>
<template>
  <div class="featured-article">
    <!-- {{ store.getters["articles/featuredArticles"] }} -->
    <div
      class="card border-0 bg-dark text-white overflow-hidden position-relative"
    >
      <template v-if="!isLoading && featuredArticle">
        <div v-if="isLoadingImage" class="image-loading-container featured-img">
          <div class="spinner"></div>
        </div>
        <img
          v-else
          :src="imageUrl"
          class="card-img featured-img"
          alt="Featured Article Image"
          @error="setDefaultImage"
        />
        <div
          class="card-img-overlay featured-overlay d-flex flex-column justify-content-end"
        >
          <div class="featured-content">
            <span class="badge bg-success mb-2">{{
              featuredArticle.category?.name
            }}</span>
            <router-link :to="`/news/${featuredArticle.slug}`" class="link">
              <h2 class="card-title featured-title mb-2">
                {{ featuredArticle.title }}
              </h2>
            </router-link>

            <p class="card-text featured-excerpt">
              {{ featuredArticle.summary }}
            </p>
            <div class="d-flex align-items-center">
              <div class="me-auto">
                <small class="text-white-50">{{
                  formatDateToLongString(featuredArticle.created_at)
                }}</small>
                <span class="mx-2 text-white-50">•</span>
                <small class="text-white-50">5 min read</small>
              </div>
              <router-link
                :to="`/news/${featuredArticle.slug}`"
                class="btn btn-success"
                >Read More</router-link
              >
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="featured-img shimmer" style="height: 240px" />
      </template>
    </div>
  </div>
</template>
<style scoped>
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

.featured-article .card {
  border-radius: 0.5rem;
  overflow: hidden;
}

.featured-img {
  height: 500px;
  object-fit: cover;
  filter: brightness(0.7);
}

.featured-overlay {
  background: linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    rgba(0, 0, 0, 0) 100%
  );
}

.featured-title {
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1.3;
}

.link {
  text-decoration: none !important;
  color: inherit !important;
}
.link:hover {
  text-decoration: underline !important;
  /* color: rgba(var(--bs-link-color-rgb), var(--bs-link-opacity, 1)) !important; */
}

.featured-excerpt {
  max-width: 800px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.image-loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  width: 100%;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #1db46e;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive Adjustments */
@media (max-width: 767.98px) {
  .featured-img {
    height: 300px;
  }

  .featured-title {
    font-size: 1.5rem;
  }
}
</style>
