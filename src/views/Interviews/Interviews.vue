<script setup>
  import { ref, computed } from "vue";

  const featuredInterview = ref({
    id: 1,
    title: "The Future of AI and Human Collaboration",
    excerpt:
      "An exclusive conversation with Dr. Elena Martinez on how artificial intelligence is reshaping workplaces and human creativity.",
    date: "2025-04-10",
    interviewer: "Michael Chen",
    category: "Technology",
    views: 145789,
    duration: "45:23",
    featured: true,
  });

  const interviews = ref([
    {
      id: 2,
      title: "Sustainable Business Models for 2025 and Beyond",
      excerpt:
        "Business strategist James Wilson discusses how companies are adapting to climate challenges.",
      date: "2025-04-12",
      interviewer: "Sarah Johnson",
      category: "Business",
      views: 78450,
      duration: "32:18",
      featured: false,
    },
    {
      id: 3,
      title: "Modern Architecture in Urban Environments",
      excerpt:
        "Award-winning architect Maria Rodriguez shares insights on designing for dense city spaces.",
      date: "2025-04-08",
      interviewer: "David Park",
      category: "Arts",
      views: 52630,
      duration: "38:45",
      featured: true,
    },
    {
      id: 4,
      title: "The Science of High-Performance Athletics",
      excerpt:
        "Sports scientist Dr. John Thompson reveals the latest research on human performance.",
      date: "2025-04-05",
      interviewer: "Lisa Wong",
      category: "Sports",
      views: 94200,
      duration: "41:09",
      featured: false,
    },
    {
      id: 5,
      title: "Reimagining Global Healthcare Systems",
      excerpt:
        "Public health expert Dr. Amara Okafor discusses solutions for healthcare equity worldwide.",
      date: "2025-04-02",
      interviewer: "Robert Kim",
      category: "Health",
      views: 65800,
      duration: "53:27",
      featured: false,
    },
    {
      id: 6,
      title: "The Evolution of Space Exploration",
      excerpt:
        "Former astronaut and physicist Dr. Thomas Miller on private space ventures and future missions.",
      date: "2025-03-28",
      interviewer: "Emily Chen",
      category: "Science",
      views: 120500,
      duration: "47:36",
      featured: true,
    },
    {
      id: 7,
      title: "Culinary Traditions in Modern Gastronomy",
      excerpt:
        "Celebrity chef Isabella Martinez explores how traditional techniques inform contemporary cuisine.",
      date: "2025-03-25",
      interviewer: "Kevin Taylor",
      category: "Food",
      views: 45780,
      duration: "35:12",
      featured: false,
    },
    {
      id: 8,
      title: "Digital Privacy in the Age of Big Data",
      excerpt:
        "Cybersecurity expert Alex Johnson discusses the balance between convenience and privacy.",
      date: "2025-03-22",
      interviewer: "Michelle Lee",
      category: "Technology",
      views: 89300,
      duration: "42:50",
      featured: false,
    },
  ]);

  const currentCategory = ref("all");
  const currentSort = ref("newest");
  const searchQuery = ref("");

  const categories = computed(() => {
    return [
      ...new Set(interviews.value.map((interview) => interview.category)),
    ];
  });

  const tags = ref([
    "Artificial Intelligence",
    "Climate Change",
    "Innovation",
    "Leadership",
    "Urban Planning",
    "Digital Transformation",
    "Healthcare Innovation",
    "Space Exploration",
    "Cybersecurity",
    "Future of Work",
    "Sustainable Living",
    "Global Economy",
  ]);

  const trendingInterviews = computed(() => {
    return [...interviews.value].sort((a, b) => b.views - a.views).slice(0, 5);
  });

  const filteredInterviews = computed(() => {
    let filtered = interviews.value.filter((interview) => {
      // Category filter
      const categoryMatch =
        currentCategory.value === "all" ||
        interview.category === currentCategory.value;

      // Search filter
      const searchMatch =
        interview.title
          .toLowerCase()
          .includes(searchQuery.value.toLowerCase()) ||
        interview.excerpt
          .toLowerCase()
          .includes(searchQuery.value.toLowerCase()) ||
        interview.interviewer
          .toLowerCase()
          .includes(searchQuery.value.toLowerCase());

      return categoryMatch && searchMatch;
    });

    // Sort the results
    if (currentSort.value === "newest") {
      filtered = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (currentSort.value === "popular") {
      filtered = filtered.sort((a, b) => b.views - a.views);
    } else if (currentSort.value === "longest") {
      filtered = filtered.sort((a, b) => {
        const aMinutes = parseInt(a.duration.split(":")[0]);
        const bMinutes = parseInt(b.duration.split(":")[0]);
        return bMinutes - aMinutes;
      });
    }

    return filtered;
  });

  const formatDate = (dateString) => {
    const options = { month: "short", day: "numeric", year: "numeric" };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const formatViews = (views) => {
    if (views >= 1000000) {
      return (views / 1000000).toFixed(1) + "M";
    } else if (views >= 1000) {
      return (views / 1000).toFixed(1) + "K";
    } else {
      return views;
    }
  };

  const getCategoryClass = (category) => {
    const categoryColors = {
      Technology: "bg-primary",
      Business: "bg-info",
      Arts: "bg-danger",
      Sports: "bg-success",
      Health: "bg-warning",
      Science: "bg-dark",
      Food: "bg-secondary",
    };

    return categoryColors[category] || "bg-dark";
  };

  const resetFilters = () => {
    currentCategory.value = "all";
    currentSort.value = "newest";
    searchQuery.value = "";
  };
</script>

<template>
  <!-- <div class="hero-section mb-5">
    <div class="container text-center">
      <h1>In-Depth Interviews</h1>
      <p class="lead">
        Exclusive conversations with industry leaders, experts, and innovators
      </p>
      <button class="btn btn-primary btn-lg mt-3">Subscribe for Updates</button>
    </div>
  </div> -->

  <div class="featured-section">
    <div class="container">
      <div class="row align-items-center">
        <div class="col-lg-6 mb-4 mb-lg-0">
          <div class="position-relative">
            <img
              src="https://mf.b37mrtl.ru/files/2025.04/l/67fd083785f5405faf16e45c.jpg"
              alt="Featured Interview"
              class="img-fluid rounded"
            />
            <div class="play-btn">
              <i class="fas fa-play"></i>
            </div>
          </div>
        </div>
        <div class="col-lg-6">
          <span class="badge bg-warning mb-2">Featured</span>
          <h2>{{ featuredInterview.title }}</h2>
          <p class="lead">{{ featuredInterview.excerpt }}</p>
          <div class="d-flex align-items-center mb-3">
            <img
              src="https://mf.b37mrtl.ru/files/2025.04/thumbnail/67fbe03185f54038734d023f.jpg"
              class="author-avatar me-2"
              :alt="featuredInterview.interviewer"
            />
            <div>
              <div>{{ featuredInterview.interviewer }}</div>
              <small class="text-muted">{{
                formatDate(featuredInterview.date)
              }}</small>
            </div>
          </div>
          <div class="mb-3">
            <span class="me-3"
              ><i class="far fa-clock me-1"></i>
              {{ featuredInterview.duration }}</span
            >
            <span
              ><i class="far fa-eye me-1"></i>
              {{ formatViews(featuredInterview.views) }} views</span
            >
          </div>
          <button class="btn btn-primary">Watch Full Interview</button>
        </div>
      </div>
    </div>
  </div>
  <div class="container mb-5">
    <div class="row">
      <div class="col-lg-8">
        <div class="row mb-4">
          <div class="col-12">
            <h2 class="mb-4">Latest Interviews</h2>

            <div class="d-flex flex-wrap gap-2 mb-4">
              <button
                class="btn btn-outline-secondary filter-btn"
                :class="{ active: currentCategory === 'all' }"
                @click="currentCategory = 'all'"
              >
                All Categories
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
                  :class="{ active: currentSort === 'newest' }"
                  @click="currentSort = 'newest'"
                >
                  Newest
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  :class="{ active: currentSort === 'popular' }"
                  @click="currentSort = 'popular'"
                >
                  Most Popular
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  :class="{ active: currentSort === 'longest' }"
                  @click="currentSort = 'longest'"
                >
                  Longest
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="row">
          <div
            v-if="filteredInterviews.length === 0"
            class="col-12 text-center py-5"
          >
            <h4>No interviews match your current filters</h4>
            <button class="btn btn-primary mt-3" @click="resetFilters">
              Reset Filters
            </button>
          </div>

          <div
            v-for="interview in filteredInterviews"
            :key="interview.id"
            class="col-md-6 mb-4"
          >
            <div
              class="card interview-card"
              :class="{ 'featured-interview': interview.featured }"
            >
              <div class="position-relative">
                <img
                  src="https://mf.b37mrtl.ru/files/2025.04/thumbnail/67fbe03185f54038734d023f.jpg"
                  class="card-img-top interview-image"
                  :alt="interview.title"
                />
                <div class="date-badge">{{ formatDate(interview.date) }}</div>
                <span
                  class="badge category-badge"
                  :class="getCategoryClass(interview.category)"
                  >{{ interview.category }}</span
                >
                <div class="play-btn">
                  <i class="fas fa-play"></i>
                </div>
              </div>
              <div class="card-body">
                <h5 class="card-title">{{ interview.title }}</h5>
                <p class="card-text">{{ interview.excerpt }}</p>
                <div
                  class="d-flex justify-content-between align-items-center mb-2"
                >
                  <div class="d-flex align-items-center">
                    <img
                      src="https://mf.b37mrtl.ru/files/2025.04/thumbnail/67ffbe9f85f5400ddf269de0.jpg"
                      class="author-avatar me-2"
                      :alt="interview.interviewer"
                    />
                    <small>{{ interview.interviewer }}</small>
                  </div>
                  <small class="text-muted">{{ interview.duration }}</small>
                </div>
                <div class="d-flex justify-content-between">
                  <span class="view-count"
                    ><i class="far fa-eye me-1"></i>
                    {{ formatViews(interview.views) }}</span
                  >
                  <button class="btn btn-sm btn-outline-primary">
                    Watch Now
                  </button>
                </div>
              </div>
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

      <div class="col-lg-4">
        <div class="card mb-4">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">Trending Interviews</h5>
          </div>
          <div class="card-body p-0">
            <ul class="list-unstyled trending-list m-0">
              <li
                v-for="interview in trendingInterviews"
                :key="interview.id"
                class="trending-item d-flex align-items-center px-3"
              >
                <div>
                  <h6 class="mb-1">{{ interview.title }}</h6>
                  <small class="text-muted"
                    >{{ interview.category }} •
                    {{ formatViews(interview.views) }} views</small
                  >
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card-header">
            <h5 class="mb-0">Subscribe to Our Newsletter</h5>
          </div>
          <div class="card-body">
            <p>Get notified about new interviews with industry leaders.</p>
            <div class="input-group mb-3">
              <input
                type="email"
                class="form-control"
                placeholder="Your email address"
              />
              <button class="btn btn-primary" type="button">Subscribe</button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Topics</h5>
          </div>
          <div class="card-body">
            <div class="d-flex flex-wrap gap-2">
              <a
                v-for="tag in tags"
                :key="tag"
                href="#"
                class="btn btn-sm btn-outline-secondary mb-2"
                >{{ tag }}</a
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .interview-card {
    transition:
      transform 0.3s,
      box-shadow 0.3s;
    height: 100%;
  }
  .interview-card:hover {
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
      url("/api/placeholder/1200/400");
    background-size: cover;
    background-position: center;
    color: white;
    padding: 80px 0;
  }
  .interview-image {
    height: 200px;
    object-fit: cover;
  }
  .featured-interview {
    border-left: 4px solid #ffc107;
  }
  .play-btn {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 50%;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0d6efd;
    font-size: 24px;
    cursor: pointer;
    transition: all 0.3s;
  }
  .play-btn:hover {
    background-color: #0d6efd;
    color: white;
  }
  .author-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }
  .featured-section {
    background-color: #f8f9fa;
    padding: 40px 0;
    margin-bottom: 40px;
  }
  .view-count {
    color: #6c757d;
    font-size: 14px;
  }
  .trending-list {
    counter-reset: trending-counter;
  }
  .trending-item {
    counter-increment: trending-counter;
    padding: 15px 0;
    border-bottom: 1px solid #dee2e6;
  }
  .trending-item:last-child {
    border-bottom: none;
  }
  .trending-item::before {
    content: counter(trending-counter);
    font-weight: bold;
    font-size: 24px;
    color: #0d6efd;
    margin-right: 15px;
    min-width: 30px;
    text-align: center;
    display: inline-block;
  }
</style>
