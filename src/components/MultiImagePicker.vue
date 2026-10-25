<!-- 
  Image picker component that allows users to select and preview images.

  This component:
  - Provides a file input for selecting multiple images
  - Shows previews of the selected images
  - Allows removing selected images
  - Supports v-model for two-way data binding
  - Emits events for image selection, removal, and editing
-->
<template>
  <div class="">
    <!-- v-if="!hasImages" -->
    <input
      type="file"
      accept="image/*"
      multiple
      @change="handleImages"
      ref="fileInput"
      class="form-control"
      :class="[hasImages ? 'd-none' : '']"
      :required="isRequired"
    />
    <div v-if="hasImages" class="my-3">
      <div class="d-flex flex-wrap gap-3 justify-content-center">
        <div
          v-for="(image, index) in previewUrls"
          :key="index"
          class="position-relative"
        >
          <img
            :src="image"
            alt="Preview"
            class="img-thumbnail rounded"
            style="
              width: 150px;
              height: 150px;
              object-fit: contain;
              cursor: pointer;
            "
            @click="$emit('view-image', index)"
          />
          <button
            @click="removeImage(index)"
            type="button"
            class="position-absolute top-0 end-0 btn btn-danger btn-sm rounded-circle"
            aria-label="Remove image"
          >
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>
      <div class="mt-3">
        <button
          type="button"
          @click="addMoreImages"
          class="btn btn-outline-primary btn-sm"
        >
          <i class="bi bi-plus-circle"></i> Add More Images
        </button>
        <button
          type="button"
          @click="removeAllImages"
          class="btn btn-outline-danger btn-sm ms-2"
        >
          <i class="bi bi-trash"></i> Remove All
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * ImagePicker.vue
 *
 * Image selection and preview component for handling multiple image uploads.
 *
 * This component:
 * - Allows users to select multiple images from their device
 * - Displays previews of the selected images
 * - Converts images to base64 for easy handling
 * - Provides remove buttons to clear selections
 * - Uses v-model for two-way data binding
 */

import { ref, watch, computed } from "vue";
import { processImageForAd } from "@/utils";

/**
 * Component props
 */
const props = defineProps({
  /**
   * Current images value for v-model binding
   * Can be an array of strings (URLs or base64) or File objects
   * @type {Array}
   */
  modelValue: {
    type: Array,
    default: () => [],
  },

  /**
   * Initial images to display
   * Used when editing existing images
   * @type {Array}
   */
  initialImages: {
    type: Array,
    default: () => [],
  },

  /**
   * Whether the component is in edit mode
   * @type {Boolean}
   * @default false
   */
  isEdit: {
    type: Boolean,
    default: false,
  },

  /**
   * Whether the image selection is required
   * @type {Boolean}
   * @default true
   */
  isRequired: {
    type: Boolean,
    default: true,
  },

  /**
   * Maximum number of images allowed
   * @type {Number}
   * @default 5
   */
  maxImages: {
    type: Number,
    default: 5,
  },

  /**
   * Whether to help design the image to fit the ad space
   * @type {Boolean}
   * @default false
   */
  designHelp: {
    type: Boolean,
    default: false,
  },
  /**
   * Aspect ratio for image processing when designHelp is true
   * @type {String}
   * @default "4:1"
   */
  aspectRatio: {
    type: String,
    default: "4:1",
  },
});

/**
 * Events emitted by the component
 */
const emit = defineEmits([
  "update:modelValue", // Emitted when the images change (for v-model)
  "remove", // Emitted when an image is removed
  "edit", // Emitted when images are edited
  "view-image", // Emitted when an image is clicked for viewing
]);

/**
 * Array of URLs for image previews
 * Can be base64 strings or URLs
 */
const previewUrls = ref([]);

/**
 * Reference to the file input element
 * Used to reset the input when removing images
 */
const fileInput = ref(null);

/**
 * Computed property to check if there are any images
 */
const hasImages = computed(() => previewUrls.value.length > 0);

/**
 * Watch for changes to the initialImages prop
 * Updates the preview URLs when the prop changes
 */
watch(
  () => props.initialImages,
  (newVal) => {
    if (newVal && newVal.length > 0) {
      previewUrls.value = [...newVal];
    } else {
      previewUrls.value = [];
    }
  },
  { immediate: true } // Run immediately on component setup
);

/**
 * Handles multiple image selection from the file input
 *
 * This function:
 * 1. Gets the selected files from the event
 * 2. Processes each file with a FileReader
 * 3. If designHelp is enabled, processes images to fit the aspect ratio
 * 4. Converts each file to a base64 data URL
 * 5. Updates the previews and emits events
 *
 * @param {Event} event - The change event from the file input
 */
const handleImages = async (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  const newImages = [];
  const maxAllowed = props.maxImages - previewUrls.value.length;
  const filesToProcess = Array.from(files).slice(0, maxAllowed);

  for (const file of filesToProcess) {
    try {
      let dataUrl;

      if (props.designHelp) {
        // Process the image with the utility function when designHelp is enabled
        dataUrl = await processImageForAd(file, props.aspectRatio, {
          quality: 0.85,
          format: "jpeg",
          fit: "contain",
          backgroundColor: "#ffffff",
          // Set a reasonable target width based on common ad sizes
          targetWidth: props.aspectRatio === "1:2" ? 300 : 800,
        });
      } else {
        // Just convert to data URL without processing
        dataUrl = await readFileAsDataURL(file);
      }

      newImages.push(dataUrl);
    } catch (error) {
      console.error("Error processing image:", error);
      // If processing fails, fall back to the original image
      const dataUrl = await readFileAsDataURL(file);
      newImages.push(dataUrl);
    }
  }

  previewUrls.value = newImages;
  emit("update:modelValue", newImages);
  emit("edit", true);
};

/**
 * Reads a file and returns a Promise that resolves to a data URL
 *
 * @param {File} file - The file to read
 * @returns {Promise<string>} A Promise that resolves to the data URL
 */
const readFileAsDataURL = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
};

/**
 * Removes a specific image from the collection
 *
 * @param {Number} index - The index of the image to remove
 */
const removeImage = (index) => {
  const updatedImages = [...previewUrls.value];
  updatedImages.splice(index, 1);
  previewUrls.value = updatedImages;
  emit("update:modelValue", updatedImages);
  emit("remove", index);
};

/**
 * Removes all selected images
 */
const removeAllImages = () => {
  previewUrls.value = [];
  emit("update:modelValue", []);
  emit("remove", "all");
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

/**
 * Opens the file input to add more images
 */
const addMoreImages = () => {
  // console.log("Adding more images: ", fileInput.value);
  if (fileInput.value) {
    fileInput.value.click();
  }
};
</script>

<!-- 
  Scoped styles that only apply to this component
  Includes styling for the image thumbnail preview
-->
<style scoped>
.img-thumbnail {
  border: 1px solid #ddd;
  padding: 4px;
  background: #fff;
}
</style>
