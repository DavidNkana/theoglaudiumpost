<template>
  <div
      class="modal fade"
      id="refineModal"
      tabindex="-1"
      aria-labelledby="refineModalLabel"
      aria-hidden="true"
      data-bs-backdrop="false"
      ref="modalRef"
  >
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="refineModalLabel">Refine Article</h5>
          <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
              @click="handleClose"
          ></button>
        </div>

        <div class="modal-body">
          <!-- AI Provider Selection -->
          <!-- @ModifiedByJunie 2025-12-10 - Added AI provider selection -->
          <div class="mb-3">
            <label class="form-label">AI Provider</label>
            <div class="d-flex flex-wrap gap-2">
              <button
                  v-for="provider in providers"
                  :key="provider.value"
                  type="button"
                  class="btn btn-sm"
                  :class="selectedProvider === provider.value ? 'btn-primary' : 'btn-outline-primary'"
                  @click="selectedProvider = provider.value"
                  :disabled="isLoading"
              >
                <i :class="provider.icon" class="me-1"></i>
                {{ provider.label }}
              </button>
            </div>
          </div>

          <!-- Quick Refinement Options -->
          <!-- @ModifiedByJunie 2025-12-10 - Added quick refinement options -->
          <div class="mb-3">
            <label class="form-label">Quick Options</label>
            <div class="d-flex flex-wrap gap-2">
              <button
                  v-for="option in quickOptions"
                  :key="option.value"
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  @click="applyQuickOption(option.value)"
                  :disabled="isLoading"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <!-- Refinement History -->
          <div class="mb-3" v-if="refinementHistory.length > 0">
            <label class="form-label">Previous Refinements:</label>
            <div class="refinement-history-container">
              <ul class="list-group">
                <li
                    v-for="item in refinementHistory"
                    :key="item.id"
                    class="list-group-item small"
                >
                  <div class="d-flex justify-content-between align-items-start">
                    <span>{{ item.prompt }}</span>
                    <small class="text-muted">{{ formatDate(item.createdAt) }}</small>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <!-- Refinement Input -->
          <div>
            <label class="form-label">Your refinement instruction</label>
            <textarea
                v-model="localRefineInput"
                class="form-control"
                rows="3"
                placeholder="E.g. Make it shorter, add a quote, etc."
                :disabled="isLoading"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
              @click="handleClose"
              :disabled="isLoading"
          >
            Cancel
          </button>
          <button
              type="button"
              class="btn btn-success"
              @click="submitRefinement"
              :disabled="!localRefineInput || isLoading"
          >
            <span
                v-if="isLoading"
                class="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
            ></span>
            {{ isLoading ? "Refining..." : "Apply Refinement" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { Modal } from 'bootstrap';

// Props
const props = defineProps({
  isLoading: {
    type: Boolean,
    default: false
  },
  refinementHistory: {
    type: Array,
    default: () => []
  },
  defaultProvider: {
    type: String,
    default: 'minimax'
  }
});

// Model for two-way binding
const refineInput = defineModel('refineInput', { default: '' });

// Emits - @ModifiedByJunie 2025-12-10 - Added provider to submit event
const emit = defineEmits(['submit', 'close', 'show']);

// Local state
const modalRef = ref(null);
const modalInstance = ref(null);
const localRefineInput = ref('');

// @ModifiedByJunie 2025-12-10 - Added provider selection and quick options
const selectedProvider = ref(props.defaultProvider);

// AI Providers
const providers = [
  { value: 'minimax', label: 'MiniMax', icon: 'bi bi-stars' },
  { value: 'gpt', label: 'ChatGPT', icon: 'bi bi-chat-dots' },
  { value: 'gemini', label: 'Gemini', icon: 'bi bi-gem' },
  { value: 'x', label: 'Nicolah', icon: 'bi bi-x' }
];

// Quick refinement options
const quickOptions = [
  { value: 'more_aggressive', label: 'More Aggressive Tone' },
  { value: 'remove_sensitive', label: 'Remove Sensitive Names' },
  { value: 'more_islamic', label: 'More Islamic' },
  { value: 'more_community', label: 'More Community Focus' },
  { value: 'less_community', label: 'Less Community Focus' },
  { value: 'shorter', label: 'Make Shorter' },
  { value: 'longer', label: 'Make Longer' },
  { value: 'simpler', label: 'Simplify Language' }
];

// Apply quick option to the text area
const applyQuickOption = (optionValue) => {
  const optionMap = {
    'more_aggressive': 'Rewrite with a more assertive and direct tone. Use stronger language and more impactful statements.',
    'remove_sensitive': 'Remove or anonymize any sensitive personal names, identifying information, or potentially controversial references while maintaining the article\'s message.',
    'more_islamic': 'Add appropriate Islamic perspectives, references to relevant hadith or Quranic principles, and emphasize values that align with Islamic teachings.',
    'more_community': 'Strengthen the focus on the Laudium community. Emphasize local impact, community involvement, and how this affects Laudium residents.',
    'less_community': 'Make the content more general and less focused on Laudium specifically. Broaden the scope to be relevant to a wider audience.',
    'shorter': 'Condense this article to be more concise. Remove unnecessary details and repetition while keeping the key information.',
    'longer': 'Expand this article with more detail, context, and supporting information. Add relevant background and elaboration.',
    'simpler': 'Rewrite using simpler language that is easier to understand. Avoid jargon and complex sentences.'
  };

  localRefineInput.value = optionMap[optionValue] || optionValue;
  refineInput.value = localRefineInput.value;
};

// Sync local input with v-model
watch(refineInput, (newVal) => {
  localRefineInput.value = newVal;
});

watch(localRefineInput, (newVal) => {
  refineInput.value = newVal;
});

// Modal lifecycle
onMounted(() => {
  if (modalRef.value) {
    modalInstance.value = new Modal(modalRef.value);

    // Listen to Bootstrap modal events
    modalRef.value.addEventListener('shown.bs.modal', handleShown);
    modalRef.value.addEventListener('hidden.bs.modal', handleHidden);
  }
});

onUnmounted(() => {
  if (modalRef.value) {
    modalRef.value.removeEventListener('shown.bs.modal', handleShown);
    modalRef.value.removeEventListener('hidden.bs.modal', handleHidden);
  }
  if (modalInstance.value) {
    modalInstance.value.dispose();
  }
  removeModalBackdrops();
});

// Methods
const show = () => {
  modalInstance.value?.show();
};

const hide = () => {
  modalInstance.value?.hide();
  removeModalBackdrops();
};

const handleShown = () => {
  emit('show');
};

const handleHidden = () => {
  emit('close');
  removeModalBackdrops();
};

const handleClose = () => {
  hide();
  setTimeout(() => {
    removeModalBackdrops();
  }, 300);
};

// @ModifiedByJunie 2025-12-10 - Updated to include provider in submit
const submitRefinement = () => {
  if (localRefineInput.value.trim()) {
    emit('submit', { prompt: localRefineInput.value, provider: selectedProvider.value });
    localRefineInput.value = '';
    refineInput.value = '';
  }
};

const removeModalBackdrops = () => {
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.remove();
  });
  document.body.classList.remove('modal-open');
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('padding-right');
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Expose methods for parent component
defineExpose({
  show,
  hide
});
</script>

<style scoped>
.refinement-history-container {
  max-height: 200px;
  overflow-y: auto;
}

.list-group-item {
  border-left: 3px solid #28a745;
}

.list-group-item:hover {
  background-color: #f8f9fa;
}
</style>