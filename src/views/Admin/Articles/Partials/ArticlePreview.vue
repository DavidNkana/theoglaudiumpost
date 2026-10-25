<script setup>
import ImageWithPlaceholder from "@/components/ImageWithPlaceholder.vue";
import Tags from "./Tags.vue";
import { getArticleBySlug } from "@/features/articles/ArticlesService";
import { ref, watch } from "vue";

const props = defineProps({
  post: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["update-props"]);

const isFetching = ref(false);

const fetchPost = async () => {
  try {
    isFetching.value = true;
    const response = await getArticleBySlug(props.post?.slug);
    if (response.status != 200 || !response.data)
      throw new Error("Article not found");

    const article = {
      ...props.post,
      content: response.data.content,
    };

    emit("update-props", article);
  } catch (error) {
    console.log("Error Fetching Post: ", error);
  } finally {
    isFetching.value = false;
  }
};

watch(
  () => props.post,
  (newPost) => {
    if (newPost?.slug && !newPost?.content) {
      fetchPost();
    }
  },
  { immediate: true }
);

const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case "published":
      return "badge bg-success";
    case "draft":
      return "badge bg-info text-dark";
    case "archived":
      return "badge bg-warning text-dark";
    default:
      return "badge bg-secondary";
  }
};
const formatDate = (dateString) => {
  if (!dateString) return "-";

  // Format date as needed
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};
const formatContent = (content) => {
  // For preview purposes, limit content length
  const maxLength = 500;
  let formattedContent = content;

  // Strip HTML if needed
  if (content.length > maxLength) {
    // Simple HTML stripping (for production, consider using a proper HTML parser)
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    formattedContent = tempDiv.textContent || tempDiv.innerText || "";

    // Truncate and add ellipsis
    formattedContent = formattedContent.substring(0, maxLength) + "...";
  }

  return formattedContent;
};

const handleImageLoaded = ({ mediaId, url }) => {
  // Update the post object with the loaded image URL
  if (props.post && mediaId === props.post.cover_id) {
    const updatedPost = {
      ...props.post,
      cover: url,
    };
    emit("update-props", updatedPost);
  }
};
</script>

<template>
  <div class="article-preview">
    <!-- Article Header -->
    <div class="article-preview-header mb-4">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <h2 class="article-title mb-0">{{ post.title }}</h2>
        <button
          type="button"
          class="btn-close"
          aria-label="Close"
          @click="$emit('close')"
        ></button>
      </div>

      <!-- Article Meta -->
      <div class="article-meta d-flex flex-wrap align-items-center gap-3 mb-3">
        <div class="article-status">
          <span class="badge" :class="getStatusBadgeClass(post.status)">
            {{ post.status == "published" ? "Published" : "Draft" }}
          </span>
        </div>

        <div class="article-date">
          <i class="bi bi-calendar3 me-1"></i>
          {{ formatDate(post.scheduledFor || post.created_at) }}
        </div>

        <div class="article-category">
          <i class="bi bi-folder me-1"></i>
          {{ post.category?.name || "Uncategorized" }}
        </div>
      </div>

      <!-- Article Tags -->
      <div class="article-tags mb-3">
        <Tags
          :tags="post.tags"
          variant="detail"
          size="sm"
          color-scheme="pastel"
          :show-icon="true"
          :limit="0"
        />
      </div>
    </div>

    <!-- Cover Image -->
    <div v-if="post.cover_id" class="article-cover mb-4">
      <ImageWithPlaceholder
        class="img-fluid rounded"
        :media-id="post.cover_id"
        :image="post.cover"
        @loaded="handleImageLoaded"
      />
      <!-- <img
        :src="post.cover?.file"
        class="img-fluid rounded"
        :alt="post.title"
      /> -->
    </div>

    <!-- Article Content Preview -->
    <div class="article-content-preview">
      <div
        v-if="post.content"
        class="content-excerpt"
        v-html="formatContent(post.content)"
      ></div>
      <div v-else class="text-muted fst-italic text-center">
        <p v-if="isFetching">Loading Content....</p>
        <div v-else>No content available for preview</div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div
      class="article-actions mt-4 pt-3 border-top d-flex justify-content-between"
    >
      <div>
        <button class="btn btn-outline-secondary" @click="$emit('close')">
          Close
        </button>
      </div>
      <div>
        <button
          class="btn btn-outline-primary me-2"
          @click="$emit('edit', post)"
        >
          <!-- @click="$emit('edit', post)" -->
          <i class="bi bi-pencil me-1"></i> Edit
        </button>
        <!-- <button class="btn btn-primary" @click="$emit('view-full', post)">
          <i class="bi bi-eye me-1"></i> View Full Article
        </button> -->
      </div>
    </div>
  </div>
</template>

<style scoped>
.article-preview {
  padding: 1.5rem;
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  transition: box-shadow 0.3s ease;
}

.article-preview:hover {
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}

.article-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #212529;
  line-height: 1.3;
  transition: color 0.2s ease;
}

.article-title:hover {
  color: #0d6efd;
}

.article-meta {
  font-size: 0.875rem;
  color: #6c757d;
  font-weight: 500;
}

.article-meta i {
  opacity: 0.75;
}

.article-status .badge {
  padding: 0.35em 0.65em;
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.article-tags {
  margin-top: 0.25rem;
}

.article-cover {
  position: relative;
  overflow: hidden;
  border-radius: 0.375rem;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
  width: 100%;
  max-height: 400px;
}

.article-cover img {
  width: 100%;
  max-height: 300px;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.article-cover:hover img {
  transform: scale(1.02);
}

.article-content-preview {
  font-size: 1rem;
  line-height: 1.7;
  color: #495057;
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
  margin: 0 -0.5rem;
  border-radius: 0.25rem;
  scrollbar-width: thin;
  scrollbar-color: #dee2e6 #f8f9fa;
}

.article-content-preview::-webkit-scrollbar {
  width: 8px;
}

.article-content-preview::-webkit-scrollbar-track {
  background: #f8f9fa;
  border-radius: 4px;
}

.article-content-preview::-webkit-scrollbar-thumb {
  background-color: #dee2e6;
  border-radius: 4px;
  border: 2px solid #f8f9fa;
}

.article-content-preview::-webkit-scrollbar-thumb:hover {
  background-color: #adb5bd;
}

.content-excerpt {
  color: #212529;
}

.content-excerpt p:last-child {
  margin-bottom: 0;
}

.article-actions {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.article-actions .btn {
  padding: 0.375rem 1rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.article-actions .btn-primary {
  box-shadow: 0 2px 4px rgba(13, 110, 253, 0.15);
}

.article-actions .btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(13, 110, 253, 0.25);
}

.article-actions .btn-outline-primary:hover {
  transform: translateY(-1px);
}

.article-actions .btn-secondary {
  background-color: #f8f9fa;
  border-color: #e9ecef;
  color: #6c757d;
}

.article-actions .btn-secondary:hover {
  background-color: #e9ecef;
  color: #495057;
}

@media (max-width: 768px) {
  .article-preview {
    padding: 1rem;
  }

  .article-title {
    font-size: 1.5rem;
  }

  .article-content-preview {
    max-height: 300px;
  }

  .article-actions {
    flex-direction: column-reverse;
    gap: 1rem;
  }

  .article-actions > div {
    display: flex;
    width: 100%;
  }

  .article-actions .btn {
    flex: 1;
  }
}
</style>
