<template>
  <div class="ad-content-upload card shadow-lg">
    <h2 class="mb-4">Upload Advertisement Content</h2>
    <p class="lead mb-4">
      Provide details for your advertisement in the selected slot:
    </p>

    <div class="card mb-4">
      <div class="card-header bg-light">
        <h3 class="h5 mb-0">Selected Slot: {{ selectedSlot.name }}</h3>
      </div>
      <div class="card-body">
        <p>
          <strong>Required Aspect Ratio:</strong>
          {{ selectedSlot.aspect_ratio || selectedSlot.aspectRatio }}
        </p>
        <p><strong>Price: </strong>ZAR {{ selectedSlot.price }}</p>
        <p><strong>Cost: </strong>ZAR {{ form.totalCost }}</p>
      </div>
    </div>

    <form @submit.prevent="validateAndProceed">
      <div class="mb-4">
        <label for="adTitle" class="form-label">Advertisement Title</label>
        <input
          type="text"
          class="form-control"
          id="adTitle"
          v-model="form.title"
          required
        />
      </div>

      <div class="mb-4">
        <label for="adDescription" class="form-label">Description</label>
        <textarea
          class="form-control"
          id="adDescription"
          v-model="form.description"
          rows="3"
        ></textarea>
      </div>

      <div class="mb-4">
        <label for="adUrl" class="form-label">Click URL</label>
        <input
          type="url"
          class="form-control"
          id="adUrl"
          v-model="form.url"
          :class="{ 'is-invalid': !isValidUrl }"
          placeholder="https://example.com"
          required
        />
        <div class="form-text">
          Where users will be directed when they click on your ad
        </div>
      </div>

      <div class="mb-4">
        <label class="form-label">Advertisement Images</label>
        <ImagePicker
          v-model="files"
          :initialImages="form.files"
          :designHelp="form.designHelp"
          :aspectRatio="
            selectedSlot.aspect_ratio || selectedSlot.aspectRatio || '4:1'
          "
          is-required
          @view-image="viewImage"
        />
        <div class="form-text">
          You can upload up to 5 images for your advertisement.
        </div>
        <div class="mt-2 form-check form-switch">
          <input
            type="checkbox"
            class="form-check-input"
            id="designHelp"
            v-model="form.designHelp"
          />
          <label for="designHelp" class="ms-2 form-label"
            >Let help design your ad to fit the space</label
          >
        </div>
      </div>

      <!-- Image Modal for previewing selected images -->
      <ImageModal
        :show="showImageModal"
        :images="files"
        :initialIndex="currentImageIndex"
        :imageAlt="form.title || 'Ad Preview'"
        @close="closeImageModal"
      />

      <!-- <div class="row mb-4">
        <div class="col-md-6">
          <label for="startDate" class="form-label">Start Date</label>
          <input
            type="datetime-local"
            class="form-control"
            id="startDate"
            v-model="form.startDate"
            required
          />
        </div>
        <div class="col-md-6">
          <label for="endDate" class="form-label">End Date</label>
          <input
            type="datetime-local"
            class="form-control"
            id="endDate"
            v-model="form.endDate"
            required
          />
        </div>
      </div> -->

      <div class="sticky-bottom-nav">
        <div class="d-flex justify-content-between py-3">
          <button
            type="button"
            class="btn btn-outline-secondary"
            @click="$emit('prev-step')"
          >
            <i class="bi bi-arrow-left"></i> Back to Slot Selection
          </button>
          <button type="submit" class="btn btn-select active text-white">
            Continue to Payment <i class="bi bi-arrow-right"></i>
          </button>
        </div>
      </div>
    </form>

    <!-- Preview section if file is uploaded -->
    <!-- <div v-if="filePreview" class="mt-5">
      <h4>Preview</h4>
      <div class="card">
        <div class="card-body">
          <img :src="filePreview" class="img-fluid" alt="Ad Preview" />
        </div>
      </div>
    </div> -->
  </div>
</template>

<script>
import ImagePicker from "@/components/MultiImagePicker.vue";
import ImageModal from "@/components/ImageModal.vue";
import dayjs from "dayjs";

