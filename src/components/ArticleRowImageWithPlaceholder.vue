<template>
  <div class="image-wrapper">
    <div v-if="loading" class="shimmer-placeholder"></div>
    <img
      v-if="!loading"
      :src="imageSrc"
      :alt="alt"
      @load="loading = false"
      class="img-fluid rounded rounded-lg-start article-img"
    />
  </div>
</template>

<script setup>
import { getMediaObjectUrl } from "@/features/media/MediaService";
import { ref, onMounted } from "vue";

const props = defineProps({
  mediaId: {
    type: Number,
    required: true,
  },
  alt: {
    type: String,
    default: "Image",
  },
});

const emit = defineEmits(["loaded"]);

const isVisible = ref(true);
const imageSrc = ref("");
const loading = ref(true);

onMounted(() => {
  loadImage();
  // const observer = new IntersectionObserver(
  //   ([entry]) => {
  //     if (entry.isIntersecting) {
  //       isVisible.value = true;
  //       loadImage();
  //       observer.disconnect();
  //     }
  //   },
  //   { threshold: 0.1 }
  // );

  // observer.observe(document.querySelector(".image-wrapper"));
});

async function loadImage() {
  try {
    const url = await getMediaObjectUrl(props.mediaId);
    imageSrc.value = url;
    loading.value = false;
    emit("loaded", { mediaId: props.mediaId, url });
  } catch (err) {
    console.error("Failed to load image:", err);
  }
}
</script>

<style scoped>
.image-wrapper {
  width: 100%;
  height: 100%;
  background-color: #f0f0f0;
}

.article-img {
  width: 100% !important;
  height: 100% !important;
  object-fit: fill;
  display: block;
}

.shimmer-placeholder {
  width: 100%;
  height: 100%;
  min-height: 120px;
  animation: shimmer 1.5s infinite;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
</style>
