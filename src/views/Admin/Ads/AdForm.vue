<!-- components/AdForm.vue (Refactored) -->
<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useAdForm } from '@/composables/useAdForm';
import MultiImagePicker from '@/components/MultiImagePicker.vue';
import TagSelector from '../Articles/Partials/TagSelector.vue';
import { createAd, editAd, getPlacements, getAd } from '@/features/ads/AdsService';
import { getBusinesses, createBusiness } from '@/features/businesses/BusinessesService';
import { getTags } from '@/features/tags/TagsService';
import { getCampaigns, createCampaign } from '@/features/ads/CampaignService';
import { getMediaDataUrl } from '@/features/media/MediaService';
import Swal from 'sweetalert2';
import dayjs from 'dayjs';

// Props & Emits
const props = defineProps({
  ad: {
    type: Object,
    default: null,
  },
});

const emits = defineEmits(['close', 'update-ad', 'add-ad']);

// Composables
const {
  form,
  selectedPlacement,
  isValidUrl,
  validationErrors,
  populateForm,
  formatPlacement,
  calculateDates,
  calculateEndDateFromStart,
  getMinStartDate,
  calculateCost,
  validateDates,
  formatUrl,
  validateForm,
  preparePayload,
  resetForm,
} = useAdForm();

// State
const isEdit = computed(() => !!props.ad);
const isSubmitting = ref(false);
const imageUpdated = ref(false);
const isLoadingData = ref(true);
const isLoadingImages = ref(false);
const isUploadingVideo = ref(false);
const videoPreviewUrl = ref(null);
const videoInputRef = ref(null);

// Media type selector: 'image' or 'video'
const mediaType = ref('image');

// Data
const placements = ref([]);
const businesses = ref([]);
const campaigns = ref([]);
const tags = ref([]);

// Inline creation modals
const showNewBusinessModal = ref(false);
const showNewCampaignModal = ref(false);
const isCreatingBusiness = ref(false);
const isCreatingCampaign = ref(false);
const newBusinessForm = ref({ name: '', type: 'business', status: 'active' });
const newCampaignForm = ref({ name: '', businessId: '', status: 'active', paymentStatus: 'pending' });

// @ModifiedByJunie 2025-12-10 - Filter campaigns by selected business
const filteredCampaigns = computed(() => {
  if (!form.value.businessId) return [];
  return campaigns.value.filter(c => c.businessId === form.value.businessId);
});

