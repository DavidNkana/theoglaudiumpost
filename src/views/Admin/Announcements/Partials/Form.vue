<script setup>
import { ref, onMounted } from "vue";
import {
  createAnnouncement,
  editAnnouncement,
  getCategories,
} from "@/features/announcements/AnnouncementsService";
import InputLabel from "@/components/InputLabel.vue";
import ImagePicker from "@/components/ImagePicker.vue";

import { watch } from "vue";

const props = defineProps({
  announcement: {
    type: Object,
  },
});

const emits = defineEmits(["close", "update", "add"]);

const isEdit = ref(props.announcement != null);
const isSubmitting = ref(false);
const imageUpdated = ref(false);

const initialData = {
  title: "",
  description: "",
  slug: "",
  imageBase64: "",
  location: "",
  category_id: "",
  priority: "medium",
  status: "published",
  publish_date: "",
  expire_date: "",
};

const form = ref(initialData);
const categories = ref([]);

onMounted(async () => {
  const res = await getCategories({});
  categories.value = res.data;

  isEdit.value = props.announcement != null;
  if (isEdit.value) {
    const _announcement = props.announcement;

    form.value = {
      title: _announcement.title,
      description: _announcement.description,
      slug: _announcement.slug,
      imageBase64: _announcement.image?.file,
      location: _announcement.location,
      category_id: _announcement.category?.id,
      priority: _announcement.priority,
      status: _announcement.status,
      publish_date: _announcement,
      expire_date: _announcement,
    };
  } else {
    form.value = initialData;
  }
});

const generateSlug = () => {
  if (!form.value.title) return;

  form.value.slug = form.value.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/-+/g, "-") // Remove consecutive dashes
    .substring(0, 255); // Respect DB limit
};

watch(
  () => props.announcement,
  (newProps) => {
    isEdit.value = newProps != null;

    if (isEdit.value) {
      const _announcement = newProps;
      form.value = {
        title: _announcement.title,
        description: _announcement.description,
        slug: _announcement.slug,
        imageBase64: _announcement.image?.file,
        location: _announcement.location,
        category_id: _announcement.category?.id,
        priority: _announcement.priority,
        status: _announcement.status,
        // publish_date: _announcement.publish_date?.split("T")?.[0],
        publish_date: _announcement.publish_date,
        expire_date: _announcement.expire_date,
      };
      console.log("Form: ", form.value);
    } else {
      form.value = initialData;
    }
  },
  { immediate: true }
);

const onSave = async () => {
  const data = form.value;
  const base64 = !isEdit.value
    ? data.imageBase64
    : imageUpdated.value
      ? (data.imageBase64 ?? null)
      : null;

  const payload = {
    title: data.title,
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
      const response = await editAnnouncement(props.announcement.id, payload);
      emits("update", {
        ...response.data,
        image: {
          file: data.imageBase64,
        },
      });
    } else {
      const response = await createAnnouncement(payload);
      emits("add", {
        ...response.data,
        image: {
          file: data.imageBase64,
        },
      });
    }
    emits("close");
  } catch (error) {
    console.error("Failed to save announcement", error);
    alert("There was an error saving announcement.");
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
  <form @submit.prevent="onSave" class="card card-body">
    <div class="modal-header mb-4 p-2">
      <h3 class="">
        {{ isEdit ? "Edit Announcement" : "Create New Announcement" }}
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
          v-model="form.title"
          class="form-control"
          required
          @input="generateSlug()"
        />
      </div>
    </div>
    <div class="mb-3" :class="[form.imageBase64 ? '' : 'col-md-6']">
      <InputLabel value="Image" />
      <ImagePicker
        v-model="form.imageBase64"
        :initialImage="form.imageBase64"
        @edit="updateIsImageUpdated"
      />
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
    <div class="row">
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
          <option v-for="p in ['low', 'medium', 'high']" :key="p" :value="p">
            {{ p }}
          </option>
        </select>
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
          v-for="s in ['draft', 'pending', 'published', 'archived', 'rejected']"
          :key="s"
          :value="s"
        >
          {{ s }}
        </option>
      </select>
    </div>

    <div class="row">
      <div class="col mb-3">
        <InputLabel for="publish_date " value="Publish Date" is-required />
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
</template>
