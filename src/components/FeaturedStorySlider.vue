<script setup>
import { ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import ImageWithPlaceholder from "./ImageWithPlaceholder.vue";
import SliderImageWithPlaceholder from "./SliderImageWithPlaceholder.vue";
// import { formatDateToLongString, setDefaultImage } from "@/utils";

const isLoading = ref(null);
const store = useStore();
const stories = computed(() => store.getters["articles/featuredArticles"]);

onMounted(() => {
  fetchPosts();
});

// Fetch posts based on current tab and filters
const fetchPosts = async () => {
  isLoading.value = true;

  try {
    await store.dispatch("articles/fetchArticlesByType", {
      type: "featured",
      size: 3,
    });
    isLoading.value = false;
  } catch (error) {
    console.error("Error fetching posts:", error);
    isLoading.value = false;
  }
};

const formatDate = (dateString) => {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-ZA", options);
};
</script>

<template>
  <div class="featured-slider position-relative">
    <div
      v-if="!isLoading"
      id="featuredCarousel"
      class="carousel slide"
      :data-bs-ride="'carousel'"
      :data-bs-pause="'false'"
    >
      <div class="carousel-indicators">
        <button
          v-for="(story, index) in stories"
          :key="`indicator-${index}`"
          type="button"
          data-bs-target="#featuredCarousel"
          :data-bs-slide-to="index"
          :class="{ active: index === 0 }"
          :aria-current="index === 0"
          :aria-label="`Slide ${index + 1}`"
        ></button>
      </div>

      <div class="carousel-inner">
        <router-link
          v-for="(story, index) in stories"
          :key="`story-${index}`"
          class="carousel-item position-relative"
          data-bs-interval="10000"
          :class="{ active: index === 0 }"
          :to="`/news/${story.slug}`"
        >
          <SliderImageWithPlaceholder
            class="d-block w-100"
            :media-id="story.cover_id"
          />
          <!-- <img
            :src="story.cover?.file"
            class="d-block w-100"
            :alt="story.title"
          /> -->

          <div class="carousel-caption">
            <span class="badge bg-success mb-2">{{
              story.category?.name
            }}</span>
            <RouterLink :to="`/news/${story.slug}`" class="link">
              <h2 class="featured-title mb-2">
                {{ story.title }}
              </h2>
            </RouterLink>
            <p class="d-none d-md-block">{{ story.summary }}</p>
            <div class="d-flex align-items-center">
              <span class="small text-light">{{
                formatDate(story.scheduledFor || story.created_at)
              }}</span>
            </div>
          </div>
          <div class="featured-overlay"></div>
        </router-link>
      </div>

      <button
        class="carousel-control-prev"
        type="button"
        data-bs-target="#featuredCarousel"
        data-bs-slide="prev"
      >
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Previous</span>
      </button>
      <button
        class="carousel-control-next"
        type="button"
        data-bs-target="#featuredCarousel"
        data-bs-slide="next"
      >
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Next</span>
      </button>
    </div>

    <template v-else>
      <div class="featured-img shimmer" style="height: 240px" />
    </template>
  </div>
</template>
<style scoped>
.featured-slider {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.carousel-item {
  height: 400px;
  padding: 0 !important;
}

.carousel-item {
  transition: transform 0.3s ease;
}

.carousel-item:hover {
  transform: translateY(-5px);
}

.carousel-item img {
  height: 100%;
  object-fit: cover;
}

.featured-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    rgba(0, 0, 0, 0) 100%
  );
}

.carousel-caption {
  text-align: left;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 2rem;
  z-index: 2;
}

.featured-title {
  font-size: 1rem;
  font-weight: 700;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
}

.link {
  text-decoration: none !important;
  color: inherit !important;
}
.link:hover {
  text-decoration: underline !important;
  /* color: rgba(var(--bs-link-color-rgb), var(--bs-link-opacity, 1)) !important; */
}

@media (min-width: 768px) {
  .carousel-item {
    height: 500px;
  }

  .featured-title {
    font-size: 2.25rem;
  }
}

@media (max-width: 767.98px) {
  .carousel-caption {
    padding: 1.5rem;
  }
}
</style>
