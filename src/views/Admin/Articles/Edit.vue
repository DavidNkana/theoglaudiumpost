<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import { getArticle, removeArticle, editArticle, generateArticleThumbnail, findArticleSources, factCheckArticle } from "@/features/articles/ArticlesService";
import { Modal } from "bootstrap";
import { getCategories } from "@/features/categories/CategoriesService";
import { getTags } from "@/features/tags/TagsService";
import Swal from "sweetalert2";
import TagSelector from "./Partials/TagSelector.vue";
// @ModifiedByJunie 2025-12-10 - Added refine functionality imports
import RefineArticleModal from "@/components/Modals/RefineArticleModal.vue";
import { useRefinementHistory } from "@/composables/useRefinementHistory";

const route = useRoute();
const router = useRouter();

// @ModifiedByJunie 2025-12-10 - Added refinement composable
const {
  refinementHistory,
  isRefining,
  loadRefinementHistory,
  submitRefinement: submitRefinementRequest,
  clearHistory
} = useRefinementHistory();

// Refs for modal
const refineModalRef = ref(null);
const refineInput = ref('');
const sourceId = ref(null); // Source article ID for refinement

const article = ref({
  id: null,
  title: "",
  slug: "",
  summary: "",
  content: "",
  thumbnailUrl: "",
  coverImage: "",
  thumbnailImage: "",
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
const isGeneratingThumbnail = ref(false);
const categories = ref([]);
const tags = ref([]);
const autoGenerateSlug = ref(true);
const authorName = ref("Unknown");
const coverBase64 = ref("");
const thumbnailBase64 = ref("");
const imageUpdated = ref(false);
const newSourceUrl = ref(''); // @ModifiedByJunie 2025-12-10 - For adding new sources
const isFindingSources = ref(false); // @ModifiedByJunie 2025-12-10 - For AI source finding
const isFactChecking = ref(false);
const skipFactCheck = ref(false);
const imageProvider = ref('gpt'); // @ModifiedByJunie 2025-12-10 - For GPT vs MiniMax image generation

const deleteModal = ref(null);
let modalInstance = null;

// Fetch article and related data on component mount
onMounted(async () => {
  try {
    // Load article data

    const articleId = route.params.id;

    const response = await getArticle(articleId);

    if (response.status != 200 || !response.data) {
      throw new Error("No Data");
    }
    article.value = {
      ...response.data,
      articleType: response.data.article_type || "featured",
      coverImage: response.data.cover?.file,
      thumbnailImage: response.data.thumbnail?.file,
      audioUrl: response.data.audio?.file || null,  // @ModifiedByJunie 2025-12-10 - Added audio
      scheduledFor: response.data.scheduled_for,
      categoryId: response.data?.category?.id,
      tags: response.data.tags?.map((tag) => tag.id),
      sources: response.data.sources || [],
      // authorId: response.data?.author?.id,
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
    categories.value = res.data;

    const resp = await getTags();
    tags.value = resp.data;

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

const handleImage = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = async () => {
      coverBase64.value = reader.result;
      thumbnailBase64.value = await generateThumbnailFromImage(reader.result);
      imageUpdated.value = true;
    };
    reader.readAsDataURL(file);
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

// Generate AI thumbnail using OpenAI's gpt-image-1 model or MiniMax
// @ModifiedByJunie 2025-12-10 - Added imageProvider parameter for GPT vs MiniMax selection
const generateThumbnail = async () => {
  if (!article.value.title || !article.value.articleType) {
    alert("Please add a title and select an article type first");
    return;
  }

  try {
    isGeneratingThumbnail.value = true;

    // Use the article title as the prompt parameter as required
    const prompt = article.value.title;

    // Call the API with the article title as prompt, article type, and selected image provider
    const response = await generateArticleThumbnail(prompt, article.value.articleType, imageProvider.value);

    coverBase64.value = "data:image/png;base64," + response.data;
    thumbnailBase64.value = await generateThumbnailFromImage(coverBase64.value);
    imageUpdated.value = true; // Mark image as updated so it gets uploaded to Cloudinary
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    alert(
      "Failed to generate thumbnail. Please try again or enter a URL manually."
    );
  } finally {
    isGeneratingThumbnail.value = false;
  }
};

// Format date for display
const formatDateTime = (datetime) => {
  if (!datetime) return "N/A";

  const date = new Date(datetime);
  return date.toLocaleString();
};

// Get category name by ID
const getCategoryName = (categoryId) => {
  const category = categories.value.find((c) => c.id === parseInt(categoryId));
  return category ? category.name : "Unknown";
};

// Handle status change
const handleStatusChange = () => {
  // If status is scheduled but no date is set, set to current date + 1 day
  if (article.value.status === "scheduled" && !article.value.scheduledFor) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setMinutes(0); // Reset minutes
    article.value.scheduledFor = tomorrow.toISOString().slice(0, 16);
  }
};

// Quick save as draft
// const updateStatusToDraft = () => {
//   article.value.status = "draft";
//   updateArticle();
// };

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

// Helper to check if a URL is a Cloudinary URL
const isCloudinaryUrl = (url) => {
  return url && typeof url === 'string' && url.includes('cloudinary.com');
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

  // For published/scheduled articles, must have a Cloudinary URL or a new image to upload
  if (article.value.status !== "draft") {
    const hasExistingCloudinaryImage = isCloudinaryUrl(article.value.coverImage);
    const hasNewImageToUpload = imageUpdated.value && coverBase64.value;

    if (!hasExistingCloudinaryImage && !hasNewImageToUpload) {
      errors.coverImage = "Published articles require an image uploaded to Cloudinary. Please upload or generate an image.";
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

  // @ModifiedByJunie 2025-12-10 - Sources validation - articles must have at least one source
  if (!article.value.sources || article.value.sources.length === 0) {
    errors.sources = "At least one source is required for all articles";
  }

  validationErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const escapeHtml = (value) => {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const buildFactCheckHtml = (issues = []) => {
  if (!Array.isArray(issues) || issues.length === 0) {
    return "<p>Fact check flagged potential issues in this draft.</p>";
  }
  return `
    <p>Please review the following items:</p>
    <ul>
      ${issues
        .map((issue) => `
          <li>
            <strong>Claim:</strong> ${escapeHtml(issue.claim || "Unknown")}
            <br />
            <strong>Verdict:</strong> ${escapeHtml(issue.verdict || "Unverified")}
            <br />
            <strong>Reason:</strong> ${escapeHtml(issue.reasoning || "No details provided")}
          </li>
        `)
        .join("")}
    </ul>
  `;
};

const buildFindSourcesDebugHtml = (debug) => {
  if (!debug || typeof debug !== "object") {
    return "";
  }

  const sections = [];

  if (debug.parseError) {
    sections.push(
      `<p><strong>Parse error:</strong> ${escapeHtml(debug.parseError)}</p>`
    );
  }

  if (Array.isArray(debug.toolQueries) && debug.toolQueries.length > 0) {
    sections.push(
      `<p><strong>Search queries:</strong> ${escapeHtml(debug.toolQueries.join(", "))}</p>`
    );
  }

  if (Array.isArray(debug.toolTags) && debug.toolTags.length > 0) {
    sections.push(
      `<p><strong>Search tags:</strong> ${escapeHtml(debug.toolTags.join(", "))}</p>`
    );
  }

  if (typeof debug.toolResultCount === "number") {
    sections.push(
      `<p><strong>Search results count:</strong> ${debug.toolResultCount}</p>`
    );
  }

  if (Array.isArray(debug.toolResultUrls) && debug.toolResultUrls.length > 0) {
    const urls = debug.toolResultUrls.map((url) => escapeHtml(url));
    sections.push(
      `<p><strong>Sample search URLs:</strong></p><ul>${urls
        .map((url) => `<li>${url}</li>`)
        .join("")}</ul>`
    );
  }

  if (Array.isArray(debug.filteredOut) && debug.filteredOut.length > 0) {
    const limited = debug.filteredOut.slice(0, 10);
    sections.push(
      `<p><strong>Filtered out:</strong></p><ul>${limited
        .map(
          (item) =>
            `<li>${escapeHtml(item.source || "Unknown")} (${escapeHtml(
              item.reason || "unknown"
            )})</li>`
        )
        .join("")}</ul>`
    );
    if (debug.filteredOut.length > 10) {
      sections.push(
        `<p>Showing 10 of ${debug.filteredOut.length} filtered items.</p>`
      );
    }
  }

  if (debug.extractedJson) {
    sections.push(
      `<p><strong>Extracted JSON:</strong></p><pre>${escapeHtml(
        debug.extractedJson
      )}</pre>`
    );
  }

  if (debug.rawResponseSnippet) {
    sections.push(
      `<p><strong>Raw response snippet:</strong></p><pre>${escapeHtml(
        debug.rawResponseSnippet
      )}</pre>`
    );
  }

  if (sections.length === 0) {
    return "";
  }

  return `<div style="text-align:left">${sections.join("")}</div>`;
};

const runFactCheck = async () => {
  if (!article.value.title) {
    return { ok: false, confirm: false };
  }
  if (skipFactCheck.value) {
    return { ok: true, confirm: true };
  }
  isFactChecking.value = true;
  let loadingShown = false;
  let loadingClosed = false;
  const closeFactCheckLoader = () => {
    if (!loadingShown || loadingClosed) {
      return;
    }
    Swal.close();
    loadingClosed = true;
  };
  try {
    Swal.fire({
      title: "Fact checking",
      text: "Busy fact checking...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
    loadingShown = true;
    const plainContent = article.value.content
      ? article.value.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
      : "";
    const response = await factCheckArticle({
      title: article.value.title,
      summary: article.value.summary || "",
      content: plainContent,
    });
    const result = response?.data;
    if (result?.hasIssues) {
      closeFactCheckLoader();
      const decision = await Swal.fire({
        title: "Fact check warning",
        html: buildFactCheckHtml(result.issues),
        icon: "warning",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Save anyway",
        denyButtonText: "Refine with fixes",
        cancelButtonText: "Cancel",
      });
      if (decision.isDenied) {
        await refineWithFactCheckIssues(result.issues);
        return { ok: false, confirm: false };
      }
      return { ok: decision.isConfirmed, confirm: decision.isConfirmed };
    }
    closeFactCheckLoader();
    return { ok: true, confirm: false };
  } catch (error) {
    closeFactCheckLoader();
    const errorFactCheck = error.response?.data?.factCheck;
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Could not verify facts. Please try again.";
    await Swal.fire({
      title: "Fact check failed",
      html: errorFactCheck?.issues
        ? buildFactCheckHtml(errorFactCheck.issues)
        : `<p>${escapeHtml(errorMessage)}</p>`,
      icon: "error",
      confirmButtonText: "OK",
    });
    return { ok: false, confirm: false };
  } finally {
    isFactChecking.value = false;
    closeFactCheckLoader();
  }
};

const buildFactCheckRefinePrompt = (issues) => {
  const formattedIssues = (issues || [])
    .map((issue, index) => {
      const claim = issue?.claim ? `Claim: ${issue.claim}` : "Claim: (missing)";
      const verdict = issue?.verdict ? `Verdict: ${issue.verdict}` : "";
      const reasoning = issue?.reasoning ? `Reason: ${issue.reasoning}` : "";
      const sources = Array.isArray(issue?.sources) && issue.sources.length > 0
        ? `Sources: ${issue.sources.join(", ")}`
        : "";
      return [`${index + 1}. ${claim}`, verdict, reasoning, sources].filter(Boolean).join("\n");
    })
    .join("\n\n");

  return [
    "Refine the article to address the fact-check issues below.",
    "Fix or remove incorrect claims, and clearly mark anything unverified.",
    "Keep the tone professional and preserve the existing structure.",
    "Ensure each paragraph remains wrapped in <p> tags.",
    "Return ONLY JSON with fields: title, article, summary, slug, sources.",
    "",
    "FACT-CHECK ISSUES:",
    formattedIssues || "No issues provided.",
    "",
    "Start with { and end with }. Do not include markdown or extra text."
  ].join("\n");
};

const refineWithFactCheckIssues = async (issues) => {
  const refinementSourceId = sourceId.value || article.value.id;
  if (!refinementSourceId) {
    await Swal.fire({
      title: "Refine unavailable",
      text: "Fact-check refinement needs a source article to refine against.",
      icon: "info",
      confirmButtonText: "OK",
    });
    return false;
  }

  const prompt = buildFactCheckRefinePrompt(issues);
  const result = await submitRefinementRequest({
    sourceId: refinementSourceId,
    articleId: article.value.id,
    prompt,
    provider: "minimax",
    currentContent: article.value.content
  });

  if (result.success) {
    article.value.content = result.content;
    Swal.fire({
      title: "Refined",
      text: "Applied fact-check fixes to the article. Please review and save.",
      icon: "success",
      confirmButtonText: "OK",
    });
    return true;
  }

  Swal.fire({
    title: "Refine failed",
    text: result.error || "Could not refine the article with fact-check fixes.",
    icon: "error",
    confirmButtonText: "OK",
  });
  return false;
};

const removeImage = () => {
  coverBase64.value = null;
  thumbnailBase64.value = null;
};

// Update article
// @ModifiedByJunie 2025-12-10 - Fixed image saving: always send existing URL or new base64
const submitArticle = async (confirmFactCheck, coverImageToSend, thumbnailImageToSend) => {
  return editArticle(article.value.id, {
    ...article.value,
    confirmFactCheck: Boolean(confirmFactCheck || skipFactCheck.value),
    coverImage: coverImageToSend,
    thumbnailImage: thumbnailImageToSend,
    scheduledFor:
      article.value.status === "draft"
        ? null
        : article.value.scheduledFor || new Date().toISOString(),
  });
};

const handleFactCheckConflict = async (error, coverImageToSend, thumbnailImageToSend) => {
  const data = error.response?.data;
  if (error.response?.status !== 409 || !data?.factCheck) {
    return false;
  }

  const decision = await Swal.fire({
    title: "Fact check warning",
    html: buildFactCheckHtml(data.factCheck.issues),
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Save anyway",
    cancelButtonText: "Cancel",
  });

  if (!decision.isConfirmed) {
    return true;
  }

  await submitArticle(true, coverImageToSend, thumbnailImageToSend);
  article.value.updated_at = new Date().toISOString();
  Swal.fire("Article", "Article updated successfully!");
  router.push("/admin/articles");
  return true;
};

const updateArticle = async () => {
  if (!validateForm()) {
    return;
  }

  const factCheckResult = await runFactCheck();
  if (!factCheckResult.ok) {
    return;
  }

  isSubmitting.value = true;

  let coverImageToSend = null;
  let thumbnailImageToSend = null;

  try {
    // Determine what to send for coverImage:
    // - If we have coverBase64 data (either new base64 or existing URL), send it
    // - The backend handles both base64 and URLs
    // Debug logging - comprehensive
    console.log('=== updateArticle DEBUG ===');
    console.log('imageUpdated:', imageUpdated.value);
    console.log('coverBase64.value:', coverBase64.value ? `[${coverBase64.value.length} chars]` : 'NULL/UNDEFINED');
    console.log('thumbnailBase64.value:', thumbnailBase64.value ? `[${thumbnailBase64.value.length} chars]` : 'NULL/UNDEFINED');
    console.log('article.value.coverImage:', article.value.coverImage);

    if (coverBase64.value) {
      const isBase64 = coverBase64.value.startsWith('data:');
      const isUrl = coverBase64.value.startsWith('http');
      console.log('coverBase64 isBase64:', isBase64, 'isUrl:', isUrl);
      console.log('coverBase64 preview:', coverBase64.value.substring(0, 80));
    }

    // Simplified logic: if we have coverBase64, send it (could be base64 or URL)
    if (coverBase64.value) {
      coverImageToSend = coverBase64.value;
      thumbnailImageToSend = thumbnailBase64.value || null;
      console.log('Sending coverImage, length:', coverImageToSend.length);
    } else {
      console.log('No coverImage to send');
    }

    console.log('Final coverImageToSend:', coverImageToSend ? `[${coverImageToSend.length} chars]` : 'NULL');
    console.log('=== END DEBUG ===');

    await submitArticle(factCheckResult.confirm, coverImageToSend, thumbnailImageToSend);

    // Update last modified date
    article.value.updated_at = new Date().toISOString();

    Swal.fire("Article", "Article updated successfully!");
    isSubmitting.value = false;
    router.push("/admin/articles");
  } catch (err) {
    console.error("Error updating article:", err);

    if (await handleFactCheckConflict(err, coverImageToSend, thumbnailImageToSend)) {
      return;
    }

    if (err.response && err.response.data.errors) {
      validationErrors.value = err.response.data.errors;
    } else {
      Swal.fire({
        title: "Error!",
        text: "Failed to update article. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }

    isSubmitting.value = false;
  }
};

const handleTagsChange = (tags) => {
  console.log("Tags changed:", tags);
  // Here you could send this to your backend or update your form state
};

// @ModifiedByJunie 2025-12-10 - Source management methods
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

// @ModifiedByJunie 2025-12-10 - Find sources using AI
const findSources = async () => {
  if (!article.value.title) {
    Swal.fire({
      title: 'Title Required',
      text: 'Please add an article title before finding sources',
      icon: 'warning',
      confirmButtonText: 'OK'
    });
    return;
  }

  isFindingSources.value = true;

  try {
    // Strip HTML from content for better AI processing
    const plainContent = article.value.content
      ? article.value.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      : '';

    const response = await findArticleSources({
      title: article.value.title,
      summary: article.value.summary || '',
      content: plainContent,
      debug: true
    });

    const payload = response?.data;
    if (!payload || typeof payload.success !== "boolean") {
      throw new Error("Unexpected response from source finder.");
    }

    const foundSources = Array.isArray(payload.sources) ? payload.sources : [];

    if (!payload.success || foundSources.length === 0) {
      const debugHtml = buildFindSourcesDebugHtml(payload.debug);
      Swal.fire({
        title: 'No Sources Found',
        html: debugHtml
          ? `<p>${escapeHtml(payload.message || 'Could not find relevant sources for this article.')}</p>${debugHtml}`
          : 'Could not find relevant sources for this article. Try adding sources manually.',
        icon: 'info',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Add found sources to the list (avoid duplicates)
    let addedCount = 0;
    for (const source of foundSources) {
      if (!article.value.sources.includes(source)) {
        article.value.sources.push(source);
        addedCount++;
      }
    }

    // Clear validation error if present
    if (validationErrors.value.sources) {
      delete validationErrors.value.sources;
    }

    Swal.fire({
      title: 'Sources Found!',
      text: `Added ${addedCount} new source${addedCount !== 1 ? 's' : ''} to your article.`,
      icon: 'success',
      confirmButtonText: 'OK'
    });
  } catch (error) {
    console.error('Error finding sources:', error);
    const payload = error.response?.data;
    const debugHtml = buildFindSourcesDebugHtml(payload?.debug);
    Swal.fire({
      title: 'Error',
      html: debugHtml
        ? `<p>${escapeHtml(payload?.message || error.message || 'Failed to find sources. Please try again.')}</p>${debugHtml}`
        : error.response?.data?.message || 'Failed to find sources. Please try again.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  } finally {
    isFindingSources.value = false;
  }
};

// @ModifiedByJunie 2025-12-10 - Handle refinement submission
const handleRefinementSubmit = async (refinementData) => {
  // Handle both old format (string) and new format (object with prompt and provider)
  const prompt = typeof refinementData === 'string' ? refinementData : refinementData.prompt;
  const provider = typeof refinementData === 'string' ? 'minimax' : refinementData.provider;

  const result = await submitRefinementRequest({
    sourceId: sourceId.value || article.value.id, // Use sourceId if available, otherwise use article ID
    articleId: article.value.id,
    prompt: prompt,
    provider: provider,
    currentContent: article.value.content
  });

  if (result.success) {
    article.value.content = result.content;
    refineModalRef.value?.hide();

    Swal.fire({
      title: 'Success!',
      text: 'Article refined successfully using ' + provider.toUpperCase(),
      icon: 'success',
      confirmButtonText: 'OK',
    });
  } else {
    Swal.fire({
      title: 'Error!',
      text: result.error || 'Failed to refine article. Please try again.',
      icon: 'error',
      confirmButtonText: 'OK',
    });
  }
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
          <!-- @ModifiedByJunie 2025-12-10 - Added Refine button -->
          <div class="mb-4">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label for="content" class="form-label mb-0"
                >Content<span class="text-danger">*</span></label
              >
              <button
                type="button"
                class="btn btn-outline-info btn-sm"
                @click="refineModalRef?.show()"
                :disabled="!article.content || isRefining"
              >
                <i class="bi bi-magic me-1"></i>
                {{ isRefining ? "Refining..." : "Refine with AI" }}
              </button>
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
              <!-- @ModifiedByJunie 2025-12-10 - Added image provider dropdown -->
              <select
                class="form-select"
                style="max-width: 120px;"
                v-model="imageProvider"
                :disabled="isGeneratingThumbnail"
              >
                <option value="gpt">GPT</option>
                <option value="minimax">MiniMax</option>
              </select>
              <button
                class="btn btn-outline-secondary"
                type="button"
                :disabled="isGeneratingThumbnail || !article.title || !article.articleType"
                @click="generateThumbnail"
              >
                <span
                  v-if="isGeneratingThumbnail"
                  class="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                {{ isGeneratingThumbnail ? "Generating..." : "AI Thumbnail" }}
              </button>
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
              <button
                type="button"
                class="btn btn-outline-info btn-sm"
                @click="findSources"
                :disabled="!article.title || isFindingSources"
              >
                <span
                  v-if="isFindingSources"
                  class="spinner-border spinner-border-sm me-1"
                  role="status"
                ></span>
                <i v-else class="bi bi-search me-1"></i>
                {{ isFindingSources ? "Finding..." : "Find Sources with AI" }}
              </button>
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

          <div class="form-check mb-4">
            <input
              type="checkbox"
              class="form-check-input"
              v-model="skipFactCheck"
              id="skipFactCheck"
            />
            <label class="form-check-label" for="skipFactCheck">
              Don't fact check (save anyway)
            </label>
            <div class="form-text text-muted">
              Skips AI fact-checking and bypasses the server check.
            </div>
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

    <!-- @ModifiedByJunie 2025-12-10 - Added Refine Article Modal -->
    <RefineArticleModal
      ref="refineModalRef"
      v-model:refineInput="refineInput"
      :isLoading="isRefining"
      :refinementHistory="refinementHistory"
      @submit="handleRefinementSubmit"
    />
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
