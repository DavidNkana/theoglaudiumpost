<template>
  <div v-for="ad in ads" :key="ad.id" class="mb-4">
    <a :href="ad.linkUrl" target="_blank" @click="trackClick(ad.id)">
      <img :src="ad.image" :alt="ad.title" class="rounded shadow" />
    </a>
  </div>
</template>

<script setup>
  import { useAds } from "@/composables/useAds";
  const { ads, trackClick } = useAds("sidebar");
</script>
