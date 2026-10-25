<script setup>
/**
 * Header.vue
 *
 * Main application header component that provides navigation and branding.
 *
 * This component:
 * - Displays the application logo and main navigation links
 * - Implements responsive behavior for mobile and desktop views
 * - Features a smart scroll behavior that fixes the header on scroll
 * - Integrates with the drawer menu system for mobile navigation
 * - Includes search functionality and advertising CTA
 */

import { ref, onMounted, onUnmounted } from "vue";
import { useStore } from "vuex";
import { useRouter, useRoute } from "vue-router";
import AdvertiseCTA from "@/components/AdvertiseCTA.vue";
import { isMobileDevice } from "@/utils";
import HeaderSearch from "./HeaderSearch.vue";
import AdCTAWithTicker from "./AdCTAWithTicker.vue";
import logoUrl from "@/assets/laudium-post-logo.png";

// Access the Vuex store for drawer state management
const store = useStore();
const router = useRouter();
const route = useRoute();

/**
 * Reactive state variables
 */
const isHeaderFixed = ref(false);
const lastScrollPosition = ref(0);
const headerHeight = ref(0);

/**
 * Opens the mobile navigation drawer
 */
const openDrawer = () => store.commit("openDrawer");

/**
 * Handles scroll events to implement smart header behavior
 */
const handleScroll = () => {
  const currentScrollPosition =
      window.pageYOffset || document.documentElement.scrollTop;

  if (headerHeight.value === 0) {
    const header = document.querySelector(".app-header");
    if (header) {
      headerHeight.value = header.offsetHeight;
    }
  }

  const isScrollingDown = currentScrollPosition > lastScrollPosition.value;

  if (
      isScrollingDown &&
      currentScrollPosition > headerHeight.value &&
      !isHeaderFixed.value
  ) {
    isHeaderFixed.value = true;
  }
  else if (
      !isScrollingDown &&
      currentScrollPosition < 50 &&
      isHeaderFixed.value
  ) {
    isHeaderFixed.value = false;
  }

  lastScrollPosition.value = currentScrollPosition;
};

onMounted(() => {
  window.addEventListener("scroll", handleScroll);

  const header = document.querySelector(".app-header");
  if (header) {
    headerHeight.value = header.offsetHeight;
  }
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});
</script>

<template>
  <header class="app-header" :class="{ 'header-fixed': isHeaderFixed }">
    <!-- Main Navigation Bar -->
    <div class="main-nav">
      <div class="container-fluid">
        <div class="nav-content">
          <!-- Left: Menu & Logo -->
          <div class="nav-left">
            <button
                class="menu-toggle"
                @click="openDrawer"
                aria-label="Open menu"
            >
              <i class="bi bi-list"></i>
            </button>

            <router-link class="brand-logo" to="/">
              <img
                  :src="logoUrl"
                  alt="Laudium POST"
                  class="logo-img"
              />
            </router-link>
          </div>

          <!-- Center: Desktop Navigation -->
          <nav class="nav-center">
            <router-link
                to="/"
                class="nav-link"
                exact-active-class="active"
            >
              Home
            </router-link>
            <router-link
                to="/news"
                class="nav-link"
                active-class="active"
            >
              News
            </router-link>
<!--            <router-link
                to="#"
                class="nav-link"
            >
              Interviews
            </router-link>
            <router-link
                to="/podcasts"
                class="nav-link"
            >
              Podcasts
            </router-link>
            <router-link
                to="/community"
                class="nav-link"
                active-class="active"
            >
              Community
            </router-link>
            <router-link
                to="/announcements"
                class="nav-link"
                active-class="active"
            >
              Announcements
            </router-link>-->
          </nav>

          <!-- Right: WhatsApp Contact -->
          <div class="nav-right">
            <a
                href="https://api.whatsapp.com/send/?phone=27774806048&text&type=phone_number&app_absent=0"
                target="_blank"
                rel="noopener noreferrer"
                class="whatsapp-btn"
                aria-label="Contact us on WhatsApp"
            >
              <i class="bi bi-whatsapp"></i>
            </a>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Spacer for fixed header -->
  <div v-if="isHeaderFixed" :style="{ height: headerHeight + 'px' }"></div>

  <!-- Sticky Bottom Ad Banner -->
  <div class="ad-banner-sticky">
    <div class="container-fluid">
      <AdCTAWithTicker layout="row" />
    </div>
  </div>
</template>

