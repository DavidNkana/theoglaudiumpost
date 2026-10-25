<script setup>
import { computed, watch, onBeforeUnmount } from "vue";
import { useStore } from "vuex";
import { useRoute } from "vue-router";
//
import Header from "@/components/Header.vue";
import Sidebar from "@/components/Sidebar.vue";
import ScrollToTop from "@/components/ScrollToTop.vue";
// import AdBanner from "@/components/AdBanner.vue";
import Footer from "@/components/Footer.vue";
import BottomNav from "@/components/BottomNav.vue";
import PopupAd from "@/components/PopupAd.vue";
import BottomBannerAd from "@/components/BottomBannerAd.vue";
import { SHOW_ADS } from "@/config/app";

const showAds = SHOW_ADS;

const store = useStore();
const route = useRoute();

const drawerOpen = computed(() => store.state.drawerOpen);

const closeDrawer = () => store.commit("closeDrawer");

// Close drawer when route changes
watch(
  () => route.fullPath,
  () => {
    closeDrawer();
  }
);

// Clean up body class on destroy
onBeforeUnmount(() => {
  document.body.classList.remove("drawer-open");
});
</script>

<template>
  <div class="app-container">
    <!-- Mobile Sidebar Drawer -->
    <div class="sidebar-backdrop" v-if="drawerOpen" @click="closeDrawer"></div>

    <Sidebar />
    <Header />

    <main class="app-content">
      <div class="main-content">
        <router-view />
      </div>
    </main>
    <PopupAd />
    <BottomBannerAd />

    <!-- Full footer on desktop; on the app/mobile its links live in the drawer -->
    <div class="site-footer-desktop">
      <Footer />
    </div>

    <!-- Native-app-style bottom tab bar (mobile / Capacitor only) -->
    <BottomNav />

    <ScrollToTop />
  </div>
</template>
<style>
.app-container {
  --bottom-nav-height: 60px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

.app-content {
  flex: 1;
  background-color: #ead7bd; /* Updated to requested background color */
  color: #333333; /* Changed to dark text for light theme */
}

.main-content {
  padding: 0;
  /* margin: 0 1rem; */
}

.app-footer {
  margin-top: auto;
}

/* Sidebar drawer styles */
.sidebar-drawer {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 280px;
  background-color: #222222;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 1050;
  transform: translateX(-100%);
  transition: transform 0.3s ease-in-out;
  display: flex;
  flex-direction: column;
}

.sidebar-drawer.open {
  transform: translateX(0);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
}

.sidebar-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1040;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Prevent body scrolling when drawer is open */
body.drawer-open {
  overflow: hidden;
}

/* Desktop menu visibility */
@media (max-width: 991.98px) {
  .navbar-collapse {
    display: none !important;
  }
}

@media (min-width: 992px) {
  .navbar-toggler {
    display: none !important;
  }
  .main-content {
    padding: 2rem;
    margin: 0;
  }
}

/* ===== App-mode chrome (mobile / Capacitor): bottom tab bar ===== */
@media (max-width: 991.98px) {
  /* The full site footer is replaced by the side drawer + bottom nav. */
  .site-footer-desktop {
    display: none;
  }

  /* Keep page content clear of the fixed bottom tab bar. */
  .app-content {
    padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px));
  }

  /* A bottom banner ad stacks ABOVE the tab bar (standard app placement). */
  .bottom-ad {
    bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px)) !important;
  }

  /* Hide the marketing CTA ticker for a clean native feel
     (the Advertise CTA still lives inside the drawer). */
  .ad-banner-sticky {
    display: none !important;
  }
}
</style>
