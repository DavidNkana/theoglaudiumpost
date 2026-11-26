<template>
  <div v-for="ad in ads" :key="ad.id" class="mb-4">
    <a :href="advertisementDetailPath(ad.id)" @click="trackClick(ad.id)" rel="noopener noreferrer">
      <img :src="ad.image" :alt="ad.title" class="rounded shadow" />
    </a>
  </div>
</template>

<script setup>
  import { useAds } from "@/composables/useAds";
  import { advertisementDetailPath } from "@/features/ads/adNavigation";
  const { ads, trackClick } = useAds("sidebar");
</script>
