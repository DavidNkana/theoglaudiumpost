<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useStore } from "vuex";
import { debounce } from "lodash";
import { useRoute, useRouter } from "vue-router";
import InfiniteLoading from "v3-infinite-loading";
import "v3-infinite-loading/lib/style.css";
import { devLog } from "@/utils/devLog";

const route = useRoute();
const router = useRouter();
const currentPage = ref(0);
const isLoading = ref(false);
const store = useStore();

const filters = ref({
  search: "",
  category: "all",
});

onMounted(() => {
  filters.value.search = route.query.search || "";
  filters.value.category = route.query.category || "all";

  fetchData();
});

const fetchData = async () => {
  try {
    if (isLoading.value) return;
    isLoading.value = true;
    devLog.info("Fetching directory data");

    await store.dispatch("directory/fetchListings", {
      size: 10,
      page: currentPage.value,
      category: filters.value.category === "all" ? "" : filters.value.category,
      search: filters.value.search,
    });

    if (currentPage.value === 0) {
      await store.dispatch("directory/fetchCategories");
    }
  } catch (error) {
    devLog.error("Error fetching directory listings:", error);
  } finally {
    isLoading.value = false;
  }
};

const debouncedFetch = debounce(fetchData, 500);

const loadMore = async ($state) => {
  if (isLoading.value) {
    return;
  }
  try {
    await fetchData();

    const hasMore = store.getters["directory/hasMore"];

    if (!hasMore) {
      $state.complete();
    } else {
      currentPage.value += 1;
      $state.loaded();
    }
  } catch (error) {
    devLog.debug("Failed to load more listings:", error);
    currentPage.value -= 1;
    $state.error();
  }
};

watch(
  () => filters.value.search,
  () => {
    currentPage.value = 0;
    debouncedFetch();
  }
);

watch(
  () => filters.value.category,
  () => {
    currentPage.value = 0;
    fetchData();
  }
);

watch(
  [() => filters.value.search, () => filters.value.category],
  () => {
    router.replace({
      query: {
        search: filters.value.search || undefined,
        // category is always a non-empty string ("all" or a slug), so it never
        // needs the `|| undefined` falsy fallback that `search` requires.
        category: filters.value.category,
      },
    });
  }
);

const resetFilters = () => {
  filters.value = {
    search: "",
    category: "all",
  };
  currentPage.value = 0;
  fetchData();
};

const categories = computed(() => store.getters["directory/categories"] || []);

const listings = computed(() => store.getters["directory/listings"] || []);
</script>

<template>
  <div class="container py-5">
    <div class="row mb-4">
      <div class="col-md-6">
        <h2>Business Directory</h2>
        <p class="text-muted">
          Find local businesses, services, and professionals in the Laudium community
        </p>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="row">
      <!-- Left Column - Directory List -->
      <div class="col-lg-8 mb-4 mb-lg-0 order-2 order-lg-1">
        <!-- Search and Filters -->
        <div class="card mb-4">
          <div class="card-body">
            <div class="row mb-3">
              <div class="col-md-8 mb-3 mb-md-0">
                <div class="input-group">
                  <span class="input-group-text"><i class="bi bi-search"></i></span>
                  <input
                    type="text"
                    class="form-control"
                    placeholder="Search directory..."
                    v-model="filters.search"
                  />
                </div>
              </div>
            </div>

            <div class="d-flex flex-wrap gap-2">
              <button
                class="btn btn-sm btn-outline-secondary filter-btn"
                :class="{
                  active: filters.category === 'all' || filters.category === '',
                }"
                @click="filters.category = 'all'"
              >
                All Categories
              </button>

              <button
                v-for="category in categories"
                :key="category.id"
                class="btn btn-sm btn-outline-success filter-btn"
                :class="{ active: filters.category === category.slug }"
                @click="filters.category = category.slug"
              >
                {{ category.name }}
              </button>
            </div>
          </div>
        </div>

        <!-- Directory Listings -->
        <div>
          <div
            v-if="listings.length === 0 && !isLoading"
            class="text-center py-5"
          >
            <i class="bi bi-journal-x text-secondary fa-3x mb-3"></i>
            <h4>No listings match your current filters</h4>
            <p class="text-muted">
              Try adjusting your search or filter settings
            </p>
            <button class="btn btn-success mt-2" @click="resetFilters">
              Reset Filters
            </button>
          </div>

          <div v-else>
            <!-- Directory listings -->
            <div v-for="listing in listings" :key="listing.id" class="card mb-3">
              <div class="card-body">
                <h5 class="card-title">{{ listing.name }}</h5>
                <p class="card-text">{{ listing.description }}</p>
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <span class="badge bg-secondary me-2">{{ listing.category }}</span>
                    <small class="text-muted">{{ listing.address }}</small>
                  </div>
                  <router-link :to="`/directory/${listing.slug}`" class="btn btn-sm btn-outline-primary">
                    View Details
                  </router-link>
                </div>
              </div>
            </div>

            <!-- Infinite loading component -->
            <div class="text-center mt-4">
              <InfiniteLoading @infinite="loadMore">
                <template #complete>
                  <p>No more listings to load</p>
                </template>
                <template #error>
                  <p>Error loading listings</p>
                </template>
              </InfiniteLoading>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column - Featured and Info -->
      <div class="col-lg-4 order-1 order-lg-2">
        <div class="card mb-4">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">Featured Businesses</h5>
          </div>
          <div class="card-body">
            <div class="featured-business mb-3">
              <h6>Business Name</h6>
              <p class="small text-muted mb-1">Category</p>
              <p class="small mb-0">Brief description of the business and what they offer to the community.</p>
            </div>
            <hr>
            <div class="featured-business">
              <h6>Another Business</h6>
              <p class="small text-muted mb-1">Category</p>
              <p class="small mb-0">Brief description of the business and what they offer to the community.</p>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header bg-success text-white">
            <h5 class="mb-0">List Your Business</h5>
          </div>
          <div class="card-body">
            <p>Want to add your business to our directory?</p>
            <a href="#" class="btn btn-success w-100">Register Now</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-btn {
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
}

.filter-btn.active {
  background-color: #198754;
  color: white;
  border-color: #198754;
}

.featured-business h6 {
  margin-bottom: 0.25rem;
}

/* Shimmer effect for loading state */
.shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
</style>
