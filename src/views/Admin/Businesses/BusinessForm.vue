<script setup>
import { ref, onMounted } from "vue";
import { createBusiness, editBusiness } from "@/features/businesses/BusinessesService";
import ImagePicker from "@/components/ImagePicker.vue";

import { watch } from "vue";

const props = defineProps({
  business: {
    type: Object,
  },
});

const emits = defineEmits(["close", "update-business", "add-business"]);

const isEdit = ref(props.business != null);
const isSubmitting = ref(false);
const imageUpdated = ref(false);

const initialData = {
  name: "",
  email: "",
  phone: "",
  location: "",
};

const form = ref(initialData);

onMounted(async () => {
  isEdit.value = props.business != null;
  if (isEdit.value) {
    const _business = props.business;

    form.value = {
      name: _business.name,
      email: _business.email,
      phone: _business.phone,
      location: _business.location,
    };
  } else {
    form.value = initialData;
  }
});

// watch(
//   () => form.value.imageBase64,
//   (newImage) => {
//     console.log(newImage);
//     if (isEdit.value) {
//       imageUpdated.value = true;
//     }
//   }
// );

watch(
  () => props.business,
  (newProps) => {
    isEdit.value = newProps != null;

    if (isEdit.value) {
      const _business = newProps;
      form.value = {
        name: _business.name,
        email: _business.email,
        phone: _business.phone,
        location: _business.location,
      };
    } else {
      form.value = initialData;
    }
  },
  { immediate: true }
);

const saveBusiness = async () => {
  try {
    isSubmitting.value = true;
    if (isEdit.value) {
      const response = await editBusiness(props.business.id, form.value);
      emits("update-business", response.data);
    } else {
      const response = await createBusiness({
        ...form.value,
        password: "password",
      });
      emits("add-business", response.data);
    }
    emits("close");
  } catch (error) {
    console.error("Failed to save business", error);
    alert("There was an error saving the business.");
  } finally {
    isSubmitting.value = false;
  }
};

const updateIsUpdate = (value) => {
  // console.log(value);
  imageUpdated.value = value;
};
</script>

<template>
  <form @submit.prevent="saveBusiness" class="card card-body">
    <div class="modal-header mb-4 p-2">
      <h3 class="">
        {{ isEdit ? "Edit Business" : "Create New Business" }}
      </h3>
      <button
        v-if="!isSubmitting"
        type="button"
        class="btn-close"
        @click="$emit('close')"
      ></button>
    </div>

    <div class="mb-3">
      <label for="name" class="form-label">Name</label>
      <div class="input-group">
        <span class="input-group-text bg-light">
          <i class="bi bi-building"></i>
        </span>
        <input
          type="name"
          class="form-control"
          id="name"
          v-model="form.name"
          placeholder="Enter Business Name"
          required
        />
      </div>
    </div>
    <div class="row">
      <div class="col-12 col-md mb-3">
        <label for="email" class="form-label">Email address</label>
        <div class="input-group">
          <span class="input-group-text bg-light">
            <i class="bi bi-envelope"></i>
          </span>
          <input
            type="email"
            class="form-control"
            id="email"
            v-model="form.email"
            placeholder="Enter Business Email"
            required
          />
        </div>
      </div>
      <div class="col-12 col-md mb-3">
        <label for="phone" class="form-label">Phone Number</label>
        <div class="input-group">
          <span class="input-group-text bg-light">
            <i class="bi bi-telephone"></i>
          </span>
          <input
            type="phone"
            class="form-control"
            id="phone"
            v-model="form.phone"
            placeholder="Enter Phone Number"
            required
          />
        </div>
      </div>
    </div>
    <div class="mb-3">
      <label for="location" class="form-label"> Location </label>
      <div>
        <textarea
          class="form-control"
          id="location"
          v-model="form.location"
          placeholder="Enter Location"
          required
        ></textarea>
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
