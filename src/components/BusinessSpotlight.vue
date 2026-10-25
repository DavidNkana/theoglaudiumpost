<template>
  <div class="business-spotlight">
    <div class="text-center mb-3">
      <img
        :src="business.logo"
        class="business-logo"
        :alt="business.name + ' logo'"
      />
    </div>
    <h5 class="business-name text-center mb-3">{{ business.name }}</h5>

    <div class="business-rating mb-2">
      <div class="d-flex justify-content-center align-items-center">
        <div class="stars">
          <i
            class="bi bi-star-fill"
            v-for="star in 5"
            :key="star"
            :class="{
              'text-warning': star <= business.rating,
              'text-muted': star > business.rating,
            }"
          ></i>
        </div>
        <span class="ms-2 rating-value">{{ business.rating }}/5</span>
      </div>
    </div>

    <p class="business-description text-center mb-3">
      {{ business.description }}
    </p>

    <div class="business-info mb-3">
      <div class="info-item">
        <i class="bi bi-geo-alt-fill"></i> {{ business.address }}
      </div>
      <div class="info-item">
        <i class="bi bi-telephone-fill"></i> {{ business.phone }}
      </div>
      <div class="info-item">
        <i class="bi bi-clock-fill"></i> {{ formatHours(business.hours) }}
      </div>
    </div>

    <div class="business-tags mb-3">
      <span
        class="badge bg-light text-dark me-1 mb-1"
        v-for="(tag, index) in business.tags"
        :key="index"
      >
        {{ tag }}
      </span>
    </div>

    <div class="d-grid">
      <router-link :to="`/business/${business.id}`" class="btn btn-primary">
        View Business Profile
      </router-link>
    </div>

    <div class="business-promo mt-3" v-if="business.promotion">
      <div class="promo-badge">
        <i class="bi bi-tag-fill"></i> Special Offer
      </div>
      <div class="promo-content mt-2">
        {{ business.promotion }}
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: "BusinessSpotlight",
    props: {
      business: {
        type: Object,
        required: true,
        validator: (obj) => {
          return obj.id && obj.name && obj.logo && obj.description;
        },
      },
    },
    methods: {
      formatHours(hours) {
        if (typeof hours === "string") {
          return hours;
        } else if (typeof hours === "object") {
          // If hours is provided as an object with today's hours
          return hours.today || "Open today";
        }
        return "Contact for hours";
      },
    },
  };
</script>

<style scoped>
  .business-spotlight {
    position: relative;
    padding: 10px;
  }

  .business-logo {
    width: 100px;
    height: 100px;
    object-fit: contain;
    border-radius: 50%;
    border: 2px solid #f8f9fa;
    padding: 5px;
    background: white;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .business-name {
    font-weight: 700;
    color: #333;
  }

  .business-description {
    font-size: 0.9rem;
    color: #6c757d;
    line-height: 1.5;
  }

  .business-info {
    font-size: 0.9rem;
  }

  .info-item {
    margin-bottom: 5px;
    display: flex;
    align-items: center;
  }

  .info-item i {
    margin-right: 8px;
    color: #0d6efd;
    width: 16px;
  }

  .business-tags {
    display: flex;
    flex-wrap: wrap;
  }

  .badge {
    font-weight: 500;
  }

  .business-promo {
    background-color: #fff8e1;
    border-radius: 8px;
    padding: 12px;
    border-left: 4px solid #ffc107;
  }

  .promo-badge {
    display: inline-block;
    font-size: 0.8rem;
    font-weight: 600;
    color: #ff9800;
  }

  .promo-content {
    font-size: 0.9rem;
    font-weight: 500;
    color: #333;
  }

  .stars {
    display: inline-block;
  }

  .rating-value {
    font-weight: 600;
    font-size: 0.9rem;
  }
</style>
