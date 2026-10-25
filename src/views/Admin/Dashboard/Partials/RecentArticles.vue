<script setup>
import { ref, onMounted } from "vue";
import { getArticles } from "@/features/articles/ArticlesService";
import { formatTimeAgo } from "@/utils";
import TableImageWithPlaceholder from "../../Articles/Partials/TableImageWithPlaceholder.vue";

const isLoading = ref(false);

const articles = ref({});

onMounted(() => {
  fetchData();
});

const fetchData = async () => {
  isLoading.value = true;

  try {
    const response = await getArticles({
      size: 5,
    });
    if (response.status != 200)
      throw new Error("Unable to Fetch Recent Articles");
    articles.value = response.data.articles ?? [];

    isLoading.value = false;
  } catch (error) {
    console.error(error);
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="card border-0 shadow-lg">
    <div class="card-header bg-white d-flex justify-content-between">
      <h5 class="card-title mb-0">Recent Articles</h5>
      <router-link
        to="/admin/articles"
        class="text-decoration-none text-success"
        >View all</router-link
      >
    </div>
    <div class="card-body p-0">
      <div v-if="!isLoading" class="list-group list-group-flush">
        <div
          v-for="article in articles"
          :key="article.id"
          class="list-group-item py-3"
        >
          <div class="d-flex align-items-center">
            <div
              class="activity-icon bg-success bg-opacity-10 text-success rounded-circle me-3"
            >
              <div v-if="article.cover_id" class="me-2">
                <TableImageWithPlaceholder
                  class="img-fluid rounded"
                  :media-id="article.cover_id"
                />
              </div>
            </div>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-center">
                <h6 class="mb-1">{{ article.title }}</h6>
                <small class="text-muted">{{
                  formatTimeAgo(article.scheduledFor || article.created_at)
                }}</small>
              </div>
              <p class="mb-0 text-muted">
                {{ article.summary }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <template v-else>
        <div v-for="i in 5" :key="'shimmer-' + i" class="shimmer-row">
          <div class="d-flex align-items-center title-col m-2">
            <div class="me-2">
              <div class="shimmer-img"></div>
            </div>
            <div class="shimmer w-100"></div>
          </div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center">
              <h6 class="mb-1 shimmer"></h6>
              <small class="text-muted shimmer"></small>
            </div>
            <p class="mb-0 text-muted shimmer"></p>
          </div>
        </div>
      </template>
    </div>
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
