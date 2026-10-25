<script setup>
import { ref, onMounted } from "vue";
import {
  createAdPlacement,
  editAdPlacement,
  getAdPlacement,
} from "@/features/ads/AdsService";
import ImagePicker from "@/components/ImagePicker.vue";
import { watch } from "vue";
import { formatAdLocation } from "@/utils";
import { devLog } from "@/utils/devLog";

const props = defineProps({
  adPlacement: {
    type: Object,
  },
});

const emits = defineEmits(["close", "update-ad-placement", "add-ad-placement"]);

const isEdit = ref(props.ad != null);
const isSubmitting = ref(false);
const imageUpdated = ref(false);

const initialData = {
  location: "",
  description: "",
  imageBase64: "",
  fee: "",
  fee_type: "FIXED",
  billing_unit: "WEEK",
  aspectRatio: "",
  enabled: true,
  rotating: false,
  file: "",
};

const form = ref(initialData);

onMounted(async () => {
  // Get available placements

  isEdit.value = props.adPlacement != null;
  // console.log("is editing: ", isEdit.value, props.adPlacement);
  if (isEdit.value) {
    const _adPlacement = props.adPlacement;

    form.value = {
      location: _adPlacement.location,
      description: _adPlacement.description,
      imageBase64: _adPlacement.image,
      fee: _adPlacement.fee,
      fee_type: _adPlacement.fee_type,
      billing_unit: _adPlacement.billing_unit,
      aspectRatio: _adPlacement.aspectRatio,
      status: _adPlacement.status,
      rotating: _adPlacement.is_rotating,
      enabled: _adPlacement.status == "active",
    };
  } else {
    form.value = initialData;
  }
});

watch(
  () => props.adPlacement,
  (newProps) => {
    // console.log("newProps :", newProps);
    isEdit.value = newProps != null;

    if (isEdit.value) {
      if (!newProps.hasAll) {
        fetchData(newProps.id);
      } else {
        const _adPlacement = newProps;

        form.value = {
          location: _adPlacement.location,
          description: _adPlacement.description,
          imageBase64: _adPlacement.image,
          fee: _adPlacement.fee,
          fee_type: _adPlacement.fee_type,
          billing_unit: _adPlacement.billing_unit,
          aspectRatio: _adPlacement.aspect_ratio,
          status: _adPlacement.status,
          rotating: _adPlacement.is_rotating,
          enabled: _adPlacement.status == "active",
        };
      }
    } else {
      form.value = initialData;
    }
  }
);

const fetchData = async (id) => {
  const res = await getAdPlacement(id);

  // Update the form with the fetched data
  const _adPlacement = res.data;
  form.value = {
    location: _adPlacement.location,
    description: _adPlacement.description,
    imageBase64: _adPlacement.image,
    fee: _adPlacement.fee,
    fee_type: _adPlacement.fee_type,
    billing_unit: _adPlacement.billing_unit,
    aspectRatio: _adPlacement.aspect_ratio,
    status: _adPlacement.status,
    rotating: _adPlacement.is_rotating,
    enabled: _adPlacement.status == "active",
  };

  // Emit event to update parent component
  emits("update-ad-placement", { ...res.data, hasAll: true });
  return res.data;
};

const save = async () => {
  const data = form.value;
  const base64 = !isEdit.value
    ? data.imageBase64
    : imageUpdated.value
      ? (data.imageBase64 ?? null)
      : null;

  const payload = {
    location: data.location,
    description: data.description,
    imageBase64: data.imageBase64,
    fee: data.fee,
    fee_type: data.fee_type,
    billing_unit: data.billing_unit,
    aspectRatio: data.aspectRatio,
    status: data.enabled ? "active" : "inactive",
    enabled: data.enabled,
    imageBase64: base64,
    rotating: data.rotating,
  };

  try {
    isSubmitting.value = true;
    if (isEdit.value) {
      const response = await editAdPlacement(props.adPlacement.id, payload);
      // console.log(response.data);
      emits("update-ad-placement", {
        ...response.data,
        image: data.imageBase64,
      });
    } else {
      const response = await createAdPlacement(payload);
      emits("add-ad-placement", {
        ...response.data,
        image: data.imageBase64,
      });
    }
    emits("close");
  } catch (error) {
    devLog.error("Failed to save ad", error);
    alert("There was an error saving the ad.");
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
  <form @submit.prevent="save" class="card card-body">
    <div class="modal-header mb-4 p-2">
      <h3 class="">
        {{ isEdit ? "Edit Ad Placement" : "Create New Ad Placement" }}
      </h3>
      <button
        v-if="!isSubmitting"
        type="button"
        class="btn-close"
        @click="$emit('close')"
      ></button>
    </div>

    <div class="row">
      <div class="mb-3 col-md-6">
        <label class="form-label">Location</label>
        <input
          :value="formatAdLocation(form.location)"
          class="form-control"
          required
          readonly
          disabled
        />
      </div>
    </div>
    <div class="row">
      <div class="col mb-3">
        <label class="form-label">Description</label>
        <textarea
          class="form-control"
          id="description"
          v-model="form.description"
          placeholder="Enter description"
          required
        ></textarea>
      </div>
    </div>

    <div class="mb-3 col-md-6">
      <label class="form-label">Image</label>
      <ImagePicker
        v-model="form.imageBase64"
        :initialImage="form.imageBase64"
        @edit="updateIsUpdate"
      />
    </div>

    <div class="row">
      <div class="col-6 mb-3">
        <label class="form-label">Aspect Ratio</label>
        <input type="text" v-model="form.aspectRatio" class="form-control" />
      </div>
    </div>

    <div class="row">
      <div class="col mb-3">
        <label class="form-label">Fee</label>
        <input
          type="number"
          step="0.01"
          v-model="form.fee"
          class="form-control"
          required
        />
      </div>
      <div class="col mb-3">
        <label html-for="fee_type" class="form-label">Fee Type</label>
        <select
          id="fee_type"
          v-model="form.fee_type"
          class="form-select"
          required
        >
          <option
            v-for="feeType in ['FIXED', 'CPM']"
            :key="feeType"
            :value="feeType"
          >
            {{ feeType }}
          </option>
        </select>
      </div>
      <div class="col mb-3">
        <label html-for="billing_unit" class="form-label">Billing Unit</label>
        <select
          id="billing_unit"
          v-model="form.billing_unit"
          class="form-select"
          required
        >
          <option
            v-for="unit in ['DAY', 'WEEK', 'MONTH']"
            :key="unit"
            :value="unit"
          >
            {{ unit }}
          </option>
        </select>
      </div>
    </div>
    <div class="row px-2 gap-4">
      <div class="form-check mb-3 col-3">
        <label class="form-check-label" for="rotating"
          >Rotating Placement</label
        >
        <input
          type="checkbox"
          class="form-check-input"
          v-model="form.rotating"
          id="rotating"
        />
      </div>
      <div class="form-check mb-3 col-3">
        <input
          type="checkbox"
          class="form-check-input"
          v-model="form.enabled"
          id="enabled"
        />
        <label class="form-check-label" for="enabled">Enabled</label>
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
