/**
 * composables/useAds.js
 * 
 * Advertisement management composable for the Laudium Biz application.
 * 
 * This composable:
 * - Fetches advertisements for a specific placement location
 * - Tracks ad impressions automatically
 * - Provides reactive ad data for components to display
 * - Handles the ad loading lifecycle
 */

import {
  getAdByPlacement,
  getAllAdByPlacement,
  trackImpression,
} from "@/features/ads/AdsService";
import { ref, onMounted } from "vue";

/**
 * Advertisement composable that provides ad data for a specific placement
 * 
 * @param {string} placement - The placement location key (e.g., "home_banner")
 * @returns {Object} - Object containing reactive ads data
 */
export function useAds(placement) {
  /**
   * Reactive array of advertisements for the specified placement
   */
  const ads = ref([]);

  /**
   * Fetches a single ad for the specified placement (currently commented out)
   * 
   * @async
   */
  //   const fetchAd = async () => {
  //     const { data } = await getAdByPlacement(placement);
  //     ads.value = data;
  //     console.log()
  //     data.forEach((ad) => trackImpression(ad.id));
  //   };

  /**
   * Fetches all ads for the specified placement and tracks impressions
   * 
   * @async
   */
  const fetchAds = async () => {
    const { data } = await getAllAdByPlacement(placement);
    ads.value = data;

    // Track impressions for each ad that was loaded
    data.forEach((ad) => trackImpression(ad.id));
  };

  /**
   * Tracks ad clicks (currently commented out)
   * 
   * @async
   * @param {number|string} id - The ad ID
   */
  //   const trackClick = async (id) => {
  //     await axios.post(`/api/ads/${id}/click`);
  //   };

  /**
   * Tracks ad impressions (currently commented out - using imported function instead)
   * 
   * @async
   * @param {number|string} id - The ad ID
   */
  //   const trackImpression = async (id) => {
  //     await axios.post(`/api/ads/${id}/impression`);
  //   };

  // Fetch ads when the component using this composable is mounted
  onMounted(fetchAds);
  //   onMounted(fetchAd);

  return { ads };
}
