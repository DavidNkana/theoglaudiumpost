<script setup>
/**
 * New script section for src/views/Admin/Articles/Edit.vue
 * Admin-entered articles. No AI generation, no automated source finding,
 * no fact-checking — the editor writes and uploads.
 */
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import { getArticle, removeArticle, editArticle } from "@/features/articles/ArticlesService";
import { uploadMedia } from "@/features/media/MediaService";
import { Modal } from "bootstrap";
import { getCategories } from "@/features/categories/CategoriesService";
import { getTags } from "@/features/tags/TagsService";
import Swal from "sweetalert2";
import TagSelector from "./Partials/TagSelector.vue";

const route = useRoute();
const router = useRouter();

const article = ref({
  id: null,
  title: "",
  slug: "",
  summary: "",
  content: "",
  thumbnailUrl: "",
  coverImage: "",
  thumbnailImage: "",
  coverId: null,
  categoryId: "",
  articleType: "featured",
  archived: false,
  status: "published",
  scheduledFor: null,
  authorId: null,
  created_at: null,
  updated_at: null,
  tags: [],
  sources: [],
});

const loading = ref(true);
const error = ref(null);
const validationErrors = ref({});
const isSubmitting = ref(false);
const isDeleting = ref(false);
const isUploadingImage = ref(false);
const categories = ref([]);
const tags = ref([]);
const autoGenerateSlug = ref(true);
const authorName = ref("Unknown");
const coverBase64 = ref("");
const thumbnailBase64 = ref("");
const imageUpdated = ref(false);
const newSourceUrl = ref('');

const deleteModal = ref(null);
let modalInstance = null;

// Fetch article and related data on component mount
onMounted(async () => {
  try {
    const articleId = route.params.id;

    const response = await getArticle(articleId);

    if (response.status != 200 || !response.data) {
      throw new Error("No Data");
    }
    article.value = {
      ...response.data,
      articleType: response.data.article_type || "featured",
      coverImage: response.data.cover?.file,
      coverId: response.data.cover_id ?? response.data.cover?.id ?? null,
      thumbnailImage: response.data.thumbnail?.file,
      audioUrl: response.data.audio?.file || null,
      scheduledFor: response.data.scheduled_for,
      categoryId: response.data?.category?.id ?? response.data.category_id ?? "",
      tags: response.data.tags?.map((tag) => tag.id) ?? [],
      sources: response.data.sources || [],
    };

    coverBase64.value = response.data.cover?.file;
    thumbnailBase64.value = response.data.thumbnail?.file;

    // Format the scheduledFor date for the datetime-local input
    if (article.value.scheduledFor) {
      article.value.scheduledFor = new Date(article.value.scheduledFor)
        .toISOString()
        .slice(0, 16);
    }

    const res = await getCategories();
    categories.value = res.data?.categories ?? res.data ?? [];

    const resp = await getTags();
    tags.value = resp.data ?? [];

    loading.value = false;
  } catch (err) {
    console.error("Error fetching article data:", err);
    error.value =
      "Failed to load article. Please try again or contact support.";
    loading.value = false;
  }

  // Initialize Bootstrap modal
  modalInstance = new Modal(deleteModal.value);
});

const statusBadgeClass = computed(() => {
  switch (article.value.status) {
    case "published":
      return "bg-success";
    case "scheduled":
      return "bg-info";
    default:
      return "bg-secondary";
  }
});

const statusLabel = computed(() => {
  switch (article.value.status) {
    case "published":
      return "Published";
    case "scheduled":
      return "Scheduled";
    default:
      return "Draft";
  }
});

const submitButtonText = computed(() => {
  if (isSubmitting.value) return "Saving...";

  return "Update Article";
});

// Generate slug from title
const generateSlug = () => {
  if (!article.value.title) return;

  article.value.slug = article.value.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/-+/g, "-") // Remove consecutive dashes
    .substring(0, 255); // Respect DB limit
};

