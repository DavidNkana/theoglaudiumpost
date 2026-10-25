<script setup>
import { ref, onMounted } from "vue";
import { useStore } from "vuex";
import { formatTimeAgo } from "@/utils";
import EventCard from "@/components/EventCard.vue";
import ArticlesRow from "@/views/News/Partials/ArticlesRow.vue";

const props = defineProps({
  title: {
    type: String,
    default: "Recent Updates",
  },
  showViewAll: {
    type: Boolean,
    default: true,
  },
  page: {
    type: String,
    default: "notices",
  },
});

const isLoading = ref(null);
const store = useStore();

onMounted(() => {
  fetchNotices();
});

const fetchNotices = async () => {
  try {
    isLoading.value = true;
    await store.dispatch("notices/fetchRecentNotices", {
      type: "communityUpdates",
      size: 8,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
  } finally {
    isLoading.value = false;
  }
};
</script>
<template>
  <div v-if="!!store.getters['notices/recent']?.length">
    <div v-if="page == 'notices'" class="card">
      <div class="card-header">
        <h5 class="mb-0">{{ title }}</h5>
      </div>

      <div class="p-0 card-body">
        <ul class="list-group list-group-flush">
          <li
            v-for="(update, index) in store.getters['notices/recent']"
            :key="index"
            class="list-group-item"
          >
            <small class="d-block mb-1">{{
              formatTimeAgo(update.publish_date)
            }}</small>
            <router-link class="mb-0 link" :to="`/community/${update.slug}`">{{
              update.title
            }}</router-link>
          </li>
        </ul>
      </div>
    </div>
    <div v-else>
      <div class="section-header d-flex align-items-center mb-3">
        <h2 class="section-title m-0">{{ title }}</h2>
        <div class="section-line flex-grow-1 mx-3"></div>
        <router-link v-if="showViewAll" to="/community" class="section-link"
          >View All</router-link
        >
      </div>

      <div v-if="!isLoading" class="list-group list-group-flush">
        <div v-for="(notice, index) in store.getters['notices/recent']">
          <EventCard
            v-if="index == 0"
            :event="notice"
            min-details
            class="mb-2"
          />
          <div
            v-else
            class="list-group-item list-group-item-action my-1 rounded"
          >
            <div class="h6 md-h5">
              <router-link
                class="nav-link title"
                :to="`/community/${notice.slug}`"
              >
                {{ notice.title }}</router-link
              >
            </div>
          </div>
        </div>
      </div>
      <ArticlesRow v-else :is-loading="isLoading" :articles="[]" />
    </div>
  </div>
</template>
<style scoped>
.card {
  background-color: var(--primary-dark);
  color: white;
  border: none;
  box-shadow: none;
}

.list-group-item {
  border: none;
  box-shadow: none;
  background-color: var(--primary-dark);
  color: white;
  transition: transform 0.3s ease;
  overflow: hidden;
}
.list-group-item:hover {
  transform: translateY(-5px);
  background-color: var(--primary-dark);
  color: white;
}

small {
  color: gray;
}

.link {
  text-decoration: none !important;
  color: inherit !important;
}

.link:hover {
  text-decoration: underline !important;
  color: var(--secondary) !important;
}

.nav-link {
  color: inherit !important;
  text-decoration: none !important;
}

.nav-link:hover {
  color: var(--secondary) !important;
  text-decoration: underline !important;
}
</style>
