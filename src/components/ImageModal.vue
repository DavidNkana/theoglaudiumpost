<template>
  <div class="image-modal" v-if="show" @click.self="closeModal">
    <div class="modal-content">
      <div class="card">
        <div class="card-body p-0">
          <button class="close-btn" @click="closeModal">&times;</button>

          <!-- Image display -->
          <img :src="currentImage" :alt="imageAlt" class="modal-image" />

          <!-- Navigation controls (only shown when there are multiple images) -->
          <!-- <div v-if="hasMultipleImages" class="image-navigation">
            <button 
              class="nav-btn prev-btn" 
              @click.stop="prevImage"
              :disabled="currentIndex === 0"
            >
              <i class="bi bi-chevron-left"></i>
            </button>
            <div class="image-counter">{{ currentIndex + 1 }} / {{ images.length }}</div>
            <button 
              class="nav-btn next-btn" 
              @click.stop="nextImage"
              :disabled="currentIndex === images.length - 1"
            >
              <i class="bi bi-chevron-right"></i>
            </button>
          </div> -->
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ImageModal",
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    images: {
      type: Array,
      default: () => [],
    },
    imageUrl: {
      type: String,
      default: "",
    },
    imageAlt: {
      type: String,
      default: "Image",
    },
    initialIndex: {
      type: Number,
      default: 0,
    },
  },
  data() {
    return {
      currentIndex: 0,
    };
  },
  computed: {
    hasMultipleImages() {
      return this.images && this.images.length > 1;
    },
    currentImage() {
      if (this.images && this.images.length > 0) {
        return this.images[this.currentIndex];
      }
      return this.imageUrl;
    },
  },
  watch: {
    initialIndex(newVal) {
      this.currentIndex = newVal;
    },
    show(newVal) {
      if (newVal) {
        this.currentIndex = this.initialIndex;
      }
    },
  },
  methods: {
    closeModal() {
      this.$emit("close");
    },
    nextImage() {
      if (this.currentIndex < this.images.length - 1) {
        this.currentIndex++;
      }
    },
    prevImage() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
      }
    },
  },
};
</script>

<style scoped>
.image-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
}

.modal-content {
  position: relative;
  max-width: 90%;
  max-height: 90%;
}

.card {
  background-color: white;
  border-radius: 5px;
  overflow: hidden;
}

.modal-image {
  max-width: 100%;
  max-height: 80vh;
  display: block;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(255, 255, 255, 0.7);
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  z-index: 1060;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.9);
}

.image-navigation {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
}

.nav-btn {
  background-color: rgba(255, 255, 255, 0.3);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
}

.nav-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.5);
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.image-counter {
  font-size: 14px;
  font-weight: bold;
}
</style>
