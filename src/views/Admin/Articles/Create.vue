<script setup>
/**
 * New script section for src/views/Admin/Articles/Create.vue
 * Admin-entered articles. No AI generation, no automated source finding,
 * no fact-checking — the editor writes and uploads.
 */
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useRouteQuery } from '@vueuse/router';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import Swal from 'sweetalert2';

import TagSelector from './Partials/TagSelector.vue';
import {
  createArticle,
  editArticle,
} from '@/features/articles/ArticlesService';
import { getCategories } from '@/features/categories/CategoriesService';
import { getTags } from '@/features/tags/TagsService';
import { uploadMedia } from '@/features/media/MediaService';

const router = useRouter();
const route = useRoute();

// Route query
const articleId = useRouteQuery('articleId');

// State
const article = ref({
  title: '',
  slug: '',
  summary: '',
  content: '',
  thumbnailUrl: '',
  coverImage: '',
  thumbnailImage: '',
  coverId: null,
  categoryId: '',
  articleType: 'featured',
  archived: false,
  status: 'published',
  scheduledFor: null,
  authorId: null,
  notify: false,
  tags: [],
  sources: [],
});

const validationErrors = ref({});
const isSubmitting = ref(false);
const isLoading = ref(false);
const isUploadingImage = ref(false);
const coverBase64 = ref('');
const thumbnailBase64 = ref('');

// Data
const categories = ref([]);
const tags = ref([]);
const newSourceUrl = ref('');

// Computed
const submitButtonText = computed(() => {
  if (isSubmitting.value) return 'Saving...';

  switch (article.value.status) {
    case 'published':
      return 'Publish Now';
    case 'scheduled':
      return 'Schedule Publication';
    default:
      return 'Save Article';
  }
});

// Methods
const generateSlug = () => {
  if (!article.value.title) return;

  article.value.slug = article.value.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/-+/g, '-') // Remove consecutive dashes
      .substring(0, 255); // Respect DB limit
};

const handleStatusChange = () => {
  if (article.value.status === 'scheduled' && !article.value.scheduledFor) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setMinutes(0);
    article.value.scheduledFor = tomorrow.toISOString().slice(0, 16);
  }
};

/**
 * Uploads the chosen cover image to storage and links it to the article.
 */
const handleImage = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  isUploadingImage.value = true;

  try {
    // Local preview while the upload runs.
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    coverBase64.value = dataUrl;
    thumbnailBase64.value = await generateThumbnailFromImage(dataUrl);

    const response = await uploadMedia(file, article.value.articleType || 'latest');
    article.value.coverId = response.data?.id ?? null;
    article.value.coverImage = response.data?.file ?? '';
  } catch (error) {
    console.error('Error uploading image:', error);
    Swal.fire({
      title: 'Error!',
      text: 'Failed to upload the image. Please try again.',
      icon: 'error',
      confirmButtonText: 'OK',
    });
  } finally {
    isUploadingImage.value = false;
  }
};

// Generate thumbnail from image
function generateThumbnailFromImage(base64) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const maxWidth = 200;
      const maxHeight = 200;
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
  });
}

// Remove image
const removeImage = () => {
  coverBase64.value = null;
  thumbnailBase64.value = null;
  article.value.coverId = null;
  article.value.coverImage = '';
};

// Validate form
const validateForm = () => {
  const errors = {};

  if (!article.value.title.trim()) {
    errors.title = 'Title is required';
  }
  if (!article.value.slug.trim()) {
    errors.slug = 'Slug is required';
  }
  if (!article.value.summary.trim()) {
    errors.summary = 'Summary is required';
  }
  if (!article.value.content.trim()) {
    errors.content = 'Content is required';
  }
  if (article.value.status === 'scheduled' && !article.value.scheduledFor) {
    errors.scheduledFor = 'Please select a publication date';
  }
  if (!coverBase64.value && !thumbnailBase64.value) {
    errors.coverImage = 'Please include Image';
  }
  if (article.value.status === 'scheduled' && article.value.scheduledFor) {
    const scheduledDate = new Date(article.value.scheduledFor);
    if (scheduledDate <= new Date()) {
      errors.scheduledFor = 'Scheduled date must be in the future';
    }
  }
  // Sources validation - articles must have at least one source
  if (!article.value.sources || article.value.sources.length === 0) {
    errors.sources = 'At least one source is required for all articles';
  }

  validationErrors.value = errors;
  return Object.keys(errors).length === 0;
};

