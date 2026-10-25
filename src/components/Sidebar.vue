<script setup>
/**
 * Sidebar.vue
 *
 * Mobile navigation drawer component that provides an alternative navigation interface.
 *
 * This component:
 * - Displays the application logo and main navigation links
 * - Provides a mobile-friendly navigation experience
 * - Integrates with the Vuex store for state management
 * - Includes advertising components
 * - Features social media links in the footer
 * - OneSignal subscription management
 */

import { computed, ref } from "vue";
import { useStore } from "vuex";
import AdBanner from "./AdBanner.vue";
import AdvertiseCTA from "./AdvertiseCTA.vue";
import { SIDEBAR_TOP } from "@/utils";
import { useOneSignal } from "@onesignal/onesignal-vue3";
import AdCTAWithTicker from "./AdCTAWithTicker.vue";

// Access the Vuex store for drawer state management
const store = useStore();

/**
 * Computed property that tracks the drawer's open/closed state
 * Reactively updates when the store state changes
 */
const drawerOpen = computed(() => store.state.drawerOpen);

/**
 * Closes the navigation drawer
 * Delegates to Vuex store mutation
 */
const closeDrawer = () => store.commit("closeDrawer");

// OneSignal subscription state
const isSubscribed = ref(() => useOneSignal().User.PushSubscription.optedIn);
const isOneSignalReady = ref(false);

const handleOptInOptOut = async () => {
  try {
    console.log("Attempting to opt in to push notifications...");

    // Check if user is already subscribed
    if (isSubscribed.value) {
      await useOneSignal().User.PushSubscription.optOut();
      isSubscribed.value = false;
    } else {
      console.log("Opt in to push notifications...");
      // Opt in to push notifications
      const optInResult = await useOneSignal().User.PushSubscription.optIn();
      console.log("Opt-in result:", optInResult);
      isSubscribed.value = true;
    }
    // Setup event listeners
    setupEventListeners();
  } catch (error) {
    console.error("Error during opt-in process:", error);
  }
};

const setupEventListeners = () => {
  try {
    console.log("Setting up notification event listeners...");

    // Handle notifications displayed while app is in foreground
    useOneSignal().Notifications.addEventListener(
        "foregroundWillDisplay",
        (event) => {
          console.log("Foreground notification will display:", event);
          const notification = event.notification;

          // You can customize notification display here
        }
    );

    // Handle notification clicks
    useOneSignal().Notifications.addEventListener("click", (event) => {
      console.log("Notification clicked:", event);
      // Handle notification click
    });

    // Listen for subscription changes
    useOneSignal().User.PushSubscription.addEventListener(
        "change",
        async (event) => {
          console.log("Subscription changed:", event);
          if (event.current.optedIn) {
            // User subscribed, add to segments
            // await setupUserSegmentation();
          } else {
            isSubscribed.value = false;
          }
        }
    );

    console.log("Event listeners setup complete");
  } catch (error) {
    console.error("Error setting up event listeners:", error);
  }
};

</script>

