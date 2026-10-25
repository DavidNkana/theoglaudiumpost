<template>
  <router-link
    :to="`/community/${event.slug}`"
    class="card event-card h-100 card-link"
  >
    <div class="position-relative">
      <img
        v-if="event.image?.file"
        :src="event.image?.file"
        class="card-img-top"
        :alt="event.title"
      />
      <div v-else class="placeholder">No Image</div>
      <div class="event-date-badge">
        <span class="date-day">{{ formatDay(event.publish_date) }}</span>
        <span class="date-month">{{ formatMonth(event.publish_date) }}</span>
      </div>
    </div>
    <div class="card-body">
      <div class="d-flex align-items-center mb-2">
        <span class="badge bg-warning me-2">{{ event.category?.name }}</span>
        <small class="">{{ formatTime(event.publish_date) }}</small>
      </div>
      <h5 class="card-title">
        <router-link class="link mb-1 h5" :to="`/community/${event.slug}`">{{
          event.title
        }}</router-link>
      </h5>
      <p v-if="!minDetails" class="card-text">{{ event.description }}</p>
    </div>
    <div v-if="!minDetails" class="card-footer bg-white border-top-0">
      <div class="d-flex justify-content-between align-items-center">
        <small class="text-muted">
          <i class="bi bi-geo-alt-fill"></i> {{ event.location }}
        </small>
        <router-link
          :to="`/community/${event.slug}`"
          class="btn btn-sm btn-primary"
          >Details</router-link
        >
      </div>
    </div>
  </router-link>
</template>

<script>
export default {
  name: "EventCard",
  props: {
    event: {
      type: Object,
      required: true,
      // validator: (obj) => {
      //   return obj.id && obj.title && obj.date && obj.location && obj.image;
      // },
    },
    minDetails: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    formatDay(dateString) {
      const date = new Date(dateString);
      return date.getDate();
    },
    formatMonth(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString("default", { month: "short" });
    },
    formatTime(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString("en-ZA", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    },
  },
};
</script>

<style scoped>
.card-link {
  text-decoration: none;
  color: inherit;
  padding: 0 !important;
}

.link {
  color: inherit !important;
  text-decoration: none !important;
}

.link:hover {
  color: var(--secondary) !important;
  text-decoration: underline !important;
}

.event-card {
  border: none;
  transition: transform 0.3s ease;
  overflow: hidden;
}

.event-card:hover {
  transform: translateY(-5px);
  /* box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1); */
}

.event-date-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: var(--secondary);
  border-radius: 4px;
  padding: 6px 10px;
  text-align: center;
  min-width: 60px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.date-day {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
  color: #dc3545;
}

.date-month {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  text-transform: uppercase;
}

.placeholder {
  background-color: #f8f9fa;
  color: #6c757d;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
}

.card-body {
  background-color: var(--primary-dark);
  color: whitesmoke;
}

.card-img-top {
  height: 180px;
  object-fit: cover;
}

.card-title {
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 8px;
}

.card-text {
  color: #6c757d;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.btn-outline-primary:hover {
  color: #fff;
}
</style>
