<script setup>
/**
 * BottomNav.vue
 *
 * Native-app-style bottom tab bar for the public site. Renders only on small
 * viewports (the Capacitor app and mobile web); on desktop the header nav is
 * used instead. Provides the primary destinations as tabs plus a "More" tab
 * that opens the side drawer (which holds the secondary/footer links).
 */
import { computed } from "vue";
import { useStore } from "vuex";

const store = useStore();
const drawerOpen = computed(() => store.state.drawerOpen);
const openMenu = () => store.dispatch("toggleDrawer");

// Primary tabs (kept to the standard 4 + a "More" affordance).
const tabs = [
  { to: "/", label: "Home", icon: "bi-house-door", exact: true },
  { to: "/news", label: "News", icon: "bi-newspaper", exact: false },
  { to: "/community", label: "Community", icon: "bi-people", exact: false },
  { to: "/podcasts", label: "Podcasts", icon: "bi-play-circle", exact: false },
];
</script>

<template>
  <nav class="bottom-nav" aria-label="Primary navigation">
    <router-link
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="bn-item"
      :exact-active-class="tab.exact ? 'active' : ''"
      :active-class="tab.exact ? '' : 'active'"
    >
      <i class="bi" :class="tab.icon"></i>
      <span class="bn-label">{{ tab.label }}</span>
    </router-link>

    <button
      type="button"
      class="bn-item bn-more"
      :class="{ active: drawerOpen }"
      @click="openMenu"
      aria-label="More"
    >
      <i class="bi bi-list"></i>
      <span class="bn-label">More</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav {
  /* Hidden on desktop — the header nav is used there instead. */
  display: none;
}

@media (max-width: 991.98px) {
  .bottom-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1045;
    display: flex;
    align-items: stretch;
    justify-content: space-around;
    height: var(--bottom-nav-height, 60px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%);
    border-top: 2px solid #ffc107;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.25);
  }
}

.bn-item {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 6px 2px;
  background: transparent;
  border: none;
  text-decoration: none;
  color: rgba(245, 237, 214, 0.7);
  font-size: 1.35rem;
  cursor: pointer;
  transition: color 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.bn-item:hover {
  color: #f5edd6;
}

.bn-item.active {
  color: #ffc107;
}

.bn-label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.2px;
  line-height: 1;
}
</style>
