<script setup>
  import { ref, computed } from "vue";
  import { useRoute } from "vue-router";

  const route = useRoute();

  // Toggle for submenu
  const postsExpanded = ref(false);

  // Automatically expand if current route is a posts subroute
  const isPostsRoute = computed(() => route.path.startsWith("/admin/articles"));
</script>

<template>
  <li class="nav-item">
    <a
      href="#"
      class="nav-link d-flex justify-content-between align-items-center"
      :class="{ active: isPostsRoute }"
      @click.prevent="postsExpanded = !postsExpanded"
    >
      <span>
        <i class="bi bi-file-earmark-text me-2"></i>
        Articles
      </span>
      <i
        class="bi"
        :class="postsExpanded ? 'bi-chevron-up' : 'bi-chevron-down'"
      ></i>
    </a>

    <!-- Submenu -->
    <Transition name="slide-fade">
      <ul v-show="postsExpanded || isPostsRoute" class="list-unstyled ps-4">
        <li>
          <router-link
            to="/admin/articles/drafts"
            class="nav-link"
            active-class="active"
            >Drafted</router-link
          >
        </li>
        <li>
          <router-link
            to="/admin/articles/pending"
            class="nav-link"
            active-class="active"
            >Pending</router-link
          >
        </li>
        <li>
          <router-link
            to="/admin/articles/approved"
            class="nav-link"
            active-class="active"
            >Approved</router-link
          >
        </li>
        <li>
          <router-link
            to="/admin/articles/denied"
            class="nav-link"
            active-class="active"
            >Denied</router-link
          >
        </li>
      </ul>
    </Transition>
  </li>
</template>
<style scoped>
  /* .slide-fade-enter-active {
    transition: all 0.3s ease-out;
  }

  .slide-fade-leave-active {
    transition: all 0.8s cubic-bezier(1, 0.5, 0.8, 1);
  }

  .slide-fade-enter-from,
  .slide-fade-leave-to {
    transform: translateX(20px);
    opacity: 0;
  } */

  .slide-fade-enter-active,
  .slide-fade-leave-active {
    transition: all 0.3s ease-in;
    overflow: hidden;
  }

  .slide-fade-enter-from,
  .slide-fade-leave-to {
    max-height: 0;
    opacity: 0;
  }

  .slide-fade-enter-to,
  .slide-fade-leave-from {
    max-height: 500px; /* or whatever fits your content */
    opacity: 1;
  }
</style>
