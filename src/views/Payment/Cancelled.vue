<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getPaymentStatus } from "@/features/payments/PayfastService";

const route = useRoute();
const router = useRouter();
const paymentStatus = ref({
  status: "processing",
  message: "Processing your payment...",
  details: null,
});
const loading = ref(true);

onMounted(async () => {
  try {
    // Get the order ID from the query parameters
    // const orderId = route.query.m_payment_id;
    const orderId = route.params.id;

    if (!orderId) {
      paymentStatus.value = {
        status: "error",
        message: "Invalid payment reference. Please contact support.",
        details: null,
      };
      loading.value = false;
      return;
    }

    // Check payment status from the backend
    const response = await getPaymentStatus(orderId);

    if (response.status != 200) throw new Error("Payment Not Found");

    const status = response.data.status.toLowerCase();
    if (status === "complete") {
      router.push("/payment/success/" + orderId);
    } else if (status == "cancelled") {
      paymentStatus.value = {
        status: "cancelled",
        message: "Looks like you didn’t complete the payment.",
        details: response.data,
      };
    } else {
      paymentStatus.value = {
        status: "pending",
        message:
          "Your payment is being processed. We'll notify you once it's complete.",
        details: response.data,
      };
    }

    loading.value = false;
  } catch (error) {
    console.error("Error checking payment status:", error);
    paymentStatus.value = {
      status: "error",
      message:
        "There was an error processing your payment. Please contact support.",
      details: null,
    };
    loading.value = false;
  }
});

const goToDashboard = () => {
  router.push("/business/dashboard");
};

const goToAds = () => {
  router.push("/business/ads");
};
</script>

<template>
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-md-8">
        <div class="card shadow">
          <div class="card-body text-center p-5">
            <!-- Loading state -->
            <div v-if="loading" class="my-5">
              <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <h3>Processing your payment...</h3>
              <p class="text-muted">
                Please wait while we verify your payment.
              </p>
            </div>

            <!-- Success state -->
            <div
              v-else-if="paymentStatus.status?.toLowerCase() === 'cancelled'"
              class="my-5"
            >
              <div class="mb-4">
                <i
                  class="bi bi-check-circle-fill text-success"
                  style="font-size: 5rem"
                ></i>
              </div>
              <h2 class="text-success mb-3">Payment Cancelled!</h2>
              <p class="lead mb-4">
                Looks like you didn’t complete the payment.
              </p>

              <div class="d-flex justify-content-center gap-3 mt-4">
                <button @click="goToDashboard" class="btn btn-outline-primary">
                  Go to Dashboard
                </button>
                <button @click="goToAds" class="btn btn-primary">
                  View My Ads
                </button>
              </div>
            </div>

            <!-- Error state -->
            <div v-else class="my-5">
              <div class="mb-4">
                <i
                  class="bi bi-exclamation-circle-fill text-danger"
                  style="font-size: 5rem"
                ></i>
              </div>
              <h2 class="text-danger mb-3">Payment Error</h2>
              <p class="lead mb-4">{{ paymentStatus.message }}</p>

              <div class="d-flex justify-content-center gap-3 mt-4">
                <button @click="goToDashboard" class="btn btn-primary">
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  border-radius: 1rem;
  border: none;
}
</style>