<template>
  <div class="sidebar-drawer" :class="{ open: drawerOpen }">
    <!-- Header Section -->
    <div class="sidebar-header">
      <div class="header-content">
        <div class="logo-wrapper">
          <img
              src="/logo/laudium-icon-dark.svg"
              alt="Laudium POST"
              class="logo-image"
          />
          <span class="logo-text">Laudium POST</span>
        </div>
        <button
            class="btn-close-custom"
            @click="closeDrawer"
            aria-label="Close"
        >
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>

    <!-- Main Navigation Section -->
    <div class="sidebar-content">
      <nav class="navigation-section">
        <div class="section-label">Navigation</div>
        <div class="nav-items">
          <router-link to="/" exact class="nav-item" exact-active-class="nav-item-active" @click="closeDrawer">
            <i class="bi bi-house-door-fill nav-icon"></i>
            <span class="nav-text">Home</span>
          </router-link>
          <router-link to="/news" class="nav-item" active-class="nav-item-active" @click="closeDrawer">
            <i class="bi bi-newspaper nav-icon"></i>
            <span class="nav-text">News</span>
          </router-link>
          <router-link to="/community" class="nav-item" active-class="nav-item-active" @click="closeDrawer">
            <i class="bi bi-people-fill nav-icon"></i>
            <span class="nav-text">Community</span>
          </router-link>
          <router-link to="/directory" class="nav-item" active-class="nav-item-active" @click="closeDrawer">
            <i class="bi bi-journal-text nav-icon"></i>
            <span class="nav-text">Directory</span>
          </router-link>
          <router-link to="/announcements" class="nav-item" active-class="nav-item-active" @click="closeDrawer">
            <i class="bi bi-megaphone-fill nav-icon"></i>
            <span class="nav-text">Announcements</span>
          </router-link>
          <router-link to="/podcasts" class="nav-item" active-class="nav-item-active" @click="closeDrawer">
            <i class="bi bi-play-circle-fill nav-icon"></i>
            <span class="nav-text">Podcasts</span>
          </router-link>
          <router-link to="/events" class="nav-item" active-class="nav-item-active" @click="closeDrawer">
            <i class="bi bi-calendar-event nav-icon"></i>
            <span class="nav-text">Events</span>
          </router-link>
          <router-link to="/search" class="nav-item" active-class="nav-item-active" @click="closeDrawer">
            <i class="bi bi-search nav-icon"></i>
            <span class="nav-text">Search</span>
          </router-link>
        </div>
      </nav>

      <!-- Secondary links (moved here from the site footer) -->
      <nav class="navigation-section">
        <div class="section-label">More</div>
        <div class="nav-items">
          <a href="https://wa.me/27774806048" target="_blank" rel="noopener noreferrer" class="nav-item" @click="closeDrawer">
            <i class="bi bi-megaphone nav-icon"></i>
            <span class="nav-text">Advertise With Us</span>
          </a>
          <router-link to="/about" class="nav-item" active-class="nav-item-active" @click="closeDrawer">
            <i class="bi bi-info-circle nav-icon"></i>
            <span class="nav-text">About</span>
          </router-link>
          <router-link to="/editorial-policy" class="nav-item" active-class="nav-item-active" @click="closeDrawer">
            <i class="bi bi-pencil-square nav-icon"></i>
            <span class="nav-text">Editorial Policy</span>
          </router-link>
          <router-link to="/corrections" class="nav-item" active-class="nav-item-active" @click="closeDrawer">
            <i class="bi bi-check2-square nav-icon"></i>
            <span class="nav-text">Corrections</span>
          </router-link>
        </div>
      </nav>

      <nav class="navigation-section">
        <div class="section-label">Legal</div>
        <div class="nav-items">
          <router-link to="/terms-of-use" class="nav-item" active-class="nav-item-active" @click="closeDrawer">
            <i class="bi bi-file-text nav-icon"></i>
            <span class="nav-text">Terms of Use</span>
          </router-link>
          <router-link to="/privacy-policy" class="nav-item" active-class="nav-item-active" @click="closeDrawer">
            <i class="bi bi-shield-lock nav-icon"></i>
            <span class="nav-text">Privacy Policy</span>
          </router-link>
        </div>
      </nav>

      <!-- Advertise CTA - Prominent Position -->
      <div class="advertise-section">
        <AdCTAWithTicker layout="col" />
      </div>

      <!-- Quick Actions Section -->
      <div class="actions-section">
        <div class="section-label">Quick Actions</div>

        <button
            class="action-button"
            :class="{ 'action-button-active': isSubscribed }"
            @click="handleOptInOptOut"
        >
          <div class="action-icon-wrapper">
            <i :class="isSubscribed ? 'bi bi-bell-fill' : 'bi bi-bell'"></i>
          </div>
          <div class="action-content">
            <div class="action-title">
              {{ isSubscribed ? 'Notifications On' : 'Enable Notifications' }}
            </div>
            <div class="action-subtitle">
              {{ isSubscribed ? 'Tap to disable' : 'Get latest updates' }}
            </div>
          </div>
        </button>
      </div>

      <!-- Ad Section -->
      <div class="ad-section">
        <AdBanner size="small" :placement="SIDEBAR_TOP" show-close />
      </div>
    </div>

    <!-- Footer Section -->
    <div class="sidebar-footer">
      <div class="footer-label">Connect</div>
      <div class="social-links">
        <a href="#" class="social-link" aria-label="Facebook">
          <i class="bi bi-facebook"></i>
        </a>
        <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://x.com/vukaagroup"
            class="social-link"
            aria-label="Twitter"
        >
          <i class="bi bi-twitter-x"></i>
        </a>
        <a href="#" class="social-link" aria-label="Instagram">
          <i class="bi bi-instagram"></i>
        </a>
        <a href="#" class="social-link" aria-label="WhatsApp">
          <i class="bi bi-whatsapp"></i>
        </a>
        <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.youtube.com/channel/UC0Om9sgYVeTUmn8ZErnJt6w"
            class="social-link"
            aria-label="YouTube"
        >
          <i class="bi bi-youtube"></i>
        </a>
      </div>
      <a class="sidebar-contact" href="mailto:info@lauduimbiz.co.za">
        <i class="bi bi-envelope"></i> info@lauduimbiz.co.za
      </a>
    </div>
  </div>
</template>

