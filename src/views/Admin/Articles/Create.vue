<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useRouteQuery } from '@vueuse/router';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import Swal from 'sweetalert2';

// Components
import RefineArticleModal from '@/components/Modals/RefineArticleModal.vue';
import PromptsManagementModal from '@/components/Modals/PromptsManagementModal.vue';
import TagSelector from './Partials/TagSelector.vue';
import { useRefinementHistory } from '@/composables/useRefinementHistory';
// Services
import {
  editArticle,
  generateArticleThumbnail,
  getPrompts,
  updatePrompt,
  findArticleSources,
  factCheckArticle,
} from '@/features/articles/ArticlesService';
import { getCategories } from '@/features/categories/CategoriesService';
import { getTags } from '@/features/tags/TagsService';

// Router
const router = useRouter();
const route = useRoute();

// Composables
const {
  refinementHistory,
  isRefining,
  loadRefinementHistory,
  submitRefinement,
  clearHistory
} = useRefinementHistory();

// Refs for modal components
const refineModalRef = ref(null);
const promptsModalRef = ref(null);

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
  categoryId: '',
  articleType: 'featured',
  archived: false,
  status: 'published',
  scheduledFor: null,
  authorId: null,
  notify: false,
  tags: [],
  sources: [], // @ModifiedByJunie 2025-12-10 - Added sources field
});

const validationErrors = ref({});
const isSubmitting = ref(false);
const isLoading = ref(false);
const isGeneratingThumbnail = ref(false);
const coverBase64 = ref('');
const thumbnailBase64 = ref('');
const refineInput = ref('');

// Data
const categories = ref([]);
const tags = ref([]);
const prompts = ref(null);
const promptsList = ref([]);
const isLoadingPrompts = ref(false);
const isSubmittingPrompt = ref(false);
const messages = ref([]);
const aiProvider = ref();
const sourceId = ref();
const newSourceUrl = ref(''); // @ModifiedByJunie 2025-12-10 - For adding new sources
const isFindingSources = ref(false); // @ModifiedByJunie 2025-12-10 - For AI source finding
const isFactChecking = ref(false);
const skipFactCheck = ref(false);
const imageProvider = ref('gpt'); // @ModifiedByJunie 2025-12-10 - For GPT vs MiniMax image generation

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

// Fetch prompts
const fetchPrompts = async () => {
  try {
    isLoadingPrompts.value = true;
    const response = await getPrompts();
    promptsList.value = response.data;
  } catch (error) {
    console.error('Error fetching prompts:', error);
    Swal.fire({
      title: 'Error!',
      text: 'Failed to load prompts. Please try again.',
      icon: 'error',
      confirmButtonText: 'OK',
    });
  } finally {
    isLoadingPrompts.value = false;
  }
};

// Save prompt
const savePrompt = async (prompt) => {
  try {
    isSubmittingPrompt.value = true;
    await updatePrompt(prompt.id, prompt);
    Swal.fire({
      title: 'Success!',
      text: 'Prompt updated successfully.',
      icon: 'success',
      confirmButtonText: 'OK',
    });
    await fetchPrompts();
  } catch (error) {
    console.error('Error updating prompt:', error);
    Swal.fire({
      title: 'Error!',
      text: 'Failed to update prompt. Please try again.',
      icon: 'error',
      confirmButtonText: 'OK',
    });
  } finally {
    isSubmittingPrompt.value = false;
  }
};

// Handle refinement submission
const handleRefinementSubmit = async (refinementPrompt) => {
  const result = await submitRefinement({
    sourceId: sourceId.value,
    articleId: articleId.value,
    prompt: refinementPrompt,
    provider: aiProvider.value,
    currentContent: article.value.content
  });

  if (result.success) {
    article.value.content = result.content;
    refineModalRef.value?.hide();

    Swal.fire({
      title: 'Success!',
      text: 'Article refined successfully.',
      icon: 'success',
      confirmButtonText: 'OK',
    });
  }
};