<style scoped>
/* ===== HEADER CONTAINER ===== */
.app-header {
  background-color: #f5edd6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.header-fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1030;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

/* ===== STICKY BOTTOM AD BANNER ===== */
.ad-banner-sticky {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1040;
  background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%);
  border-top: 2px solid #1a252f;
  padding: 8px 0;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.2);
}

:deep(.btn-warning:active) {
  transform: translateY(0);
}

:deep(.ticker-text) {
  color: #f5edd6 !important;
  font-weight: 600;
}

:deep(.ticker-container) {
  flex: 1;
}

/* Responsive adjustments for ticker */
@media (max-width: 767.98px) {
  :deep(.btn-warning) {
    padding: 6px 12px;
    font-size: 0.85rem;
  }

  :deep(.btn-warning .me-1) {
    margin-right: 0 !important;
  }

  :deep(.btn-warning span:not(.bi)) {
    display: none;
  }
}

@media (max-width: 575.98px) {
  :deep(.ticker-wrapper) {
    gap: 8px;
  }
}

/* ===== MAIN NAVIGATION ===== */
.main-nav {
  background-color: #f5edd6;
  border-bottom: 1px solid #e0d8c3;
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  gap: 20px;
  position: relative;
}

.header-fixed .nav-content {
  padding: 0;
}

/* ===== LEFT SECTION ===== */
.nav-left {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex: 1;
}

/* Menu Toggle */
.menu-toggle {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  font-size: 1.8rem;
  color: #2c3e50;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-toggle:hover {
  background-color: rgba(44, 62, 80, 0.1);
}

@media (min-width: 768px) {
  .menu-toggle {
    left: 24px;
  }
}

/* Logo */
.brand-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.logo-img {
  height: 40px;
  width: auto;
  object-fit: contain;
  transition: height 0.3s ease;
  display: block;
}

.header-fixed .logo-img {
  height: 32px;
}

@media (max-width: 767.98px) {
  .logo-img {
    height: 38px;
  }

  .header-fixed .logo-img {
    height: 28px;
  }
}

@media (max-width: 575.98px) {
  .logo-img {
    height: 34px;
  }

  .header-fixed .logo-img {
    height: 26px;
  }
}

/* ===== CENTER NAVIGATION ===== */
.nav-center {
  display: none;
}

.nav-right {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
}

/* WhatsApp Button */
.whatsapp-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%);
  color: #f5edd6;
  border-radius: 50%;
  font-size: 1.1rem;
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.whatsapp-btn:hover {
  background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
  color: #ffc107;
  transform: scale(1.05);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
}

.header-fixed .whatsapp-btn {
  width: 28px;
  height: 28px;
  font-size: 1rem;
}

@media (min-width: 768px) {
  .nav-right {
    right: 24px;
  }
}

.nav-link {
  padding: 8px 14px;
  color: #333;
  font-size: 0.95rem;
  font-weight: 500;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s ease;
  position: relative;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: 6px;
  left: 14px;
  right: 14px;
  height: 2px;
  background: #ffc107;
  transform: scaleX(0);
  transition: transform 0.2s ease;
}

.nav-link:hover {
  color: #000;
  background-color: #fff8e1;
}

.nav-link:hover::after {
  transform: scaleX(1);
}

.nav-link.active {
  color: #000;
  font-weight: 600;
  background-color: #fff3cd;
}

.nav-link.active::after {
  transform: scaleX(1);
}

.header-fixed .nav-link {
  padding: 6px 12px;
  font-size: 0.9rem;
}

/* Responsive Navigation */
@media (min-width: 1200px) {
  .nav-link {
    padding: 8px 16px;
    font-size: 1rem;
  }

  .nav-center {
    gap: 6px;
  }
}

@media (max-width: 1199.98px) and (min-width: 992px) {
  .nav-link {
    padding: 8px 10px;
    font-size: 0.9rem;
  }

  .nav-center {
    gap: 2px;
  }
}


/* Container adjustments for proper padding */
.container-fluid {
  padding-left: 16px;
  padding-right: 16px;
}

@media (min-width: 768px) {
  .container-fluid {
    padding-left: 24px;
    padding-right: 24px;
  }
}

/* ===== ACCESSIBILITY ===== */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus states for keyboard navigation */
.menu-toggle:focus-visible,
.nav-link:focus-visible,
.view-toggle:focus-visible {
  outline: 2px solid #ffc107;
  outline-offset: 2px;
}
</style>