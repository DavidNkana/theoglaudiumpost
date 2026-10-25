<script setup>
import { ref } from "vue";
import {
  formatAdLocation,
  getAdLocationBadgeClass,
  getStatusBadgeClass,
} from "@/utils";
import { changeCategoryStatus } from "@/features/announcements/AnnouncementsService";

const props = defineProps({
  categories: {
    type: Array,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
    required: true,
  },
  page: {
    type: Number,
    default: 0,
  },
  pageSize: {
    type: Number,
    default: 10,
  },
});

const loadingId = ref(null);

const emit = defineEmits(["handle-delete", "handle-edit"]);

const toggleStatus = async (category) => {
  if (category.id == 14) return;
  const newStatus = !category.is_active;
  loadingId.value = category.id;
  try {
    await changeCategoryStatus(category.id, { is_active: newStatus });
    category.is_active = newStatus; // update locally on success
  } catch (error) {
    console.error("Failed to update status:", error);
    // Optional: Revert UI or show error
  } finally {
    loadingId.value = null;
  }
};
</script>

<template>
  <div class="table-responsive">
    <!-- {{ categories }} -->
    <table class="table table-striped table-hover">
      <thead>
        <tr>
          <th class="">No.</th>
          <th class="title-col">Title</th>
          <th class="">Description</th>
          <th class="">Announcements</th>
          <th class="">Active</th>
          <th class="actions-col">Actions</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="isLoading">
          <tr v-for="i in 5" :key="'shimmer-' + i" class="shimmer-row">
            <td class=""><div class="shimmer"></div></td>
            <td class=""><div class="shimmer"></div></td>
            <td class=""><div class="shimmer"></div></td>
            <td class=""><div class="shimmer"></div></td>
            <td class="actions-col">
              <div class="d-flex">
                <div class="shimmer shimmer-btn me-1"></div>
                <div class="shimmer shimmer-btn"></div>
              </div>
            </td>
          </tr>
        </template>
        <template v-else>
          <tr v-if="categories.length === 0">
            <td colspan="11" class="text-center">No categories found</td>
          </tr>
          <tr v-for="(category, index) in categories" :key="category.id">
            <td class="">{{ page * pageSize + index + 1 }}</td>
            <td>
              {{ category.name }}
            </td>
            <td class="">
              {{ category.description }}
            </td>
            <td class="text-center">
              {{ category.announcements }}
            </td>

            <td class="capitalize">
              <div class="form-check form-switch">
                <input
                  class="form-check-input"
                  type="checkbox"
                  :id="`statusSwitch-${category.id}`"
                  :checked="category.is_active"
                  @change="toggleStatus(category)"
                />
                <label
                  class="form-check-label"
                  :for="`statusSwitch-${category.id}`"
                >
                  {{ category.is_active ? "Active" : "Inactive" }}
                </label>
                <div
                  v-if="loadingId === category.id"
                  class="spinner-border spinner-border-sm text-primary"
                  role="status"
                >
                  <span class="visually-hidden">Loading...</span>
                </div>
              </div>
            </td>
            <td class="actions-col">
              <div class="btn-group" v-if="category.id !== 14">
                <button
                  class="btn btn-sm btn-ghost text-success"
                  @click="$emit('handle-edit', category.id)"
                >
                  <i class="bi bi-pencil"></i>
                </button>
                <button
                  class="btn btn-sm btn-ghost text-danger"
                  @click="$emit('handle-delete', category.id)"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
<style scoped>
.table img {
  object-fit: cover;
}

/* Custom styling for truncating text */
.truncate-1 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  max-width: 150px;
}

.truncate-2 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  max-width: 200px;
  min-width: 150px;
}

.title-col {
  min-width: 180px;
}

.actions-col {
  min-width: 160px;
  text-align: right;
}

/* Shimmer loading effect */
@keyframes shimmer {
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
}

.shimmer {
  height: 16px;
  background: #f6f7f8;
  background-image: linear-gradient(
    to right,
    #f6f7f8 0%,
    #edeef1 20%,
    #f6f7f8 40%,
    #f6f7f8 100%
  );
  background-repeat: no-repeat;
  background-size: 800px 104px;
  position: relative;
  animation-duration: 1.5s;
  animation-fill-mode: forwards;
  animation-iteration-count: infinite;
  animation-name: shimmer;
  animation-timing-function: linear;
  border-radius: 4px;
}

.shimmer-img {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background: #f6f7f8;
  background-image: linear-gradient(
    to right,
    #f6f7f8 0%,
    #edeef1 20%,
    #f6f7f8 40%,
    #f6f7f8 100%
  );
  background-repeat: no-repeat;
  background-size: 800px 104px;
  position: relative;
  animation-duration: 1.5s;
  animation-fill-mode: forwards;
  animation-iteration-count: infinite;
  animation-name: shimmer;
  animation-timing-function: linear;
}

.shimmer-badge {
  width: 70px;
  height: 20px;
  border-radius: 12px;
}

.shimmer-btn {
  height: 31px;
  width: 70px;
  border-radius: 4px;
}

/* Responsive column sizing */
@media (max-width: 992px) {
  .d-lg-none-custom {
    display: none;
  }
}

@media (max-width: 768px) {
  .d-md-none-custom {
    display: none;
  }

  /* .actions-col .btn-group {
      flex-direction: column;
    } */

  .actions-col .btn {
    margin-bottom: 5px;
    border-radius: 0.25rem !important;
  }
}

@media (max-width: 576px) {
  .d-sm-none-custom {
    display: none;
  }
}

.capitalize {
  text-transform: capitalize;
}
</style>
