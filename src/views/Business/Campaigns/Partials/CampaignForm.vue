<template>
  <form @submit.prevent="submit" class="card card-body">
    <div class="modal-header mb-4 p-2">
      <h3 class="">
        {{ isEdit ? "Edit Campaign" : "Create New Campaign" }}
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
    </div>

    <div class="row">
      <div class="mb-3 col-md-6">
        <label class="form-label">Transaction#</label>
        <input v-model="form.transactionRef" class="form-control" required />
      </div>

      <div class="mb-3 col-md-6">
        <label class="form-label">Payment Status</label>
        <select v-model="form.paymentStatus" class="form-select" required>
          <option disabled value="">-- Select --</option>
          <option
            v-for="status in ['pending', 'paid', 'failed']"
            :key="status"
            :value="status"
            class="capitalize"
          >
            {{ status }}
          </option>
        </select>
      </div>
    </div>

    <div class="row mb-3">
      <div class="col">
        <label class="form-label">Start Date</label>
        <input type="date" v-model="form.startDate" class="form-control" />
      </div>
      <div class="col">
        <label class="form-label">End Date</label>
        <input type="date" v-model="form.endDate" class="form-control" />
      </div>
    </div>

    <div class="form-check mb-4">
      <input
        type="checkbox"
        class="form-check-input"
        v-model="form.isRecurring"
        id="enabled"
      />
      <label class="form-check-label" for="enabled">Recurring?</label>
    </div>

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
        <span v-else>{{ isEdit ? "Update Campaign" : "Create Campaign" }}</span>
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { createCampaign, editCampaign } from "@/features/ads/AdsService";
import { watch } from "vue";

const props = defineProps({
  businesses: {
    type: Array,
    default: [],
  },
  campaign: {
    type: Object,
  },
});

const emits = defineEmits(["close", "update-campaign", "add-campaign"]);

const isEdit = ref(props.campaign != null);
const isSubmitting = ref(false);

const initialData = {
  title: "",
  businessId: "",
  transactionRef: "",
  isRecurring: false,
  paymentStatus: "",
  status: "pending",
  startDate: "",
  endDate: "",
};

const form = ref(initialData);

onMounted(() => {
  // If editing, fetch the form
  // console.log(props.campaign);

  isEdit.value = props.campaign != null;
  if (isEdit.value) {
    const _campaign = props.campaign;
    // console.log(_campaign);
    form.value = {
      title: _campaign.name,
      businessId: _campaign.business_id,
      transactionRef: _campaign.transaction_ref,
      isRecurring: _campaign.is_recurring ?? false,
      paymentStatus: _campaign.payment_status ?? "pending",
      status: "active",
      startDate: _campaign.start_date?.split("T")[0],
      endDate: _campaign.end_date?.split("T")[0],
    };

    // console.log(form.value);
  } else {
    form.value = initialData;
  }
});

watch(
  () => props.campaign,
  (newProps) => {
    // console.log("newProps :", newProps);
    isEdit.value = newProps != null;

    if (isEdit.value) {
      const _campaign = newProps;
      form.value = {
        title: _campaign.name,
        businessId: _campaign.business_id,
        transactionRef: _campaign.transaction_ref,
        isRecurring: _campaign.is_recurring ?? false,
        paymentStatus: _campaign.payment_status ?? "pending",
        status: "active",
        startDate: _campaign.start_date?.split("T")[0],
        endDate: _campaign.end_date?.split("T")[0],
      };
    } else {
      form.value = initialData;
    }
  }
);

const submit = async () => {
  const data = form.value;
  const payload = {
    name: data.title,
    businessId: data.businessId,
    transactionRef: data.transactionRef,
    isRecurring: data.isRecurring ?? false,
    paymentStatus: data.paymentStatus ?? "pending",
    status: data.status,
    startDate: new Date(data.startDate),
    endDate: new Date(data.endDate),
  };
  try {
    isSubmitting.value = true;

    if (isEdit.value) {
      const response = await editCampaign(props.campaign.id, payload);
      emits("update-campaign", response.data);
    } else {
      const response = await createCampaign(payload);
      emits("add-campaign", response.data);
    }
    emits("close");
  } catch (error) {
    console.error("Failed to save campaign", error);
    alert("There was an error saving the campaign.");
  } finally {
    isSubmitting.value = false;
  }
};
</script>
