<template>
  <div class="source-articles-container">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1 class="h3 mb-0">Source Articles</h1>
      <div class="d-flex align-items-center gap-2">
        <label class="me-2 mb-0">AI Source</label>
        <select class="form-select" style="width: 220px;" v-model="selectedProvider" :disabled="loading">
          <option value="minimax">MiniMax M3 (Recommended)</option>
          <option value="gemini">Serah AI</option>
          <option value="gpt">Magic Ai</option>
          <option value="x">Nicolah</option>
        </select>
        <div class="form-check form-switch ms-2">
          <input
            class="form-check-input"
            type="checkbox"
            v-model="deepSearch"
            id="deepSearchToggle"
            :disabled="loading"
          >
          <label class="form-check-label" for="deepSearchToggle">Deep Search</label>
        </div>
        <button class="btn btn-success" @click="refreshArticles">
          <i class="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
      </div>
    </div>

    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <div class="alert alert-info">
          <i class="bi bi-info-circle-fill me-2"></i>
          This section allows you to manage AI-generated source articles from social media platforms. You can select articles to convert into full content for your site.
        </div>
        
        <!-- Task Information -->
        <div v-if="tasks.length" class="mb-4">
          <h5>Tasks Queried</h5>
          <div class="table-responsive">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Prompt</th>
                  <th>Articles</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="task in tasks" :key="task.taskId">
                  <td>{{ task.taskId }}</td>
                  <td>{{ task.prompt }}</td>
                  <td>{{ task.articleCount }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-2">Loading source articles...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="alert alert-danger">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          {{ error }}
        </div>

        <!-- Empty state -->
        <div v-else-if="!sourceArticles.length" class="text-center py-5">
          <i class="bi bi-file-earmark-text display-1 text-muted"></i>
          <p class="mt-3 mb-4">No source articles found</p>
          <button class="btn btn-primary" @click="generateNewSourceArticle">
            <i class="bi bi-plus-circle me-1"></i> Generate New Source Article
          </button>
        </div>

        <!-- Articles table -->
        <div v-else class="table-responsive">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <span class="badge bg-primary me-2">{{ selectedArticles.length }} selected</span>
            </div>
            <button 
              class="btn btn-success" 
              @click="convertSelectedArticles"
              :disabled="selectedArticles.length === 0"
            >
              <i class="bi bi-file-earmark-plus me-1"></i> Convert Selected Articles
            </button>
          </div>
          
          <table class="table table-hover">
            <thead>
              <tr>
                <th>
                  <div class="form-check">
                    <input 
                      class="form-check-input" 
                      type="checkbox" 
                      id="selectAll" 
                      :checked="selectedArticles.length === sourceArticles.length && sourceArticles.length > 0"
                      @change="toggleSelectAll"
                    >
                    <label class="form-check-label" for="selectAll">All</label>
                  </div>
                </th>
                <th>Title</th>
                <th>URL</th>
                <th>Platform</th>
                <th>Author</th>
                <th>Type</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="article in sourceArticles" :key="article.id">
                <td>
                  <div class="form-check">
                    <input 
                      class="form-check-input" 
                      type="checkbox" 
                      :id="'select-' + getArticleKey(article)"
                      :checked="isArticleSelected(article)"
                      @change="toggleArticleSelection(article)"
                    >
                  </div>
                </td>
                <td>{{ article.title }}</td>
                <td>
                  <a v-if="article.url" :href="article.url" target="_blank" class="text-truncate d-inline-block" style="max-width: 200px;">
                    {{ article.url }}
                  </a>
                  <span v-else>N/A</span>
                </td>
                <td>{{ article.platform || article.source || 'Unknown' }}</td>
                <td>{{ article.author || 'Unknown' }}</td>
                <td>{{ article.type || 'Article' }}</td>
                <td>{{ formatDate(article.timestamp || article.createdAt) }}</td>
                <td>
                  <div class="btn-group">
                    <button
                      class="btn btn-sm btn-outline-primary"
                      @click="viewArticle(article)"
                      title="View"
                    >
                      <i class="bi bi-eye"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-success"
                      @click="createFromSource(article)"
                      title="Create Article"
                    >
                      <i class="bi bi-file-earmark-plus"></i>
                    </button>
                    <button
                      class="btn btn-sm btn-outline-danger"
                      @click="deleteArticle(article)"
                      title="Delete"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Article Count -->
        <div v-if="sourceArticles.length" class="d-flex justify-content-end align-items-center mt-3">
          <div>
            <span class="text-muted">Total articles: {{ sourceArticles.length }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Generate Article Modal -->
    <div class="modal fade" id="generateModal" tabindex="-1" aria-labelledby="generateModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="generateModalLabel">Generate New Source Article</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="topicInput" class="form-label">Topic or Keywords</label>
              <input
                type="text"
                class="form-control"
                id="topicInput"
                v-model="generationTopic"
                placeholder="Enter a topic or keywords for the article"
              />
            </div>
            <div class="mb-3">
              <label for="instructionsInput" class="form-label">Additional Instructions (Optional)</label>
              <textarea
                class="form-control"
                id="instructionsInput"
                v-model="generationInstructions"
                rows="3"
                placeholder="Enter any specific instructions for the AI"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button
              type="button"
              class="btn btn-primary"
              @click="startGeneration"
              :disabled="isGenerating"
            >
              <span v-if="isGenerating">
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Generating...
              </span>
              <span v-else>Generate Article</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- View Article Modal -->
    <div class="modal fade" id="viewModal" tabindex="-1" aria-labelledby="viewModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="viewModalLabel">{{ selectedArticle?.title || 'Article Preview' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div v-if="selectedArticle" class="article-preview">
              <div v-html="selectedArticle.content"></div>
            </div>
            <div v-else class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button
              type="button"
              class="btn btn-success"
              @click="createFromSource(selectedArticle)"
              v-if="selectedArticle"
            >
              Create Article From This Source
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Modal } from 'bootstrap';
import { getArticles, generateArticle, getSourceArticlesFromAllTasks, getSourceArticlesByProvider, generateArticleBySourceId, generateArticlesBySourceIds } from '@/features/articles/ArticlesService';
import { stripCodeBlockMarkers } from '@/utils';
import Swal from 'sweetalert2';

// Router for navigation
const router = useRouter();

// State variables
const sourceArticles = ref([]);
const loading = ref(true);
const error = ref(null);
const selectedArticle = ref(null);
const generationTopic = ref('');
const generationInstructions = ref('');
const isGenerating = ref(false);
const tasks = ref([]);
const selectedArticles = ref([]);

// AI source provider selection (persisted) - @ModifiedByJunie 2025-12-10 - Changed default from 'gpt' to 'minimax'
const selectedProvider = ref(localStorage.getItem('sourceProvider') || 'minimax');

// Deep Search toggle (persisted) - US #14 - Adds Tavily advanced search merge
const deepSearch = ref(localStorage.getItem('sourceDeepSearch') === 'true');

watch(selectedProvider, (newVal) => {
  try {
    localStorage.setItem('sourceProvider', newVal);
  } catch (_) {}
  // Auto-refresh when provider changes
  fetchSourceArticles();
});

watch(deepSearch, (newVal) => {
  try {
    localStorage.setItem('sourceDeepSearch', String(!!newVal));
  } catch (_) {}
  // Auto-refresh when deep-search toggle changes
  fetchSourceArticles();
});

// Helper to generate a stable unique key for a source article
const getArticleKey = (article) => {
  // Prefer a real unique id
  if (article?.id !== undefined && article?.id !== null && String(article.id).trim() !== '') {
    return String(article.id);
  }
  // Then try URL which should be unique per source
  if (article?.url) return String(article.url);
  // Fallback to a composite key
  return [article?.platform || article?.source || 'src', article?.author || 'author', article?.createdAt || 'date', article?.title || Math.random().toString(36).slice(2)].join('|');
};

// Modal references
let generateModal = null;
let viewModal = null;

// No pagination-related computed properties needed

// Lifecycle hooks
onMounted(async () => {
  // Initialize modals
  generateModal = new Modal(document.getElementById('generateModal'));
  viewModal = new Modal(document.getElementById('viewModal'));
  
  // Load initial data
  await fetchSourceArticles();
});

// Methods
const fetchSourceArticles = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    // Determine provider - @ModifiedByJunie 2025-12-10 - Changed default from 'gpt' to 'minimax'
    let provider = selectedProvider.value || 'minimax';
    // x (Nicolah) routes directly to /x/* endpoints - no fallback

    // 1) Try to load saved source article IDs from localStorage
    let savedIds = [];
    try {
      const raw = localStorage.getItem('savedSourceArticleIds');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          savedIds = parsed.filter((v) => v !== undefined && v !== null && String(v).trim() !== '');
        }
      }
    } catch (_) {}

    let list = [];
    let taskList = [];

    // Always fetch provider-specific endpoint then optionally filter by saved IDs
    // @ModifiedByJunie 2026-07-09 - US #14: pass deepSearch to merge Tavily advanced results
    let response = await getSourceArticlesByProvider(provider, deepSearch.value);

    // Normalize response data shape (handle various nesting)
    const root = response?.data ?? response ?? {};
    const container = (root && root.data && !Array.isArray(root.data)) ? root.data : root;
    const directArray = Array.isArray(container) ? container : (Array.isArray(container?.data) ? container.data : null);

    if (Array.isArray(directArray)) {
      list = directArray;
      taskList = Array.isArray(container?.tasks) ? container.tasks : (Array.isArray(root?.tasks) ? root.tasks : []);
    } else {
      const source = container?.sourceArticles || container?.articles || container?.items || container?.results || [];
      list = Array.isArray(source) ? source : [];
      taskList = Array.isArray(container?.tasks) ? container.tasks : (Array.isArray(root?.tasks) ? root.tasks : []);
    }

    // If list appears empty, try legacy fallback which returns the expected structure
    if (!Array.isArray(list) || list.length === 0) {
      try {
        const legacy = await getSourceArticlesFromAllTasks();
        const legacyData = legacy?.data ?? legacy ?? {};
        list = legacyData.sourceArticles || legacyData.items || [];
        taskList = legacyData.tasks || [];
      } catch (fallbackErr) {
        console.warn('Legacy fallback failed:', fallbackErr);
      }
    }

    // Preserve unfiltered list for fallback
    const unfilteredList = Array.isArray(list) ? list.slice() : [];

    // If we have saved IDs, filter the list locally
    if (Array.isArray(savedIds) && savedIds.length > 0 && Array.isArray(list) && list.length > 0) {
      const idSet = new Set(savedIds.map(String));
      list = list.filter(a => a?.id !== undefined && idSet.has(String(a.id)));
      // If filtering removed all items, fall back to unfiltered list
      if (list.length === 0 && unfilteredList.length > 0) {
        list = unfilteredList;
      }
    }

    tasks.value = Array.isArray(taskList) ? taskList : [];
    sourceArticles.value = Array.isArray(list) ? list : [];

    // Reset selected articles
    selectedArticles.value = [];
  } catch (err) {
    console.error('Error fetching source articles:', err);
    error.value = 'Failed to load source articles. Please try again later.';
  } finally {
    loading.value = false;
  }
};

