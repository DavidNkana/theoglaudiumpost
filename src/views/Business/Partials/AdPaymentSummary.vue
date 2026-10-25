<template>
  <div class="ad-payment-summary">
    <h2 class="mb-4">Payment Summary</h2>
    <p class="lead mb-4">
      Review your advertisement details and proceed to payment
    </p>

    <div class="card shadow-lg mb-4">
      <div class="card-header bg-light">
        <h3 class="h5 mb-0">Order Details</h3>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-6">
            <h4 class="h6">Advertisement Information</h4>
            <ul class="list-unstyled">
              <li><strong>Title:</strong> {{ adContent.title }}</li>
              <li><strong>Description:</strong> {{ adContent.description }}</li>
              <li><strong>Target URL:</strong> {{ adContent.url }}</li>
              <li>
                <strong>Duration:</strong>
                {{ formatDate(adContent.startDate) }} to
                {{ formatDate(adContent.endDate) }}
              </li>
            </ul>
          </div>

          <div class="col-md-6">
            <h4 class="h6">Selected Slot</h4>
            <ul class="list-unstyled">
              <li><strong>Position:</strong> {{ selectedSlot.name }}</li>
              <li>
                <strong>Aspect Ratio:</strong>
                {{ selectedSlot.aspect_ratio || selectedSlot.aspectRatio }}
              </li>
              <li>
                <strong>Price:</strong> {{ selectedSlot.currency ?? "ZAR" }}
                {{ selectedSlot.price ?? selectedSlot.fee }}
              </li>
            </ul>
          </div>
        </div>

        <hr />

        <div class="row">
          <div class="col-md-6">
            <h4 class="h6">Ad Preview</h4>
            <div v-if="hasImages" class="border p-2">
              <div class="d-flex flex-wrap gap-2">
                <div
                  v-for="(image, index) in adContent.files"
                  :key="index"
                  class="preview-thumbnail"
                  @click="openImageModal(index)"
                >
                  <img
                    :src="image"
                    class="img-fluid"
                    :alt="`Ad Preview ${index + 1}`"
                    style="
                      cursor: pointer;
                      width: 80px;
                      height: 80px;
                      object-fit: cover;
                    "
                  />
                </div>
              </div>
              <div class="mt-2 text-center">
                <small class="text-muted"
                  >Click on an image to view larger</small
                >
              </div>
            </div>
            <div v-else class="text-muted">No preview available</div>
          </div>

          <div class="col-md-6">
            <div class="card bg-light">
              <div class="card-body">
                <h4 class="h6">Payment Details</h4>
                <!-- <div class="d-flex justify-content-between">
                  <span>Subtotal:</span>
                  <span
                    >{{ selectedSlot.currency ?? "ZAR" }}
                    {{ selectedSlot.price ?? selectedSlot.fee }}</span
                  >
                </div>
                <div class="d-flex justify-content-between">
                  <span>VAT (15%):</span>
                  <span
                    >{{ selectedSlot.currency ?? "ZAR" }}
                    {{ calculateVAT() }}</span
                  >
                </div>
                <hr /> -->
                <div class="d-flex justify-content-between fw-bold">
                  <span>Total:</span>
                  <span
                    >{{ selectedSlot.currency ?? "ZAR" }}
                    {{ calculateTotal() }}</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card shadow-l mb-4">
      <div class="card-header bg-light">
        <h3 class="h5 mb-0">Payment Method</h3>
      </div>
      <div class="card-body">
        <!-- Payment method selection -->
        <div class="mb-4">
          <div class="form-check form-check-inline">
            <input
              class="form-check-input"
              type="radio"
              name="paymentMethod"
              id="paymentMethodPayfast"
              value="payfast"
              v-model="paymentMethod"
            />
            <label class="form-check-label" for="paymentMethodPayfast">
              PayFast
            </label>
          </div>
          <div class="form-check form-check-inline">
            <input
              class="form-check-input"
              type="radio"
              name="paymentMethod"
              id="paymentMethodEFT"
              value="eft"
              v-model="paymentMethod"
            />
            <label class="form-check-label" for="paymentMethodEFT">
              EFT Payment
            </label>
          </div>
        </div>

        <!-- PayFast payment info -->
        <div v-if="paymentMethod === 'payfast'">
          <div class="alert alert-info">
            <i class="bi bi-info-circle"></i> You will be redirected to PayFast
            secure payment gateway to complete your payment.
          </div>

          <div class="text-center my-3">
            <img
              src="/images/Payfast.png"
              alt="PayFast"
              height="40"
              class="mx-2"
            />
            <span class="fs-4 mx-2">•••</span>
            <i class="bi bi-credit-card fs-4 mx-2"></i>
          </div>
        </div>

        <!-- EFT payment info -->
        <div v-if="paymentMethod === 'eft'" class="eft-payment-form">
          <div class="alert alert-info mb-4">
            <i class="bi bi-info-circle"></i> Please complete the EFT payment
            form below. You will receive banking details to make your payment.
          </div>

          <div class="mb-3">
            <label for="eftAmount" class="form-label"
              >Payment Amount (ZAR)</label
            >
            <input
              type="number"
              class="form-control"
              id="eftAmount"
              v-model="eftDetails.amount"
              :placeholder="calculateTotal()"
              disabled
              step="0.01"
              min="0"
            />
          </div>

          <div class="mb-3">
            <label for="eftReference" class="form-label"
              >Payment Reference</label
            >
            <input
              type="text"
              class="form-control"
              id="eftReference"
              v-model="eftDetails.reference"
              placeholder="e.g., Reference ID"
            />
          </div>

          <div class="card bg-light p-3 mb-3">
            <h6 class="card-title">Bank Account Details</h6>
            <p class="mb-1"><strong>Account Name:</strong> Laudium Post</p>
            <p class="mb-1"><strong>Bank:</strong> First National Bank</p>
            <p class="mb-1"><strong>Account Number:</strong> 123456789</p>
            <p class="mb-1"><strong>Branch Code:</strong> 250655</p>
            <p class="mb-1">
              <strong>Reference:</strong> AD-{{
                eftDetails.reference || "Your Name"
              }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state for payment processing -->
    <div v-if="isProcessingPayment" class="alert alert-warning text-center">
      <div class="spinner-border spinner-border-sm me-2" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      Processing your payment request...
    </div>

    <!-- Error state -->
    <div v-if="paymentError" class="alert alert-danger">
      <i class="bi bi-exclamation-triangle"></i>
      {{ paymentError }}
      <button
        type="button"
        class="btn btn-sm btn-outline-danger ms-2"
        @click="paymentError = null"
      >
        Dismiss
      </button>
    </div>

    <div class="form-check mb-4">
      <input
        class="form-check-input"
        type="checkbox"
        v-model="termsAccepted"
        id="termsCheck"
        required
      />
      <label class="form-check-label" for="termsCheck">
        I accept the
        <a href="#" @click.prevent="showTerms">Terms and Conditions</a> for
        advertising
      </label>
    </div>

    <div class="sticky-bottom-nav">
      <div class="d-flex justify-content-between py-3">
        <button
          type="button"
          class="btn btn-outline-secondary"
          @click="$emit('prev-step')"
        >
          <i class="bi bi-arrow-left"></i> Back to Ad Content
        </button>
        <button
          v-if="!isProcessingPayment"
          type="button"
          class="btn btn-success"
          :disabled="
            !termsAccepted || (paymentMethod === 'eft' && !isEftFormValid)
          "
          @click="proceedWithPayment"
        >
          Proceed to Payment <i class="bi bi-arrow-right"></i>
        </button>
      </div>
    </div>

    <!-- Terms and Conditions Modal -->
    <div
      class="modal fade"
      id="termsModal"
      tabindex="-1"
      aria-labelledby="termsModalLabel"
      aria-hidden="true"
      ref="termsModal"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="termsModalLabel">
              Advertising Terms and Conditions
            </h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            <h6>1. Advertisement Content</h6>
            <p>
              All advertisements must comply with our content policy and
              applicable laws. We reserve the right to refuse any advertisement
              that does not comply with our standards.
            </p>

            <h6>2. Payment and Cancellation</h6>
            <p>
              Payment must be made in full before advertisement is published.
              Cancellations after payment may be subject to a cancellation fee.
            </p>

            <h6>3. Advertisement Specifications</h6>
            <p>
              All advertisements must adhere to the specified dimensions and
              file formats. Non-compliant advertisements may be rejected or
              modified.
            </p>

            <h6>4. Publication Period</h6>
            <p>
              Advertisements will be published for the duration specified in the
              order. Extensions require additional payment.
            </p>

            <h6>5. Liability</h6>
            <p>
              We are not liable for any loss or damage arising from the
              publication of your advertisement.
            </p>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-success"
              data-bs-dismiss="modal"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Image Modal for Ad Preview -->
  <ImageModal
    :show="showImageModal"
    :images="adContent.files"
    :initialIndex="currentImageIndex"
    :imageAlt="adContent.title || 'Ad Preview'"
    @close="closeImageModal"
  />
</template>

<script>
import { Modal } from "bootstrap";
import ImageModal from "@/components/ImageModal.vue";
export default {
  name: "AdPaymentSummary",
  components: {
    ImageModal,
  },
  emits: ["prev-step", "proceed-to-payment"],
  props: {
    selectedSlot: {
      type: Object,
      required: true,
    },
    adContent: {
      type: Object,
      required: true,
    },
    isProcessingPayment: {
      type: Boolean,
      default: false,
    },
    paymentError: {
      required: false,
    },
  },
  data() {
    return {
      termsAccepted: false,
      modal: null,
      paymentMethod: "payfast",
      eftDetails: {
        amount: "",
        reference: "",
      },
      showImageModal: false,
      currentImageIndex: 0,
    };
  },
  watch: {
    paymentMethod(newVal, oldVal) {
      if (!newVal) return;

      if (newVal == "eft") {
        this.eftDetails.amount = this.calculateTotal();
      } else {
        this.eftDetails.amount = "";
      }
    },
  },
  mounted() {
    // Initialize Bootstrap modal if needed
    // In a real app, you would use the Bootstrap JS
    this.modal = new Modal(this.$refs.termsModal);
  },
  computed: {
    isEftFormValid() {
      return this.eftDetails.amount && this.eftDetails.reference;
    },
    hasImages() {
      return this.adContent.files && this.adContent.files.length > 0;
    },
  },
  methods: {
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-ZA");
    },
    calculateTotal() {
      const amount = this.selectedSlot.price ?? this.selectedSlot.fee;
      return amount.toFixed(2);
    },
    showTerms() {
      if (this.modal) {
        this.modal.show();
      } else {
        alert("Terms and Conditions modal would show here");
      }
    },
    proceedWithPayment() {
      // Add payment method to the event
      this.$emit("proceed-to-payment", {
        method: this.paymentMethod,
        eftDetails: this.paymentMethod === "eft" ? this.eftDetails : null,
      });
    },
    openImageModal(index = 0) {
      this.currentImageIndex = index;
      this.showImageModal = true;
    },
    closeImageModal() {
      this.showImageModal = false;
    },
  },
};
</script>

<style scoped>
.sticky-bottom-nav {
  position: sticky;
  bottom: 0;
  background-color: white;
  border-top: 1px solid #dee2e6;
  margin-top: 2rem;
  margin-left: -1rem;
  margin-right: -1rem;
  padding-left: 1rem;
  padding-right: 1rem;
  z-index: 1000;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}

.preview-thumbnail {
  transition: transform 0.2s;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  overflow: hidden;
}

.preview-thumbnail:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.border-primary {
  border-color: var(--primary) !important;
}

.btn-select {
  border: 1px solid var(--primary);
  color: #000;
}
.btn-select.active {
  background-color: var(--primary);
}
</style>
