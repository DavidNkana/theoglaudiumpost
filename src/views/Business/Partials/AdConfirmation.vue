<template>
  <div class="ad-confirmation py-2">
    <!-- PayFast Confirmation -->
    <div v-if="paymentMethod === 'payfast'" class="text-center">
      <div class="mb-4">
        <i class="bi bi-check-circle text-success" style="font-size: 5rem"></i>
      </div>

      <h2 class="mb-3">Payment Successful!</h2>
      <p class="lead">Thank you for advertising with Laudium Post.</p>
    </div>

    <!-- EFT Confirmation -->
    <div v-else-if="paymentMethod === 'eft'" class="text-center">
      <div class="mb-4">
        <i class="bi bi-info-circle text-warning" style="font-size: 5rem"></i>
      </div>

      <h2 class="mb-3">Order Received</h2>
      <p class="lead">
        Please complete your EFT payment to activate your advertisement.
      </p>
    </div>

    <!-- PayFast Order Details -->
    <div
      v-if="paymentMethod === 'payfast'"
      class="card shadow-lg my-2 mx-auto"
      style="max-width: 500px"
    >
      <div class="card-body">
        <h3 class="h5 card-title">Order Details</h3>
        <p class="card-text mb-1">
          <strong>Order Number:</strong> {{ orderNumber }}
        </p>
        <p class="card-text mb-1">
          <strong>Slot:</strong> {{ selectedSlot.name }}
        </p>
        <p class="card-text">
          <strong>Amount Paid:</strong> {{ selectedSlot.currency }}
          {{ calculateTotal() }}
        </p>

        <hr />

        <div class="text-start">
          <h4 class="h6">What happens next?</h4>
          <ul class="list-unstyled">
            <li>
              <i class="bi bi-envelope me-2"></i> You will receive a
              confirmation email shortly
            </li>
            <li>
              <i class="bi bi-calendar-check me-2"></i> Your ad will go live on
              your selected start date
            </li>
            <li>
              <i class="bi bi-file-earmark-bar-graph me-2"></i> You can track
              performance in your dashboard
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- EFT Order Details -->
    <div
      v-else-if="paymentMethod === 'eft'"
      class="card shadow-lg my-2 mx-auto"
      style="max-width: 500px"
    >
      <div class="card-body">
        <h3 class="h5 card-title">Order Details</h3>
        <p class="card-text mb-1">
          <strong>Order Number:</strong> {{ orderNumber }}
        </p>
        <p class="card-text mb-1">
          <strong>Slot:</strong> {{ selectedSlot.name }}
        </p>
        <p class="card-text mb-1">
          <strong>Amount Due:</strong> {{ selectedSlot.currency }}
          {{ eftDetails?.amount || calculateTotal() }}
        </p>

        <hr />

        <div class="text-start">
          <h4 class="h6">Payment Instructions</h4>
          <p>Please make payment to the following account:</p>
          <ul class="list-unstyled">
            <li><strong>Account Name:</strong> Laudium Post</li>
            <li><strong>Bank:</strong> First National Bank</li>
            <li><strong>Account Number:</strong> 123456789</li>
            <li><strong>Branch Code:</strong> 250655</li>
            <li>
              <strong>Reference:</strong> AD-{{
                eftDetails?.reference || orderNumber
              }}
            </li>
          </ul>

          <div class="alert alert-warning mt-3">
            <i class="bi bi-exclamation-triangle me-2"></i>
            Please use the correct reference when making your payment.
          </div>

          <h4 class="h6 mt-4">What happens next?</h4>
          <ul class="list-unstyled">
            <!-- <li>
              <i class="bi bi-envelope me-2"></i> You will receive a
              confirmation email with these payment details
            </li> -->
            <li>
              <i class="bi bi-credit-card me-2"></i> After we confirm your
              payment, your ad will be activated
            </li>
            <li>
              <i class="bi bi-calendar-check me-2"></i> Your ad will go live on
              the approved start date
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="d-flex justify-content-center gap-3 mt-4">
      <router-link to="dashboard" class="btn btn-outline-primary">
        <i class="bi bi-speedometer2"></i> Go to Dashboard
      </router-link>
      <router-link to="/" class="btn btn-success">
        <i class="bi bi-house"></i> Return to Homepage
      </router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: "AdConfirmation",
  props: {
    orderNumber: {
      type: String,
      required: true,
    },
    selectedSlot: {
      type: Object,
      required: true,
    },
    paymentMethod: {
      type: String,
      default: "payfast",
    },
    eftDetails: {
      type: Object,
      default: null,
    },
    showEftConfirmation: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    calculateTotal() {
      return (this.selectedSlot.price * 1.15).toFixed(2);
    },
  },
};
</script>
<style scoped>
.btn-outline-primary {
  border-color: var(--secondary);
  color: var(--secondary);
}
</style>
