<template>
  <div class="">
    <input
      v-if="!previewUrl"
      type="file"
      accept="image/*"
      @change="handleImage"
      ref="fileInput"
      class="form-control"
      :required="isRequired"
    />
    <div v-else class="my-3 position-relative text-center">
      <img
        :src="previewUrl"
        alt="Preview"
        class="img-thumbnail rounded"
        style="max-width: 300px"
      />
      <button
        @click="removeImage"
        type="button"
        class="position-absolute top-0 end-0 btn btn-danger btn-sm rounded-circle"
        aria-label="Remove image"
      >
        <i class="bi bi-x"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  modelValue: [String, File],
  initialImage: String,
  isEdit: false,
  isRequired: {
    default: true,
    type: Boolean,
  },
  // When true, we crop the uploaded image to the provided aspect ratio
  designHelp: { type: Boolean, default: false },
  // Target aspect ratio like "9:16"
  aspectRatio: { type: String, default: "4:1" },
});

const emit = defineEmits(["update:modelValue", "remove", "edit"]);

const previewUrl = ref(null);
// console.log(props.initialImage || null);
// console.log(previewUrl);
const fileInput = ref(null);

watch(
  () => props.initialImage,
  (newVal) => {
    if (newVal) {
      // console.log("new Props", newVal);
      previewUrl.value = newVal;
    } else {
      previewUrl.value = null;
    }
  },
  { immediate: true } // run immediately on setup
);

const handleImage = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // If designHelp is on, process to required aspect ratio
  if (props.designHelp && props.aspectRatio) {
    try {
      const { processImageForAd } = await import("@/utils/index.js");
      const dataUrl = await processImageForAd(file, props.aspectRatio, { quality: 0.9 });
      previewUrl.value = dataUrl;
      emit("update:modelValue", dataUrl);
      emit("edit", true);
      return;
    } catch (e) {
      console.warn("Image processing failed, using original", e);
    }
  }

  const reader = new FileReader();
  reader.onload = async () => {
    previewUrl.value = reader.result;
    emit("update:modelValue", reader.result);
    emit("edit", true);
  };
  reader.readAsDataURL(file);
};

const removeImage = () => {
  previewUrl.value = null;
  emit("update:modelValue", null);
  emit("remove");
  fileInput.value = null;
};
</script>

<style scoped>
.img-thumbnail {
  border: 1px solid #ddd;
  padding: 4px;
  background: #fff;
}
</style>