const refreshArticles = () => {
  fetchSourceArticles();
};

// Pagination removed - no changePage method needed

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const generateNewSourceArticle = () => {
  generationTopic.value = '';
  generationInstructions.value = '';
  generateModal.show();
};

const startGeneration = async () => {
  if (!generationTopic.value.trim()) return;
  
  isGenerating.value = true;
  
  try {
    // Prepare the messages for the AI
    const messages = [
      {
        role: 'system',
        content: 'You are a professional content writer for Laudium POST, a community news platform. Create a well-structured, informative article that follows journalistic standards.'
      },
      {
        role: 'user',
        content: `Write an article about: ${generationTopic.value}${
          generationInstructions.value ? `\n\nAdditional instructions: ${generationInstructions.value}` : ''
        }`
      }
    ];
    
    // Generate the article
    const result = await generateArticle(messages);
    
    // In a real implementation, you would save this to your backend
    // For now, we'll just add it to our local state and close the modal
    const newArticle = {
      id: Date.now().toString(), // Temporary ID
      title: generationTopic.value,
      content: result.html || result.data?.html || '<p>Generated content would appear here</p>',
      summary: result.summary || result.data?.summary || 'Article summary',
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    
    sourceArticles.value.unshift(newArticle);
    
    // Close the modal
    generateModal.hide();
    
    // Show success message
    alert('Article generated successfully!');
  } catch (err) {
    console.error('Error generating article:', err);
    alert('Failed to generate article. Please try again later.');
  } finally {
    isGenerating.value = false;
  }
};

const viewArticle = (article) => {
  selectedArticle.value = article;
  viewModal.show();
};

const createFromSource = async (article) => {
  try {
    // Show loading indicator
    Swal.fire({
      title: 'Converting article...',
      text: 'Please wait while we generate the article content.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // Call the API to generate an article by source ID - @ModifiedByJunie 2025-12-10 - Changed default from 'gpt' to 'minimax'
    const provider = selectedProvider.value || 'minimax';
    const response = await generateArticleBySourceId(article.id, provider);
    
    // Extract the article data from the response
    const articleData = response.data || response;
    
    // Format the data to match the expected structure
    // Supports both formats (title, article, summary, slug, sources) or legacy (Title:, Article:, Summary:)
    console.log('Response from generateArticleBySourceId:', articleData);
    
    // @ModifiedByJunie 2025-12-10 - Extract coverUrl from backend response for image display
    const articleDataForStorage = {
      title: articleData.title || articleData["Title:"] || article.title || '',
      slug: articleData.slug || '', // Use the slug from the API if available
      content: stripCodeBlockMarkers(articleData.article || articleData["Article:"] || ''),
      summary: articleData.summary || articleData["Summary:"] || '',
      sourceId: article.id,
      sources: articleData.sources || [], // Include sources if available
      coverUrl: articleData.coverUrl || null, // Cloudinary URL from backend
      coverMediaId: articleData.coverMediaId || null // Media ID from backend
    };

    console.log('Formatted data for storage:', articleDataForStorage);
    console.log("Content before stripping code block markers:",
      articleData.article
        ? articleData.article.substring(0, 100) + "..."
        : articleData["Article:"]
          ? articleData["Article:"].substring(0, 100) + "..."
          : "");
    console.log("Content after stripping code block markers:", articleDataForStorage.content.substring(0, 100) + "...");
    articleDataForStorage.ai = provider;
    // Store the article data in localStorage
    localStorage.setItem('newArticleData', JSON.stringify(articleDataForStorage));

    // @ModifiedByJunie 2025-12-10 - Store cover image URL separately for Create.vue
    if (articleDataForStorage.coverUrl) {
      localStorage.setItem('article.coverBase64', articleDataForStorage.coverUrl);
      localStorage.setItem('article.thumbnailBase64', articleDataForStorage.coverUrl);
    }

    // Persist the sourceId as a saved Source Article ID
    try {
      const raw = localStorage.getItem('savedSourceArticleIds');
      const arr = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(arr) ? arr : [];
      if (articleDataForStorage.sourceId !== undefined && articleDataForStorage.sourceId !== null) {
        const sid = String(articleDataForStorage.sourceId);
        if (!next.includes(sid)) next.push(sid);
      }
      localStorage.setItem('savedSourceArticleIds', JSON.stringify(next));
    } catch (_) {}
    
    // Close the loading indicator
    Swal.close();
    
    // Navigate to the create article page with the generated article data
    router.push({
      path: '/admin/articles/create',
      query: { 
        newArticle: 'true',
        fromSource: 'true',
        articleId: articleData.articleId,
      },
      state: {
        articleData: articleDataForStorage
      }
    });
  } catch (error) {
    console.error('Error creating article from source:', error);
    
    // Show error message
    Swal.fire({
      title: 'Error!',
      text: 'Failed to create article from source. Please try again.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }
};

const deleteArticle = async (article) => {
  if (!confirm('Are you sure you want to delete this source article?')) return;
  
  try {
    // In a real implementation, you would call an API to delete the article
    // For now, we'll just remove it from our local state
    sourceArticles.value = sourceArticles.value.filter(a => a.id !== article.id);
    
    // Remove from selected articles if it was selected
    if (isArticleSelected(article)) {
      toggleArticleSelection(article);
    }
    
    // Show success message
    alert('Article deleted successfully!');
  } catch (err) {
    console.error('Error deleting article:', err);
    alert('Failed to delete article. Please try again later.');
  }
};

/**
 * Checks if an article is currently selected
 */
const isArticleSelected = (article) => {
  const key = getArticleKey(article);
  return selectedArticles.value.includes(key);
};

/**
 * Toggles the selection of an article
 */
const toggleArticleSelection = (article) => {
  const key = getArticleKey(article);
  if (isArticleSelected(article)) {
    // Remove the article from selection
    selectedArticles.value = selectedArticles.value.filter(k => k !== key);
  } else {
    // Add the article to the existing selection
    selectedArticles.value.push(key);
  }
};

/**
 * Toggles the selection of all articles
 */
const toggleSelectAll = () => {
  if (selectedArticles.value.length === sourceArticles.value.length) {
    // Deselect all
    selectedArticles.value = [];
  } else {
    // Select all (store keys)
    selectedArticles.value = sourceArticles.value.map(a => getArticleKey(a));
  }
};

/**
 * Converts the selected articles to full articles
 */
const convertSelectedArticles = async () => {
  if (selectedArticles.value.length === 0) return;
  
  // If there's only one selected article, use the createFromSource method
  if (selectedArticles.value.length === 1) {
    const firstKey = selectedArticles.value[0];
    const firstArticle = sourceArticles.value.find(a => getArticleKey(a) === firstKey);
    if (firstArticle) {
      await createFromSource(firstArticle);
    }
    return;
  }
  
  try {
    // Show loading indicator
    Swal.fire({
      title: 'Converting articles...',
      text: `Please wait while we generate content for ${selectedArticles.value.length} articles.`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
    
    // For now, we'll just use the first selected article
    // In a real implementation, you might want to combine multiple articles or process them in batch
    const firstKeyMultiple = selectedArticles.value[0];
    const article = sourceArticles.value.find(a => getArticleKey(a) === firstKeyMultiple);
    
    // Batch convert by IDs: pick all selected ids in order - @ModifiedByJunie 2025-12-10 - Changed default from 'gpt' to 'minimax'
    const provider = selectedProvider.value || 'minimax';
    const allKeys = [...selectedArticles.value];
    const selectedIds = allKeys
      .map(key => sourceArticles.value.find(a => getArticleKey(a) === key))
      .filter(Boolean)
      .map(a => a.id);

    const response = await generateArticlesBySourceIds(selectedIds, provider);

    const data = response?.data ?? response ?? {};
    // Some backends may return a single object or an array under different keys
    const articlesArray = Array.isArray(data)
      ? data
      : data.articles || data.items || data.data || data.sourceArticles || [];

    const first = Array.isArray(articlesArray) && articlesArray.length > 0 ? articlesArray[0] : (data || {});

    // Format the data to match the expected structure
    const articleDataForStorage = {
      title: first.title || first["Title:"] || article?.title || '',
      slug: first.slug || '', // Will be generated from title in the Create component if missing
      content: stripCodeBlockMarkers(first.article || first["Article:"] || ''),
      summary: first.summary || first["Summary:"] || '',
      sourceId: selectedIds[0],
      // Include information about other selected articles
      additionalSourceIds: selectedIds.slice(1)
    };
    
    // Store the article data in localStorage
    articleDataForStorage.ai = provider;
    localStorage.setItem('newArticleData', JSON.stringify(articleDataForStorage));

    // Persist the sourceId as a saved Source Article ID (for multiple conversion case)
    try {
      const raw = localStorage.getItem('savedSourceArticleIds');
      const arr = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(arr) ? arr : [];
      if (articleDataForStorage.sourceId !== undefined && articleDataForStorage.sourceId !== null) {
        const sid = String(articleDataForStorage.sourceId);
        if (!next.includes(sid)) next.push(sid);
      }
      // Also persist additional source IDs if present
      // (additionalSourceIds is always selectedIds.slice(1), i.e. always an array)
      articleDataForStorage.additionalSourceIds.forEach((id) => {
        const sid = String(id);
        if (!next.includes(sid)) next.push(sid);
      });
      localStorage.setItem('savedSourceArticleIds', JSON.stringify(next));
    } catch (_) {}
    
    // Close the loading indicator
    Swal.close();
    
    // For multiple conversions, do not navigate to the create page.
    // Inform the user that background generation has started and proto articles are being created.
    Swal.fire({
      title: 'Articles are being generated',
      text: `We are generating ${selectedIds.length} article(s) in the background. Proto articles are being generated. Please come back later.`,
      icon: 'info',
      confirmButtonText: 'OK'
    });

    // Clear selection to avoid duplicate submissions
    selectedArticles.value = [];
  } catch (error) {
    console.error('Error converting selected articles:', error);
    
    // Show error message
    Swal.fire({
      title: 'Error!',
      text: 'Failed to convert selected articles. Please try again.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }
};
</script>

<style scoped>
.source-articles-container {
  min-height: 70vh;
}

.article-preview {
  max-height: 70vh;
  overflow-y: auto;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 0.25rem;
}

/* Style for the article content */
.article-preview :deep(h1),
.article-preview :deep(h2),
.article-preview :deep(h3) {
  margin-top: 1.5rem;
  margin-bottom: 1rem;
}

.article-preview :deep(p) {
  margin-bottom: 1rem;
  line-height: 1.6;
}

.article-preview :deep(img) {
  max-width: 100%;
  height: auto;
  margin: 1rem 0;
}

.article-preview :deep(blockquote) {
  border-left: 4px solid #198754;
  padding-left: 1rem;
  margin-left: 0;
  color: #6c757d;
}
</style>