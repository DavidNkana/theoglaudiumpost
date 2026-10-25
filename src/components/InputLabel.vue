<script setup>
const props = defineProps({
  value: String,
  isRequired: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <label class="form-label"
    >{{ value }} <span v-if="isRequired" class="text-danger">*</span></label
  >
</template>
