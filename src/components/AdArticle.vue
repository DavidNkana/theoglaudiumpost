<template>
  <div class="card news-card h-100 ad-article">
    <div class="card-img-container position-relative">
      <img 
        :src="adImage" 
        class="card-img-top" 
        alt="Advertisement"
        @error="handleImageError"
      >
      <div class="category-badge badge" :class="adProvider === 'direct' ? 'bg-warning' : 'bg-primary'">
        <span class="link">{{ adProvider === 'direct' ? 'Direct Advertiser' : 'Advertisement' }}</span>
      </div>
    </div>
    <div class="card-body">
      <h5 class="card-title">
        <a :href="adLink" class="nav-link">{{ adTitle }}</a>
      </h5>
      <p class="card-text">{{ adDescription }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { setDefaultImage } from "@/utils";

const props = defineProps({
  placement: {
    type: String,
    default: 'in-article'
  },
  size: {
    type: String,
    default: 'medium'
  },
  adProvider: {
    type: String,
    default: 'direct',
    validator: (value) => ["direct", "google"].includes(value)
  }
});

// Default ad content - in a real implementation, this would come from an ad service
const adTitle = ref('Advertise Your Business Here');
const adDescription = ref('Reach the Laudium community with your products and services');
const adLink = ref('/business/advertise');
const adImage = ref('https://placehold.co/300x200/f8f9fa/495057/?text=Your+Ad+Here');

// Handle image loading errors
const handleImageError = (event) => {
  setDefaultImage(event);
};
</script>

<style scoped>
.ad-article {
  border: 1px solid #dee2e6;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  height: 100%;
}

.ad-article:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.card-img-container {
  height: 200px;
  overflow: hidden;
  background-color: #ffffff;
}

.card-img-top {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.category-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1;
}

.card-title {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.card-text {
  font-size: 0.9rem;
  color: #6c757d;
}

/* Add a subtle indicator that this is an ad */
.ad-article::before {
  content: "AD";
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: rgba(255, 255, 255, 0.8);
  color: #6c757d;
  font-size: 0.7rem;
  padding: 2px 5px;
  border-radius: 3px;
  z-index: 2;
}
</style>
