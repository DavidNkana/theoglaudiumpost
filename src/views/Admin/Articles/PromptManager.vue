<script setup>
import { ref, onMounted } from "vue";
import { getPrompts, updatePrompt } from "@/features/articles/ArticlesService";
import Swal from "sweetalert2";

const prompts = ref([]);
const isLoading = ref(false);
const isSubmitting = ref(false);

// Fetch all prompts on component mount
onMounted(async () => {
  await fetchPrompts();
});

// Fetch prompts from the API
const fetchPrompts = async () => {
  try {
    isLoading.value = true;
    const response = await getPrompts();
    prompts.value = response.data;
  } catch (error) {
    console.error("Error fetching prompts:", error);
    Swal.fire({
      title: "Error!",
      text: "Failed to load prompts. Please try again.",
      icon: "error",
      confirmButtonText: "OK",
    });
  } finally {
    isLoading.value = false;
  }
};

// Update a prompt
const savePrompt = async (prompt) => {
  try {
    console.log("Prompt: ", prompt);
    isSubmitting.value = true;
    await updatePrompt(prompt.id, prompt);
    Swal.fire({
      title: "Success!",
      text: "Prompt updated successfully.",
      icon: "success",
      confirmButtonText: "OK",
    });
    await fetchPrompts(); // Refresh the prompts list
  } catch (error) {
    console.error("Error updating prompt:", error);
    Swal.fire({
      title: "Error!",
      text: "Failed to update prompt. Please try again.",
      icon: "error",
      confirmButtonText: "OK",
    });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="my-2">
    <div class="card shadow">
      <div class="card-header bg-success text-white">
        <h3 class="mb-0">Manage AI Prompts</h3>
      </div>
      <div class="card-body">
        <div v-if="isLoading" class="text-center py-5">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-2">Loading prompts...</p>
        </div>

        <div v-else>
          <p class="text-muted mb-4">
            Manage the prompts used for AI-generated articles and thumbnails.
            These prompts guide the AI in creating content that matches your
            desired style and format.
          </p>

          <div v-if="prompts.length === 0" class="alert alert-info">
            No prompts found. Please contact your system administrator.
          </div>

          <div v-else class="accordion" id="promptsAccordion">
            <!-- Article Generation System Prompt -->
            <div
              class="accordion-item mb-3"
              v-for="prompt in prompts"
              :key="prompt.id"
            >
              <h2 class="accordion-header">
                <button
                  class="accordion-button"
                  type="button"
                  data-bs-toggle="collapse"
                  :data-bs-target="`#collapse-${prompt.id}`"
                  aria-expanded="true"
                  :aria-controls="`collapse-${prompt.id}`"
                >
                  <div class="d-flex align-items-center w-100">
                    <span class="me-auto">{{ prompt.name }}</span>
                    <span class="badge bg-primary me-2">{{ prompt.type }}</span>
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
                  <form @submit.prevent="savePrompt(prompt)">
                    <div class="mb-3">
                      <label class="form-label">Name</label>
                      <input
                        type="text"
                        class="form-control"
                        v-model="prompt.name"
                        disabled
                        required
                      />
                    </div>

                    <div class="mb-3">
                      <label class="form-label">Type</label>
                      <select
                        class="form-select"
                        v-model="prompt.type"
                        required
                        disabled
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
                      <!-- <small class="text-muted">
                        Use {{ topic }} and {{ summary }} as placeholders that
                        will be replaced with the article's title and summary.
                      </small> -->
                    </div>

                    <div class="form-check mb-3">
                      <input
                        type="checkbox"
                        class="form-check-input"
                        id="active"
                        v-model="prompt.active"
                      />
                      <label class="form-check-label" for="active"
                        >Active</label
                      >
                    </div>

                    <div class="d-flex justify-content-end">
                      <button
                        type="submit"
                        class="btn btn-primary"
                        :disabled="isSubmitting"
                      >
                        <span
                          v-if="isSubmitting"
                          class="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        {{ isSubmitting ? "Saving..." : "Save Changes" }}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.accordion-button:not(.collapsed) {
  background-color: #f8f9fa;
  color: #212529;
}

.accordion-button:focus {
  box-shadow: none;
  border-color: rgba(0, 0, 0, 0.125);
}

textarea {
  font-family: monospace;
}
</style>