export default {
  name: "AdContentUpload",
  props: {
    selectedSlot: {
      type: Object,
      required: true,
    },
    adContent: {
      type: Object,
      required: true,
    },
  },
  emits: ["prev-step", "next-step"],
  components: {
    ImagePicker,
    ImageModal,
  },
  data() {
    return {
      form: {
        title: this.adContent.title || "",
        description: this.adContent.description || "",
        url: this.adContent.url || "",
        designHelp: false,
        startDate: this.adContent.startDate || "",
        endDate: this.adContent.endDate || "",
        files: this.adContent.files || [],
      },
      filePreview: null,
      files: this.adContent.files || [],
      isValidUrl: false,
      showImageModal: false,
      currentImageIndex: 0,
    };
  },
  watch: {
    "form.url"(newVal, oldVal) {
      if (!newVal) return;

      // Auto-prepend https:// if missing
      if (!/^https?:\/\//i.test(newVal)) {
        this.form.url = "https://" + newVal;
      }

      // Validate URL pattern
      try {
        new URL(this.form.linkUrl);
        this.isValidUrl = true;
      } catch {
        this.isValidUrl = false;
      }
    },
  },
  emits: ["update-content", "next-step"],
  mounted() {
    this.initializeDates();
  },
  methods: {
    initializeDates() {
      const today = dayjs();

      // Set start date to today
      this.form.startDate = today.format("YYYY-MM-DDTHH:mm");

      // Calculate end date based on billing unit
      let endDate;
      const billingUnit = this.selectedSlot.billing_unit || "DAY";

      switch (billingUnit.toUpperCase()) {
        case "MONTH":
          endDate = today.add(1, "month").subtract(1, "day");
          break;
        case "WEEK":
          endDate = today.add(1, "week").subtract(1, "day");
          break;
        case "DAY":
        default:
          endDate = today.add(1, "day").subtract(1, "hour");
          break;
      }

      this.form.endDate = endDate.format("YYYY-MM-DDTHH:mm");
      this.calculateCost();
    },
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      this.file = file;

      // Create a preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.filePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    validateAndProceed() {
      // Validate dates
      const startDate = new Date(this.form.startDate);
      const endDate = new Date(this.form.endDate);

      this.validateAndRecalculate();
      if (endDate <= startDate) {
        alert("End date must be after start date");
        return;
      }

      // Validate that at least one image is selected
      if (!this.files || this.files.length === 0) {
        alert("Please select at least one image for your advertisement");
        return;
      }

      // Update parent component with form data
      this.$emit("update-content", {
        files: this.files,
        file: this.files[0], // Keep the first image as the primary for backward compatibility
        title: this.form.title,
        description: this.form.description,
        url: this.form.url,
        startDate: this.form.startDate,
        endDate: this.form.endDate,
        totalCost: this.form.totalCost,
      });

      this.$emit("next-step");
    },

    // Methods for image modal
    viewImage(index) {
      this.currentImageIndex = index;
      this.showImageModal = true;
    },

    closeImageModal() {
      this.showImageModal = false;
    },
    calculateCost() {
      const start = dayjs(this.form.startDate);
      const end = dayjs(this.form.endDate);
      const placement = this.selectedSlot;

      if (!placement) return;

      const days = end.diff(start, "day") + 1;

      if (placement.fee_type === "FIXED") {
        const unit = placement.billing_unit;
        let multiplier = 1;

        if (unit === "DAY") {
          multiplier = days;
        } else if (unit === "WEEK") {
          multiplier = Math.ceil(days / 7);
        } else if (unit === "MONTH") {
          // console.log("days: ", days);
          // console.log("x: ", Math.ceil((days - 1) / 30));
          multiplier = Math.ceil((days - 1) / 30); // approx monthly blocks
        }

        this.form.totalCost = (Number(placement.fee) * multiplier).toFixed(2);
      }
    },
    validateAndRecalculate() {
      const start = dayjs(this.form.startDate);
      const end = dayjs(this.form.endDate);

      if ((start.isValid() && !end.isValid()) || end.isBefore(start)) {
        alert("End date must be after start date.");
        this.form.endDate = "";
        return;
      }

      this.calculateCost();
    },
  },
};
</script>

<style scoped>
.ad-content-upload {
  padding: 1rem;
}

.sticky-bottom-nav {
  position: sticky;
  bottom: 0;
  background-color: white;
  border-top: 1px solid #dee2e6;
  margin-top: 2rem;
  margin-left: -1rem;
  margin-right: -1rem;
  padding-left: 1rem;
  padding-right: 1rem;
  z-index: 1000;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.border-primary {
  border-color: var(--primary) !important;
}

.btn-select {
  border: 1px solid var(--primary);
  color: #000;
}
.btn-select.active {
  background-color: var(--primary);
}
</style>
