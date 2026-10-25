<script setup>
import { ref } from "vue";

const props = defineProps({
  notice: {
    type: Object,
    required: true,
  },
});

const showModal = ref(false);

const formatDate = (dateString) => {
  const options = { month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
};

const openModal = () => {
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};
</script>
<template>
  <div
    class="card h-100 event-card text-white overflow-hidden position-relative"
    @click="openModal"
    style="cursor: pointer"
  >
    <div class="date-badge">{{ formatDate(notice.publish_date) }}</div>
    <span class="badge category-badge bg-info">{{
      notice?.category?.name
    }}</span>
    <img
      :src="notice.image?.file || '/placeholder-image.png'"
      class="card-img-top"
      :alt="notice.title"
    />
  </div>

  <!-- Bootstrap 5 Modal -->
  <div
    class="modal fade"
    :class="{ show: showModal }"
    tabindex="-1"
    :style="{ display: showModal ? 'block' : 'none' }"
    aria-modal="true"
    role="dialog"
    @click.self="closeModal"
  >
    <div
      class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down modal-lg"
    >
      <div class="modal-content">
        <!-- <div class="modal-header">
          <h5 class="modal-title">{{ notice.title }}</h5>
          <button
            type="button"
            class="btn-close"
            @click="closeModal"
            aria-label="Close"
          ></button>
        </div> -->
        <div class="modal-body">
          <!-- If notice has content, show both image and content -->
          <!-- <div v-if="notice.content">
            <div class="text-center mb-4" v-if="notice.image?.file">
              <img
                :src="notice.image?.file"
                class="img-fluid"
                :alt="notice.title"
                style="max-height: 400px"
              />
            </div>
            <div v-html="notice.content"></div>
          </div>
           -->
          <!-- If notice only has an image, show just the image -->
          <div v-if="notice.image?.file" class="text-center">
            <img
              :src="notice.image?.file"
              class="img-fluid"
              :alt="notice.title"
            />
          </div>

          <!-- Fallback if neither content nor image is available -->
          <div v-else class="text-center">
            <p>No details available for this notice.</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal backdrop -->
  <div
    class="modal-backdrop fade"
    :class="{ show: showModal }"
    v-if="showModal"
    @click="closeModal"
  ></div>
</template>
<style scoped>
.event-card {
  transition:
    transform 0.3s,
    box-shadow 0.3s;
}
.event-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}
.category-badge {
  position: absolute;
  top: 10px;
  right: 10px;
}
.date-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 10px;
  border-radius: 4px;
}

img {
  height: 100%;
  object-fit: cover;
  filter: brightness(0.9);
}

.overlay {
  background: linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0.4) 35%,
    rgba(0, 0, 0, 0) 100%
  );
}

/* Modal styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 2050;
  width: 100%;
  height: 100%;
  overflow: hidden;
  outline: 0;
}

.modal-content {
  background: none;
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1040;
  width: 100vw;
  height: 100vh;
  /* background-color: #000; */
}

.modal-backdrop.fade {
  opacity: 0;
}

.modal-backdrop.show {
  opacity: 0.8 !important;
}

.fade {
  transition: opacity 0.15s linear;
}

.fade.show {
  opacity: 1;
}

/* Fix for modal image */
.modal-body img {
  height: auto;
  max-width: 100%;
  object-fit: contain;
}
</style>
