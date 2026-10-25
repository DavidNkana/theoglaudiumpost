<template>
  <div class="modal fade" id="articlePromptModal" tabindex="-1" aria-labelledby="articlePromptModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="articlePromptModalLabel">Create New Article</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <ul class="nav nav-tabs mb-3" id="articleTabs" role="tablist">
            <li class="nav-item" role="presentation">
              <button 
                class="nav-link active" 
                id="prompt-tab" 
                data-bs-toggle="tab" 
                data-bs-target="#prompt-tab-pane" 
                type="button" 
                role="tab" 
                aria-controls="prompt-tab-pane" 
                aria-selected="true"
              >
                Create from Prompt
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button 
                class="nav-link" 
                id="source-tab" 
                data-bs-toggle="tab" 
                data-bs-target="#source-tab-pane" 
                type="button" 
                role="tab" 
                aria-controls="source-tab-pane" 
                aria-selected="false"
                @click="loadSourceArticles"
              >
                Create from Source Article
              </button>
            </li>
          </ul>
          
          <div class="tab-content" id="articleTabsContent">
            <!-- Prompt Tab -->
            <div 
              class="tab-pane fade show active" 
              id="prompt-tab-pane" 
              role="tabpanel" 
              aria-labelledby="prompt-tab" 
              tabindex="0"
            >
              <div class="mb-3">
                <label for="articlePrompt" class="form-label">What is this article about?</label>
                <textarea 
                  class="form-control" 
                  id="articlePrompt" 
                  v-model="prompt" 
                  rows="3" 
                  placeholder="Enter a topic or description for your article"
                  :disabled="isLoading"
                ></textarea>
                <div class="form-text">
                  Provide a clear description of what you want the article to be about. The AI will generate a title, content, and summary based on your prompt.
                </div>
              </div>
              
              <div class="d-grid">
                <button 
                  type="button" 
                  class="btn btn-primary" 
                  @click="generateArticle" 
                  :disabled="!prompt.trim() || isLoading"
                >
                  <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  {{ isLoading ? 'Generating...' : 'Generate Article' }}
                </button>
              </div>
            </div>
            
            <!-- Source Articles Tab -->
            <div 
              class="tab-pane fade" 
              id="source-tab-pane" 
              role="tabpanel" 
              aria-labelledby="source-tab" 
              tabindex="0"
            >
              <!-- Loading state -->
              <div v-if="isLoadingSourceArticles" class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading source articles...</p>
              </div>
              
              <!-- Error state -->
              <div v-else-if="sourceArticlesError" class="alert alert-danger">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                {{ sourceArticlesError }}
              </div>
              
              <!-- Empty state -->
              <div v-else-if="!sourceArticles.length" class="text-center py-4">
                <i class="bi bi-file-earmark-text display-1 text-muted"></i>
                <p class="mt-3">No source articles found</p>
              </div>
              
              <!-- Source articles table -->
              <div v-else>
                <!-- AI Provider Selection -->
                <div class="row g-3 align-items-center mb-3">
                  <div class="col-auto">
                    <label class="col-form-label">AI Source</label>
                  </div>
                  <div class="col-auto">
                    <select class="form-select" v-model="selectedProvider" :disabled="isLoading">
                      <option value="gpt">Magic Ai</option>
                      <option value="gemini">Serah AI</option>
                      <option value="x">Nicolah</option>
                    </select>
                  </div>
                </div>
                <div class="table-responsive">
                  <table class="table table-hover">
                    <thead>
                      <tr>
                        <th>Select</th>
                        <th>Title</th>
                        <th>Platform</th>
                        <th>Author</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="article in sourceArticles" :key="article.id">
                        <td>
                          <div class="form-check">
                            <input 
                              class="form-check-input" 
                              type="radio" 
                              :id="'select-' + article.id" 
                              :checked="selectedSourceArticle && selectedSourceArticle.id === article.id"
                              @change="selectSourceArticle(article)"
                            >
                          </div>
                        </td>
                        <td>{{ article.title }}</td>
                        <td>{{ article.platform || article.source || 'Unknown' }}</td>
                        <td>{{ article.author || 'Unknown' }}</td>
                        <td>{{ formatDate(article.createdAt) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div class="d-grid mt-3">
                  <button 
                    type="button" 
                    class="btn btn-success" 
                    @click="createFromSourceArticle" 
                    :disabled="!selectedSourceArticle || isLoading"
                  >
                    <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    {{ isLoading ? 'Creating...' : 'Create Article from Selected Source' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button 
            type="button" 
            class="btn btn-secondary" 
            data-bs-dismiss="modal" 
            :disabled="isLoading"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { Modal } from 'bootstrap';
import { generateArticleWithMetadata } from '@/features/articles/ArticlesService';
import { getSourceArticlesFromAllTasks } from '@/features/articles/ArticlesService';
import Swal from 'sweetalert2';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'article-generated']);

// Prompt tab state
const prompt = ref('');
const isLoading = ref(false);

// Source articles tab state
const sourceArticles = ref([]);
const isLoadingSourceArticles = ref(false);
const sourceArticlesError = ref(null);
const selectedSourceArticle = ref(null);
// AI Provider selection for Source Articles tab
const selectedProvider = ref('gpt');

let modalInstance = null;

// Initialize the modal when the component is mounted
const initModal = () => {
  const modalElement = document.getElementById('articlePromptModal');
  if (modalElement) {
    modalInstance = new Modal(modalElement);
    
    // Add event listener for when the modal is hidden
    modalElement.addEventListener('hidden.bs.modal', () => {
      emit('close');
    });
  }
};

// Show the modal
const showModal = () => {
  if (modalInstance) {
    modalInstance.show();
  }
};

// Hide the modal
const hideModal = () => {
  if (modalInstance) {
    modalInstance.hide();
  }
};

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Load source articles
const loadSourceArticles = async () => {
  if (sourceArticles.value.length > 0) return; // Only load once
  
  isLoadingSourceArticles.value = true;
  sourceArticlesError.value = null;
  
  try {
    // Load saved source article IDs from localStorage (optional client-side filter)
    let savedIds = [];
    try {
      const raw = localStorage.getItem('savedSourceArticleIds');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) savedIds = parsed;
      }
    } catch (_) {}

    // Fetch all source articles from tasks
    const response = await getSourceArticlesFromAllTasks();
    let list = response?.data?.sourceArticles || [];

    // If we have saved IDs, filter locally
    if (Array.isArray(savedIds) && savedIds.length > 0) {
      const idSet = new Set(savedIds.map(String));
      list = list.filter(a => a?.id !== undefined && idSet.has(String(a.id)));
    }

    sourceArticles.value = list;
  } catch (error) {
    console.error('Error loading source articles:', error);
    sourceArticlesError.value = 'Failed to load source articles. Please try again.';
  } finally {
    isLoadingSourceArticles.value = false;
  }
};

