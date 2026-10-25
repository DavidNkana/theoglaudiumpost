<script setup>
import AdBanner from "@/components/AdBanner.vue";
import {
  formatDate,
  HOME_BANNER,
  IN_ARTICLE_BOTTOM,
  IN_ARTICLE_MID,
  SIDEBAR_TOP,
  SIDEBAR_BOTTOM,
  SIDEBAR_MID,
} from "@/utils";
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
import Contacts from "./Partials/Contacts.vue";
import RelatedNotices from "./Partials/RelatedNotices.vue";
import RecentUpdates from "./Partials/RecentUpdates.vue";

const notice = ref(null);

const loading = ref(false);

const route = useRoute();

const store = useStore();

const relatedNotices = computed(() =>
  store.getters["notices/relatedNotices"]({
    id: notice.value?.id,
    categoryId: notice.value?.category_id,
  })
);

const fetchNotice = async (slug) => {
  try {
    loading.value = true;

    notice.value = await store.dispatch("notices/fetchSingleNotice", slug);

    loading.value = false;
  } catch (err) {
    console.error("Error fetching notice data:", err);
    // error.value =
    //   "Failed to load notice. Please try again or contact support.";
    loading.value = false;
  }
};

const showAds = computed(() => {
  const _notice = notice.value;
  // Show ads only if the notice has content
  return (
    _notice?.content &&
    _notice?.content.length > 0 &&
    !_notice?.category?.name?.toLowerCase().includes("funeral") &&
    !_notice?.title?.toLowerCase().includes("funeral")
  );
});

onMounted(() => {
  const slug = route.params.slug;
  fetchNotice(slug);
});

watch(
  () => route.params.slug,
  (newSlug) => {
    fetchNotice(newSlug);
  }
);

// 👇 Split the HTML into paragraphs
const paragraphBlocks = computed(() => {
  const paragraphs = notice.value.content?.match(/<p>.*?<\/p>/g) || [];

  const blocks = [];
  const insertEvery = 3; // every 3 paragraphs
  let count = 0;

  paragraphs.forEach((para, i) => {
    blocks.push({
      type: "div",
      props: {
        innerHTML: para,
      },
    });

    count++;
    if (count === insertEvery && showAds.value) {
      blocks.push({
        type: AdBanner,
        props: {
          // placement: `In-Notice Ad after paragraph ${i + 1}`,
          placement: IN_ARTICLE_MID,
          tags: notice.value?.tags?.map((tag) => tag.id),
        },
      });
      count = 0;
    }
  });

  return blocks;
});

