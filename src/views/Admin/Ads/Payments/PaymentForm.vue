<script setup>
import { ref, onMounted, watch } from "vue";
import { createPayment, updatePayment } from "@/features/payments/PaymentsService";
import { getBusinesses } from "@/features/businesses/BusinessesService";

const props = defineProps({
  payment: {
    type: Object,
    default: null,
  },
});

const emits = defineEmits(["close", "update-payment", "add-payment"]);

const isEdit = ref(props.payment != null);
const isSubmitting = ref(false);
const businesses = ref([]);
const loadingAds = ref(false);

const initialData = {
  reference: "",
  amount: 0,
  status: "PENDING",
  paymentDate: "",
  businessId: "",
  paymentMethod: "eft",
  customerName: "",
  customerEmail: "",
};

const form = ref({ ...initialData });

const fetchAds = async () => {
  loadingAds.value = true;
  try {
    const response = await getBusinesses({
      page: 0,
      size: 100, // Get a large number to populate dropdown
    });
    if (response.status === 200) {
      businesses.value = response.data.businesses;
    }
  } catch (error) {
    console.error("Error fetching ads:", error);
  } finally {
    loadingAds.value = false;
  }
};

onMounted(async () => {
  await fetchAds();

  form.value = { ...initialData };

  isEdit.value = props.payment != null;
  if (isEdit.value && props.payment) {
    const payment = props.payment;

    form.value = {
      reference:
        payment.payment_method == "eft"
          ? payment.eft_reference
          : payment.pf_payment_id,
      amount: payment.amount_gross || 0,
      status: payment.status || "PENDING",
      paymentDate: payment.created_date?.slice(0, 10) || "",
      businessId: payment.business_id || "",
      paymentMethod: payment.payment_method || "eft",
      customerName: payment.customer_name || "",
      customerEmail: payment.customer_email || "",
      customerPhone: payment.customer_phone || "",
    };
  }
});

watch(
  () => props.payment,
  (newPayment) => {
    isEdit.value = newPayment != null;
    console.log("Payment updated:", newPayment);

    if (isEdit.value && newPayment) {
      form.value = {
        reference:
          newPayment.payment_method == "eft"
            ? newPayment.eft_reference
            : newPayment.pf_payment_id,
        amount: newPayment.amount_gross || 0,
        status: newPayment.status || "PENDING",
        paymentDate: newPayment.created_date?.slice(0, 10) || "",
        businessId: newPayment.business_id || "",
        paymentMethod: newPayment.payment_method || "eft",
        customerName: newPayment.customer_name || "",
        customerEmail: newPayment.customer_email || "",
        customerPhone: newPayment.customer_phone || "",
      };
    } else {
      form.value = { ...initialData };
    }
  }
);

const savePayment = async () => {
  const data = {
    pf_payment_id:
      form.value.paymentMethod != "eft" ? form.value.reference : "",
    business_id: form.value.businessId,
    payment_method: form.value.paymentMethod,
    status: form.value.status,
    eft_reference:
      form.value.paymentMethod == "eft" ? form.value.reference : "",
    eft_amount: parseFloat(form.value.amount) || 0,
    amount_gross: parseFloat(form.value.amount) || 0,
    amount_fee: parseFloat(form.value.amount) || 0,
    amount_net: parseFloat(form.value.amount) || 0,
    currency: "ZAR",
    customer_email: form.value.customerEmail || "",
    customer_name: form.value.customerName || "",
    date: new Date(form.value.paymentDate),
  };

  try {
    isSubmitting.value = true;

    if (isEdit.value) {
      const response = await updatePayment(props.payment.id, data);
      emits("update-payment", response.data);
    } else {
      const response = await createPayment(data);
      emits("add-payment", response.data);
    }

    emits("close");
  } catch (error) {
    console.error("Failed to save payment", error);
    alert("There was an error saving the payment.");
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <form @submit.prevent="savePayment" class="card card-body">
    <div class="modal-header mb-4 p-2">
      <h3 class="">
        {{ isEdit ? "Edit Payment" : "Create New Payment" }}
      </h3>
      <button
        v-if="!isSubmitting"
        type="button"
        class="btn-close"
        @click="$emit('close')"
      ></button>
    </div>

    <div class="row">
      <div class="mb-3 col-md-6">
        <label class="form-label">Reference Number</label>
        <input
          v-model="form.reference"
          class="form-control"
          required
          placeholder="e.g., PAY-12345"
        />
      </div>
      <div class="mb-3 col-md-6">
        <label class="form-label">Amount (ZAR)</label>
        <input
          v-model="form.amount"
          type="number"
          step="0.01"
          min="0"
          class="form-control"
          required
        />
      </div>
    </div>

    <div class="row">
      <div class="mb-3 col-md-6">
        <label class="form-label">Status</label>
        <select v-model="form.status" class="form-select" required>
          <option value="PENDING">Pending</option>
          <option value="COMPLETE">Complete</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>
      <div class="mb-3 col-md-6">
        <label class="form-label">Payment Date</label>
        <input v-model="form.paymentDate" type="date" class="form-control" />
      </div>
    </div>

    <div class="row">
      <div class="mb-3 col-md-6">
        <label class="form-label">Related Business</label>
        <select v-model="form.businessId" class="form-select" required>
          <option disabled value="">-- Select Business --</option>
          <option
            v-for="business in businesses"
            :key="business.id"
            :value="business.id"
          >
            {{ business.name }}
          </option>
        </select>
        <div v-if="loadingAds" class="form-text">
          <div class="spinner-border spinner-border-sm" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          Loading...
        </div>
      </div>
      <div class="mb-3 col-md-6">
        <label class="form-label">Payment Method</label>
        <select v-model="form.paymentMethod" class="form-select" required>
          <option value="eft">EFT</option>
          <option value="payfast">PayFast</option>
        </select>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-header bg-light">
        <h5 class="mb-0">Customer Information</h5>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="mb-3 col-md-6">
            <label class="form-label">Customer Name</label>
            <input v-model="form.customerName" class="form-control" required />
          </div>
          <div class="mb-3 col-md-6">
            <label class="form-label">Customer Email</label>
            <input
              v-model="form.customerEmail"
              type="email"
              class="form-control"
            />
          </div>
        </div>
        <!-- <div class="mb-3">
          <label class="form-label">Customer Phone</label>
          <input v-model="form.customerPhone" class="form-control" />
        </div> -->
      </div>
    </div>

    <!-- <div class="mb-3">
      <label class="form-label">Notes</label>
      <textarea
        v-model="form.notes"
        class="form-control"
        rows="3"
        placeholder="Additional information about this payment"
      ></textarea>
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
        <span v-else> {{ isEdit ? "Update Payment" : "Create Payment" }}</span>
      </button>
    </div>
  </form>
</template>