// Initialize form data
const initializeForm = async () => {
  isLoadingData.value = true;

  try {
    // Load all required data in parallel
    // @ModifiedByJunie 2025-12-10 - Load all campaigns (not just active) to have full list for filtering by business
    const [placementsRes, businessesRes, campaignsRes, tagsRes] = await Promise.all([
      getPlacements(),
      getBusinesses({}),
      getCampaigns({ size: 1000 }),
      getTags()
    ]);

    // Restrict to a single placement: "Main Page Add" with mobile aspect ratio and fixed price R900
    const fetched = placementsRes.data || [];
    const basePlacement = fetched.length > 0 ? fetched[0] : {
      id: 'main_page_ad',
      location: 'main_page_ad',
      fee_type: 'FIXED',
      billing_unit: 'DAY',
    };
    const mainPlacement = {
      ...basePlacement,
      location: 'main_page_ad',
      name: 'Main Page Ad',
      aspect_ratio: '9:16',
      fee_type: 'FIXED',
      fee: 900,
      billing_unit: 'WEEK',
    };
    placements.value = [mainPlacement];

    // Default selection and pricing
    form.value.placementId = mainPlacement.id;
    selectedPlacement.value = mainPlacement;
    // Set default dates: active for 7 days from tomorrow
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const end = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 6);
    form.value.startTime = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
    form.value.endTime = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
    form.value.totalCost = (900).toFixed(2);
    form.value.enabled = true;

    businesses.value = businessesRes.data.businesses || [];
    campaigns.value = campaignsRes.data.campaigns || [];
    tags.value = tagsRes.data || [];
    // Sync payment amount with fixed price
    if (!form.value.paymentInfo) form.value.paymentInfo = { amount: '', status: 'COMPLETE', reference: '' };
    form.value.paymentInfo.amount = '900.00';

    // If editing, load ad data
    if (isEdit.value) {
      await loadAdData();
    } else {
      resetForm();
    }
  } catch (error) {
    console.error('Error loading form data:', error);
    Swal.fire({
      title: 'Error',
      text: 'Failed to load form data. Please try again.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  } finally {
    isLoadingData.value = false;
  }
};

// Load ad data for editing
const loadAdData = async () => {
  if (!props.ad) return;

  // First populate with the data we have
  populateForm(props.ad);

  // Find and set the selected placement
  if (form.value.placementId && placements.value.length > 0) {
    selectedPlacement.value = placements.value.find(
        p => p.id === form.value.placementId
    );

    // Recalculate cost with the full placement data
    if (selectedPlacement.value) {
      calculateCost();
    }
  }

  // Load existing video URL for preview
  if (props.ad.video_url) {
    videoPreviewUrl.value = props.ad.video_url;
    form.value.videoUrl = props.ad.video_url;
  }

  // Load images if needed
  if (props.ad.imageIds && props.ad.imageIds.length > 0) {
    await fetchImages(props.ad.imageIds);
  } else if (!props.ad.hasAll) {
    // Fetch complete ad data if not already loaded
    await fetchCompleteAdData(props.ad.id);
  }
};

// Fetch complete ad data
const fetchCompleteAdData = async (adId) => {
  if (!adId) return;

  try {
    const response = await getAd(adId);
    const fullAd = response.data;

    // Re-populate with full data
    populateForm(fullAd);

    // Update selected placement
    if (form.value.placementId && placements.value.length > 0) {
      selectedPlacement.value = placements.value.find(
          p => p.id === form.value.placementId
      );
      calculateCost();
    }

    // Emit update with full data
    emits('update-ad', { ...fullAd, hasAll: true });
  } catch (error) {
    console.error('Error fetching complete ad data:', error);
  }
};

// Fetch images for the ad
const fetchImages = async (mediaIds) => {
  if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) {
    return;
  }

  isLoadingImages.value = true;

  try {
    const images = [];

    for (const mediaId of mediaIds) {
      // Edit form re-submits form.images on save, so persist base64 (not a
      // transient object URL) to preserve the existing ad image.
      const dataUrl = await getMediaDataUrl(mediaId);
      images.push(dataUrl);
    }

    form.value.images = images;
    // mediaIds is guaranteed non-empty here (guarded above) and the loop always
    // pushes one entry per id, so images always has at least one element.
    form.value.imageBase64 = images[0];
  } catch (error) {
    console.error('Error fetching images:', error);
  } finally {
    isLoadingImages.value = false;
  }
};

// Handle placement selection
const onPlacementSelect = () => {
  const placement = placements.value.find(p => p.id === form.value.placementId);
  if (placement) {
    calculateDates(placement);
    calculateCost();
  }
};

// Handle start date change - auto-calculate end date for 7-day duration
const handleStartDateChange = () => {
  // Auto-calculate end date (7 days from start)
  calculateEndDateFromStart(form.value.startTime);

  const error = validateDates();
  if (error) {
    Swal.fire({
      title: 'Invalid Dates',
      text: error,
      icon: 'warning',
      confirmButtonText: 'OK'
    });
    return;
  }
  calculateCost();
};

// Minimum start date (tomorrow)
const minStartDate = computed(() => getMinStartDate());

// Handle image update
const handleImageUpdate = (value) => {
  imageUpdated.value = value;

  if (isEdit.value && value && form.value.images.length > 0) {
    form.value.imageBase64 = form.value.images[0] || null;
  }
};

// Handle URL change
const handleUrlChange = () => {
  if (form.value.linkUrl) {
    form.value.linkUrl = formatUrl(form.value.linkUrl);
  }
};

// Extract YouTube video ID from various URL formats
// Supports: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID
const extractYouTubeId = (url) => {
  if (!url) return null;

  // YouTube Shorts: youtube.com/shorts/VIDEO_ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) return { id: shortsMatch[1], isShort: true };

  // Standard YouTube: youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) return { id: watchMatch[1], isShort: false };

  // Short URL: youtu.be/VIDEO_ID
  const shortUrlMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortUrlMatch) return { id: shortUrlMatch[1], isShort: false };

  // Embed URL: youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (embedMatch) return { id: embedMatch[1], isShort: false };

  return null;
};

