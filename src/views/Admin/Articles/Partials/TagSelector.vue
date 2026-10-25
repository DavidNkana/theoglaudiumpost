<template>
  <div class="tag-selector">
    <h3 v-if="title" class="mb-3 h6">{{ title }}</h3>

    <!-- Search filter -->
    <div v-if="searchable" class="input-group mb-3">
      <span class="input-group-text">
        <i class="bi bi-search"></i>
      </span>
      <input
        type="text"
        class="form-control"
        :placeholder="`Search ${title}...`"
        v-model="searchQuery"
      />
      <button
        v-if="searchQuery"
        class="btn btn-outline-secondary"
        type="button"
        @click="searchQuery = ''"
      >
        <i class="bi bi-x"></i>
      </button>
    </div>

    <!-- Tags with checkboxes -->
    <div class="tags-container">
      <div v-if="filteredTags.length === 0" class="text-muted p-2">
        No tags found
      </div>

      <div v-else class="tag-list">
        <!-- Display as grid -->
        <div v-if="displayType === 'grid'" class="row g-2">
          <div
            v-for="tag in filteredTags"
            :key="tag.id"
            class="col-md-4 col-sm-6"
          >
            <div
              class="form-check tag-item p-2"
              :class="{
                selected: isSelected(tag.id),
                'tag-item-grid': true,
              }"
            >
              <input
                class="form-check-input"
                type="checkbox"
                :id="`tag-${tag.id}`"
                :value="tag.id"
                v-model="selectedTagIds"
                @change="emitChange"
              />
              <label class="form-check-label w-100" :for="`tag-${tag.id}`">
                {{ tag.name }}
                <span v-if="showCount" class="badge bg-secondary ms-1">{{
                  tag.count || 0
                }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Display as list -->
        <div v-else-if="displayType === 'list'" class="tag-list-container">
          <div
            v-for="tag in filteredTags"
            :key="tag.id"
            class="form-check tag-item p-2 mb-1"
            :class="{ selected: isSelected(tag.id) }"
          >
            <input
              class="form-check-input"
              type="checkbox"
              :id="`tag-${tag.id}`"
              :value="tag.id"
              v-model="selectedTagIds"
              @change="emitChange"
            />
            <label class="form-check-label w-100" :for="`tag-${tag.id}`">
              {{ tag.name }}
              <span v-if="showCount" class="badge bg-secondary ms-1">{{
                tag.count || 0
              }}</span>
            </label>
          </div>
        </div>

        <!-- Display as badges -->
        <div v-else class="tag-badges">
          <div
            v-for="tag in filteredTags"
            :key="tag.id"
            class="form-check tag-badge-item d-inline-block me-2 mb-2"
            :class="{ selected: isSelected(tag.id) }"
          >
            <input
              class="form-check-input"
              type="checkbox"
              :id="`tag-${tag.id}`"
              :value="tag.id"
              v-model="selectedTagIds"
              @change="emitChange"
            />
            <label
              class="form-check-label badge"
              :class="isSelected(tag.id) ? 'bg-primary' : 'bg-secondary'"
              :for="`tag-${tag.id}`"
            >
              {{ tag.name }}
              <span v-if="showCount" class="ms-1">({{ tag.count || 0 }})</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Selection actions -->
    <div
      v-if="showActions"
      class="tag-actions mt-3 d-flex justify-content-between"
    >
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary"
        @click="clearSelection"
        :disabled="selectedTagIds.length === 0"
      >
        Clear All
      </button>
      <button
        type="button"
        class="btn btn-sm btn-outline-primary"
        @click="selectAll"
        :disabled="selectedTagIds.length === filteredTags.length"
      >
        Select All
      </button>
    </div>

    <!-- Selected tags summary -->
    <div
      v-if="showSelectionSummary && selectedTagIds.length > 0"
      class="selected-summary mt-3"
    >
      <p class="mb-2">
        <strong>Selected ({{ selectedTagIds.length }}):</strong>
      </p>
      <div class="selected-tags">
        <span
          v-for="tagId in selectedTagIds"
          :key="tagId"
          class="badge bg-primary me-1 mb-1 p-2"
        >
          {{ getTagName(tagId) }}
          <i
            class="bi bi-x-circle-fill ms-1"
            style="cursor: pointer"
            @click="removeTag(tagId)"
          ></i>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from "vue";

export default {
  name: "TagSelector",
  props: {
    // Array of tag objects with id and name properties
    tags: {
      type: Array,
      required: true,
      default: () => [],
    },
    // Optional title for the component
    title: {
      type: String,
      default: "",
    },
    // Initially selected tag IDs
    modelValue: {
      type: Array,
      default: () => [],
    },
    // Display type: 'grid', 'list', or 'badges'
    displayType: {
      type: String,
      default: "badges",
      validator: (value) => ["grid", "list", "badges"].includes(value),
    },
    // Enable search functionality
    searchable: {
      type: Boolean,
      default: true,
    },
    // Show tag count (if available in tag object)
    showCount: {
      type: Boolean,
      default: false,
    },
    // Show selection actions (Select All, Clear All)
    showActions: {
      type: Boolean,
      default: true,
    },
    // Show summary of selected tags
    showSelectionSummary: {
      type: Boolean,
      default: true,
    },
  },
  emits: ["update:modelValue", "change"],
  setup(props, { emit }) {
    // Internal state
    const selectedTagIds = ref([...props.modelValue]);
    const searchQuery = ref("");

    // Filtered tags based on search query
    const filteredTags = computed(() => {
      if (!searchQuery.value) {
        return props.tags;
      }

      const query = searchQuery.value.toLowerCase();
      return props.tags.filter((tag) => tag.name.toLowerCase().includes(query));
    });

    // Watch for external changes to modelValue
    watch(
      () => props.modelValue,
      (newValue) => {
        selectedTagIds.value = [...newValue];
      }
    );

    // Check if a tag is selected
    const isSelected = (tagId) => {
      return selectedTagIds.value.includes(tagId);
    };

    // Get tag name by ID
    const getTagName = (tagId) => {
      const tag = props.tags.find((t) => t.id === tagId);
      return tag ? tag.name : "";
    };

    // Clear all selections
    const clearSelection = () => {
      selectedTagIds.value = [];
      emitChange();
    };

    // Select all visible tags
    const selectAll = () => {
      selectedTagIds.value = filteredTags.value.map((tag) => tag.id);
      emitChange();
    };

    // Remove a specific tag from selection
    const removeTag = (tagId) => {
      selectedTagIds.value = selectedTagIds.value.filter((id) => id !== tagId);
      emitChange();
    };

    // Emit change events
    const emitChange = () => {
      emit("update:modelValue", selectedTagIds.value);
      emit("change", selectedTagIds.value);
    };

    return {
      selectedTagIds,
      searchQuery,
      filteredTags,
      isSelected,
      getTagName,
      clearSelection,
      selectAll,
      removeTag,
      emitChange,
    };
  },
};
</script>

<style scoped>
.tag-selector {
  margin-bottom: 1rem;
}

.tag-list {
  max-height: 300px;
  overflow-y: auto;
}

.tag-item {
  border: 1px solid #dee2e6;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.tag-item:hover {
  background-color: #f8f9fa;
}

.tag-item.selected {
  background-color: rgba(13, 110, 253, 0.1);
  border-color: var(--secondary);
}

.tag-item-grid {
  height: 100%;
}

.tag-badge-item {
  position: relative;
}

.tag-badge-item .form-check-input {
  position: absolute;
  opacity: 0;
}

.tag-badge-item label {
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  font-weight: normal;
}

.tag-badge-item label:hover {
  opacity: 0.9;
}

.selected-summary {
  border-top: 1px solid #dee2e6;
  padding-top: 0.75rem;
}
</style>
