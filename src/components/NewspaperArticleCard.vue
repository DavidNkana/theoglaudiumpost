<script setup>
/**
 * components/NewspaperArticleCard.vue
 *
 * The article card used by the mobile newspaper feed.
 *
 * A newspaper card reads top to bottom: the kicker and headline sit above the
 * picture, and the standfirst (short description) and the sub text sit below
 * it. Everything is set in the newspaper serif.
 */

import { computed, ref, watch } from "vue";
import dayjs from "dayjs";
import { getMediaById } from "@/features/media/MediaService";

const props = defineProps({
  article: {
    type: Object,
    required: true,
  },
  isTopStory: {
    type: Boolean,
    default: false,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isPopular: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["loaded"]);

const imageUrl = ref(null);
const isLoadingImage = ref(false);

const PLACEHOLDER_IMAGE = "https://placehold.co/800x450?text=Laudium+POST";

/**
 * Resolves the cover image for the article.
 */
const fetchMedia = async () => {
  if (props.article?.cover_id) {
    isLoadingImage.value = true;
    try {
      let storyType = null;
      if (props.isTopStory) {
        storyType = "top";
      } else if (props.isFeatured) {
        storyType = "featured";
      } else if (props.isPopular) {
        storyType = "popular";
      }

      const response = await getMediaById(props.article.cover_id, storyType);
      if (response.data && response.status === 200 && response.data.url) {
        imageUrl.value = response.data.url;
      }
    } catch (error) {
      console.error("Error fetching media:", error);
      imageUrl.value = PLACEHOLDER_IMAGE;
    } finally {
      isLoadingImage.value = false;
      emit("loaded");
    }
  } else if (props.article?.cover?.file) {
    imageUrl.value = props.article.cover.file;
    emit("loaded");
  } else {
    imageUrl.value = PLACEHOLDER_IMAGE;
    emit("loaded");
  }
};

watch(() => props.article, fetchMedia, { immediate: true });

const routeTarget = computed(() => `/news/${props.article?.slug}`);

const title = computed(() => props.article?.title ?? "");

const summary = computed(() => props.article?.summary ?? "");

const categoryName = computed(() => props.article?.category?.name ?? "");

const publishedDate = computed(() => {
  const value =
    props.article?.published_at ??
    props.article?.scheduled_for ??
    props.article?.created_at;

  return value ? dayjs(value).format("D MMMM YYYY") : "";
});

/** The publication the story came from, shown in the sub text. */
const sourceName = computed(() => {
  const sources = props.article?.sources ?? [];
  if (!sources.length) return "";

  const first = sources[0];
  try {
    return new URL(first).hostname.replace(/^www\./, "");
  } catch {
    return first;
  }
});
</script>

<template>
  <article
      class="newspaper-article"
      :class="{
        'top-story': isTopStory,
        'featured-story': isFeatured,
        'popular-story': isPopular,
      }"
  >
    <router-link :to="routeTarget" class="article-link">
      <!-- Text above the picture -->
      <header class="article-head">
        <span v-if="categoryName" class="article-kicker">{{ categoryName }}</span>
        <h2 class="article-title">{{ title }}</h2>
        <p v-if="summary" class="article-standfirst">{{ summary }}</p>
      </header>

      <!-- Picture -->
      <div class="article-picture">
        <div v-if="isLoadingImage" class="article-picture-loading">
          <span class="spinner"></span>
        </div>
        <img
            v-else
            :src="imageUrl"
            :alt="title"
            class="article-image"
            @load="emit('loaded')"
        />
      </div>

      <!-- Text below the picture -->
      <footer class="article-foot">
        <span v-if="publishedDate" class="article-date">{{ publishedDate }}</span>
        <span v-if="sourceName" class="article-source">{{ sourceName }}</span>
        <span class="article-more">Read more →</span>
      </footer>
    </router-link>
  </article>
</template>

<style scoped>
.newspaper-article {
  background-color: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0;
  height: 100%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.article-link {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: #1a1a1a;
  text-decoration: none;
}

/* ===== Text above the picture ===== */
.article-head {
  padding: 12px 12px 8px;
}

.article-kicker {
  display: inline-block;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b58900;
  margin-bottom: 4px;
}

.article-title {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.22;
  margin: 0 0 6px;
  color: #111;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.article-standfirst {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.88rem;
  line-height: 1.4;
  margin: 0;
  color: #3a3a3a;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

/* ===== Picture ===== */
.article-picture {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
  background-color: #f1f1f1;
}

.article-picture-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
}

.spinner {
  width: 26px;
  height: 26px;
  border: 3px solid rgba(0, 0, 0, 0.12);
  border-top-color: #b58900;
  border-radius: 50%;
  animation: newspaper-spin 0.9s linear infinite;
}

@keyframes newspaper-spin {
  to {
    transform: rotate(360deg);
  }
}

.article-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ===== Text below the picture ===== */
.article-foot {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 12px 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 0.78rem;
  color: #6b6b6b;
}

.article-date {
  font-style: italic;
}

.article-source {
  font-style: italic;
}

.article-source::before {
  content: "·";
  margin-right: 8px;
}

.article-more {
  margin-left: auto;
  font-weight: 700;
  color: #b58900;
  white-space: nowrap;
}

/* ===== Lead story treatment ===== */
.top-story .article-title {
  font-size: 1.22rem;
}

.featured-story .article-title {
  font-size: 1.15rem;
}
</style>