// Get YouTube embed URL for iframe
const youtubeEmbedUrl = computed(() => {
  const result = extractYouTubeId(form.value.videoUrl);
  if (!result) return null;
  // Use shorts-style embed for shorts (autoplay, loop, mute)
  if (result.isShort) {
    return `https://www.youtube.com/embed/${result.id}?autoplay=0&loop=1&playlist=${result.id}&mute=1`;
  }
  return `https://www.youtube.com/embed/${result.id}`;
});

// Check if the video URL is a valid YouTube URL
const isYouTubeUrl = computed(() => {
  return extractYouTubeId(form.value.videoUrl) !== null;
});

// Check if the video URL is a YouTube Short
const isYouTubeShort = computed(() => {
  const result = extractYouTubeId(form.value.videoUrl);
  return result?.isShort || false;
});

// Remove video
const removeVideo = () => {
  if (videoPreviewUrl.value) {
    URL.revokeObjectURL(videoPreviewUrl.value);
  }
  videoPreviewUrl.value = null;
  form.value.videoBase64 = '';
  form.value.videoUrl = '';
  if (videoInputRef.value) {
    videoInputRef.value.value = '';
  }
};

// Handle media type change - clear the other media type
const handleMediaTypeChange = (type) => {
  mediaType.value = type;
  if (type === 'image') {
    // Clear video data
    removeVideo();
  } else {
    // Clear image data
    form.value.images = [];
    form.value.imageBase64 = '';
  }
};

// Remove image
const removeImage = () => {
  form.value.images = [];
  form.value.imageBase64 = '';
};

