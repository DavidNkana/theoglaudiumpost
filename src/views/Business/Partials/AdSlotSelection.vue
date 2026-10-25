<template>
  <div class="ad-slot-selection">
    <h2 class="mb-4">Select Advertisement Slot</h2>
    <p class="lead mb-4">
      Choose where you would like your advertisement to appear on our platform:
    </p>

    <!-- Loading shimmer placeholders -->
    <div v-if="loading" class="row">
      <div v-for="i in 4" :key="i" class="col-md-6 mb-4">
        <div class="card h-100 shimmer-card">
          <div class="card-header bg-light shimmer-header"></div>
          <div class="shimmer-img"></div>
          <div class="card-body">
            <div class="shimmer-text shimmer-title"></div>
            <div class="shimmer-text"></div>
            <div class="shimmer-text"></div>
            <div class="shimmer-text shimmer-short"></div>
          </div>
          <div class="card-footer bg-white">
            <div class="shimmer-button"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actual slot cards -->
    <div v-else class="row">
      <div v-for="slot in slots" :key="slot.id" class="col-md-6 mb-4">
        <div
          class="card shadow-lg h-100"
          :class="{ 'border-primary': isSelected(slot) }"
        >
          <div class="card-header bg-light">
            <h3 class="h5 mb-0">{{ format(slot.location) }}</h3>
          </div>
          <img
            :src="
              slot.image_id
                ? imageCache[slot.image_id] || slot.image
                : slot.image
            "
            class=""
            :alt="slot.name"
            style="height: 180px; object-fit: cover; cursor: pointer"
            @click="openImageModal(slot)"
            @error="getSlotImage(slot)"
          />
          <div class="card-body">
            <p class="card-text">{{ slot.description }}</p>
            <ul class="list-unstyled">
              <li>
                <strong>Aspect Ratio:</strong>
                {{ slot.aspect_ratio || slot.aspectRatio }}
              </li>
              <li><strong>Duration:</strong> {{ slot.billing_unit }}</li>
              <li>
                <strong>Price:</strong> {{ slot.currency ?? "ZAR" }}
                {{ slot.fee }}
              </li>
            </ul>
          </div>
          <div class="card-footer bg-white">
            <button
              class="btn btn-select w-100"
              @click="selectSlot(slot)"
              :class="{ 'active text-white': isSelected(slot) }"
            >
              {{ isSelected(slot) ? "Selected" : "Select" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="sticky-bottom-nav">
      <div class="d-flex justify-content-end py-3">
        <button
          class="btn btn-success"
          :disabled="!selectedSlot"
          @click="$emit('next-step')"
        >
          Continue to Upload <i class="bi bi-arrow-right"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- Image Modal -->
  <ImageModal
    :show="showImageModal"
    :imageUrl="selectedImage.url"
    :imageAlt="selectedImage.alt"
    @close="closeImageModal"
  />
</template>

<script>
import { formatAdLocation } from "@/utils";
import ImageModal from "@/components/ImageModal.vue";
import { getMediaObjectUrl } from "@/features/media/MediaService";

export default {
  name: "AdSlotSelection",
  components: {
    ImageModal,
  },
  emits: ["select-slot", "next-step"],
  props: {
    slots: {
      type: Array,
      required: true,
    },
    selectedSlot: {
      type: Object,
      default: null,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  mounted() {
    this.preloadSlotImages();
  },
  watch: {
    slots: {
      handler() {
        this.preloadSlotImages();
      },
      immediate: true,
    },
  },
  data() {
    return {
      showImageModal: false,
      imageCache: {},
      selectedImage: {
        url: "",
        alt: "",
      },
    };
  },
  methods: {
    selectSlot(slot) {
      this.$emit("select-slot", {
        ...slot,
        price: Number(slot.fee),
        currency: slot.currency ?? "ZAR",
      });
    },
    isSelected(slot) {
      return this.selectedSlot && this.selectedSlot.id === slot.id;
    },
    format: (slot) => formatAdLocation(slot),
    async fetchAndCacheImage(mediaId) {
      // If already in cache, return the cached URL
      if (this.imageCache[mediaId]) {
        return this.imageCache[mediaId];
      }

      try {
        const url = await getMediaObjectUrl(mediaId);

        // Cache the URL
        this.imageCache[mediaId] = url;
        return url;
      } catch (err) {
        console.error(`Failed to load image with mediaId ${mediaId}:`, err);
        return null;
      }
    },
    async getSlotImage(slot) {
      if (!slot || !slot.image_id) return null;
      return await this.fetchAndCacheImage(slot.image_id);
    },
    async openImageModal(slot) {
      // Fetch the image if it's a media ID
      let imageUrl = slot.image;
      if (slot.image_id) {
        imageUrl = await this.getSlotImage(slot);
      }

      this.selectedImage = {
        url: imageUrl,
        alt: slot.name || "Advertisement Placement",
      };
      this.showImageModal = true;
    },
    closeImageModal() {
      this.showImageModal = false;
    },
    async preloadSlotImages() {
      if (!this.slots || this.slots.length === 0 || this.loading) return;

      // Preload all slot images
      for (const slot of this.slots) {
        if (slot.image_id) {
          await this.getSlotImage(slot);
        }
      }
    },
  },
};
</script>

<style scoped>
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

/* Shimmer effect styles */
.shimmer-card {
  overflow: hidden;
}

.shimmer-header {
  height: 40px;
  margin-bottom: 0;
}

.shimmer-img {
  height: 180px;
  background-color: #f0f0f0;
}

.shimmer-text {
  height: 16px;
  margin-bottom: 12px;
  background-color: #f0f0f0;
  border-radius: 4px;
}

.shimmer-title {
  height: 20px;
  width: 70%;
}

.shimmer-short {
  width: 60%;
}

.shimmer-button {
  height: 38px;
  background-color: #f0f0f0;
  border-radius: 4px;
}

.shimmer-header,
.shimmer-img,
.shimmer-text,
.shimmer-button {
  position: relative;
  overflow: hidden;
}

.shimmer-header::after,
.shimmer-img::after,
.shimmer-text::after,
.shimmer-button::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.6) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
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