// Generate thumbnail
const generateThumbnail = async () => {
  if (!article.value.title || !article.value.articleType) {
    Swal.fire({
      title: 'Error!',
      text: 'Please add a title and select an article type first',
      icon: 'error',
      confirmButtonText: 'OK',
    });
    return;
  }

  try {
    isGeneratingThumbnail.value = true;

    if (!prompts.value) {
      const res = await getPrompts();
      if (res.status != 200 && !res.data) {
        throw new Error('Failed to fetch Prompts');
      }
      const _prompts = res.data;
      const thumbnailPrompt = _prompts.find(
          (prompt) => prompt.active && prompt.type == 'thumbnail'
      );

      prompts.value = {
        ...prompts.value,
        thumbnail:
            thumbnailPrompt?.content ||
            'Generate image based on the title: {{topic}} and summary: {{summary}}',
      };
    }

    let promptText =
        prompts.value.thumbnail ||
        'Generate image based on the title: {{topic}} and summary: {{summary}}';

    promptText = promptText
        .replace('{{topic}}', article.value.title)
        .replace('{{summary}}', article.value.summary);

    // @ModifiedByJunie 2025-12-10 - Pass imageProvider for GPT vs MiniMax selection
    const response = await generateArticleThumbnail(promptText, article.value.articleType, imageProvider.value);
    coverBase64.value = 'data:image/png;base64,' + response.data;

    const thumbnail_b64 = await generateThumbnailFromImage(coverBase64.value);

    thumbnailBase64.value = thumbnail_b64;

    localStorage.setItem('article.coverBase64',coverBase64.value);
    localStorage.setItem('article.thumbnailBase64',thumbnail_b64);
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    Swal.fire({
      title: 'Error!',
      text: 'Failed to generate thumbnail. Please try again or enter a URL manually.',
      icon: 'error',
      confirmButtonText: 'OK',
    });
  } finally {
    isGeneratingThumbnail.value = false;
  }
};

// Handle image upload
const handleImage = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = async () => {
      coverBase64.value = reader.result;
      thumbnailBase64.value = await generateThumbnailFromImage(reader.result);
    };
    reader.readAsDataURL(file);
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
};

