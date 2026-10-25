<template>
  <div class="image-wrapper">
    <div v-if="loading" class="shimmer-placeholder"></div>
    <img
      v-if="!loading"
      :src="imageSrc"
      :alt="alt"
      class="d-block w-100"
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
  image: {
    type: Object,
    required: false,
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
  console.log(
    "Mounted FeaturedImageWithPlaceholder with mediaId:",
    props.mediaId,
    "and image:",
    props.image
  );
  if (props.image && props.image.file) {
    imageSrc.value = props.image.file;
    loading.value = false;
    emit("loaded", { mediaId: props.mediaId, url: props.image.file });
    return;
  } else if (props.mediaId) {
    console.log("Loading image for mediaId:", props.mediaId);
    loadImage();
  } else {
    console.warn("No mediaId provided for FeaturedImageWithPlaceholder");
    loading.value = false;
    return;
  }
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
img {
  width: 100% !important;
  height: 100% !important;
  object-fit: fill;
  display: block;
}

.image-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #f0f0f0;
}

.shimmer-placeholder {
  width: 100%;
  height: 100%;
  min-height: 280px;
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
