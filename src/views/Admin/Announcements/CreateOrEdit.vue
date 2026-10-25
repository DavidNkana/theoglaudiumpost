<script setup>
import { ref, computed, onMounted } from "vue";
import { QuillEditor } from "@vueup/vue-quill";
import "@vueup/vue-quill/dist/vue-quill.snow.css";
import {
  getAnnouncement,
  editAnnouncement,
  createAnnouncement,
  getCategories,
} from "@/features/announcements/AnnouncementsService";
import { useRouter, useRoute } from "vue-router";
import { devLog } from "@/utils/devLog";
import { useSweetAlert } from "@/composables/useSweetAlert";
import InputLabel from "@/components/InputLabel.vue";
import ImagePicker from "@/components/ImagePicker.vue";

const { showToast } = useSweetAlert();

const router = useRouter();
const route = useRoute();

const initialData = {
  title: "",
  slug: "",
  description: "",
  content: "",
  imageBase64: "",
  location: "",
  category_id: "",
  priority: "medium",
  status: "published",
  publish_date: "",
  expire_date: "",
};

const isEdit = ref(route.params.id != null);
const imageUpdated = ref(false);

const form = ref(initialData);
const categories = ref([]);

const validationErrors = ref({});
const isSubmitting = ref(false);
const isLoading = ref(false);

// Fetch categories on component mount
onMounted(async () => {
  try {
    const res = await getCategories({});
    categories.value = res.data?.categories ?? [];

    if (isEdit.value) {
      const res = await getAnnouncement(route.params.id);
      const _announcement = res.data;
      console.log("_announcement: ", _announcement);

      form.value = {
        title: _announcement.title,
        description: _announcement.description,
        content: _announcement.description ?? _announcement.content,
        slug: _announcement.slug,
        imageBase64: _announcement.image?.file,
        location: _announcement.location,
        category_id: _announcement.category?.id,
        priority: _announcement.priority,
        status: _announcement.status,
        publish_date: _announcement.publish_date,
        expire_date: _announcement.expire_date,
      };
    } else {
      form.value = initialData;
    }
    devLog.info("Form: ", form.value);
  } catch (error) {
    devLog.warn("Error fetching initial data:", error);
  }
});

// Generate slug from title
const generateSlug = () => {
  if (!form.value.title) return;

  form.value.slug = form.value.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/-+/g, "-") // Remove consecutive dashes
    .substring(0, 255); // Respect DB limit
};

// Reset form
const resetForm = () => {
  if (
    confirm(
      "Are you sure you want to reset the form? All unsaved changes will be lost."
    )
  ) {
    form.value = initialData;
    validationErrors.value = {};
  }
};

const isSelectedFuneralCategory = computed(() => {
  const id = form.value.category_id;
  if (!id) return false;
  return categories.value
    .find((category) => category.id == id)
    ?.name?.toLowerCase()
    ?.includes("funeral");
});

