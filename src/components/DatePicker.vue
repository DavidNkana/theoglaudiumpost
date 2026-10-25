<!-- 
  Date picker component that allows users to select a date or date range.

  This component:
  - Wraps the flatpickr library for date selection
  - Supports single date or date range selection
  - Provides a clear button to reset the selection
  - Emits events to update the parent component
-->
<template>
  <div class="input-group">
    <!-- <label>Date</label> -->
    <flat-pickr
      v-model="internalRange"
      :config="config"
      class="form-control"
      placeholder="Select date"
      name="date"
    />
    <button
      class="btn btn-secondary"
      type="button"
      title="Clear"
      data-clear
      @click="clearDate"
    >
      <i class="bi bi-x" />
      <!-- <span aria-hidden="true" class="sr-only">Clear</span> -->
    </button>
  </div>
</template>

<script setup>
/**
 * DatePicker.vue
 * 
 * Date selection component that provides a user-friendly interface for selecting dates.
 * 
 * This component:
 * - Integrates the flatpickr library for date selection
 * - Supports both single date and date range selection
 * - Provides a clear button to reset the selection
 * - Uses v-model for two-way data binding
 * - Formats dates in a user-friendly way
 */

import { ref, watch } from "vue";
import flatPickr from "vue-flatpickr-component";
import "flatpickr/dist/flatpickr.css";
// Material Blue theme for consistent styling
import "flatpickr/dist/themes/material_blue.css";
import { devLog } from "@/utils/devLog";

/**
 * Component props
 */
const props = defineProps({
  /**
   * Date range value for v-model binding
   * Array containing start and end dates, or a single date
   * @type {Array}
   * @default []
   */
  modelValue: {
    type: Array,
    default: () => [],
  },
});

/**
 * Events emitted by the component
 */
const emit = defineEmits(["update:modelValue"]);

/**
 * Internal representation of the date range
 * Used to sync with the flatpickr component
 */
const internalRange = ref(props.modelValue);

/**
 * Watch for changes to the modelValue prop
 * Updates the internal range when the prop changes
 */
watch(
  () => props.modelValue,
  (val) => {
    devLog.info("modelValue", val);
    if (val[1]) {
      // Format as range with "to" separator for flatpickr
      internalRange.value = val.join(" to ");
    } else {
      // Single date
      internalRange.value = val[0];
    }
    devLog.info("range", internalRange.value);
  }
);

/**
 * Watch for changes to the internal range
 * Emits update events to the parent component
 */
watch(
  () => internalRange.value,
  (val) => {
    let _dates = val;
    if (_dates?.includes("to")) {
      // Parse range format back to array
      _dates = _dates.split(" to ");
    } else {
      // Single date format
      _dates = [val, null];
    }
    devLog.info("update:modelValue", _dates);
    emit("update:modelValue", _dates);
  }
);

/**
 * Configuration options for the flatpickr component
 * @see https://flatpickr.js.org/options/ for all available options
 */
const config = ref({
  wrap: true,           // Set wrap to true when using 'input-group'
  mode: "range",        // Enable date range selection
  dateFormat: "Y-m-d",  // Format for date storage (YYYY-MM-DD)
  time_24hr: true,      // Use 24-hour time format
});

/**
 * Clears the date selection
 * Called when the clear button is clicked
 */
function clearDate() {
  internalRange.value = null;
}
</script>
