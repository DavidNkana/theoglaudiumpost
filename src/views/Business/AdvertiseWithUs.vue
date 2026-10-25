<script setup>
import {ref, onMounted, nextTick} from "vue";
import AdSlotSelection from "./Partials/AdSlotSelection.vue";
import AdContentUpload from "./Partials/AdContentUpload.vue";
import AdPaymentSummary from "./Partials/AdPaymentSummary.vue";
import AdConfirmation from "./Partials/AdConfirmation.vue";

import {getAdPlacements, createAd} from "@/features/ads/AdsService";
import {createPayment, getPayfastProcessUrl} from "@/features/payments/PayfastService";
import {devLog} from "@/utils/devLog";
import {useAuth} from "@/composables/useAuth";

const {isAuthenticated, user, hasRole} = useAuth();

const currentStep = ref(1);
const selectedSlot = ref(null);
const adContent = ref({
  file: null,
  files: [],
  title: "",
  description: "",
  url: "",
  startDate: "",
  endDate: "",
});
const loading = ref("");
const availableSlots = ref([]);
const orderNumber = ref(false);

const isProcessingPayment = ref(false);
const payFastForm = ref(null);
const paymentError = ref(null);
const payFastData = ref({});
const payFastUrl = getPayfastProcessUrl();
const selectedPaymentMethod = ref("payfast");
const eftPaymentDetails = ref(null);
const showEftConfirmation = ref(false);

onMounted(() => {
  fetchPlacements();
});

const fetchPlacements = async () => {
  if (loading.value) return;
  loading.value = true;

  try {
    const response = await getAdPlacements({});
    if (response.status != 200) {
      throw new Error("Unexpected Error");
    }

    availableSlots.value = response.data.placements;
    console.log(availableSlots.value);

    loading.value = false;
  } catch (error) {
    console.error("Error fetching adPlacements:", error);
    loading.value = false;
  }
};

const selectSlot = (slot) => {
  selectedSlot.value = slot;
};
const updateAdContent = (content) => {
  adContent.value = {...adContent.value, ...content};
};
const nextStep = () => {
  if (currentStep.value < 4) {
    currentStep.value++;
  }
};
const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
};

const formatPlacement = (p) => {
  return `${p.location.replace(/_/g, " ").toUpperCase()} ${p.aspect_ratio ? `(${p.aspect_ratio})` : ""} - $${p.fee}/${p.billing_unit}`;
};

const proceedToPayment = async (paymentDetails) => {
  isProcessingPayment.value = true;
  paymentError.value = null;

  // Store payment method and details
  selectedPaymentMethod.value = paymentDetails?.method || "payfast";
  eftPaymentDetails.value = paymentDetails?.eftDetails || null;

  try {
    const data = adContent.value;
    console.log("\n\ndata: ", data);

    if (!selectedSlot.value.id) throw new Error("Slot Not Selected");
    if (!user.value) {
      throw new Error("User Not Found");
    }

    const [firstName, lastName] = user.value.name?.split(" ");
    const email = user.value.email;

    // Create common payment request data
    const paymentRequest = {
      item_name: `Advertisement: ${data.title}`,
      item_description: `${selectedSlot.value.name} - ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`,
      amount_gross: calculateTotal(),
      amount_fee: calculateTotal(),
      user_id: user.value.id,
      business_id: user.value.businessId,
      email: data.email,
      customer_name: `${firstName} ${lastName}`,
      customer_email: email,
      status: "PENDING",
      ad_description: data.description,
      click_url: data.url,
      start_date: new Date(data.startDate),
      end_date: new Date(data.endDate),
      placement_id: selectedSlot.value.id,
      placement_info: formatPlacement(selectedSlot.value),
      images: data.files,
      image: data.file, // Keep for backward compatibility
      payment_method: selectedPaymentMethod.value,
    };

    // Handle different payment methods
    if (selectedPaymentMethod.value === "eft") {
      // For EFT payments, store the details and show confirmation
      const eftAmount = eftPaymentDetails.value.amount || calculateTotal();
      const eftReference = eftPaymentDetails.value.reference;

      // In a real application, you would save this information to your database
      console.log("EFT Payment Details:", {
        ...paymentRequest,
        eft_amount: eftAmount,
        eft_reference: eftReference,
      });
      const response = await createPayment({
        ...paymentRequest,
        eft_amount: eftAmount,
        eft_reference: eftReference,
      });
      devLog.info("\n\nEFT Payload", response.data);

      // Generate an order number
      orderNumber.value = response.data.paymentId;

      // Show EFT confirmation and move to next step
      showEftConfirmation.value = true;
      nextStep();
    } else {
      // For PayFast payments, proceed with the existing flow
      const response = await createPayment(paymentRequest);

      devLog.debug(response);
      if (response.status != 200) {
        throw new Error(response);
      }

      payFastData.value = response.data;

      devLog.info("\n\nPayFast Payload", payFastData.value);

      // Submit form to PayFast
      await nextTick();
      payFastForm.value.submit();
    }
  } catch (error) {
    devLog.error("Payment creation failed:", error);
    paymentError.value =
        error.message ||
        "An error occurred while processing your payment. Please try again.";
  } finally {
    isProcessingPayment.value = false;
  }
};

const calculateTotal = () => {
  if (!selectedSlot.value || !selectedSlot.value.price) return 0;
  return parseFloat(selectedSlot.value.price.toFixed(2));
};

// Format a date string
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-ZA");
};

