<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const searchQuery = ref("");
const showSearch = ref(false);
const searchToggleBtn = ref(null);
const searchDropdown = ref(null);

const toggleSearch = () => {
  showSearch.value = !showSearch.value;
  if (showSearch.value) {
    // Focus the input when search becomes visible
    setTimeout(() => {
      document.querySelector('input[type="text"]')?.focus();
    }, 100);
  }
};

// Perform search on mobile
const submit = () => {
  if (searchQuery.value.trim()) {
    router.push({ path: "/search", query: { q: searchQuery.value.trim() } });
    showSearch.value = false;
    searchQuery.value = "";
  }
};

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
  if (
    showSearch.value &&
    searchDropdown.value &&
    !searchDropdown.value.contains(event.target) &&
    searchToggleBtn.value &&
    !searchToggleBtn.value.contains(event.target)
  ) {
    showSearch.value = false;
  }
};

// Add/remove event listeners
onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div class="search-component">
    <!-- Desktop version - redirects to search page -->

    <!-- Mobile version - shows dropdown -->
    <div class="d-block position-relative ms-3">
      <button
        class="btn btn-outline-none text-warning btn-lg"
        @click="toggleSearch"
        ref="searchToggleBtn"
      >
        <i class="bi bi-search"></i>
      </button>

      <transition name="fade fade-up">
        <div
          v-if="showSearch"
          class="mobile-search-dropdown position-absolute"
          ref="searchDropdown"
        >
          <form
            class="d-flex align-items-center bg-white rounded shadow px-2 py-1 py-md-2"
            @submit.prevent="submit"
            style="z-index: 1000; width: 250px"
          >
            <input
              v-model="searchQuery"
              type="text"
              class="form-control form-control-sm border-0 flex-grow-1 search-input"
              placeholder="Search..."
            />
            <button class="btn btn-sm submit-btn ms-2" type="submit">
              <i class="bi bi-arrow-right"></i>
            </button>
          </form>

          <!-- <div class="card p-2">
          <div class="input-group">
            <input
              type="text"
              class="form-control"
              placeholder="Search..."
              v-model="searchQuery"
              @keyup.enter="submit"
            />
            <button
              class="btn btn-primary"
              type="button"
              @click="submit"
            >
              <i class="bi bi-search"></i>
            </button>
          </div>
        </div> -->
        </div>
      </transition>
    </div>
  </div>
</template>
<style scoped>
.search-component {
  position: relative;
}

.mobile-search-dropdown {
  top: 100%;
  right: 0;
  /* width: 300px; */
  z-index: 1000;
  margin-top: 0.5rem;
}

.btn-outline-none {
  border: none;
  background: transparent;
}

.btn-outline-none:focus {
  box-shadow: none;
}

.submit-btn {
  background-color: var(--primary);
  color: wheat;
}

.search-input:focus {
  border: none !important;
  box-shadow: none !important;
}
</style>