// 👇 Rendered content includes both paragraphs and ads
const renderedContent = computed(() => paragraphBlocks.value);
</script>
<template>
  <div class="notice-details-page">
    <div v-if="!loading && notice" class="container py-4">
      <AdBanner size="large" :placement="HOME_BANNER" />
      <!-- Breadcrumb -->
      <nav aria-label="breadcrumb" class="mb-3">
        <ol class="breadcrumb">
          <li class="breadcrumb-item">
            <router-link to="/">Home</router-link>
          </li>
          <li class="breadcrumb-item">
            <router-link to="/community"> Community </router-link>
          </li>
          <li class="breadcrumb-item">
            <router-link :to="`/community?category=${notice?.category?.id}`">
              {{ notice.category.name }}
            </router-link>
          </li>
          <li class="breadcrumb-item active" aria-current="page">
            {{ notice?.title }}
          </li>
        </ol>
      </nav>

      <div class="row">
        <!-- Main Content Area -->
        <div class="col-lg-8">
          <article class="notice-main">
            <!-- Notice Header -->
            <header>
              <div class="d-flex mb-3">
                <span class="badge bg-warning me-2">{{
                  notice?.category?.name
                }}</span>
                <span class="small">
                  {{ formatDate(notice?.publish_date ?? notice?.created_at) }}
                </span>
              </div>

              <h1 class="notice-title mb-2">{{ notice?.title }}</h1>

              <div class="notice-subtitle mb-2">
                {{ notice?.description }}
              </div>
            </header>

            <!-- Featured Image -->
            <figure v-if="notice.image" class="notice-featured-image mb-4">
              <img :src="notice.image?.file" :alt="notice.title" />
              <figcaption class="text-muted small mt-2">
                {{ notice.title }}
              </figcaption>
            </figure>

            <!-- Notice Content -->
            <div class="notice-content">
              <div v-for="(block, index) in renderedContent" :key="index">
                <component :is="block.type" v-bind="block.props" />
              </div>
            </div>
          </article>

          <div class="related-notices" v-if="relatedNotices?.length > 0">
            <RelatedNotices :notices="relatedNotices" />
          </div>
        </div>

        <!-- Sidebar -->
        <div class="d-none d-lg-block col-lg-4">
          <Contacts />

          <!-- Recent Updates -->
          <div class="">
            <RecentUpdates />
          </div>
        </div>
      </div>
      <!-- Related Articles -->

      <!-- <AdBanner
        size="medium"
        :placement="IN_ARTICLE_BOTTOM"
        :tags="notice?.tags?.map((tag) => tag.id)"
      /> -->
    </div>
    <div v-else class="container py-4">
      <!-- Featured Image -->
      <div
        class="shimmer mb-4"
        style="width: 100%; height: 300px; border-radius: 8px"
      ></div>

      <!-- Title -->
      <div class="shimmer mb-3" style="width: 60%; height: 30px"></div>

      <!-- Meta Info (Date, Author) -->
      <div class="d-flex gap-3 mb-4">
        <div class="shimmer" style="width: 100px; height: 15px"></div>
        <div class="shimmer" style="width: 120px; height: 15px"></div>
      </div>

      <!-- Notice Paragraphs -->
      <div v-for="n in 5" :key="n" class="mb-3">
        <div
          class="shimmer"
          style="height: 15px; width: 100%; margin-bottom: 5px"
        ></div>
        <div
          class="shimmer"
          style="height: 15px; width: 95%; margin-bottom: 5px"
        ></div>
        <div class="shimmer" style="height: 15px; width: 90%"></div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.breadcrumb > * {
  color: white !important;
}

.breadcrumb-item a {
  color: var(--secondary) !important;
  text-decoration: none !important;
}
.breadcrumb-item a:hover {
  text-decoration: underline !important;
}

header {
  color: white;
}

.notice-featured-image {
  max-height: 400px; /* Adjust this value as needed */
  overflow: hidden;
}

.notice-featured-image img {
  width: 100%;
  max-height: 400px;
  height: auto;
  object-fit: cover;
  display: block;
  border-radius: 0.5rem; /* if not using Bootstrap rounded */
}

.notice-title {
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.2;
}

.notice-subtitle {
  font-size: 1.1rem;
  color: #667;
  font-weight: 400;
}

.notice-content {
  font-size: 1.1rem;
  line-height: 1.7;
  color: white;
}

.notice-content h3 {
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 600;
}

.notice-content p {
  margin-bottom: 1.2rem;
}

.notice-content ul {
  margin-bottom: 1.2rem;
  padding-left: 1.5rem;
}

.notice-content li {
  margin-bottom: 0.5rem;
}

.author-name {
  font-weight: 600;
}

.sidebar-heading {
  position: relative;
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e9ecef;
}

.sidebar-heading::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 60px;
  height: 2px;
  background-color: #0d6efd;
}

.sidebar-news-list .list-group-item {
  padding: 0.75rem;
  transition: background-color 0.2s ease;
}

.sidebar-news-list .list-group-item:hover {
  background-color: #f8f9fa;
}

.sidebar-ad {
  background-color: #f8f9fa;
  padding: 0.5rem;
  border-radius: 0.25rem;
}

.nested-comments {
  border-left: 2px solid #e9ecef;
  padding-left: 1rem;
}

@media (max-width: 767.98px) {
  .notice-title {
    font-size: 1.75rem;
  }

  .notice-subtitle {
    font-size: 1.1rem;
  }

  .notice-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .notice-stats {
    margin-left: 0;
    margin-top: 1rem;
  }

  .sidebar-thumb {
    width: 80px;
    height: 60px;
  }
}

.shimmer {
  position: relative;
  overflow: hidden;
  background: #e0e0e0;
  border-radius: 4px;
}

.shimmer::after {
  content: "";
  position: absolute;
  top: 0;
  left: -150px;
  width: 100px;
  height: 100%;
  background: linear-gradient(
    to right,
    transparent 0%,
    #f8f9fa 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    left: -150px;
  }
  100% {
    left: 100%;
  }
}
</style>
