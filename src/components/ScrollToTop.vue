<template>
  <transition name="fade">
    <button
      v-show="isVisible"
      @click="scrollToTop"
      class="scroll-top-btn"
      aria-label="Scroll to top"
    >
      <i class="bi bi-arrow-up"></i>
    </button>
  </transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const isVisible = ref(false);
const scrollThreshold = 300; // Show button after scrolling this many pixels

// Check scroll position and update button visibility
const checkScroll = () => {
  const scrollPosition =
    window.pageYOffset || document.documentElement.scrollTop;
  isVisible.value = scrollPosition > scrollThreshold;
};

// Smooth scroll to top function
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

// Set up scroll event listener
onMounted(() => {
  window.addEventListener("scroll", checkScroll);
  // Initial check
  checkScroll();
});

// Clean up event listener
onUnmounted(() => {
  window.removeEventListener("scroll", checkScroll);
});
</script>

<style scoped>
.scroll-top-btn {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--secondary);
  color: white;
  border: none;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  transition:
    background-color 0.3s,
    transform 0.3s;
}

.scroll-top-btn:hover {
  background-color: var(--secondary);
  transform: translateY(-3px);
}

.scroll-top-btn:active {
  transform: translateY(1px);
}

.scroll-top-btn i {
  font-size: 1.5rem;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s,
    transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Media query for mobile devices */
@media (max-width: 767.98px) {
  .scroll-top-btn {
    bottom: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
  }

  .scroll-top-btn i {
    font-size: 1.25rem;
  }
}
</style>