<style scoped>
/* ===== SIDEBAR CONTAINER ===== */
.sidebar-drawer {
  position: fixed;
  top: 0;
  left: -320px;
  width: 320px;
  height: 100vh;
  background-color: #ffffff;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
  transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1050;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-drawer.open {
  left: 0;
}

/* ===== HEADER SECTION (DARK MODE) ===== */
.sidebar-header {
  background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%);
  padding: 20px 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 2;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-wrapper {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo-image {
  height: 68px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3));
}

.logo-text {
  font-size: 1.35rem;
  font-weight: 700;
  color: #f5edd6;
  letter-spacing: -0.5px;
}

.btn-close-custom {
  background: rgba(245, 237, 214, 0.15);
  border: none;
  border-radius: 50%;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #f5edd6;
  font-size: 1.1rem;
}

.btn-close-custom:hover {
  background: rgba(245, 237, 214, 0.25);
  transform: rotate(90deg);
}

/* ===== CONTENT SECTION ===== */
.sidebar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: #fefefe;
  padding-bottom: 16px;
}

/* Custom scrollbar */
.sidebar-content::-webkit-scrollbar {
  width: 5px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: #f5f5f5;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: #d4c5a0;
  border-radius: 3px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: #ffc107;
}

/* ===== SECTION LABELS ===== */
.section-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #999;
  padding: 16px 20px 6px 20px;
  margin-top: 4px;
}

/* ===== NAVIGATION SECTION (DARK BLUE THEME) ===== */
.navigation-section {
  margin-bottom: 4px;
  background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);
  padding: 8px 0;
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  text-decoration: none;
  color: #f5edd6;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.nav-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 3px;
  background: #ffc107;
  transform: translateX(-3px);
  transition: transform 0.2s ease;
}

.nav-item:hover {
  background-color: rgba(245, 237, 214, 0.1);
  color: #ffffff;
  transform: translateX(2px);
}

.nav-item:hover::before {
  transform: translateX(0);
}

.nav-item-active {
  background-color: rgba(255, 193, 7, 0.2);
  color: #ffc107;
  font-weight: 600;
}

.nav-item-active::before {
  transform: translateX(0);
}

.nav-icon {
  font-size: 1.15rem;
  width: 22px;
  text-align: center;
  color: rgba(245, 237, 214, 0.7);
  transition: color 0.2s ease;
}

.nav-item:hover .nav-icon,
.nav-item-active .nav-icon {
  color: #ffc107;
}

.nav-text {
  flex: 1;
}

/* ===== ADVERTISE SECTION ===== */
.advertise-section {
  padding: 12px;
  margin: 8px 0;
  background: linear-gradient(to bottom, #fffbf0 0%, #fff8e1 100%);
  border-top: 1px solid #ffe9a0;
  border-bottom: 1px solid #ffe9a0;
}

/* ===== ACTIONS SECTION ===== */
.actions-section {
  margin-bottom: 12px;
  padding: 0 12px;
}

.action-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.action-button:hover {
  border-color: #ffc107;
  background: #fffbf0;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(255, 193, 7, 0.12);
}

.action-button-active {
  border-color: #4caf50;
  background: #f1f8f4;
}

.action-button-active:hover {
  border-color: #4caf50;
  background: #e8f5e9;
}

.action-icon-wrapper {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
  border-radius: 6px;
  font-size: 1.2rem;
  color: #ffc107;
  flex-shrink: 0;
}

.action-button-active .action-icon-wrapper {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  color: #4caf50;
}

.action-content {
  flex: 1;
}

.action-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #000;
  margin-bottom: 1px;
}

.action-subtitle {
  font-size: 0.75rem;
  color: #666;
}

/* ===== AD SECTION ===== */
.ad-section {
  padding: 12px;
  margin-top: 4px;
}

/* ===== FOOTER SECTION ===== */
.sidebar-footer {
  background: linear-gradient(to bottom, #f9f9f9 0%, #f0f0f0 100%);
  padding: 12px 20px;
  border-top: 1px solid #e0e0e0;
  text-align: center;
}

.footer-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #666;
  margin-bottom: 8px;
}

.social-links {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.social-link {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 50%;
  color: #333;
  font-size: 1.1rem;
  text-decoration: none;
  transition: all 0.2s ease;
}

.social-link:hover {
  background: #ffc107;
  border-color: #ffc107;
  color: #000;
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 3px 8px rgba(255, 193, 7, 0.25);
}

.sidebar-contact {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 0.8rem;
  color: #555;
  text-decoration: none;
}

.sidebar-contact:hover {
  color: #ffc107;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 375px) {
  .sidebar-drawer {
    width: 100%;
    left: -100%;
  }

  .sidebar-drawer.open {
    left: 0;
  }
}

/* ===== AD COMPONENT OVERRIDES ===== */
:deep(.ad-container) {
  background-color: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}

:deep(.ad-details) {
  color: #333;
}

:deep(.ad-label) {
  background-color: #ffc107;
  color: #000;
  font-weight: 600;
}
</style>