// Select a source article
const selectSourceArticle = (article) => {
  selectedSourceArticle.value = article;
};

// Create article from selected source article
const createFromSourceArticle = async () => {
  if (!selectedSourceArticle.value) return;
  
  isLoading.value = true;
  
  try {
    const sa = selectedSourceArticle.value;
    const provider = selectedProvider.value || 'gpt';

    // Call by ID endpoint via articles service
    const { generateArticleBySourceId } = await import('@/features/articles/ArticlesService');
    const response = await generateArticleBySourceId(sa.id, provider);

    // Extract the article data from the response
    const articleData = response?.data ?? response ?? {};

    // Hide the modal
    hideModal();

    // Persist the selected source article ID as saved
    try {
      const raw = localStorage.getItem('savedSourceArticleIds');
      const arr = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(arr) ? arr : [];
      if (sa.id !== undefined && sa.id !== null) {
        const sid = String(sa.id);
        if (!next.includes(sid)) next.push(sid);
      }
      localStorage.setItem('savedSourceArticleIds', JSON.stringify(next));
    } catch (_) {}

    // Emit the article data to the parent component
    emit('article-generated', articleData);
  } catch (error) {
    console.error('Error creating article from source:', error);

    // Show error message
    Swal.fire({
      title: 'Error!',
      text: 'Failed to create article from source. Please try again.',
      icon: 'error',
      confirmButtonText: 'OK'
    });

    isLoading.value = false;
  }
};

// Generate article based on the prompt
const generateArticle = async () => {
  if (!prompt.value.trim()) return;
  
  isLoading.value = true;
  
  try {
    // Call the API to generate the article
    const response = await generateArticleWithMetadata(prompt.value.trim());
    
    // Extract the article data from the response
    const articleData = response.data;
    
    // Hide the modal
    hideModal();
    
    // Emit the article data to the parent component
    emit('article-generated', articleData);
  } catch (error) {
    console.error('Error generating article:', error);
    
    // Show error message
    Swal.fire({
      title: 'Error!',
      text: 'Failed to generate article. Please try again.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  } finally {
    isLoading.value = false;
  }
};

// Watch for changes to the show prop
watch(() => props.show, (newValue) => {
  if (newValue) {
    showModal();
  } else {
    hideModal();
  }
});

// Initialize the modal when the component is mounted
onMounted(() => {
  initModal();
  
  // Show the modal if the show prop is true
  if (props.show) {
    showModal();
  }
});

// Clean up when the component is unmounted
onUnmounted(() => {
  if (modalInstance) {
    hideModal();
    modalInstance = null;
  }
});
</script>

<style scoped>
/* Add any component-specific styles here */
</style>