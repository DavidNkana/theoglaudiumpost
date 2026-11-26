<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { listCommunityPosts, deleteCommunityPost } from "@/features/community/CommunityPostsService";
const router = useRouter(); const posts = ref([]); const loading = ref(true); const error = ref("");
const load = async () => { loading.value = true; error.value = ""; try { posts.value = (await listCommunityPosts()).data; } catch (e) { error.value = e.message; } finally { loading.value = false; } };
const remove = async (post) => { if (!window.confirm(`Delete “${post.title}”?`)) return; try { await deleteCommunityPost(post.id); posts.value = posts.value.filter((item) => item.id !== post.id); } catch (e) { error.value = e.message; } };
onMounted(load);
</script>
<template>
  <div class="container-fluid py-4">
    <div class="d-flex justify-content-between align-items-center mb-4"><div><h1>Community Posts</h1><p class="text-muted mb-0">Image-led community posts. Separate from News Articles and Announcements.</p></div><button class="btn btn-success" @click="router.push('/admin/community-posts/create')">New Community Post</button></div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div><div v-if="loading" class="text-muted">Loading posts…</div>
    <div v-else class="card"><div class="table-responsive"><table class="table align-middle mb-0"><thead><tr><th>Post</th><th>Status</th><th>Date</th><th class="text-end">Actions</th></tr></thead><tbody><tr v-for="post in posts" :key="post.id"><td><div class="d-flex align-items-center gap-3"><img v-if="post.imageUrl || post.image_url" :src="post.imageUrl || post.image_url" :alt="post.title" class="thumb" /><div><strong>{{ post.title }}</strong><div class="small text-muted">/{{ post.slug }}</div></div></div></td><td><span class="badge" :class="post.status === 'published' ? 'bg-success' : 'bg-secondary'">{{ post.status }}</span></td><td>{{ post.publishedAt || post.createdAt ? new Date(post.publishedAt || post.createdAt).toLocaleDateString() : '—' }}</td><td class="text-end"><button class="btn btn-sm btn-outline-secondary me-2" @click="router.push(`/admin/community-posts/edit/${post.id}`)">Edit</button><button class="btn btn-sm btn-outline-danger" @click="remove(post)">Delete</button></td></tr><tr v-if="!posts.length"><td colspan="4" class="text-center py-4 text-muted">No community posts yet.</td></tr></tbody></table></div></div>
  </div>
</template>
<style scoped>.thumb { width: 64px; height: 48px; object-fit: cover; border-radius: .35rem; }</style>
