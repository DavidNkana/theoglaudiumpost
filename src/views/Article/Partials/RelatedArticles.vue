<script setup>
import NewsCard from "@/components/NewsCard.vue";

const props = defineProps({
  articles: {
    required: true,
    type: Array,
  },
});
</script>

<template>
  <div class="">
    <div class="section-header d-flex align-items-center mb-3">
      <h2 class="section-title m-0">Related Articles</h2>
    </div>
    <div class="px-2 row">
      <div v-for="story in articles" :key="story.id" class="col-8 col-md-4">
        <NewsCard :article="story" />
      </div>
    </div>
  </div>
</template>
<style scoped>
.news-card {
  flex: 0 0 300px; /* Fixed width, won't shrink */
  white-space: normal;
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
  .news-card {
    flex: 0 0 280px; /* Smaller cards on mobile */
  }

  .scroll-fade::after {
    width: 30px; /* Smaller fade on mobile */
  }

  .scroll-container {
    gap: 0.75rem; /* Tighter gap on mobile */
  }
}

@media (max-width: 480px) {
  .news-card {
    flex: 0 0 250px; /* Even smaller cards on small mobile */
  }

  .scroll-fade::after {
    width: 25px;
  }

  .scroll-container {
    gap: 0.5rem;
  }
}

/* Fade effect to indicate more content */
.scroll-fade {
  position: relative;
}

.scroll-fade::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 50px;
  height: 100%;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.9));
  pointer-events: none;
  z-index: 1;
}

.scroll-fade.at-end::after {
  display: none;
}

.card-img-top {
  max-height: 180px;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.hover-card {
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  border-radius: 0.5rem;
  overflow: hidden;
}

.hover-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1) !important;
}

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
</style>
