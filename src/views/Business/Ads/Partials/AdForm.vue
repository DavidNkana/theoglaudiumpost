<script setup>
import { ref, onMounted, watch } from "vue";
import { createAd, editAd, getPlacements } from "@/features/ads/AdsService";
import { getCampaigns } from "@/features/businesses/BusinessesService";
import ImagePicker from "@/components/ImagePicker.vue";
// import TagSelector from "@/components/TagSelector.vue";
// import { getTags } from "@/features/tags/TagsService";

import dayjs from "dayjs";

const props = defineProps({
  ad: {
    type: Object,
  },
});

const emits = defineEmits(["close", "update-ad", "add-ad"]);

const isEdit = ref(props.ad != null);
const isSubmitting = ref(false);
const imageUpdated = ref(false);
const selectedPlacement = ref(null);

const initialData = {
  title: "",
  description: "",
  campaignId: "",
  imageUrl: "",
  imageBase64: "",
  linkUrl: "",
  placementId: "",
  startTime: "",
  endTime: "",
  enabled: true,
  // tags: [],
  file: "",
  totalCost: 0,
};

const form = ref(initialData);

const placements = ref([]);
// const campaigns = ref([]);
// const tags = ref([]);

onMounted(async () => {
  // Get available placements
  const { data: placementsData } = await getPlacements();
  console.log(props.ad);
  // Restrict to a single placement: Main Page Add (mobile portrait 9:16) with fixed fee R900 per day
  const fetched = placementsData || [];
  const basePlacement = fetched.length > 0 ? fetched[0] : {
    id: 'main_page_ad',
    location: 'main_page_ad',
    fee_type: 'FIXED',
    billing_unit: 'DAY',
  };
  const mainPlacement = {
    ...basePlacement,
    location: 'main_page_ad',
    name: 'Main Page Add',
    aspect_ratio: '9:16',
    fee_type: 'FIXED',
    fee: 900,
    billing_unit: 'WEEK',
  };
  placements.value = [mainPlacement];
  // Preselect and set default dates and price
  form.value.placementId = mainPlacement.id;
  selectedPlacement.value = mainPlacement;
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const end = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 6);
  form.value.startTime = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}T00:00`;
  form.value.endTime = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}T23:59`;
  form.value.totalCost = (900).toFixed(2);
  form.value.enabled = true;
  // (A paymentInfo default was initialised here, but `paymentInfo` is never read by the
  // template, saveAd payload, or watcher, so it had no observable effect and was removed.)
  // campaigns.value = res.data;

  // const response = await getTags();
  // tags.value = response.data;

  form.value = initialData;

  isEdit.value = props.ad != null;
  if (isEdit.value) {
    const _ad = props.ad;

    form.value = {
      title: _ad.title,
      description: _ad.description,
      totalCost: _ad.total_cost,
      campaignId: _ad.campaign_id ?? 1,
      imageUrl: _ad.image_url,
      linkUrl: _ad.click_url,
      videoUrl: _ad.video_url,
      placementId: _ad.placement_id,
      imageBase64: _ad.image?.file,
      startTime: _ad.placement_date?.slice(0, 16), // format for datetime-local input
      endTime: _ad.expiry_date?.slice(0, 16),
      enabled: _ad.status == "active",
      // tags: _ad.tags?.map((tag) => tag.id),
    };
    onPlacementSelect();
  } else {
    form.value = initialData;
  }
});

// watch(
//   () => form.value.imageBase64,
//   (newImage) => {
//     console.log(newImage);
//     if (isEdit.value) {
//       imageUpdated.value = true;
//     }
//   }
// );

watch(
  () => props.ad,
  (newProps) => {
    // console.log("newProps :", newProps);
    isEdit.value = newProps != null;
    form.value = initialData;
    if (isEdit.value) {
      const _ad = newProps;
      form.value = {
        title: _ad.title,
        description: _ad.description,
        totalCost: _ad.total_cost,
        campaignId: _ad.campaign_id ?? 1,
        imageUrl: _ad.image_url,
        linkUrl: _ad.click_url,
        videoUrl: _ad.video_url,
        placementId: _ad.placement_id,
        imageBase64: _ad.image?.file,
        startTime: _ad.placement_date?.slice(0, 16), // format for datetime-local input
        endTime: _ad.expiry_date?.slice(0, 16),
        enabled: _ad.status == "active",
        // tags: _ad.tags?.map((tag) => tag.id),
      };
      onPlacementSelect();
    } else {
      form.value = initialData;
    }
  }
);

