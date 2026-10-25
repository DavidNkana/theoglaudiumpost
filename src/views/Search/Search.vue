<script setup>
import NewsCard from "@/components/NewsCard.vue";
import { getArticles } from "@/features/articles/ArticlesService";
import { getCategories } from "@/features/categories/CategoriesService";
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

// Search state
const searchQuery = ref("");
const currentSearchTerm = ref("");
const searchPerformed = ref(false);
const loading = ref(false);
const searchResults = ref([]);

// Pagination
const currentPage = ref(1);
const resultsPerPage = 10;
const totalResults = ref(0);
const totalPages = computed(() =>
  Math.ceil(totalResults.value / resultsPerPage)
);

// Filters and sorting
const activeFilter = ref("");
const sortOrder = ref("relevant");

const isFetching = ref(false);
const categories = ref([]);

const reset = () => {
  searchPerformed.value = false;
  currentSearchTerm.value = "";
  searchResults.value = [];
  totalResults.value = 0;
};

// Change page and update results
const changePage = (page) => {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  performSearch(false);

  // Scroll to top of results
  const resultsContainer = document.querySelector(".search-results-container");
  if (resultsContainer) {
    resultsContainer.scrollIntoView({ behavior: "smooth" });
  }
};

// Perform search
const performSearch = async (resetPage = true) => {
  if (resetPage) {
    currentPage.value = 1;
  }

  if (!searchQuery.value && resetPage) {
    // console.log("in here");
    reset();
    router.push({
      path: "/search",
      query: {
        q: searchQuery.value,
        filter: activeFilter.value,
        // sort: sortOrder.value,
        page: currentPage.value,
      },
    });
    return;
  }

  loading.value = true;
  searchPerformed.value = true;
  currentSearchTerm.value = searchQuery.value;

  // Update URL with search parameters
  router.push({
    path: "/search",
    query: {
      q: searchQuery.value,
      filter: activeFilter.value,
      // sort: sortOrder.value,
      page: currentPage.value,
    },
  });

  try {
    const response = await getArticles({
      page: currentPage.value - 1 < 0 ? 0 : currentPage.value - 1,
      search: searchQuery.value,
      category: activeFilter.value,
      size: 10,
    });
    if (response.status != 200) throw Error("Unable to Fetch");

    // console.log("Articles: ", response.data);

    searchResults.value = response.data.articles;

    totalResults.value = response.data.total;
  } catch (error) {
    console.error("Search error:", error);
    searchResults.value = [];
    totalResults.value = 0;
  } finally {
    loading.value = false;
  }
};

// Initialize from URL parameters
onMounted(() => {
  if (route.query.q) {
    searchQuery.value = route.query.q;
    // activeFilter.value = route.query.filter || "all";
    // sortOrder.value = route.query.sort || "relevant";
    currentPage.value = parseInt(route.query.page) || 1;
    performSearch(false);
  }
  fetchCategories();
});

const fetchCategories = async () => {
  try {
    isFetching.value = true;
    let response = await getCategories();
    categories.value = response.data;
    console.log(response.data);
  } catch (error) {
    console.log(error);
  } finally {
    isFetching.value = false;
  }
};

// Watch for sort order changes
watch(sortOrder, () => {
  performSearch(false);
});
</script>

