<script setup>
import {
  formatAdLocation,
  getAdLocationBadgeClass,
  getStatusBadgeClass,
} from "@/utils";

const props = defineProps({
  announcements: {
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

const emit = defineEmits(["handle-delete", "handle-edit", "handle-preview"]);
</script>

<template>
  <div class="table-responsive">
    <!-- {{ announcements }} -->
    <table class="table table-striped table-hover">
      <thead>
        <tr>
          <th class="d-md-none-custom">No.</th>
          <th class="title-col">Title</th>
          <th class="d-lg-none-custom">Description</th>
          <th class="d-lg-none-custom">Location</th>
          <th class="">Category</th>
          <th class="">Priority</th>
          <th class="d-lg-none-custom">Status</th>
          <th class="d-lg-none-custom">Publish Date</th>
          <th class="d-lg-none-custom">Expire Date</th>
          <th class="actions-col">Actions</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="isLoading">
          <tr v-for="i in 5" :key="'shimmer-' + i" class="shimmer-row">
            <td class="d-md-none-custom"><div class="shimmer"></div></td>
            <td>
              <div class="d-flex align-items-center title-col">
                <div class="me-2">
                  <div class="shimmer-img"></div>
                </div>
                <div class="shimmer w-100"></div>
              </div>
            </td>
            <td class="d-lg-none-custom"><div class="shimmer"></div></td>
            <td>
              <div class="shimmer"></div>
              <div class="shimmer mt-1"></div>
            </td>
            <td class="d-lg-none-custom"><div class="shimmer"></div></td>
            <td class="d-md-none-custom"><div class="shimmer"></div></td>
            <td><div class="shimmer shimmer-badge"></div></td>
            <td class="d-md-none-custom"><div class="shimmer"></div></td>
            <td class="actions-col">
              <div class="d-flex">
                <div class="shimmer shimmer-btn me-1"></div>
                <div class="shimmer shimmer-btn"></div>
              </div>
            </td>
          </tr>
        </template>
        <template v-else>
          <tr v-if="announcements.length === 0">
            <td colspan="11" class="text-center">No announcements found</td>
          </tr>
          <tr
            v-for="(announcement, index) in announcements"
            :key="announcement.id"
          >
            <td class="d-md-none-custom">{{ page * pageSize + index + 1 }}</td>
            <td>
              <div class="d-flex align-items-center title-col">
                <div v-if="announcement.image" class="me-2">
                  <img
                    :src="announcement.image?.file"
                    class="rounded"
                    width="40"
                    height="40"
                    alt="article thumbnail"
                  />
                </div>
                <!-- <div> -->
                <div class="truncate-1">
                  {{ announcement.title }}
                </div>
              </div>
            </td>
            <td class="d-lg-none-custom">
              <div class="truncate-1">
                {{ announcement.description }}
              </div>
            </td>
            <td class="d-lg-none-custom">
              <span class="truncate-2">{{ announcement.location ?? "-" }}</span>
            </td>
            <td class="">
              <span class="truncate-2">{{
                announcement?.category?.name ?? "-"
              }}</span>
            </td>
            <td class="capitalize">
              <span class="truncate-2">{{
                announcement?.priority ?? "-"
              }}</span>
            </td>
            <td class="d-lg-none-custom capitalize">
              <span
                class="capitalize"
                :class="getStatusBadgeClass(announcement.status)"
              >
                {{ announcement.status }}
              </span>
            </td>

            <td class="d-lg-none-custom capitalize">
              {{ announcement.publish_date?.split("T")[0] }}
            </td>
            <td class="d-lg-none-custom capitalize">
              {{ announcement.expire_date?.split("T")[0] }}
            </td>
            <td class="actions-col">
              <div class="btn-group">
                <button
                  class="btn btn-sm btn-ghost text-secondary"
                  @click="$emit('handle-preview', announcement.id)"
                >
                  <i class="bi bi-eye"></i>
                </button>
                <router-link
                  class="btn btn-sm btn-ghost text-success"
                  :to="`announcements/edit/${announcement.id}`"
                >
                  <i class="bi bi-pencil"></i>
                </router-link>
                <button
                  class="btn btn-sm btn-ghost text-danger"
                  @click="$emit('handle-delete', announcement.id)"
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