const updateIsUpdate = (value) => {
  // console.log(value);
  imageUpdated.value = value;
};

const onPlacementSelect = () => {
  selectedPlacement.value = placements.value.find(
    (p) => p.id === form.value.placementId
  );
  const today = dayjs();

  let endDate;
  if (selectedPlacement.value.billing_unit === "MONTH") {
    // endDate = today.add(1, "month").subtract(1, "day");
    endDate = today.add(1, "month");
  } else if (selectedPlacement.value.billing_unit === "WEEK") {
    endDate = today.add(6, "day"); // 7-day range
  } else {
    endDate = today; // one-day ad
  }

  form.value.startTime = today.format("YYYY-MM-DDTHH:mm");
  form.value.endTime = endDate.format("YYYY-MM-DDTHH:mm");
  calculateCost();
};

const validateAndRecalculate = () => {
  const start = dayjs(form.value.startTime);
  const end = dayjs(form.value.endTime);

  if ((start.isValid() && !end.isValid()) || end.isBefore(start)) {
    alert("End date must be after start date.");
    form.value.endTime = "";
    return;
  }

  // if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
  //   alert("End date must be after start date.");

  // }

  calculateCost();
};

const calculateCost = () => {
  const start = dayjs(form.value.startTime);
  const end = dayjs(form.value.endTime);
  const placement = selectedPlacement.value;

  if (!placement) return;

  const days = end.diff(start, "day") + 1;

  if (placement.fee_type === "FIXED") {
    const unit = placement.billing_unit;
    let multiplier = 1;

    if (unit === "DAY") {
      multiplier = days;
    } else if (unit === "WEEK") {
      multiplier = Math.ceil(days / 7);
    } else if (unit === "MONTH") {
      // console.log("days: ", days);
      // console.log("x: ", Math.ceil((days - 1) / 30));
      multiplier = Math.ceil((days - 1) / 30); // approx monthly blocks
    }

    form.value.totalCost = (Number(placement.fee) * multiplier).toFixed(2);
  }
};

const formatPlacement = (p) => {
  return `${p.location.replace(/_/g, " ").toUpperCase()} (${p.width}x${p.height}) - $${p.fee}/${p.billing_unit}`;
};

