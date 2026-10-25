<template>
  <div class="position-relative">
    <div v-if="loading" class="shimmer-placeholder"></div>
    <img
      v-if="!loading"
      :src="imageSrc"
      :alt="alt"
      width="40"
      height="40"
      alt="article thumbnail"
      @load="loading = false"
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

const isVisible = ref(false);
const imageSrc = ref("");
const loading = ref(true);

onMounted(() => {
  isVisible.value = true;
  loadImage();
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
  position: relative;
  width: 100%;
  height: auto;
  min-height: 180px;
  background-color: #f0f0f0;
  overflow: hidden;
}

.shimmer-placeholder {
  width: 100%;
  height: 100%;
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