// Validate form
const validateForm = () => {
  const errors = {};

  if (!form.value.title.trim()) {
    errors.title = "Title is required";
  }

  if (!form.value.slug.trim()) {
    errors.slug = "Slug is required";
  }

  // if (!form.value.summary.trim()) {
  //   errors.summary = "Summary is required";
  // }

  // NOTE: content validation removed — the original condition
  // `!isSelectedFuneralCategory` referenced the ComputedRef object (always
  // truthy), so this branch could never set errors.content. It was dead code:
  // content was never required in practice, and removing it preserves that
  // exact behavior. (The template still renders validationErrors.content if it
  // is ever set externally.)

  if (!form.value.category_id) {
    errors.category_id = "Please select a category";
  }

  validationErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const save = async () => {
  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;

  const data = form.value;
  const base64 = !isEdit.value
    ? data.imageBase64
    : imageUpdated.value
      ? (data.imageBase64 ?? null)
      : null;

  const payload = {
    title: data.title,
    content: data.content,
    description: data.description,
    slug: data.slug,
    imageBase64: base64,
    location: data.location,
    category_id: data.category_id,
    priority: data.priority,
    status: data.status,
    publish_date: new Date(data.publish_date),
    expire_date: !data.expire_date
      ? data.expire_date
      : new Date(data.expire_date),
  };

  try {
    isSubmitting.value = true;
    if (isEdit.value) {
      const response = await editAnnouncement(route.params.id, payload);
    } else {
      const response = await createAnnouncement(payload);
    }
    showToast(
      "success",
      `Category ${isEdit.value ? "updated" : "created"} successfully!`
    );
    router.push("/admin/announcements");
  } catch (error) {
    // console.error("Failed to save announcement", error);
    devLog.error("There was an error saving announcement", error);
    showToast(
      "error",
      `Category ${isEdit.value ? "update" : "creation"} failed!`
    );
  } finally {
    isSubmitting.value = false;
  }
};

const updateIsImageUpdated = (value) => {
  // console.log(value);
  imageUpdated.value = value;
};
</script>
<template>
  <div class="my-2">
    <div class="card shadow">
      <div class="card-header bg-success text-white p-2 d-flex">
        <h3 class="">
          {{ isEdit ? "Edit Announcement" : "Create New Announcement" }}
        </h3>
      </div>
      <div class="card-body">
        <form @submit.prevent="save">
          <div class="row">
            <div class="mb-3 col-md-6">
              <InputLabel for="category" value="Category" is-required />
              <select
                id="category"
                v-model="form.category_id"
                class="form-select capitalize"
                required
              >
                <option disabled value="">-- Select --</option>
                <option
                  v-for="category in categories"
                  :key="category.id"
                  :value="category.id"
                >
                  {{ category.name }}
                </option>
              </select>
            </div>
            <div class="mb-3 col-md-6">
              <InputLabel for="priority" value="Priority" is-required />
              <select
                id="priority"
                v-model="form.priority"
                class="form-select capitalize"
                required
              >
                <option
                  v-for="p in ['low', 'medium', 'high']"
                  :key="p"
                  :value="p"
                >
                  {{ p }}
                </option>
              </select>
            </div>
          </div>

          <div class="row">
            <div class="mb-3 col">
              <InputLabel value="Title" is-required />
              <input
                v-model="form.title"
                class="form-control"
                required
                @input="generateSlug()"
              />
            </div>
          </div>
          <div class="mb-3" :class="[form.imageBase64 ? '' : 'col-md-6']">
            <InputLabel
              value="Image"
              :is-required="isSelectedFuneralCategory"
            />
            <ImagePicker
              v-model="form.imageBase64"
              :initialImage="form.imageBase64"
              @edit="updateIsImageUpdated"
              :required="isSelectedFuneralCategory"
            />
          </div>

          <div class="mb-3" v-if="!isSelectedFuneralCategory">
            <InputLabel for="content" value="Content" is-required />
            <div :class="{ 'is-invalid': validationErrors.content }">
              <QuillEditor
                id="content"
                v-model:content="form.content"
                contentType="html"
                theme="snow"
                toolbar="full"
                :styles="{ height: '480px' }"
              />
            </div>
            <div class="invalid-feedback" v-if="validationErrors.content">
              {{ validationErrors.content }}
            </div>
            <small class="text-muted">Full body with rich formatting</small>
          </div>

          <div class="row" v-if="!isSelectedFuneralCategory">
            <div class="mb-3 col">
              <InputLabel for="location" value="Location" />
              <input
                id="location"
                v-model="form.location"
                class="form-control"
                required
              />
            </div>
          </div>

          <div class="mb-3 col-md-6">
            <InputLabel for="status" value="Status" is-required />
            <select
              id="status"
              v-model="form.status"
              class="form-select capitalize"
              required
            >
              <option
                v-for="s in [
                  'draft',
                  'pending',
                  'published',
                  'archived',
                  'rejected',
                ]"
                :key="s"
                :value="s"
              >
                {{ s }}
              </option>
            </select>
          </div>

          <div class="row">
            <div class="col mb-3">
              <InputLabel
                for="publish_date "
                value="Publish Date"
                is-required
              />
              <input
                id="publish_date"
                type="datetime-local"
                v-model="form.publish_date"
                class="form-control"
              />
            </div>
            <div class="col mb-3">
              <InputLabel for="expiry_date " value="Expiry Date" />
              <input
                id="expiry_date"
                type="datetime-local"
                v-model="form.expire_date"
                class="form-control"
              />
            </div>
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
                role="status"
                aria-hidden="true"
              ></span>
              <span v-else> {{ isEdit ? "Update" : "Create" }}</span>
            </button>
          </div>
        </form>
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
</style>
