<!-- 
  VideoCard.vue

  YouTube video card component that displays embedded videos with title and description.

  This component:
  - Embeds YouTube videos using iframes
  - Displays video title and description
  - Features hover effects and animations for better user experience
  - Supports responsive layout
-->
<template>
  <div class="card h-100 video-card shadow-sm border-0">
    <div class="ratio ratio-16x9">
      <iframe
        :src="`https://www.youtube.com/embed/${video.id.videoId}`"
        :title="video.snippet.title"
        allowfullscreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      ></iframe>
    </div>
    <div class="card-body d-flex flex-column">
      <h5 class="card-title fw-semibold video-title">
        {{ video.snippet.title }}
      </h5>
      <p class="card-text text-muted">{{ video.snippet.description }}</p>
      <!-- <div class="video-meta">
        <i class="bi bi-calendar3 me-1"></i>
        <span>{{
          new Date(video.snippet.publishedAt).toLocaleDateString()
        }}</span>
      </div> -->
    </div>
  </div>
</template>

<script>
/**
 * VideoCard component
 *
 * Displays a YouTube video in a card format with title and description.
 * Embeds the video using an iframe and provides hover animations.
 */
export default {
  name: "VideoCard",

  /**
   * Component props
   */
  props: {
    /**
     * YouTube video data object from the YouTube API
     * Must contain id.videoId and snippet properties
     * @type {Object}
     * @required
     */
    video: {
      type: Object,
      required: true,
    },
  },
  /**
   * Component methods
   */
  methods: {
    /**
     * Formats a date string into a localized date format
     *
     * @param {string} dateString - ISO date string to format
     * @returns {string} Formatted date string in the format "MMM DD, YYYY"
     */
    formatDate(dateString) {
      const options = { year: "numeric", month: "short", day: "numeric" };
      return new Date(dateString).toLocaleDateString("en-ZA", options);
    },
  },
};
</script>

<!-- 
  Scoped styles that only apply to this component
  Includes card styling, hover effects, and responsive design
-->
<style scoped>
.video-card {
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  border: none;
  box-shadow: 0 2px 8px rgba(4, 24, 6, 0.1);
  /* z-index: 2050; */
}

.video-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
}

.video-thumbnail {
  position: relative;
  height: 180px;
  overflow: hidden;
}

.video-thumbnail img {
  height: 100%;
  width: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.video-card:hover .video-thumbnail img {
  transform: scale(1.05);
}

.card-body {
  background-color: var(--primary-dark);
  color: white;
}

.card-body p {
  color: gray !important;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.video-card:hover .play-overlay {
  opacity: 1;
}

.play-button {
  width: 50px;
  height: 50px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  transform: scale(0.8);
  transition: transform 0.3s ease;
}

.play-button i {
  font-size: 2rem;
  color: #dc3545;
}

.video-card:hover .play-button {
  transform: scale(1);
}

.video-duration {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 0.8rem;
}

.video-title {
  font-weight: 600;
  font-size: 1.1rem;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.video-meta {
  font-size: 0.8rem;
  color: #6c757d;
  margin-top: 0.5rem;
}
</style>
