<template>
  <div v-if="ads.length" class="w-full">
    <a
      :href="currentAd.linkUrl"
      target="_blank"
      @click="trackClick(currentAd.id)"
    >
      <img
        :src="currentAd.imageUrl"
        :alt="currentAd.title"
        class="rounded shadow w-full"
      />
    </a>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted, computed } from "vue";
  import { useAds } from "@/composables/useAds";

  const props = defineProps({ placement: String });
  const { ads, trackClick } = useAds(props.placement);

  const currentIndex = ref(0);
  const currentAd = computed(() => ads.value[currentIndex.value] || {});

  let interval;

  onMounted(() => {
    interval = setInterval(() => {
      if (ads.value.length > 0) {
        currentIndex.value = Math.floor(Math.random() * ads.value.length);
      }
    }, 8000); // Rotate every 8 seconds
  });

  onUnmounted(() => clearInterval(interval));
</script>