// Validate form
// @ModifiedByJunie 2025-12-10 - Added sources validation requirement
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
  const refinementSourceId = sourceId.value || articleId.value;
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
  const provider = aiProvider.value || "minimax";
  const result = await submitRefinement({
    sourceId: refinementSourceId,
    articleId: articleId.value,
    prompt,
    provider,
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

const submitArticle = async (confirmFactCheck) => {
  return editArticle(articleId.value, {
    ...article.value,
    confirmFactCheck: Boolean(confirmFactCheck || skipFactCheck.value),
    coverImage: coverBase64.value ?? '',
    thumbnailImage: thumbnailBase64.value ?? '',
    scheduledFor:
      article.value.status === 'scheduled'
        ? article.value.scheduledFor || new Date().toISOString()
        : null,
  });
};

const handleFactCheckConflict = async (error) => {
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

  await submitArticle(true);
  Swal.fire('Success!', 'Article created successfully!', 'success');
  localStorage.removeItem('newArticleData');
  localStorage.removeItem('article.thumbnailBase64');
  localStorage.removeItem('article.coverBase64');
  router.push('/admin/articles');
  return true;
};

// Save article
const saveArticle = async () => {
  if (!validateForm()) {
    return;
  }

  const factCheckResult = await runFactCheck();
  if (!factCheckResult.ok) {
    return;
  }

  isSubmitting.value = true;

  try {
    await submitArticle(factCheckResult.confirm);

    Swal.fire('Success!', 'Article created successfully!', 'success');
    localStorage.removeItem('newArticleData');
    localStorage.removeItem('article.thumbnailBase64');
    localStorage.removeItem('article.coverBase64');
    router.push('/admin/articles');
  } catch (error) {
    console.error('Error saving article:', error);

    if (await handleFactCheckConflict(error)) {
      return;
    }

    if (error.response && error.response.data.errors) {
      validationErrors.value = error.response.data.errors;
    } else {
      Swal.fire({
        title: 'Error!',
        text: 'Failed to save article. Please try again.',
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
    clearHistory();
  }
};

// Handle tag changes
const handleTagsChange = (tags) => {
  // Process tag changes as needed
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
const findSources = async ({ silent = false } = {}) => {
  if (!article.value.title) {
    if (!silent) {
      Swal.fire({
        title: 'Title Required',
        text: 'Please add an article title before finding sources',
        icon: 'warning',
        confirmButtonText: 'OK'
      });
    }
    return;
  }

  isFindingSources.value = true;

  try {
    // Strip HTML from content for the AI
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

    if (payload.success && foundSources.length > 0) {
      // Add found sources to existing sources (avoid duplicates)
      const existingSources = new Set(article.value.sources);
      let addedCount = 0;

      foundSources.forEach(source => {
        if (!existingSources.has(source)) {
          article.value.sources.push(source);
          addedCount++;
        }
      });

      // Clear validation error if sources were added
      if (article.value.sources.length > 0 && validationErrors.value.sources) {
        delete validationErrors.value.sources;
      }

      if (!silent) {
        Swal.fire({
          title: 'Sources Found!',
          text: `Added ${addedCount} new source${addedCount !== 1 ? 's' : ''} (${foundSources.length - addedCount} duplicate${foundSources.length - addedCount !== 1 ? 's' : ''} skipped)`,
          icon: 'success',
          confirmButtonText: 'OK'
        });
      }
    } else {
      const debugHtml = buildFindSourcesDebugHtml(payload.debug);
      if (!silent) {
        Swal.fire({
          title: 'No Sources Found',
          html: debugHtml
            ? `<p>${escapeHtml(payload.message || 'The AI could not find relevant sources for this article.')}</p>${debugHtml}`
            : 'The AI could not find relevant sources for this article. You can add sources manually.',
          icon: 'info',
          confirmButtonText: 'OK'
        });
      }
    }
  } catch (error) {
    console.error('Error finding sources:', error);
    const payload = error.response?.data;
    const debugHtml = buildFindSourcesDebugHtml(payload?.debug);
    if (!silent) {
      Swal.fire({
        title: 'Error',
        html: debugHtml
          ? `<p>${escapeHtml(payload?.message || error.message || 'Failed to find sources. Please try again.')}</p>${debugHtml}`
          : error.response?.data?.message || 'Failed to find sources. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  } finally {
    isFindingSources.value = false;
  }
};

// Initialize article data from route/storage
const initializeArticleData = async () => {
  if (route.query.newArticle === 'true') {
    let articleData;

    if (route.state && route.state.articleData) {
      articleData = route.state.articleData;
    } else if(route.query.fromSource) {
      const storedData = localStorage.getItem('newArticleData');
      if (storedData) {
        try {
          articleData = JSON.parse(storedData);
          thumbnailBase64.value = localStorage.getItem('article.thumbnailBase64');
          coverBase64.value = localStorage.getItem('article.coverBase64');
        } catch (e) {
          console.error('Error parsing article data:', e);
        }
      }
    } else {
      localStorage.removeItem('newArticleData');
      localStorage.removeItem('article.thumbnailBase64');
      localStorage.removeItem('article.coverBase64');
    }

    if (articleData) {
      const { title, slug, content, summary, sources, ai, sourceId: source } = articleData;

      aiProvider.value = ai;
      sourceId.value = source
      article.value.title = title || '';

      if (!slug && title) {
        generateSlug();
      } else {
        article.value.slug = slug || '';
      }

      // @ModifiedByJunie 2025-12-10 - Store sources in the article.sources array (separate from content)
      article.value.sources = sources || [];

      let processedContent = content || '';
      // Don't append sources to content HTML - they're now stored separately and displayed in the template
      article.value.content = processedContent;
      article.value.summary = summary || '';

      if (article.value.title && article.value.content) {
        void findSources({ silent: true });
      }

      // @ModifiedByJunie 2025-12-10 - Auto-generate thumbnail when creating from source articles
      // Only generate if we don't already have a cover image
      if (!coverBase64.value && article.value.title) {
        Swal.fire({
          title: 'Article Generated!',
          text: 'The article has been generated successfully. Now generating thumbnail...',
          icon: 'success',
          confirmButtonText: 'OK'
        });
        // Wait a brief moment for the UI to update, then generate thumbnail
        setTimeout(() => {
          generateThumbnail();
        }, 500);
      } else {
        // Cover image already exists (from backend Cloudinary upload)
        Swal.fire({
          title: 'Article Generated!',
          text: 'The article and cover image have been generated successfully. You can now edit and save.',
          icon: 'success',
          confirmButtonText: 'OK'
        });
      }
    }
  }
  // Handle source article initialization if needed
  else if (route.query.sourceId || route.query.sourceIds) {
    // Implementation for source articles
    console.log('Loading from source articles:', route.query.sourceId || route.query.sourceIds);
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

    categories.value = categoriesResponse.data;
    tags.value = tagsResponse.data;

    if (categories.value.length > 0) {
      article.value.categoryId = categories.value[0]?.id;
    }

    // Initialize article data from route/storage
    await initializeArticleData();

    // Load refinement history if editing existing article
    if (articleId.value) {
      await loadRefinementHistory(articleId.value);
    }
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
              <div class="d-flex align-items-center gap-2">
                <button
                    v-if="article.content"
                    class="btn btn-outline-success"
                    type="button"
                    @click="refineModalRef?.show()"
                >
                  Refine
                </button>
              </div>
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
              <button
                type="button"
                class="btn btn-outline-info btn-sm"
                @click="findSources"
                :disabled="!article.title || isFindingSources"
              >
                <span v-if="isFindingSources" class="spinner-border spinner-border-sm me-1" role="status"></span>
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

    <!-- Modals -->
    <RefineArticleModal
        ref="refineModalRef"
        v-model:refine-input="refineInput"
        :is-loading="isRefining"
        :refinement-history="refinementHistory"
        @submit="handleRefinementSubmit"
    />

    <PromptsManagementModal
        ref="promptsModalRef"
        :prompts-list="promptsList"
        :is-loading-prompts="isLoadingPrompts"
        :is-submitting-prompt="isSubmittingPrompt"
        @save-prompt="savePrompt"
        @fetch-prompts="fetchPrompts"
    />
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
