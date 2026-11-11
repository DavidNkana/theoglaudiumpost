<script setup>
/**
 * components/NewspaperAdCard.vue
 *
 * The advertisement card used by the mobile newspaper feed.
 *
 * An advertisement on the mobile feed is the picture and nothing else: it
 * runs the full width of the column and is as long as the creative, which is
 * how a full-page advertisement reads in a paper.
 */

import { computed, ref, watch } from "vue";

const props = defineProps({
  ad: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["loaded"]);

const PLACEHOLDER_IMAGE = "https://placehold.co/600x1000?text=Advertisement";

const imageUrl = ref(null);

/**
 * Resolves the creative for the advertisement.
 */
const resolveImage = () => {
  const ad = props.ad ?? {};

  if (ad.image_url) {
    imageUrl.value = ad.image_url;
  } else if (Array.isArray(ad.images) && ad.images.length) {
    imageUrl.value = ad.images[0];
  } else if (Array.isArray(ad.files) && ad.files.length) {
    imageUrl.value = ad.files[0];
  } else {
    imageUrl.value = PLACEHOLDER_IMAGE;
  }

  emit("loaded");
};

watch(() => props.ad, resolveImage, { immediate: true });

const linkTarget = computed(() => props.ad?.click_url || "#");
</script>

<template>
  <div class="newspaper-ad">
    <a
        :href="linkTarget"
        target="_blank"
        rel="noopener noreferrer"
        class="ad-link"
    >
      <img
          :src="imageUrl"
          :alt="ad?.title || 'Advertisement'"
          class="ad-image"
          @load="emit('loaded')"
      />
    </a>
  </div>
</template>

<style scoped>
.newspaper-ad {
  width: 100%;
  margin-bottom: 10px;
  background-color: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.ad-link {
  display: block;
  line-height: 0;
}

.ad-image {
  display: block;
  width: 100%;
  height: auto;
  object-fit: cover;
}
</style>