const saveAd = async () => {
  const data = form.value;
  const base64 = !isEdit.value
    ? data.imageBase64
    : imageUpdated.value
      ? (data.imageBase64 ?? null)
      : null;

  const payload = {
    campaign_id: data.campaignId,
    placement_id: data.placementId,
    title: data.title,
    description: data.description,
    total_cost: data.totalCost,
    placement_info: formatPlacement(selectedPlacement.value),
    imageUrl: data.imageUrl,
    videoUrl: data.videoUrl,
    type: selectedPlacement.value.location,
    status: props.ad.status,
    // data.enabled ? "active" : "pending",
    clickUrl: data.linkUrl,
    placementDate: data.startTime,
    expiryDate: data.endTime,
    imageBase64: base64,
    // tags: data.tags,
  };

  // console.log(isEdit.value);
  // console.log(imageUpdated.value);
  // console.log(
  //   !isEdit.value
  //     ? data.imageBase64
  //     : imageUpdated.value
  //       ? (data.imageBase64 ?? null)
  //       : null
  // );
  // console.log(payload);
  // return;
  try {
    isSubmitting.value = true;
    if (isEdit.value) {
      const response = await editAd(props.ad.id, payload);
      emits("update-ad", {
        ...response.data,
        // tags: data.tags,
        image: {
          file: data.imageBase64,
        },
      });
    } else {
      const response = await createAd(payload);
      emits("add-ad", {
        ...response.data,
        // tags: data.tags,
        image: {
          file: data.imageBase64,
        },
      });
    }
    emits("close");
  } catch (error) {
    console.error("Failed to save ad", error);
    alert("There was an error saving the ad.");
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <form @submit.prevent="saveAd" class="card card-body">
    <div class="modal-header mb-4 p-2">
      <h3 class="">
        {{ isEdit ? "Edit Ad" : "Create New Ad" }}
      </h3>
      <button
        v-if="!isSubmitting"
        type="button"
        class="btn-close"
        @click="$emit('close')"
      ></button>
    </div>

    <div class="row">
      <div class="mb-3 col">
        <label class="form-label">Title</label>
        <input v-model="form.title" class="form-control" required />
      </div>

      <!-- <div class="mb-3 col">
        <label class="form-label">Campaign</label>
        <select v-model="form.campaignId" class="form-select" required>
          <option disabled value="">-- Select Campaign --</option>
          <option
            v-for="campaign in campaigns"
            :key="campaign.id"
            :value="campaign.id"
          >
            {{ campaign.name }} - {{ campaign.business?.name }}
          </option>
        </select>
      </div> -->
    </div>
    <div class="mb-3">
      <label for="description" class="form-label"> Description </label>
      <div>
        <textarea
          class="form-control"
          id="description"
          v-model="form.description"
          placeholder="Enter description"
          required
        ></textarea>
      </div>
    </div>
    <div class="mb-3" :class="[form.imageBase64 ? '' : 'col-md-6']">
      <label class="form-label">Image</label>
      <ImagePicker
        v-model="form.imageBase64"
        :initialImage="form.imageBase64"
        @edit="updateIsUpdate"
        :designHelp="true"
        aspectRatio="9:16"
      />
      <!-- <input v-model="form.imageUrl" class="form-control" required /> -->
    </div>
    <div class="row">
      <div class="mb-3 col-md-6">
        <label class="form-label">Placement</label>
        <select
          v-model="form.placementId"
          class="form-select"
          required
          :disabled="ad?.status == 'active'"
          :readonly="ad?.status == 'active'"
          @change="onPlacementSelect"
        >
          <option disabled value="">-- Select Placement --</option>
          <option v-for="p in placements" :key="p.id" :value="p.id">
            {{ formatPlacement(p) }}
          </option>
        </select>
      </div>
      <div class="mb-3 col-md-6">
        <label class="form-label">Click URL</label>
        <input v-model="form.linkUrl" class="form-control" />
      </div>
      <!-- <div class="mb-3 col-md-6">
        <label class="form-label">Video URL</label>
        <input v-model="form.videoUrl" class="form-control" required />
      </div> -->
    </div>
    <div class="row">
      <div class="col mb-3">
        <label class="form-label">Start Time</label>
        <input
          type="datetime-local"
          v-model="form.startTime"
          class="form-control"
          @change="validateAndRecalculate"
          :disabled="ad?.status == 'active'"
          :readonly="ad?.status == 'active'"
        />
      </div>
      <div class="col mb-3">
        <label class="form-label">End Time</label>
        <input
          type="datetime-local"
          v-model="form.endTime"
          class="form-control"
          @change="validateAndRecalculate"
          :disabled="ad?.status == 'active'"
          :readonly="ad?.status == 'active'"
        />
      </div>
    </div>
    <div class="mb-3 col-md-6">
      <label class="form-label">Total Cost (ZAR)</label>
      <input
        type="text"
        class="form-control"
        :value="form.totalCost"
        disabled
        readonly
      />
    </div>

    <!-- <div class="row mb-3">
      <TagSelector
        v-model="form.tags"
        title="Tags"
        :tags="tags"
        :searchable="false"
        :show-count="false"
        :show-actions="false"
        :show-selection-summary="false"
      />
    </div> -->

    <!-- <div class="form-check mb-4" v-if="ad?.status !== 'active'">
      <input
        type="checkbox"
        class="form-check-input"
        v-model="form.enabled"
        id="enabled"
      />
      <label class="form-check-label" for="enabled">Enabled</label>
    </div> -->

    <div class="d-flex justify-content-between modal-footer p-0 pt-2">
      <button
        type="button"
        class="btn btn-outline-secondary me-2"
        @click="$emit('close')"
      >
        Cancel
      </button>

      <button class="btn btn-success" :disabled="isSubmitting">
        <span
          v-if="isSubmitting"
          class="spinner-border spinner-border-sm me-2"
          role="status"
          aria-hidden="true"
        ></span>
        <span v-else> {{ isEdit ? "Update Ad" : "Create Ad" }}</span>
      </button>
    </div>
  </form>
</template>