<template>
  <div class="search-page">
    <!-- Search Header -->
    <div class="search-header pb-2 p-md-4">
      <div>
        <h1 class="search-title mb-4">Search Results</h1>

        <!-- Search Form -->
        <div class="search-form-container">
          <form @submit.prevent="performSearch" class="search-form">
            <div class="input-group">
              <input
                type="text"
                class="form-control form-control-lg search-input"
                placeholder="Search Laudium Post..."
                v-model="searchQuery"
                autofocus
                aria-label="Search query"
              />
              <button class="btn search-btn btn-lg" type="submit">
                <i class="bi bi-search me-2"></i>Search
              </button>
            </div>
          </form>
        </div>

        <!-- Search Stats -->
        <div class="search-stats mt-3" v-if="searchPerformed">
          <p class="mb-0">
            {{ searchResults.length }} results for "{{ currentSearchTerm }}"
          </p>
        </div>
      </div>
    </div>

    <!-- Search Results Container -->
    <div class="search-results-container">
      <div class="container py-4">
        <!-- Results List -->
        <div class="search-results">
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-success" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Searching...</p>
          </div>

          <div
            v-else-if="searchResults.length === 0 && searchPerformed"
            class="no-results text-center py-5"
          >
            <i class="bi bi-search display-1 text-muted"></i>
            <h2 class="mt-3">No results found</h2>
            <p class="text-muted">
              We couldn't find any matches for "{{ currentSearchTerm }}". Please
              try different keywords or filters.
            </p>
            <div class="suggestions mt-4">
              <h5>Suggestions:</h5>
              <ul class="list-unstyled">
                <li>Check your spelling</li>
                <li>Try more general terms</li>
                <li>Try different keywords</li>
                <li>Try fewer keywords</li>
              </ul>
            </div>
          </div>

          <div
            v-else-if="!searchPerformed"
            class="search-prompt text-center py-5"
          >
            <i class="bi bi-search display-1 text-muted"></i>
            <h2 class="mt-3">Start searching</h2>
            <p class="text-muted">
              Enter your search terms above to find content across Laudium Post.
            </p>
          </div>

          <div v-else>
            <!-- Results Grid -->
            <div class="row">
              <div
                v-for="(result, index) in searchResults"
                :key="index"
                class="col-md-4 mb-4"
              >
                <NewsCard :article="result" />
              </div>

              <!-- Pagination -->
              <nav aria-label="Search results pagination" class="mt-4">
                <ul class="pagination justify-content-center">
                  <li
                    class="page-item"
                    :class="{ disabled: currentPage === 1 }"
                  >
                    <a
                      class="page-link"
                      href="#"
                      @click.prevent="changePage(currentPage - 1)"
                    >
                      <i class="bi bi-chevron-left"></i>
                    </a>
                  </li>
                  <li
                    v-for="page in totalPages"
                    :key="page"
                    class="page-item"
                    :class="{ active: page === currentPage }"
                  >
                    <a
                      class="page-link"
                      href="#"
                      @click.prevent="changePage(page)"
                      >{{ page }}</a
                    >
                  </li>
                  <li
                    class="page-item"
                    :class="{ disabled: currentPage === totalPages }"
                  >
                    <a
                      class="page-link"
                      href="#"
                      @click.prevent="changePage(currentPage + 1)"
                    >
                      <i class="bi bi-chevron-right"></i>
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-page {
  min-height: 100vh;
  /* background-color: #f8f9fa; */
}

.search-header {
  /* background-color: #f5f7f7; */
  /* padding: 2rem; */
  /* border-bottom: 3px solid #28a745; */
}

.search-title {
  font-weight: 700;
  font-size: 2rem;
  color: #fff;
}

.search-form-container {
  max-width: 700px;
  margin: 0 auto;
}

.search-stats {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.search-filters .btn-group {
  /* flex-wrap: wrap; */
}

.search-filters .btn {
  margin-bottom: 5px;
}

.search-result-card {
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.search-result-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1) !important;
}

.search-result-image {
  height: 100%;
  object-fit: cover;
  border-radius: 0.25rem 0 0 0.25rem;
}

.search-result-excerpt {
  color: #555;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 1rem;
}

.search-btn {
  background-color: var(--secondary);
  color: var(--primary-dark);
}

.search-prompt {
  color: rgba(255, 255, 255, 0.7);
}
.search-prompt p {
  color: rgba(255, 255, 255, 0.7) !important;
}

.search-result-meta {
  font-size: 0.8rem;
  color: #6c757d;
}

.hover-success:hover {
  color: #28a745 !important;
}

.page-link {
  color: #28a745;
}

.page-item:focus,
.page-link:focus {
  border-color: #28a745;
  box-shadow: none !important;
}

.page-item.active .page-link {
  background-color: #28a745;
  border-color: #28a745;
  color: #fff;
}

.search-input:focus {
  border-color: #28a745;
  /* border: none !important; */
  box-shadow: none !important;
}

/* Responsive adjustments */
@media (max-width: 767.98px) {
  .search-result-image {
    height: 180px;
    border-radius: 0.25rem 0.25rem 0 0;
  }

  .search-filters .btn-group {
    display: flex;
    overflow-x: auto;
    padding-bottom: 5px;
  }

  .search-filters .btn {
    flex-shrink: 0;
  }
}
</style>
