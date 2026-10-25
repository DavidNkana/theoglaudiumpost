<script setup>
  import { ref, computed } from "vue";
  const events = ref([
    {
      id: 1,
      title: "Tech Conference 2025",
      description:
        "Join the biggest tech conference with industry leaders and innovators.",
      date: "2025-05-15",
      location: "Convention Center, New York",
      category: "Technology",
      price: 199,
      featured: true,
    },
    {
      id: 2,
      title: "Summer Music Festival",
      description:
        "Three days of amazing performances from top artists across multiple genres.",
      date: "2025-06-20",
      location: "Central Park, New York",
      category: "Music",
      price: 89,
      featured: false,
    },
    {
      id: 3,
      title: "Startup Pitch Night",
      description:
        "Watch innovative startups pitch their ideas to investors and win funding.",
      date: "2025-04-30",
      location: "Innovation Hub, Boston",
      category: "Business",
      price: 0,
      featured: false,
    },
    {
      id: 4,
      title: "International Food Fair",
      description:
        "Taste cuisines from around the world with over 50 food vendors.",
      date: "2025-05-10",
      location: "Waterfront Park, San Francisco",
      category: "Food",
      price: 45,
      featured: true,
    },
    {
      id: 5,
      title: "Art Exhibition Opening",
      description: "Be the first to see new works from contemporary artists.",
      date: "2025-04-25",
      location: "Modern Art Gallery, Chicago",
      category: "Arts",
      price: 15,
      featured: false,
    },
    {
      id: 6,
      title: "Health & Wellness Expo",
      description:
        "Discover the latest in fitness, nutrition, and mental wellbeing.",
      date: "2025-05-22",
      location: "Community Center, Denver",
      category: "Health",
      price: 25,
      featured: false,
    },
  ]);

  const currentCategory = ref("all");
  const currentTimeFilter = ref("all");
  const searchQuery = ref("");

  const categories = computed(() => {
    return [...new Set(events.value.map((event) => event.category))];
  });

  const filteredEvents = computed(() => {
    return events.value.filter((event) => {
      // Category filter
      const categoryMatch =
        currentCategory.value === "all" ||
        event.category === currentCategory.value;

      // Search filter
      const searchMatch =
        event.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        event.description
          .toLowerCase()
          .includes(searchQuery.value.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.value.toLowerCase());

      // Time filter
      let timeMatch = true;
      const today = new Date();
      const eventDate = new Date(event.date);

      if (currentTimeFilter.value === "today") {
        timeMatch = eventDate.toDateString() === today.toDateString();
      } else if (currentTimeFilter.value === "week") {
        const weekFromNow = new Date();
        weekFromNow.setDate(today.getDate() + 7);
        timeMatch = eventDate >= today && eventDate <= weekFromNow;
      } else if (currentTimeFilter.value === "month") {
        const monthFromNow = new Date();
        monthFromNow.setMonth(today.getMonth() + 1);
        timeMatch = eventDate >= today && eventDate <= monthFromNow;
      }

      return categoryMatch && searchMatch && timeMatch;
    });
  });

  const formatDate = (dateString) => {
    const options = { month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const getCategoryClass = (category) => {
    const categoryColors = {
      Technology: "bg-primary",
      Music: "bg-success",
      Business: "bg-info",
      Food: "bg-warning",
      Arts: "bg-danger",
      Health: "bg-secondary",
    };

    return categoryColors[category] || "bg-dark";
  };

  const resetFilters = () => {
    currentCategory.value = "all";
    currentTimeFilter.value = "all";
    searchQuery.value = "";
  };
</script>

<template>
  <!-- <div class="hero-section mb-5">
    <div class="container text-center">
      <h1>Discover Amazing Events</h1>
      <p class="lead">Find and attend the best events in your area</p>
      <button class="btn btn-primary btn-lg mt-3">Subscribe to updates</button>
    </div>
  </div> -->

  <div class="container mb-5">
    <div class="row mb-4">
      <div class="col-12">
        <h2 class="mb-4">Upcoming Events</h2>

        <div class="d-flex flex-wrap gap-2 mb-4">
          <button
            class="btn btn-outline-secondary filter-btn"
            :class="{ active: currentCategory === 'all' }"
            @click="currentCategory = 'all'"
          >
            All Events
          </button>
          <button
            v-for="category in categories"
            :key="category"
            class="btn btn-outline-secondary filter-btn"
            :class="{ active: currentCategory === category }"
            @click="currentCategory = category"
          >
            {{ category }}
          </button>
        </div>

        <div class="mb-4">
          <div class="btn-group" role="group">
            <button
              type="button"
              class="btn btn-outline-secondary"
              :class="{ active: currentTimeFilter === 'all' }"
              @click="currentTimeFilter = 'all'"
            >
              All Time
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary"
              :class="{ active: currentTimeFilter === 'today' }"
              @click="currentTimeFilter = 'today'"
            >
              Today
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary"
              :class="{ active: currentTimeFilter === 'week' }"
              @click="currentTimeFilter = 'week'"
            >
              This Week
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary"
              :class="{ active: currentTimeFilter === 'month' }"
              @click="currentTimeFilter = 'month'"
            >
              This Month
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div v-if="filteredEvents.length === 0" class="col-12 text-center py-5">
        <h4>No events match your current filters</h4>
        <button class="btn btn-primary mt-3" @click="resetFilters">
          Reset Filters
        </button>
      </div>

      <div
        v-for="event in filteredEvents"
        :key="event.id"
        class="col-md-6 col-lg-4 mb-4"
      >
        <div class="card h-100 event-card position-relative">
          <div class="date-badge">{{ formatDate(event.date) }}</div>
          <span
            class="badge category-badge"
            :class="getCategoryClass(event.category)"
            >{{ event.category }}</span
          >
          <img
            src="https://mf.b37mrtl.ru/files/2025.04/thumbnail/67ff84d92030272165539e5d.jpg"
            class="card-img-top"
            :alt="event.title"
          />
          <div class="card-body">
            <h5 class="card-title">{{ event.title }}</h5>
            <p class="card-text">{{ event.description }}</p>
            <div class="d-flex align-items-center mb-3">
              <i class="bi bi-geo-alt me-2"></i>
              <small>{{ event.location }}</small>
            </div>
            <div class="d-flex justify-content-between align-items-center">
              <span class="badge bg-secondary">{{
                event.price === 0 ? "Free" : "$" + event.price
              }}</span>
              <button
                class="btn btn-sm"
                :class="event.featured ? 'btn-warning' : 'btn-outline-primary'"
              >
                {{ event.featured ? "Featured Event" : "Learn More" }}
              </button>
            </div>
          </div>
          <!-- <div class="card-footer bg-white border-top-0">
            <a href="#" class="btn btn-primary w-100">Register Now</a>
          </div> -->
        </div>
      </div>
    </div>

    <div class="row mt-4">
      <div class="col-12 d-flex justify-content-center">
        <nav>
          <ul class="pagination">
            <li class="page-item disabled">
              <a class="page-link" href="#" tabindex="-1">Previous</a>
            </li>
            <li class="page-item active">
              <a class="page-link" href="#">1</a>
            </li>
            <li class="page-item"><a class="page-link" href="#">2</a></li>
            <li class="page-item"><a class="page-link" href="#">3</a></li>
            <li class="page-item">
              <a class="page-link" href="#">Next</a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </div>
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
    padding: 5px 10px;
    border-radius: 4px;
  }
  .filter-btn.active {
    background-color: #0d6efd;
    color: white;
  }
  .hero-section {
    background:
      linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)),
      url("https://mf.b37mrtl.ru/files/2025.04/thumbnail/67ff84d92030272165539e5d.jpg");
    background-size: cover;
    background-position: center;
    color: white;
    padding: 80px 0;
  }
</style>