// Exposed so navigation guards (step bounds) and the placement fetch can be
// exercised directly; these branches are otherwise unreachable through the UI.
defineExpose({fetchPlacements, nextStep, prevStep, currentStep, loading});
</script>

<template>
  <div class="container py-5 advertise-container">
    <div class="row justify-content-center">
      <div class="col-md-10">
        <h1 class="text-center mb-4">Advertise With Us</h1>

        <!-- Progress indicator -->
        <div class="step-progress-container mb-2">
          <div class="step-progress">
            <div
                class="step-item"
                :class="{ active: currentStep >= 1, completed: currentStep > 1 }"
            >
              <div class="step-circle">1</div>
              <div class="step-text">Select Slot</div>
            </div>
            <div
                class="step-item"
                :class="{ active: currentStep >= 2, completed: currentStep > 2 }"
            >
              <div class="step-circle">2</div>
              <div class="step-text">Upload Content</div>
            </div>
            <div
                class="step-item"
                :class="{ active: currentStep >= 3, completed: currentStep > 3 }"
            >
              <div class="step-circle">3</div>
              <div class="step-text">Payment</div>
            </div>
            <div
                class="step-item"
                :class="{ active: currentStep >= 4, completed: currentStep > 4 }"
            >
              <div class="step-circle">4</div>
              <div class="step-text">Confirmation</div>
            </div>
          </div>
        </div>

        <!-- Step content -->
        <div v-if="currentStep === 1">
          <AdSlotSelection
              :slots="availableSlots"
              :selectedSlot="selectedSlot"
              :loading="loading"
              @select-slot="selectSlot"
              @next-step="nextStep"
          />
        </div>

        <div v-else-if="currentStep === 2">
          <AdContentUpload
              :selectedSlot="selectedSlot"
              :adContent="adContent"
              @update-content="updateAdContent"
              @prev-step="prevStep"
              @next-step="nextStep"
          />
        </div>

        <div v-else-if="currentStep === 3">
          <AdPaymentSummary
              :selectedSlot="selectedSlot"
              :adContent="adContent"
              :is-processing-payment="isProcessingPayment"
              :payment-error="paymentError"
              @prev-step="prevStep"
              @proceed-to-payment="proceedToPayment"
          />

          <!-- Hidden form for PayFast submission -->
          <form
              ref="payFastForm"
              :action="payFastUrl"
              method="POST"
              target="_blank"
              style="display: none"
          >
            <input
                type="hidden"
                name="merchant_id"
                :value="payFastData.merchant_id"
            />
            <input
                type="hidden"
                name="merchant_key"
                :value="payFastData.merchant_key"
            />
            <input
                type="hidden"
                name="return_url"
                :value="payFastData.return_url"
            />
            <input
                type="hidden"
                name="cancel_url"
                :value="payFastData.cancel_url"
            />
            <input
                type="hidden"
                name="notify_url"
                :value="payFastData.notify_url"
            />
            <input
                type="hidden"
                name="name_first"
                :value="payFastData.name_first"
            />
            <input
                type="hidden"
                name="name_last"
                :value="payFastData.name_last"
            />
            <input
                type="hidden"
                name="email_address"
                :value="payFastData.email_address"
            />
            <input
                type="hidden"
                name="m_payment_id"
                :value="payFastData.m_payment_id"
            />
            <input type="hidden" name="amount" :value="payFastData.amount"/>
            <input
                type="hidden"
                name="item_name"
                :value="payFastData.item_name"
            />
            <input
                type="hidden"
                name="item_description"
                :value="payFastData.item_description"
            />
            <input
                type="hidden"
                name="signature"
                :value="payFastData.signature"
            />
          </form>
        </div>

        <div v-else-if="currentStep === 4">
          <AdConfirmation
              :orderNumber="orderNumber"
              :selectedSlot="selectedSlot"
              :paymentMethod="selectedPaymentMethod"
              :eftDetails="eftPaymentDetails"
              :showEftConfirmation="showEftConfirmation"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.step-progress-container {
  width: 100%;
  overflow-x: auto;
}

.step-progress {
  display: flex;
  justify-content: space-between;
  position: relative;
  margin-bottom: 10px;
  max-width: 100%;
  width: 100%;
}

.step-progress::before {
  content: "";
  background-color: #e0e0e0;
  position: absolute;
  top: 20px;
  left: 0;
  height: 4px;
  width: 100%;
  z-index: 1;
}

.step-item {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 80px;
}

.step-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #fff;
  border: 3px solid #e0e0e0;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.step-text {
  margin-top: 6px;
  font-size: 0.85rem;
  color: #555;
  text-align: center;
}

.step-item.active .step-circle {
  border-color: var(--secondary);
  color: var(--secondary);
}

.step-item.completed .step-circle {
  background-color: var(--secondary);
  border-color: var(--secondary);
  color: #fff;
}

.step-item.completed::after {
  content: "";
  position: absolute;
  top: 20px;
  left: 50%;
  height: 4px;
  width: 100%;
  background-color: var(--secondary);
  z-index: -1;
}

/* Make the progress indicator responsive */
@media (max-width: 768px) {
  .step-text {
    font-size: 0.7rem;
  }

  .step-circle {
    width: 30px;
    height: 30px;
  }

  .step-progress::before,
  .step-item.completed::after {
    top: 15px;
  }
}
  .advertise-container {
    background-color: green;
    color: white;
    border-radius: 8px;
  }
</style>
