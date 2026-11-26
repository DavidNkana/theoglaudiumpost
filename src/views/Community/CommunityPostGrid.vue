<script setup>
import { onMounted, computed } from "vue";
import { useStore } from "vuex";
import { formatDate } from "@/utils";
const store = useStore();
const posts = computed(() => store.getters["communityPosts/posts"] ?? []);
const loading = computed(() => store.state?.communityPosts?.loading ?? false);
onMounted(async () => {
  try { await store.dispatch("communityPosts/fetchPosts", { status: "published" }); } catch (error) { /* the notices flow remains usable if posts are unavailable */ }
});
</script>
<template>
  <section class="community-posts mb-5" aria-labelledby="community-posts-heading">
    <div class="d-flex justify-content-between align-items-end mb-3">
      <div><p class="eyebrow mb-1">From our community</p><h3 id="community-posts-heading" class="mb-0">Community Posts</h3></div>
    </div>
    <div v-if="loading && !posts.length" class="text-muted">Loading community posts…</div>
    <div v-else-if="!posts.length" class="empty-posts">No community posts have been published yet.</div>
    <div v-else class="community-post-grid">
      <article v-for="post in posts" :key="post.id" class="community-post-card">
        <router-link :to="`/community/${post.slug}`" class="text-decoration-none">
          <img v-if="post.imageUrl || post.image_url" :src="post.imageUrl || post.image_url" :alt="post.title" loading="lazy" />
          <div v-else class="post-image-placeholder" aria-hidden="true"><i class="bi bi-image"></i></div>
          <div class="p-3"><h3>{{ post.title }}</h3><time :datetime="post.publishedAt || post.published_at">{{ formatDate(post.publishedAt || post.published_at || post.createdAt) }}</time></div>
        </router-link>
      </article>
    </div>
  </section>
</template>
<style scoped>
.community-posts { color: white; }
.eyebrow { color: var(--secondary); text-transform: uppercase; letter-spacing: .12em; font-size: .75rem; font-weight: 700; }
.community-post-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
.community-post-card { background: var(--primary-dark); border-radius: .65rem; overflow: hidden; box-shadow: 0 .75rem 1.5rem rgba(0,0,0,.16); transition: transform .2s ease; }
.community-post-card:hover { transform: translateY(-4px); }
.community-post-card img, .post-image-placeholder { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
.post-image-placeholder { display: grid; place-items: center; background: #254d38; color: var(--secondary); font-size: 2rem; }
.community-post-card h3 { color: white; font-size: 1.05rem; line-height: 1.3; margin: 0 0 .4rem; }
.community-post-card time { color: #b8c8bf; font-size: .8rem; }
.empty-posts { padding: 1.5rem; background: rgba(255,255,255,.08); border-radius: .5rem; }
</style>