// Save article
const saveArticle = async () => {
  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;

  try {
    const payload = {
      ...article.value,
      cover_id: article.value.coverId ?? null,
      coverImage: coverBase64.value ?? '',
      thumbnailImage: thumbnailBase64.value ?? '',
      scheduledFor:
        article.value.status === 'scheduled'
          ? article.value.scheduledFor || new Date().toISOString()
          : null,
    };

    if (articleId.value) {
      await editArticle(articleId.value, payload);
    } else {
      await createArticle(payload);
    }

    Swal.fire('Success!', 'Article created successfully!', 'success');
    localStorage.removeItem('newArticleData');
    router.push('/admin/articles');
  } catch (error) {
    console.error('Error saving article:', error);

    if (error.response && error.response.data.errors) {
      validationErrors.value = error.response.data.errors;
    } else {
      Swal.fire({
        title: 'Error!',
        text:
          error.response?.data?.message ||
          'Failed to save article. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    }
  } finally {
    isSubmitting.value = false;
  }
};

// Reset form
const resetForm = () => {
  if (
      confirm(
          'Are you sure you want to reset the form? All unsaved changes will be lost.'
      )
  ) {
    article.value = {
      title: '',
      slug: '',
      summary: '',
      content: '',
      thumbnailUrl: '',
      coverImage: '',
      thumbnailImage: '',
      coverId: null,
      categoryId: '',
      status: 'published',
      scheduledFor: null,
      notify: false,
      tags: [],
      articleType: 'featured',
      archived: false,
      authorId: article.value.authorId,
    };
    validationErrors.value = {};
  }
};

// Handle tag changes
const handleTagsChange = (tags) => {
  // Process tag changes as needed
};

// Add a new source URL
const addSource = () => {
  if (!newSourceUrl.value.trim()) return;

  // Basic URL validation
  try {
    new URL(newSourceUrl.value);
  } catch {
    Swal.fire({
      title: 'Invalid URL',
      text: 'Please enter a valid URL (e.g., https://example.com/article)',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;
  }

  // Check for duplicates
  if (article.value.sources.includes(newSourceUrl.value)) {
    Swal.fire({
      title: 'Duplicate Source',
      text: 'This source URL has already been added',
      icon: 'warning',
      confirmButtonText: 'OK'
    });
    return;
  }

  article.value.sources.push(newSourceUrl.value);
  newSourceUrl.value = '';
  // Clear validation error if present
  if (validationErrors.value.sources) {
    delete validationErrors.value.sources;
  }
};

// Remove a source by index
const removeSource = (index) => {
  article.value.sources.splice(index, 1);
};

// Initialize article data from route/storage
const initializeArticleData = async () => {
  if (route.query.newArticle === 'true') {
    let articleData;

    if (route.state && route.state.articleData) {
      articleData = route.state.articleData;
    } else {
      localStorage.removeItem('newArticleData');
      localStorage.removeItem('article.thumbnailBase64');
      localStorage.removeItem('article.coverBase64');
    }

    if (articleData) {
      const { title, slug, content, summary, sources } = articleData;

      article.value.title = title || '';

      if (!slug && title) {
        generateSlug();
      } else {
        article.value.slug = slug || '';
      }

      article.value.sources = sources || [];
      article.value.content = content || '';
      article.value.summary = summary || '';
    }
  }
};

// Lifecycle
onMounted(async () => {
  try {
    // Load categories and tags
    const [categoriesResponse, tagsResponse] = await Promise.all([
      getCategories(),
      getTags()
    ]);

    categories.value = categoriesResponse.data?.categories ?? [];
    tags.value = tagsResponse.data ?? [];

    if (categories.value.length > 0) {
      article.value.categoryId = categories.value[0]?.id;
    }

    // Initialize article data from route/storage
    await initializeArticleData();
  } catch (error) {
    console.error('Error fetching initial data:', error);
  }
});
</script>

<template>
  <div class="my-2">
    <div class="card shadow-lg">
      <div class="card-header bg-success text-white">
        <h3 class="mb-0">Create New Article</h3>
      </div>
      <div class="card-body">
        <form @submit.prevent="saveArticle" class="needs-validation">
          <!-- Title and Slug -->
          <div class="row">
            <div class="col-md-6 mb-3 mb-md-0">
              <label for="title" class="form-label">
                Title<span class="text-danger">*</span>
              </label>
              <input
                  type="text"
                  class="form-control"
                  id="title"
                  v-model="article.title"
                  required
                  :class="{ 'is-invalid': validationErrors.title }"
                  @input="generateSlug"
              />
              <div class="invalid-feedback" v-if="validationErrors.title">
                {{ validationErrors.title }}
              </div>
            </div>

            <div class="col-md-6 mb-3 mb-md-0">
              <label for="slug" class="form-label">
                Slug<span class="text-danger">*</span>
              </label>
              <div class="input-group">
                <input
                    type="text"
                    class="form-control"
                    id="slug"
                    v-model="article.slug"
                    required
                    :class="{ 'is-invalid': validationErrors.slug }"
                />
                <div class="invalid-feedback" v-if="validationErrors.slug">
                  {{ validationErrors.slug }}
                </div>
              </div>
              <small class="text-muted">URL-friendly version of the title</small>
            </div>
          </div>

          <!-- Summary -->
          <div class="mb-3">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <label for="summary" class="form-label">
                Summary<span class="text-danger">*</span>
              </label>
            </div>
            <textarea
                class="form-control"
                id="summary"
                v-model="article.summary"
                rows="3"
                required
                :class="{ 'is-invalid': validationErrors.summary }"
            ></textarea>
            <div class="invalid-feedback" v-if="validationErrors.summary">
              {{ validationErrors.summary }}
            </div>
            <small class="text-muted">Short description for article previews</small>
          </div>

          <!-- Content Editor -->
          <div class="mb-4">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <label for="content" class="form-label">
                Content<span class="text-danger">*</span>
              </label>
            </div>
            <div :class="{ 'is-invalid': validationErrors.content }">
              <QuillEditor
                  id="content"
                  v-model:content="article.content"
                  contentType="html"
                  theme="snow"
                  toolbar="full"
                  :styles="{ height: '480px' }"
                  :readonly="false"
                  :enable="true"
              />
            </div>
            <div class="invalid-feedback" v-if="validationErrors.content">
              {{ validationErrors.content }}
            </div>
            <small class="text-muted">Full article body with rich formatting</small>
          </div>

          <!-- Cover Image -->
          <div class="mb-3 col-md-8">
            <label for="thumbnail" class="form-label">Article Cover Image</label>
            <div v-if="coverBase64" class="position-relative text-center">
              <img
                  :src="coverBase64"
                  alt="Preview"
                  class="img-fluid"
                  style="max-width: 300px"
              />
              <button
                  @click="removeImage"
                  type="button"
                  class="position-absolute top-0 end-0 btn btn-danger btn-sm rounded-circle"
                  aria-label="Remove image"
              >
                <i class="bi bi-x"></i>
              </button>
            </div>

            <div v-else class="input-group">
              <input
                  type="file"
                  @change="handleImage"
                  accept="image/*"
                  class="form-control"
                  :class="{ 'is-invalid': validationErrors.coverImage }"
              />
              <span
                  v-if="isUploadingImage"
                  class="input-group-text text-nowrap"
              >
                <span class="spinner-border spinner-border-sm me-1" role="status"></span>
                Uploading
              </span>
              <div class="invalid-feedback" v-if="validationErrors.coverImage">
                {{ validationErrors.coverImage }}
              </div>
            </div>
          </div>

          <!-- Category, Type, Status -->
          <div class="row">
            <div class="col-md-4 mb-3">
              <label for="category" class="form-label">
                Category<span class="text-danger">*</span>
              </label>
              <select
                  class="form-select"
                  id="category"
                  v-model="article.categoryId"
                  required
                  :class="{ 'is-invalid': validationErrors.categoryId }"
              >
                <option value="" disabled>Select a category</option>
                <option
                    v-for="category in categories"
                    :key="category.id"
                    :value="category.id"
                >
                  {{ category.name }}
                </option>
              </select>
              <div class="invalid-feedback" v-if="validationErrors.categoryId">
                {{ validationErrors.categoryId }}
              </div>
            </div>

            <div class="col-6 col-md-4 mb-3">
              <label for="articleType" class="form-label">
                Type<span class="text-danger">*</span>
              </label>
              <select
                  class="form-select"
                  id="articleType"
                  v-model="article.articleType"
                  required
                  :class="{ 'is-invalid': validationErrors.articleType }"
              >
                <option value="featured">Featured</option>
                <option value="top">Top Story</option>
                <option value="popular">Popular Story</option>
              </select>
            </div>

            <div class="col-6 col-md-4 mb-3">
              <label for="status" class="form-label">
                Status<span class="text-danger">*</span>
              </label>
              <select
                  class="form-select"
                  id="status"
                  v-model="article.status"
                  required
                  :class="{ 'is-invalid': validationErrors.status }"
                  @change="handleStatusChange"
              >
                <option value="published">Publish Immediately</option>
                <option value="scheduled">Schedule for Later</option>
              </select>
            </div>
          </div>

          <!-- Scheduled Date/Time -->
          <div class="mb-3 row" v-if="article.status === 'scheduled'">
            <div class="col-6">
              <label for="scheduledDate" class="form-label">
                Publish Date/Time<span class="text-danger">*</span>
              </label>
              <input
                  type="datetime-local"
                  class="form-control"
                  id="scheduledDate"
                  v-model="article.scheduledFor"
                  required
                  :class="{ 'is-invalid': validationErrors.scheduledFor }"
              />
              <div class="invalid-feedback" v-if="validationErrors.scheduledFor">
                {{ validationErrors.scheduledFor }}
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div class="row">
            <div class="col-md-6 mb-3">
              <TagSelector
                  v-model="article.tags"
                  title="Tags"
                  :tags="tags"
                  :searchable="true"
                  :show-count="false"
                  :show-actions="false"
                  :show-selection-summary="false"
                  @change="handleTagsChange"
              />
            </div>
          </div>

          <!-- Sources Section -->
          <!-- @ModifiedByJunie 2025-12-10 - Added sources management UI -->
          <div class="mb-4">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label mb-0">
                Sources<span class="text-danger">*</span>
              </label>
            </div>
            <div class="sources-container" :class="{ 'is-invalid': validationErrors.sources }">
              <!-- Existing Sources List -->
              <div v-if="article.sources && article.sources.length > 0" class="sources-list mb-2">
                <div
                  v-for="(source, index) in article.sources"
                  :key="index"
                  class="source-item d-flex align-items-center gap-2 mb-2"
                >
                  <input
                    type="url"
                    class="form-control form-control-sm"
                    v-model="article.sources[index]"
                    placeholder="https://example.com/article"
                  />
                  <button
                    type="button"
                    class="btn btn-outline-danger btn-sm"
                    @click="removeSource(index)"
                    title="Remove source"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>

              <!-- Add New Source -->
              <div class="d-flex gap-2">
                <input
                  type="url"
                  class="form-control"
                  v-model="newSourceUrl"
                  placeholder="Enter source URL (e.g., https://example.com/article)"
                  @keyup.enter="addSource"
                />
                <button
                  type="button"
                  class="btn btn-outline-primary"
                  @click="addSource"
                  :disabled="!newSourceUrl"
                >
                  <i class="bi bi-plus-lg"></i> Add
                </button>
              </div>
            </div>
            <div class="invalid-feedback" v-if="validationErrors.sources">
              {{ validationErrors.sources }}
            </div>
            <small class="text-muted">Add at least one source URL for article credibility</small>
          </div>

          <!-- Notify Checkbox -->
          <div class="form-check mb-2">
            <input
                type="checkbox"
                class="form-check-input"
                v-model="article.notify"
                id="notify"
            />
            <label class="form-check-label" for="notify">Notify</label>
          </div>

          <!-- Form Actions -->
          <div class="d-flex justify-content-between">
            <button
                type="button"
                class="btn btn-outline-secondary"
                @click="resetForm"
            >
              Reset
            </button>
            <div class="w-full d-flex">
              <button type="submit" class="btn btn-success">
                {{ submitButtonText }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-label {
  font-weight: 500;
}

textarea {
  resize: vertical;
}

.form-control,
.form-select {
  transition:
      border-color 0.15s ease-in-out,
      box-shadow 0.15s ease-in-out;
}

.card.border-secondary:hover {
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}

.ql-container {
  border-bottom-left-radius: 0.25rem;
  border-bottom-right-radius: 0.25rem;
  background: #fff;
}

.ql-toolbar {
  border-top-left-radius: 0.25rem;
  border-top-right-radius: 0.25rem;
  background: #f8f9fa;
  border-bottom: 1px solid #ced4da;
}

.is-invalid .ql-toolbar {
  border-color: #dc3545;
}

.is-invalid .ql-container {
  border-color: #dc3545;
}
</style>
