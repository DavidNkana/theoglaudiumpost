<script setup>
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";

const router = useRouter();
const { isAuthenticated, hasRole } = useAuth();

const props = defineProps({
  label: String,
  icon: String,
  basePath: String,
  children: {
    type: Array,
    default: () => [],
  },
});

const expanded = ref(false);
const route = useRoute();

const isActive = computed(() => route.path.startsWith(props.basePath));

const toggle = () => {
  expanded.value = !expanded.value;
};

// Custom navigation function with debugging
const navigateTo = (path, event) => {
  // Stop event propagation to prevent dropdown toggle
  if (event) {
    event.stopPropagation();
  }
  
  console.log(`[SidebarMenuItem] Navigation triggered to: ${path}`);
  console.log(`[SidebarMenuItem] Current authentication state: ${isAuthenticated.value ? 'Authenticated' : 'Not authenticated'}`);
  console.log(`[SidebarMenuItem] Has admin role: ${hasRole('admin')}`);
  
  try {
    // Try to navigate to the specified path
    console.log(`[SidebarMenuItem] Attempting to navigate to: ${path}`);
    router.push(path).then(() => {
      console.log(`[SidebarMenuItem] Navigation to ${path} successful`);
    }).catch(error => {
      console.error(`[SidebarMenuItem] Navigation error:`, error);
    });
  } catch (error) {
    console.error(`[SidebarMenuItem] Error during navigation to ${path}:`, error);
  }
};

watch(route, () => {
  if (!route.path.startsWith(props.basePath)) {
    expanded.value = false;
  }
});
</script>

<template>
  <li class="nav-item">
    <div
      class="nav-link d-flex justify-content-between align-items-center"
      :class="{ active: isActive, expanded }"
      @click.prevent="toggle"
    >
      <div class="d-flex align-items-center">
        <a 
          href="#" 
          class="cursor-pointer p-0 m-0" 
          @click.prevent="navigateTo(basePath, $event)"
        >
          <i :class="['me-2', icon]"></i>
          {{ label }}
        </a>
      </div>
      <i class="bi" :class="expanded ? 'bi-chevron-up' : 'bi-chevron-down'" @click.prevent="toggle"></i>
    </div>

    <transition name="slide-fade">
      <ul v-show="expanded || isActive" class="list-unstyled ps-4">
        <li v-for="(item, index) in children" :key="index">
          <a 
            href="#" 
            class="nav-link" 
            @click.prevent="navigateTo(`${basePath}${item.to}`, $event)"
            :class="{ 'my-active-link': $route.path === `${basePath}${item.to}` }"
          >
            {{ item.label }}
          </a>
        </li>
      </ul>
    </transition>
  </li>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  max-height: 0;
  opacity: 0;
}

.slide-fade-enter-to,
.slide-fade-leave-from {
  max-height: 500px;
  opacity: 1;
}

.nav-link {
  color: var(--primary-dark);
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
}

.nav-link.expanded {
  background-color: var(--primary-dark);
  color: #fff;
}

.nav-link:hover {
  background-color: var(--primary-dark) !important;
  color: #ffffff !important;
}

.nav-link.active {
  font-size: 1.1rem;
  font-weight: bolder;
  color: var(--secondary) !important;
}
.nav-link.active:hover {
  color: #ffffff !important;
}

.my-active-link {
  color: #f7f8f9;
  background-color: var(--primary-dark);
  border-left: 3px solid var(--primary);
}
</style>
