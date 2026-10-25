<script setup>
defineProps({
  layout: {
    type: String,
    default: "row",
    validator: (value) => ['row', 'col'].includes(value)
  },
});
</script>

<template>
  <div
      class="cta-ticker-wrapper"
      :class="{
      'layout-row': layout === 'row',
      'layout-col': layout === 'col'
    }"
  >
    <!-- Advertise Button -->
    <a
        href="https://wa.me/27774806048"
        target="_blank"
        rel="noopener noreferrer"
        class="advertise-btn"
        :class="{ 'btn-fullwidth': layout === 'col' }"
    >
      <i class="bi bi-megaphone-fill btn-icon"></i>
      <span class="btn-text">Advertise with us!</span>
    </a>

    <!-- Ticker Container -->
    <div class="ticker-container" v-if="layout === 'row'">
      <div class="ticker-scroll">
        <span class="ticker-text">
          <i class="bi bi-megaphone-fill"></i> AD Packages from R499 • <i class="bi bi-bullseye"></i> Reach your local audience •
          <i class="bi bi-megaphone-fill"></i> AD Packages from R499 • <i class="bi bi-bullseye"></i> Reach your local audience •
          <i class="bi bi-megaphone-fill"></i> AD Packages from R499 • <i class="bi bi-bullseye"></i> Reach your local audience
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== WRAPPER ===== */
.cta-ticker-wrapper {
  width: 100%;
}

.layout-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.layout-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ===== ADVERTISE BUTTON ===== */
.advertise-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: #f5edd6;
  color: #2c3e50;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.advertise-btn:hover {
  background-color: #fff;
  color: #2c3e50;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.advertise-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.btn-fullwidth {
  width: 100%;
}

.btn-icon {
  font-size: 1.1rem;
}

/* ===== TICKER CONTAINER ===== */
.ticker-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-width: 0;
}

.ticker-scroll {
  display: inline-block;
  white-space: nowrap;
  animation: scroll-ticker 30s linear infinite;
}

.ticker-text {
  display: inline-block;
  font-size: 0.9rem;
  font-weight: 600;
  color: #f5edd6;
  padding-right: 40px;
}

/* Ensure ticker icons are monochrome and spaced */
.ticker-text .bi {
  color: #f5edd6;
  margin-right: 6px;
  vertical-align: -2px;
}

@keyframes scroll-ticker {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-33.333%);
  }
}

/* Pause animation on hover */
.ticker-container:hover .ticker-scroll {
  animation-play-state: paused;
}

/* ===== RESPONSIVE DESIGN ===== */

/* Large Screens */
@media (min-width: 1200px) {
  .ticker-text {
    font-size: 1rem;
  }
}

/* Medium Screens */
@media (min-width: 992px) and (max-width: 1199.98px) {
  .ticker-text {
    font-size: 0.95rem;
  }
}

/* Tablets */
@media (min-width: 768px) and (max-width: 991.98px) {
  .layout-row {
    gap: 10px;
  }

  .advertise-btn {
    padding: 8px 14px;
    font-size: 0.85rem;
  }

  .ticker-text {
    font-size: 0.9rem;
  }
}

/* Mobile Landscape and Small Tablets */
@media (max-width: 767.98px) {
  .layout-row {
    gap: 8px;
  }

  .advertise-btn {
    padding: 6px 12px;
    font-size: 0.85rem;
  }

  .btn-text {
    display: none;
  }

  .btn-icon {
    font-size: 1.2rem;
    margin: 0;
  }

  .ticker-text {
    font-size: 0.85rem;
  }
}

/* Small Mobile */
@media (max-width: 575.98px) {
  .advertise-btn {
    padding: 6px 10px;
  }

  .ticker-text {
    font-size: 0.8rem;
  }
}

/* Extra Small Mobile */
@media (max-width: 350px) {
  .advertise-btn {
    padding: 5px 8px;
  }

  .btn-icon {
    font-size: 1.1rem;
  }

  .ticker-text {
    font-size: 0.75rem;
  }
}

/* ===== COLUMN LAYOUT SPECIFIC ===== */
.layout-col .advertise-btn {
  padding: 10px 16px;
  font-size: 0.95rem;
}

.layout-col .advertise-btn:hover {
  transform: translateY(-1px);
}

/* For sidebar usage */
@media (max-width: 991.98px) {
  .layout-col .advertise-btn {
    padding: 10px 14px;
    font-size: 0.9rem;
  }
}

/* ===== ACCESSIBILITY ===== */
@media (prefers-reduced-motion: reduce) {
  .ticker-scroll {
    animation: none;
  }

  .advertise-btn {
    transition: none;
  }
}

/* Focus state for keyboard navigation */
.advertise-btn:focus-visible {
  outline: 2px solid #f5edd6;
  outline-offset: 3px;
}
</style>