/**
 * Uploads a new cover image and links it to the article.
 */
const handleImage = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  isUploadingImage.value = true;

  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    coverBase64.value = dataUrl;
    thumbnailBase64.value = await generateThumbnailFromImage(dataUrl);

    const response = await uploadMedia(file, article.value.articleType || "latest");
    article.value.coverId = response.data?.id ?? null;
    article.value.coverImage = response.data?.file ?? "";
    imageUpdated.value = true;
  } catch (error) {
    console.error("Error uploading image:", error);
    Swal.fire({
      title: "Error!",
      text: "Failed to upload the image. Please try again.",
      icon: "error",
      confirmButtonText: "OK",
    });
  } finally {
    isUploadingImage.value = false;
  }
};

function generateThumbnailFromImage(base64) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

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
      resolve(canvas.toDataURL("image/jpeg", 0.8)); // compressed thumbnail
    };
  });
}

// Format date for display
const formatDateTime = (datetime) => {
  if (!datetime) return "N/A";

  const date = new Date(datetime);
  return date.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Get category name from category id
const getCategoryName = (categoryId) => {
  const category = categories.value.find((cat) => cat.id === categoryId);
  return category?.name || "Uncategorized";
};

// Handle status change
const handleStatusChange = () => {
  if (article.value.status === "scheduled" && !article.value.scheduledFor) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setMinutes(0);
    article.value.scheduledFor = tomorrow.toISOString().slice(0, 16);
  }
};

// Navigate back to articles list
const goBack = () => {
  router.push("/admin/articles");
};

// Open delete confirmation modal
const confirmDelete = () => {
  modalInstance?.show();
};

// Delete article
const deleteArticle = async () => {
  isDeleting.value = true;

  try {
    await removeArticle(article.value.id);
    modalInstance?.hide();
    router.push("/admin/articles");
  } catch (err) {
    console.error("Error deleting article:", err);
    Swal.fire({
      title: "Error!",
      text: "Failed to delete article. Please try again.",
      icon: "error",
      confirmButtonText: "OK",
    });
  } finally {
    isDeleting.value = false;
  }
};

// Validate form
const validateForm = () => {
  const errors = {};

  if (!article.value.title.trim()) {
    errors.title = "Title is required";
  }

  if (!article.value.slug.trim()) {
    errors.slug = "Slug is required";
  }

  if (!article.value.summary.trim()) {
    errors.summary = "Summary is required";
  }

  if (!article.value.content.trim()) {
    errors.content = "Content is required";
  }

  if (!article.value.categoryId) {
    errors.categoryId = "Please select a category";
  }

  // Image validation: must have an image
  if (!coverBase64.value && !thumbnailBase64.value) {
    errors.coverImage = "Please include an image";
  }

  // Published and scheduled articles must have a stored cover image
  if (article.value.status !== "draft") {
    const hasStoredCover = Boolean(article.value.coverId);
    const hasNewImage = imageUpdated.value && Boolean(coverBase64.value);

    if (!hasStoredCover && !hasNewImage) {
      errors.coverImage =
        "Published articles require an uploaded cover image. Please upload an image.";
    }
  }

  if (article.value.status === "scheduled" && !article.value.scheduledFor) {
    errors.scheduledFor = "Please select a publication date";
  }

  // Check if scheduled date is in the future
  if (article.value.status === "scheduled" && article.value.scheduledFor) {
    const scheduledDate = new Date(article.value.scheduledFor);
    if (scheduledDate <= new Date()) {
      errors.scheduledFor = "Scheduled date must be in the future";
    }
  }

  // Sources validation - articles must have at least one source
  if (!article.value.sources || article.value.sources.length === 0) {
    errors.sources = "At least one source is required for all articles";
  }

  validationErrors.value = errors;
  return Object.keys(errors).length === 0;
};

