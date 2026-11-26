<script setup>
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { getCommunityPostBySlug } from "@/features/community/CommunityPostsService";
import { formatDate } from "@/utils";
import Notice from "./Notice.vue";
const route = useRoute();
const post = ref(null); const isNotice = ref(false); const loading = ref(true);
const load = async (slug) => { loading.value = true; post.value = null; isNotice.value = false; try { post.value = (await getCommunityPostBySlug(slug)).data; } catch (error) { if (error?.response?.status === 404) isNotice.value = true; } finally { loading.value = false; } };
onMounted(() => load(route.params.slug));
watch(() => route.params.slug, load);
</script>
<template>
  <Notice v-if="isNotice" />
  <div v-else-if="loading" class="container py-5 text-white">Loading community post…</div>
  <main v-else-if="post" class="container py-5 community-post-detail">
    <router-link to="/community" class="back-link">← Community</router-link>
    <article class="mt-4"><img v-if="post.imageUrl || post.image_url" :src="post.imageUrl || post.image_url" :alt="post.title" class="hero-image" /><p class="post-date">{{ formatDate(post.publishedAt || post.published_at || post.createdAt) }}</p><h1>{{ post.title }}</h1><p class="post-body">{{ post.body }}</p></article>
  </main>
</template>
<style scoped>
.community-post-detail { color: white; max-width: 920px; }.back-link { color: var(--secondary); text-decoration: none; }.hero-image { width: 100%; max-height: 560px; object-fit: cover; border-radius: .75rem; }.post-date { color: #b8c8bf; margin: 1rem 0 .5rem; }.community-post-detail h1 { font-size: clamp(2rem, 5vw, 3.4rem); }.post-body { white-space: pre-wrap; line-height: 1.8; font-size: 1.1rem; color: #edf5ef; }
</style>
