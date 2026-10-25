<script setup>
import { ref, onMounted } from "vue";
import { createCategory, editCategory } from "@/features/announcements/AnnouncementsService";
import InputLabel from "@/components/InputLabel.vue";
import { watch } from "vue";
import { useSweetAlert } from "@/composables/useSweetAlert";
import { devLog } from "@/utils/devLog";
const { showToast } = useSweetAlert();

const props = defineProps({
  category: {
    type: Object,
  },
});

const emits = defineEmits(["close", "update", "add"]);

const isEdit = ref(props.category != null);
const isSubmitting = ref(false);

const initialData = {
  name: "",
  description: "",
  slug: "",
  is_active: true,
};

const form = ref(initialData);

onMounted(async () => {
  isEdit.value = props.category != null;
  if (isEdit.value) {
    const _category = props.category;

    form.value = {
      name: _category.name,
      description: _category.description,
      slug: _category.slug,
      is_active: _category.is_active,
    };
  } else {
    form.value = initialData;
  }
});

const generateSlug = () => {
  if (!form.value.name) return;

  form.value.slug = form.value.name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/-+/g, "-") // Remove consecutive dashes
    .substring(0, 255); // Respect DB limit
};

watch(
  () => props.category,
  (newProps) => {
    isEdit.value = newProps != null;

    if (isEdit.value) {
      const _category = newProps;
      form.value = {
        name: _category.name,
        description: _category.description,
        is_active: _category.is_active,
      };

      devLog.info("Form: ", form.value);
    } else {
      form.value = initialData;
    }
  },
  { immediate: true }
);

const onSave = async () => {
  const payload = form.value;

  try {
    isSubmitting.value = true;
    if (isEdit.value) {
      const response = await editCategory(props.category.id, payload);
      emits("update", response.data);
    } else {
      const response = await createCategory(payload);
      emits("add", response.data);
    }
    showToast(
      "success",
      `Category ${isEdit.value ? "updated" : "created"} successfully!`
    );

    emits("close");
  } catch (error) {
    devLog.error("Failed to save category", error);
    showToast("error", "Failed to save category");
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <form @submit.prevent="onSave" class="card card-body">
    <div class="modal-header mb-4 p-2">
      <h3 class="">
        {{ isEdit ? "Edit Category" : "Create New Category" }}
      </h3>
      <button
        v-if="!isSubmitting"
        type="button"
        class="btn-close"
        @click="$emit('close')"
      ></button>
    </div>

    <div class="row">
      <div class="mb-3 col">
        <InputLabel value="Title" is-required />
        <input
          v-model="form.name"
          class="form-control"
          required
          @input="generateSlug()"
        />
      </div>
    </div>

    <div class="mb-3">
      <InputLabel for="description" value="Description" is-required />
      <textarea
        class="form-control"
        id="description"
        v-model="form.description"
        placeholder="Enter Description"
        required
      ></textarea>
    </div>

    <div class="mb-3 col-md-6 form-check">
      <input
        type="checkbox"
        class="form-check-input"
        v-model="form.is_active"
        id="is_active"
      />
      <InputLabel for="is_active" value="Status" is-required />
    </div>

    <div class="d-flex justify-content-between modal-footer p-0 pt-2">
      <button
        type="button"
        class="btn btn-outline-secondary me-2"
        @click="$emit('close')"
      >
        Cancel
      </button>

      <button class="btn btn-success" :disabled="isSubmitting">
        <span
          v-if="isSubmitting"
          class="spinner-border spinner-border-sm me-2"
          role="is_active"
          aria-hidden="true"
        ></span>
        <span v-else> {{ isEdit ? "Update" : "Create" }}</span>
      </button>
    </div>
  </form>
</template>