// Remove image
const removeImage = () => {
  coverBase64.value = null;
  thumbnailBase64.value = null;
  article.value.coverId = null;
  article.value.coverImage = "";
};

// Update article
const updateArticle = async () => {
  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;

  try {
    await editArticle(article.value.id, {
      ...article.value,
      cover_id: article.value.coverId ?? null,
      coverImage: coverBase64.value || article.value.coverImage || "",
      thumbnailImage: thumbnailBase64.value || "",
      scheduledFor:
        article.value.status === "draft"
          ? null
          : article.value.scheduledFor || new Date().toISOString(),
    });

    // Update last modified date
    article.value.updated_at = new Date().toISOString();

    Swal.fire("Article", "Article updated successfully!");
    isSubmitting.value = false;
    router.push("/admin/articles");
  } catch (err) {
    console.error("Error updating article:", err);

    if (err.response && err.response.data.errors) {
      validationErrors.value = err.response.data.errors;
    } else {
      Swal.fire({
        title: "Error!",
        text:
          err.response?.data?.message ||
          "Failed to update article. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }

    isSubmitting.value = false;
  }
};

const handleTagsChange = (tags) => {
  console.log("Tags changed:", tags);
};

// Add a new source URL
const addSource = () => {
  if (!newSourceUrl.value.trim()) return;

  // Basic URL validation
  try {
    new URL(newSourceUrl.value);
  } catch {
    Swal.fire({
      title: "Invalid URL",
      text: "Please enter a valid URL (e.g., https://example.com/article)",
      icon: "error",
      confirmButtonText: "OK"
    });
    return;
  }

  // Check for duplicates
  if (article.value.sources.includes(newSourceUrl.value)) {
    Swal.fire({
      title: "Duplicate Source",
      text: "This source URL has already been added",
      icon: "warning",
      confirmButtonText: "OK"
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
</script>

<template>
  <div class="my-2">
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-dark" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2">Loading article data...</p>
    </div>

    <div v-else-if="error" class="alert alert-danger" role="alert">
      <h4 class="alert-heading">Error Loading Article</h4>
      <p>{{ error }}</p>
      <hr />
      <div class="d-flex justify-content-end">
        <button class="btn btn-outline-danger" @click="goBack">Go Back</button>
      </div>
    </div>

    <div v-else class="card shadow">
      <div
        class="card-header bg-success text-white d-flex justify-content-between align-items-center"
      >
        <h3 class="mb-0">Edit Article</h3>
        <div>
          <span class="badge bg-light text-dark me-2"
            >ID: {{ article.id }}</span
          >
          <span class="badge" :class="statusBadgeClass">{{ statusLabel }}</span>
        </div>
      </div>

      <div class="card-body">
        <form @submit.prevent="updateArticle" class="needs-validation">
          <div class="row">
            <!-- Article Title -->
            <div class="col-md-6 mb-3 mb-md-0">
              <label for="title" class="form-label"
                >Title<span class="text-danger">*</span></label
              >
              <input
                type="text"
                class="form-control"
                id="title"
                v-model="article.title"
                required
                :class="{ 'is-invalid': validationErrors.title }"
                @input="autoGenerateSlug && generateSlug()"
              />
              <div class="invalid-feedback" v-if="validationErrors.title">
                {{ validationErrors.title }}
              </div>
            </div>

            <!-- Slug -->
            <div class="col-md-6 mb-3 mb-md-0">
              <label for="slug" class="form-label"
                >Slug<span class="text-danger">*</span></label
              >
              <div class="input-group">
                <input
                  type="text"
                  class="form-control"
                  id="slug"
                  v-model="article.slug"
                  required
                  :class="{ 'is-invalid': validationErrors.slug }"
                />
                <button
                  class="btn btn-outline-secondary"
                  type="button"
                  @click="generateSlug"
                >
                  Regenerate
                </button>
                <div class="invalid-feedback" v-if="validationErrors.slug">
                  {{ validationErrors.slug }}
                </div>
              </div>
              <!-- <div class="form-check mt-1">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="autoGenerateSlug"
                  v-model="autoGenerateSlug"
                />
                <label class="form-check-label small" for="autoGenerateSlug">
                  Auto-generate slug when title changes
                </label>
              </div> -->
            </div>
          </div>

          <!-- Summary -->
          <div class="mb-3">
            <label for="summary" class="form-label"
              >Summary<span class="text-danger">*</span></label
            >
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
            <small class="text-muted"
              >Short description for article previews</small
            >
          </div>

          <!-- Content - Rich Text Editor -->
          <div class="mb-4">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label for="content" class="form-label mb-0"
                >Content<span class="text-danger">*</span></label
              >
            </div>
            <div :class="{ 'is-invalid': validationErrors.content }">
              <QuillEditor
                id="content"
                v-model:content="article.content"
                contentType="html"
                theme="snow"
                toolbar="full"
                :styles="{ height: '350px' }"
              />
            </div>
            <div class="invalid-feedback" v-if="validationErrors.content">
              {{ validationErrors.content }}
            </div>
            <small class="text-muted"
              >Full article body with rich formatting</small
            >
          </div>

          <!-- Cover Image -->
          <div class="mb-3 col-md-8">
            <label for="thumbnail" class="form-label"
              >Article Cover Image</label
            >
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

          <!-- Audio Narration Section - @ModifiedByJunie 2025-12-10 -->
          <div class="mb-3 col-md-8" v-if="article.audioUrl">
            <label class="form-label">
              <i class="bi bi-headphones me-1"></i>
              Article Audio Narration
            </label>
            <div class="audio-player-container p-3 bg-light rounded">
              <audio
                controls
                :src="article.audioUrl"
                class="w-100"
                preload="metadata"
              >
                Your browser does not support the audio element.
              </audio>
              <small class="text-muted d-block mt-2">
                Audio is automatically generated when the article is published.
              </small>
            </div>
          </div>
          <div class="mb-3 col-md-8" v-else-if="article.status === 'published'">
            <label class="form-label">
              <i class="bi bi-headphones me-1"></i>
              Article Audio Narration
            </label>
            <div class="alert alert-info mb-0">
              <i class="bi bi-info-circle me-1"></i>
              Audio is being generated... It will appear here once ready.
            </div>
          </div>

          <div class="row">
            <div class="col-md-4 mb-3">
              <label for="category" class="form-label"
                >Category<span class="text-danger">*</span></label
              >
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
              <label for="category" class="form-label"
                >Type<span class="text-danger">*</span></label
              >
              <select
                class="form-select"
                id="category"
                v-model="article.articleType"
                required
                :class="{ 'is-invalid': validationErrors.articleType }"
              >
                <!-- <option value="" disabled>Select a category</option> -->
                <option
                  v-for="articleType in [
                    {
                      name: 'featured',
                      label: 'Featured',
                    },
                    {
                      name: 'top',
                      label: 'Top Story',
                    },
                    {
                      name: 'popular',
                      label: 'Popular Story',
                    },
                  ]"
                  :key="articleType.name"
                  :value="articleType.name"
                >
                  {{ articleType.label }}
                </option>
              </select>
              <div class="invalid-feedback" v-if="validationErrors.categoryId">
                {{ validationErrors.categoryId }}
              </div>
            </div>

            <!-- Status -->
            <div class="col-6 col-md-4 mb-3">
              <label for="status" class="form-label"
                >Status<span class="text-danger">*</span></label
              >
              <select
                class="form-select"
                id="status"
                v-model="article.status"
                required
                :class="{ 'is-invalid': validationErrors.status }"
                @change="handleStatusChange"
              >
                <!-- <option value="draft">Draft</option> -->
                <option value="published">Publish Immediately</option>
                <option value="scheduled">Schedule for Later</option>
              </select>
              <div class="invalid-feedback" v-if="validationErrors.status">
                {{ validationErrors.status }}
              </div>
            </div>
          </div>

          <!-- Scheduled Date/Time (conditional) -->
          <div class="mb-3 row" v-if="article.status === 'scheduled'">
            <div class="col-md-6">
              <label for="scheduledDate" class="form-label"
                >Publish Date/Time<span class="text-danger">*</span></label
              >
              <input
                type="datetime-local"
                class="form-control"
                id="scheduledDate"
                v-model="article.scheduledFor"
                required
                :class="{ 'is-invalid': validationErrors.scheduledFor }"
              />
              <div
                class="invalid-feedback"
                v-if="validationErrors.scheduledFor"
              >
                {{ validationErrors.scheduledFor }}
              </div>
            </div>
          </div>

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
          <!-- @ModifiedByJunie 2025-12-10 - Updated to editable sources management UI with AI find sources -->
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

          <!-- Metadata -->
          <!-- <div class="card mb-4 bg-light">
            <div class="card-body">
              <div class="row">
                <div class="col-md-6">
                  <dl class="row mb-0">
                    <dt class="col-sm-4">Author</dt>
                    <dd class="col-sm-8">{{ authorName }}</dd>

                    <dt class="col-sm-4">Created</dt>
                    <dd class="col-sm-8">
                      {{ formatDateTime(article.created_at) }}
                    </dd>
                  </dl>
                </div>
                <div class="col-md-6">
                  <dl class="row mb-0">
                    <dt class="col-sm-4">Last Updated</dt>
                    <dd class="col-sm-8">
                      {{ formatDateTime(article.updated_at) }}
                    </dd>

                    <dt class="col-sm-4" v-if="article.status === 'scheduled'">
                      Scheduled For
                    </dt>
                    <dd class="col-sm-8" v-if="article.status === 'scheduled'">
                      {{ formatDateTime(article.scheduledFor) }}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div> -->

          <!-- Action Buttons -->
          <div class="d-flex justify-content-between">
            <div>
              <button
                type="button"
                class="btn btn-outline-secondary me-2"
                @click="goBack"
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-outline-danger"
                @click="confirmDelete"
                :disabled="isSubmitting"
              >
                Delete
              </button>
            </div>
            <div>
              <!-- <button
                type="button"
                class="btn btn-secondary me-2"
                @click="updateStatusToDraft"
                :disabled="article.status === 'draft' || isSubmitting"
              >
                Save as Draft
              </button> -->
              <button
                type="submit"
                class="btn btn-success"
                :disabled="isSubmitting"
              >
                {{ submitButtonText }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div class="modal fade" id="deleteModal" tabindex="-1" ref="deleteModal">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">Confirm Deletion</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete this article?</p>
            <p class="fw-bold">{{ article.title }}</p>
            <p class="text-danger">
              <strong>Warning:</strong> This action cannot be undone.
            </p>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-danger"
              @click="deleteArticle"
              :disabled="isDeleting"
            >
              {{ isDeleting ? "Deleting..." : "Delete Article" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
/* Custom styles */
.form-label {
  font-weight: 500;
}

textarea {
  resize: vertical;
}

/* Add a subtle transition for form controls */
.form-control,
.form-select {
  transition:
    border-color 0.15s ease-in-out,
    box-shadow 0.15s ease-in-out;
}

/* Subtle hover effect for the preview card */
.card.border-secondary:hover {
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}

/* Style the Quill editor container */
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

/* Style for when the editor has validation errors */
.is-invalid .ql-toolbar {
  border-color: #dc3545;
}

.is-invalid .ql-container {
  border-color: #dc3545;
}

/* Style for metadata section */
dt {
  font-weight: 500;
  color: #6c757d;
}

dd {
  margin-bottom: 0.5rem;
}
</style>
