<template>
  <main class="container py-4 advertisement-detail">
    <div v-if="loading" class="text-center py-5" role="status">Loading advertisement…</div>
    <div v-else-if="error" class="alert alert-warning" role="alert">{{ error }}</div>
    <article v-else-if="ad" class="mx-auto" style="max-width: 860px">
      <span class="badge bg-secondary mb-3">Advertisement</span>
      <div v-if="images.length" class="row g-3 mb-4">
        <div v-for="image in images" :key="image" class="col-12" :class="{ 'col-md-6': images.length > 1 }">
          <img :src="image" :alt="ad.title || 'Advertisement creative'" class="img-fluid rounded shadow-sm w-100" />
        </div>
      </div>
      <h1 class="h2">{{ ad.title || "Advertisement" }}</h1>
      <p v-if="ad.business_name" class="lead text-muted">{{ ad.business_name }}</p>
      <p v-if="ad.description" class="advertisement-description">{{ ad.description }}</p>
      <dl class="row small text-muted" v-if="ad.placement_date || ad.expiry_date || ad.campaign_id">
        <template v-if="ad.placement_date"><dt class="col-sm-3">Starts</dt><dd class="col-sm-9">{{ formatDate(ad.placement_date) }}</dd></template>
        <template v-if="ad.expiry_date"><dt class="col-sm-3">Ends</dt><dd class="col-sm-9">{{ formatDate(ad.expiry_date) }}</dd></template>
        <template v-if="ad.campaign_id"><dt class="col-sm-3">Campaign</dt><dd class="col-sm-9">{{ ad.campaign_id }}</dd></template>
      </dl>
      <a v-if="safeClickUrl" :href="safeClickUrl" target="_blank" rel="noopener noreferrer" class="btn btn-primary" @click="trackCta">Visit {{ ad.business_name || "advertiser" }}</a>
      <p v-else class="text-muted small">This advertisement has no valid destination.</p>
    </article>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { getAd, trackClick } from "@/features/ads/AdsService";
import { getSafeExternalUrl } from "@/features/ads/adNavigation";
import { getMediaObjectUrl } from "@/features/media/MediaService";

const props = defineProps({ id: { type: String, required: true } });
const ad = ref(null);
const loading = ref(true);
const error = ref("");
const resolvedImages = ref([]);
const images = computed(() => resolvedImages.value);
const safeClickUrl = computed(() => getSafeExternalUrl(ad.value?.click_url));
const formatDate = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
const trackCta = () => { if (ad.value?.id) trackClick(ad.value.id); };

const loadImages = async (value) => {
  const references = Array.isArray(value.files) && value.files.length ? value.files : [value.image_url].filter(Boolean);
  resolvedImages.value = (await Promise.all(references.map(async (reference) => {
    if (/^(https?:|data:|blob:)/i.test(reference)) return reference;
    try { return await getMediaObjectUrl(reference); } catch { return null; }
  }))).filter(Boolean);
};

onMounted(async () => {
  try {
    const response = await getAd(props.id);
    ad.value = response.data;
    await loadImages(ad.value);
  } catch (err) {
    error.value = err?.response?.data?.message || "Advertisement unavailable";
  } finally { loading.value = false; }
});
</script>
