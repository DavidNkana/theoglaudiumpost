<template>
  <div v-for="ad in ads" :key="ad.id" class="my-6">
    <a :href="ad.linkUrl" target="_blank" @click="trackClick(ad.id)">
      <img :src="ad.imageUrl" :alt="ad.title" class="w-full rounded-lg" />
    </a>
  </div>
</template>

<script setup>
  import { useAds } from "@/composables/useAds";
  const { ads, trackClick } = useAds("in-article-mid"); // or 'in-article-top' etc.
</script>
