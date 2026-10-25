<template>
  <div
      class="modal fade"
      id="promptsModal"
      tabindex="-1"
      aria-labelledby="promptsModalLabel"
      aria-hidden="true"
      ref="modalRef"
  >
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header bg-dark text-white">
          <h5 class="modal-title" id="promptsModalLabel">
            Manage AI Prompts
          </h5>
          <button
              type="button"
              class="btn-close btn-close-white"
              data-bs-dismiss="modal"
              aria-label="Close"
              @click="handleClose"
          ></button>
        </div>

        <div class="modal-body">
          <div v-if="isLoadingPrompts" class="text-center py-5">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading prompts...</p>
          </div>

          <div v-else>
            <p class="text-muted mb-4">
              Manage the prompts used for AI-generated articles and
              thumbnails. These prompts guide the AI in creating content that
              matches your desired style and format.
            </p>

            <div v-if="localPromptsList.length === 0" class="alert alert-info">
              No prompts found. Please contact your system administrator.
            </div>

            <div v-else class="accordion" id="promptsAccordion">
              <div
                  class="accordion-item mb-3"
                  v-for="prompt in localPromptsList"
                  :key="prompt.id"
              >
                <h2 class="accordion-header">
                  <button
                      class="accordion-button"
                      type="button"
                      data-bs-toggle="collapse"
                      :data-bs-target="`#collapse-${prompt.id}`"
                      aria-expanded="false"
                      :aria-controls="`collapse-${prompt.id}`"
                  >
                    <div class="d-flex align-items-center w-100">
                      <span class="me-auto">{{ prompt.name }}</span>
                      <span class="badge bg-primary me-2">{{
                          prompt.type
                        }}</span>
                      <span
                          class="badge"
                          :class="prompt.active ? 'bg-success' : 'bg-secondary'"
                      >
                        {{ prompt.active ? "Active" : "Inactive" }}
                      </span>
                    </div>
                  </button>
                </h2>
                <div
                    :id="`collapse-${prompt.id}`"
                    class="accordion-collapse collapse"
                    data-bs-parent="#promptsAccordion"
                >
                  <div class="accordion-body">
                    <form @submit.prevent="handleSavePrompt(prompt)">
                      <div class="mb-3">
                        <label class="form-label">Name</label>
                        <input
                            type="text"
                            class="form-control"
                            v-model="prompt.name"
                            required
                        />
                      </div>

                      <div class="mb-3">
                        <label class="form-label">Type</label>
                        <select
                            class="form-select"
                            v-model="prompt.type"
                            required
                        >
                          <option value="system">System</option>
                          <option value="user">User</option>
                          <option value="thumbnail">Thumbnail</option>
                        </select>
                      </div>

                      <div class="mb-3">
                        <label class="form-label">Content</label>
                        <textarea
                            class="form-control"
                            v-model="prompt.content"
                            rows="10"
                            required
                        ></textarea>
                        <small class="text-muted" v-if="prompt.type === 'thumbnail'">
                          Use <code v-text="'{{topic}}'"></code> and <code v-text="'{{summary}}'"></code> as placeholders
                          that will be replaced with the article's title and
                          summary.
                        </small>
                      </div>

                      <div class="form-check mb-3">
                        <input
                            type="checkbox"
                            class="form-check-input"
                            :id="`active-${prompt.id}`"
                            v-model="prompt.active"
                        />
                        <label class="form-check-label" :for="`active-${prompt.id}`">
                          Active
                        </label>
                      </div>

                      <div class="d-flex justify-content-end">
                        <button
                            type="submit"
                            class="btn btn-primary"
                            :disabled="isSubmittingPrompt"
                        >
                          <span
                              v-if="isSubmittingPrompt"
                              class="spinner-border spinner-border-sm me-2"
                              role="status"
                              aria-hidden="true"
                          ></span>
                          {{
                            isSubmittingPrompt ? "Saving..." : "Save Changes"
                          }}
                        </button>
                      </div>
                    </form>
                  </div>
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
              @click="handleClose"
          >
            Close
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
  promptsList: {
    type: Array,
    default: () => []
  },
  isLoadingPrompts: {
    type: Boolean,
    default: false
  },
  isSubmittingPrompt: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['save-prompt', 'fetch-prompts', 'close', 'show']);

// Local state
const modalRef = ref(null);
const modalInstance = ref(null);
const localPromptsList = ref([]);

// Watch for changes in promptsList prop
watch(() => props.promptsList, (newVal) => {
  localPromptsList.value = JSON.parse(JSON.stringify(newVal)); // Deep copy
}, { deep: true, immediate: true });

// Modal lifecycle
onMounted(() => {
  modalInstance.value = new Modal(modalRef.value);

  // Listen to Bootstrap modal events
  modalRef.value.addEventListener('shown.bs.modal', handleShown);
  modalRef.value.addEventListener('hidden.bs.modal', handleHidden);
});

onUnmounted(() => {
  if (modalInstance.value) {
    modalInstance.value.dispose();
  }
});

// Methods
const show = () => {
  // Fetch prompts if not already loaded
  if (localPromptsList.value.length === 0) {
    emit('fetch-prompts');
  }
  modalInstance.value?.show();
};

const hide = () => {
  modalInstance.value?.hide();
};

const handleShown = () => {
  emit('show');
};

const handleHidden = () => {
  emit('close');
};

const handleClose = () => {
  hide();
};

const handleSavePrompt = (prompt) => {
  emit('save-prompt', prompt);
};

// Expose methods for parent component
defineExpose({
  show,
  hide
});
</script>

<style scoped>
.accordion-button:not(.collapsed) {
  background-color: #f8f9fa;
  color: #212529;
}

.accordion-button:focus {
  box-shadow: none;
  border-color: rgba(0, 0, 0, 0.125);
}

.modal-body textarea {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.accordion-item {
  border: 1px solid rgba(0, 0, 0, 0.125);
  border-radius: 0.375rem;
}

.accordion-button {
  border-radius: 0.375rem;
}

.badge {
  font-size: 0.75rem;
}
</style>