// @ModifiedByJunie 2025-12-10 - Add inline business creation
const handleCreateBusiness = async () => {
  if (!newBusinessForm.value.name?.trim()) {
    Swal.fire({
      title: 'Validation Error',
      text: 'Business name is required',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;
  }

  isCreatingBusiness.value = true;

  try {
    const response = await createBusiness({
      name: newBusinessForm.value.name.trim(),
      type: newBusinessForm.value.type,
      status: newBusinessForm.value.status,
    });

    const newBusiness = response.data;
    businesses.value.push(newBusiness);
    form.value.businessId = newBusiness.id;

    // Reset and close modal
    newBusinessForm.value = { name: '', type: 'business', status: 'active' };
    showNewBusinessModal.value = false;

    Swal.fire({
      title: 'Success!',
      text: 'Business created successfully',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  } catch (error) {
    console.error('Error creating business:', error);
    Swal.fire({
      title: 'Error',
      text: 'Failed to create business. Please try again.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  } finally {
    isCreatingBusiness.value = false;
  }
};

// @ModifiedByJunie 2025-12-10 - Add inline campaign creation
const handleCreateCampaign = async () => {
  if (!newCampaignForm.value.name?.trim()) {
    Swal.fire({
      title: 'Validation Error',
      text: 'Campaign name is required',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;
  }

  // Use current businessId if not specified in the campaign form
  const businessId = newCampaignForm.value.businessId || form.value.businessId;
  if (!businessId) {
    Swal.fire({
      title: 'Validation Error',
      text: 'Please select a business first',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;
  }

  isCreatingCampaign.value = true;

  try {
    // @ModifiedByJunie 2025-12-10 - Backend expects LocalDateTime format (ISO with time component)
    const startDate = dayjs().format('YYYY-MM-DDTHH:mm:ss');
    const endDate = dayjs().add(30, 'day').format('YYYY-MM-DDTHH:mm:ss');

    const response = await createCampaign({
      name: newCampaignForm.value.name.trim(),
      businessId: businessId,
      status: newCampaignForm.value.status,
      paymentStatus: newCampaignForm.value.paymentStatus,
      isRecurring: false,
      transactionRef: `AD-${Date.now()}`,
      startDate: startDate,
      endDate: endDate,
    });

    const newCampaign = response.data;
    campaigns.value.push(newCampaign);
    form.value.campaignId = newCampaign.id;

    // Reset and close modal
    newCampaignForm.value = { name: '', businessId: '', status: 'active', paymentStatus: 'pending' };
    showNewCampaignModal.value = false;

    Swal.fire({
      title: 'Success!',
      text: 'Campaign created successfully',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    Swal.fire({
      title: 'Error',
      text: 'Failed to create campaign. Please try again.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  } finally {
    isCreatingCampaign.value = false;
  }
};

// Save ad
const saveAd = async () => {
  if (!validateForm()) {
    const firstError = Object.values(validationErrors.value)[0];
    Swal.fire({
      title: 'Validation Error',
      text: firstError,
      icon: 'error',
      confirmButtonText: 'OK'
    });
    return;
  }

  isSubmitting.value = true;

  try {
    const payload = preparePayload(imageUpdated.value, isEdit.value);
    console.log('AdForm saveAd payload:', payload);
    console.log('AdForm form.value:', form.value);

    let response;
    if (isEdit.value) {
      response = await editAd(props.ad.id, payload);
      emits('update-ad', {
        ...response.data,
        image: { file: payload.images[0] || null },
        images: payload.images,
      });
    } else {
      response = await createAd(payload);
      emits('add-ad', {
        ...response.data,
        image: { file: payload.images[0] || null },
        images: payload.images,
      });
    }

    Swal.fire({
      title: 'Success!',
      text: `Ad ${isEdit.value ? 'updated' : 'created'} successfully!`,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });

    emits('close');
  } catch (error) {
    console.error('Failed to save ad:', error);
    console.error('Error response data:', error.response?.data);
    Swal.fire({
      title: 'Error',
      text: error.response?.data?.message || 'Failed to save ad. Please try again.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  } finally {
    isSubmitting.value = false;
  }
};

// Watchers
watch(() => props.ad, async (newAd) => {
  if (newAd && placements.value.length > 0) {
    await loadAdData();
  }
}, { immediate: false });

watch(() => form.value.linkUrl, handleUrlChange);

// @ModifiedByJunie 2025-12-10 - Clear campaign when business changes
watch(() => form.value.businessId, () => {
  form.value.campaignId = '';
});

// Lifecycle
onMounted(() => {
  initializeForm();
});
</script>

<template>
  <div class="card card-body">
    <!-- Header -->
    <div class="modal-header mb-4 p-2">
      <h3>{{ isEdit ? 'Edit Ad' : 'Create New Ad' }}</h3>
      <button
          v-if="!isSubmitting"
          type="button"
          class="btn-close"
          @click="$emit('close')"
      ></button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoadingData" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2">Loading form data...</p>
    </div>

    <!-- Form -->
    <form v-else @submit.prevent="saveAd">
      <!-- Title and Business -->
      <div class="row">
        <div class="mb-3 col">
          <label class="form-label">Title<span class="text-danger">*</span></label>
          <input
              v-model="form.title"
              class="form-control"
              :class="{ 'is-invalid': validationErrors.title }"
              required
          />
          <div class="invalid-feedback" v-if="validationErrors.title">
            {{ validationErrors.title }}
          </div>
        </div>

        <div class="mb-3 col">
          <label class="form-label">Business<span class="text-danger">*</span></label>
          <div class="input-group">
            <select
                v-model="form.businessId"
                class="form-select"
                :class="{ 'is-invalid': validationErrors.businessId }"
                required
            >
              <option disabled value="">-- Select Business --</option>
              <option
                  v-for="business in businesses"
                  :key="business.id"
                  :value="business.id"
              >
                {{ business.name }}
              </option>
            </select>
            <button
                type="button"
                class="btn btn-outline-primary"
                @click="showNewBusinessModal = true"
                title="Create New Business"
            >
              <i class="bi bi-plus-lg"></i>
            </button>
          </div>
          <div class="invalid-feedback d-block" v-if="validationErrors.businessId">
            {{ validationErrors.businessId }}
          </div>
        </div>
      </div>

      <!-- Campaign -->
      <div class="row">
        <div class="mb-3 col">
          <label class="form-label">Campaign<span class="text-danger">*</span></label>
          <div class="input-group">
            <select
                v-model="form.campaignId"
                class="form-select"
                :class="{ 'is-invalid': validationErrors.campaignId }"
                :disabled="!form.businessId"
                required
            >
              <option disabled value="">{{ form.businessId ? '-- Select Campaign --' : '-- Select Business First --' }}</option>
              <option
                  v-for="campaign in filteredCampaigns"
                  :key="campaign.id"
                  :value="campaign.id"
              >
                {{ campaign.name }}
              </option>
            </select>
            <button
                type="button"
                class="btn btn-outline-primary"
                @click="showNewCampaignModal = true"
                :disabled="!form.businessId"
                title="Create New Campaign"
            >
              <i class="bi bi-plus-lg"></i>
            </button>
          </div>
          <div class="invalid-feedback d-block" v-if="validationErrors.campaignId">
            {{ validationErrors.campaignId }}
          </div>
          <div class="form-text" v-if="form.businessId && filteredCampaigns.length === 0">
            No campaigns found for this business. Click + to create one.
          </div>
          <div class="form-text" v-else>
            Select the campaign this ad belongs to or click + to create a new one.
          </div>
        </div>
      </div>

      <!-- Description -->
      <div class="mb-3">
        <label class="form-label">Description<span class="text-danger">*</span></label>
        <textarea
            class="form-control"
            v-model="form.description"
            :class="{ 'is-invalid': validationErrors.description }"
            rows="3"
            placeholder="Enter description"
            required
        ></textarea>
        <div class="invalid-feedback" v-if="validationErrors.description">
          {{ validationErrors.description }}
        </div>
      </div>

      <!-- Media Type Selector -->
      <div class="mb-3">
        <label class="form-label">Ad Media<span class="text-danger">*</span></label>
        <div class="btn-group w-100 mb-3" role="group">
          <button
              type="button"
              class="btn"
              :class="mediaType === 'image' ? 'btn-primary' : 'btn-outline-primary'"
              @click="handleMediaTypeChange('image')"
          >
            <i class="bi bi-image me-2"></i>Image Ad
          </button>
          <button
              type="button"
              class="btn"
              :class="mediaType === 'video' ? 'btn-primary' : 'btn-outline-primary'"
              @click="handleMediaTypeChange('video')"
          >
            <i class="bi bi-camera-video me-2"></i>Video Ad
          </button>
        </div>

        <!-- Image Upload Section -->
        <div v-if="mediaType === 'image'">
          <div v-if="isLoadingImages" class="text-center p-3 border rounded">
            <div class="spinner-border spinner-border-sm" role="status">
              <span class="visually-hidden">Loading image...</span>
            </div>
            <p class="mt-2 mb-0 small">Loading image...</p>
          </div>
          <MultiImagePicker
              v-else
              v-model="form.images"
              :initialImages="form?.images"
              @edit="handleImageUpdate"
              :maxImages="1"
              :designHelp="true"
              aspectRatio="9:16"
          />
          <div class="form-text">
            Upload 1 image for your ad (9:16 aspect ratio recommended for mobile).
          </div>

          <!-- Image Preview -->
          <div v-if="form.images.length > 0" class="mt-3">
            <label class="form-label small text-muted">Preview:</label>
            <div class="media-preview-container">
              <img
                  :src="form.images[0]"
                  class="preview-media"
                  alt="Ad preview"
              />
            </div>
          </div>
        </div>

        <!-- Video Upload Section - YouTube URL Only -->
        <div v-if="mediaType === 'video'">
          <!-- YouTube URL Input -->
          <div class="mb-3">
            <label class="form-label">YouTube Video URL</label>
            <input
                v-model="form.videoUrl"
                class="form-control"
                :class="{ 'is-invalid': form.videoUrl && !isYouTubeUrl }"
                placeholder="https://www.youtube.com/watch?v=... or https://youtube.com/shorts/..."
            />
            <div class="invalid-feedback" v-if="form.videoUrl && !isYouTubeUrl">
              Please enter a valid YouTube URL
            </div>
            <div class="form-text">
              <i class="bi bi-info-circle me-1"></i>
              Supports: Regular videos (youtube.com/watch?v=...) and Shorts (youtube.com/shorts/...)
            </div>
          </div>

          <!-- YouTube Video Preview -->
          <div v-if="isYouTubeUrl" class="youtube-preview mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label mb-0">
                Preview
                <span v-if="isYouTubeShort" class="badge bg-danger ms-2">YouTube Short (9:16)</span>
                <span v-else class="badge bg-primary ms-2">YouTube Video (16:9)</span>
              </label>
              <button
                  type="button"
                  class="btn btn-sm btn-outline-danger"
                  @click="removeVideo"
              >
                <i class="bi bi-x"></i> Clear
              </button>
            </div>
            <div class="ratio" :class="isYouTubeShort ? 'youtube-short-ratio' : 'ratio-16x9'">
              <iframe
                  :src="youtubeEmbedUrl"
                  title="YouTube video preview"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
              ></iframe>
            </div>
          </div>

          <!-- Help Text -->
          <div class="alert alert-info small" v-if="!form.videoUrl">
            <strong>Tip:</strong> Use YouTube Shorts (9:16) for mobile ads - they display perfectly in the vertical feed!
          </div>
        </div>

        <div class="invalid-feedback d-block" v-if="validationErrors.media">
          {{ validationErrors.media }}
        </div>
      </div>

      <!-- Placement and URLs -->
      <div class="row">
        <div class="mb-3 col-md-6">
          <label class="form-label">Placement<span class="text-danger">*</span></label>
          <select
              v-model="form.placementId"
              class="form-select"
              :class="{ 'is-invalid': validationErrors.placementId }"
              required
              @change="onPlacementSelect"
          >
            <option disabled value="">-- Select Placement --</option>
            <option v-for="p in placements" :key="p.id" :value="p.id">
              {{ formatPlacement(p) }}
            </option>
          </select>
          <div class="invalid-feedback" v-if="validationErrors.placementId">
            {{ validationErrors.placementId }}
          </div>
        </div>

        <div class="mb-3 col-md-6">
          <label class="form-label">Click URL</label>
          <input
              v-model="form.linkUrl"
              class="form-control"
              :class="{ 'is-invalid': !isValidUrl && form.linkUrl }"
              placeholder="https://example.com"
          />
          <div class="invalid-feedback" v-if="!isValidUrl && form.linkUrl">
            Please enter a valid URL
          </div>
        </div>
      </div>

      <!-- Dates -->
      <div class="row">
        <div class="col mb-3">
          <label class="form-label">Start Date<span class="text-danger">*</span></label>
          <input
              type="date"
              v-model="form.startTime"
              class="form-control"
              :class="{ 'is-invalid': validationErrors.dates }"
              :min="minStartDate"
              @change="handleStartDateChange"
              required
          />
          <div class="form-text">Earliest start date is tomorrow.</div>
        </div>
        <div class="col mb-3">
          <label class="form-label">End Date<span class="text-danger">*</span></label>
          <input
              type="date"
              v-model="form.endTime"
              class="form-control"
              :class="{ 'is-invalid': validationErrors.dates }"
              readonly
              required
          />
          <div class="form-text">Auto-calculated: 7 days from start date.</div>
        </div>
      </div>
      <div class="invalid-feedback d-block" v-if="validationErrors.dates">
        {{ validationErrors.dates }}
      </div>

      <!-- Total Cost -->
      <div class="mb-3 col-md-6">
        <label class="form-label">Total Cost (ZAR)</label>
        <input
            type="text"
            class="form-control"
            :value="form.totalCost"
            readonly
        />
      </div>

      <!-- Payment Information -->
      <div class="card mb-4">
        <div class="card-header bg-light">
          <h5 class="mb-0">Payment Information</h5>
        </div>
        <div class="card-body">
          <!-- Payment Method -->
          <div class="mb-4">
            <label class="form-label">Payment Method</label>
            <div class="d-flex gap-3">
              <div class="form-check">
                <input
                    class="form-check-input"
                    type="radio"
                    id="paymentMethodPayfast"
                    value="payfast"
                    v-model="form.paymentMethod"
                />
                <label class="form-check-label" for="paymentMethodPayfast">
                  PayFast
                </label>
              </div>
              <div class="form-check">
                <input
                    class="form-check-input"
                    type="radio"
                    id="paymentMethodEFT"
                    value="eft"
                    v-model="form.paymentMethod"
                />
                <label class="form-check-label" for="paymentMethodEFT">
                  EFT Payment
                </label>
              </div>
            </div>
          </div>

          <!-- Payment Details -->
          <div class="row">
            <div class="mb-3 col-md-6">
              <label class="form-label">Amount</label>
              <input
                  v-model="form.paymentInfo.amount"
                  class="form-control"
                  required
                  :readonly="true"
              />
              <div class="form-text">Fixed price: R900 for 7 days.</div>
            </div>
            <div class="mb-3 col-md-6">
              <label class="form-label">Payment Status</label>
              <select v-model="form.paymentInfo.status" class="form-select">
                <option value="COMPLETE">COMPLETE</option>
                <option value="PENDING">PENDING</option>
                <option value="FAILED">FAILED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Payment Reference</label>
            <input
                v-model="form.paymentInfo.reference"
                class="form-control"
                placeholder="e.g., AD-12345"
                required
            />
          </div>
        </div>
      </div>

      <!-- Tags -->
      <div class="row mb-3">
        <TagSelector
            v-model="form.tags"
            title="Tags"
            :tags="tags"
            :searchable="false"
            :show-count="false"
            :show-actions="false"
            :show-selection-summary="false"
        />
      </div>

      <!-- Enabled Checkbox -->
      <div class="form-check mb-4">
        <input
            type="checkbox"
            class="form-check-input"
            v-model="form.enabled"
            id="enabled"
        />
        <label class="form-check-label" for="enabled">Enabled</label>
      </div>

      <!-- Actions -->
      <div class="d-flex justify-content-between modal-footer p-0 pt-2">
        <button
            type="button"
            class="btn btn-outline-secondary me-2"
            @click="$emit('close')"
            :disabled="isSubmitting"
        >
          Cancel
        </button>

        <button
            type="submit"
            class="btn btn-success"
            :disabled="isSubmitting || isLoadingData"
        >
          <span
              v-if="isSubmitting"
              class="spinner-border spinner-border-sm me-2"
              role="status"
              aria-hidden="true"
          ></span>
          <span v-else>{{ isEdit ? 'Update Ad' : 'Create Ad' }}</span>
        </button>
      </div>
    </form>

    <!-- New Business Modal -->
    <div v-if="showNewBusinessModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Create New Business</h5>
            <button type="button" class="btn-close" @click="showNewBusinessModal = false" :disabled="isCreatingBusiness"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Business Name<span class="text-danger">*</span></label>
              <input
                  v-model="newBusinessForm.name"
                  class="form-control"
                  placeholder="Enter business name"
                  :disabled="isCreatingBusiness"
              />
            </div>
            <div class="mb-3">
              <label class="form-label">Type</label>
              <select v-model="newBusinessForm.type" class="form-select" :disabled="isCreatingBusiness">
                <option value="business">Business</option>
                <option value="individual">Individual</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showNewBusinessModal = false" :disabled="isCreatingBusiness">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" @click="handleCreateBusiness" :disabled="isCreatingBusiness">
              <span v-if="isCreatingBusiness" class="spinner-border spinner-border-sm me-2" role="status"></span>
              {{ isCreatingBusiness ? 'Creating...' : 'Create Business' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- New Campaign Modal -->
    <div v-if="showNewCampaignModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Create New Campaign</h5>
            <button type="button" class="btn-close" @click="showNewCampaignModal = false" :disabled="isCreatingCampaign"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Campaign Name<span class="text-danger">*</span></label>
              <input
                  v-model="newCampaignForm.name"
                  class="form-control"
                  placeholder="Enter campaign name"
                  :disabled="isCreatingCampaign"
              />
            </div>
            <div class="mb-3">
              <label class="form-label">Business</label>
              <input
                  :value="businesses.find(b => b.id === form.businessId)?.name || 'Selected Business'"
                  class="form-control"
                  readonly
              />
              <div class="form-text">Campaign will be created for the selected business.</div>
            </div>
            <div class="mb-3">
              <label class="form-label">Payment Status</label>
              <select v-model="newCampaignForm.paymentStatus" class="form-select" :disabled="isCreatingCampaign">
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showNewCampaignModal = false" :disabled="isCreatingCampaign">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" @click="handleCreateCampaign" :disabled="isCreatingCampaign">
              <span v-if="isCreatingCampaign" class="spinner-border spinner-border-sm me-2" role="status"></span>
              {{ isCreatingCampaign ? 'Creating...' : 'Create Campaign' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-label {
  font-weight: 500;
}

.text-danger {
  margin-left: 2px;
}

textarea {
  resize: vertical;
}

.invalid-feedback {
  display: block;
}

.is-invalid {
  border-color: #dc3545;
}

/* YouTube Video Styles */
.youtube-preview {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1rem;
  background: #f8f9fa;
}

/* Custom ratio for YouTube Shorts (9:16) */
.youtube-short-ratio {
  --bs-aspect-ratio: 177.78%; /* 16/9 * 100 = 177.78% for 9:16 */
  position: relative;
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
}

.youtube-short-ratio::before {
  display: block;
  padding-top: var(--bs-aspect-ratio);
  content: "";
}

.youtube-short-ratio > iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 8px;
}

.media-preview-container {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  max-width: 280px;
}

.preview-media {
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  display: block;
}
</style>