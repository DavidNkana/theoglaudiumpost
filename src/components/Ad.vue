<template>
  <div>
    <!-- Ad Popup -->
    <transition name="fade">
      <div
        v-if="ads.length && showAd"
        class="position-fixed bottom-0 end-0 m-3 p-3 bg-white border shadow rounded"
        style="z-index: 1050; width: 300px"
      >
        <div class="d-flex justify-content-between align-items-start">
          <strong class="text-success">Ad</strong>
          <button type="button" class="btn-close" @click="closeAd"></button>
        </div>
        <div class="mt-2" @click="handleClick(ads[0].id)">
          <img
            :src="ads[0].image"
            :alt="ads[0].title"
            class="img-fluid rounded"
          />
          <p class="mt-2 small">
            {{ ads[0].title }} <br />
            <a
              v-if="ads[0].click_url"
              href="https://advertiser-site.com"
              target="_blank"
              class="text-success fw-bold"
              >Visit</a
            >
          </p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { useAds } from "@/composables/useAds";
import { trackClick, trackImpression } from "@/features/ads/AdsService";

const showAd = ref(false);
let adTimeout = null;

const { ads } = useAds("pop_up");
// console.log("Popup ads: ", ads);
function handleClick(adId) {
  trackClick(adId);
}

// Show the ad after 5 seconds, then auto-hide after 15 seconds
onMounted(() => {
  setTimeout(() => {
    showAd.value = true;
    trackImpression(ads[0]?.id);
    // Auto-close after 15 seconds
    adTimeout = setTimeout(() => {
      showAd.value = false;
    }, 15000);
  }, 5000);
});

const closeAd = () => {
  showAd.value = false;
  clearTimeout(adTimeout);
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
