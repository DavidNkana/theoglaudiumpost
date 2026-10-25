<template>
  <div class="image-wrapper position-relative">
    <div v-if="loading" class="shimmer-placeholder"></div>
    <img
        v-if="!loading"
        :src="imageSrc"
        :alt="alt"
        class="card-img-top"
        @load="loading = false"
    />
    <!-- class="img-fluid" -->
  </div>
</template>

<script setup>
import {getMediaById} from "@/features/media/MediaService";
import {ref, onMounted} from "vue";

const props = defineProps({
  mediaId: {
    type: Number,
    required: true,
  },
  image: {
    type: [Object, String],
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
  loadImage();
  // If image prop is provided, use it directly
  if (props.image) {
    if (typeof props.image === "string") {
      imageSrc.value = props.image;
      loading.value = false;
      emit("loaded", {mediaId: props.mediaId, url: props.image});
      return;
    } else if (props.image.file) {
      imageSrc.value = props.image.file;
      loading.value = false;
      emit("loaded", {mediaId: props.mediaId, url: props.image.file});
      return;
    }
  }

  // Otherwise, use IntersectionObserver to load image when it becomes visible

  // const observer = new IntersectionObserver(
  //   ([entry]) => {
  //     if (entry.isIntersecting) {
  //       isVisible.value = true;
  //       observer.disconnect();
  //     }
  //   },
  //   { threshold: 0.1 }
  // );

  // observer.observe(document.querySelector(".image-wrapper"));
});

async function loadImage() {
  try {
    const response = await getMediaById(props.mediaId);
    let url = ""
    if (response.data.url.includes("base64")) {
      url = URL.createObjectURL(response.data.url);
    }else{
      url = response.data.url;
    }
    /*
    PopularStories.vue
HomeTopStories.vue
RecentUpdates.vue
LatestNews.vue
    * */
    imageSrc.value = url;
    loading.value = false;
    emit("loaded", {mediaId: props.mediaId, url});
  } catch (err) {
    console.error("Failed to load image:", err);
  }
}
</script>

<style scoped>
.image-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #f0f0f0;
}

.card-img-top {
  width: 100%;
  height: 100%;
  object-fit: fill;
  display: block;
}

.shimmer-placeholder {
  width: 100%;
  height: 100%;
  min-height: 140px;
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
