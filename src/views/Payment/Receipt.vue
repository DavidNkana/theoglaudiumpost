<template>
  <div class="container-fluid py-4">
    <!-- Header Actions -->
    <div class="row mb-4">
      <div class="col-md-6">
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item">
              <router-link to="/dashboard" class="text-decoration-none"
                >Dashboard</router-link
              >
            </li>
            <li class="breadcrumb-item">
              <router-link to="/payments" class="text-decoration-none"
                >Payments</router-link
              >
            </li>
            <li class="breadcrumb-item active" aria-current="page">
              Invoice Details
            </li>
          </ol>
        </nav>
      </div>
      <div class="col-md-6 text-end">
        <div class="btn-group" role="group">
          <button
            @click="printInvoice"
            class="btn btn-outline-primary"
            :disabled="loading"
          >
            <i class="bi bi-printer me-2"></i>
            Print Invoice
          </button>
          <button
            @click="downloadPDF"
            class="btn btn-primary"
            :disabled="loading"
          >
            <i class="bi bi-download me-2"></i>
            Download PDF
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div
        class="spinner-border text-primary"
        style="width: 3rem; height: 3rem"
        role="status"
      >
        <span class="visually-hidden">Loading invoice...</span>
      </div>
      <p class="mt-3 text-muted">Loading payment details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="alert alert-danger" role="alert">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      <strong>Error:</strong> {{ error }}
      <button
        @click="fetchPaymentDetails"
        class="btn btn-outline-danger btn-sm ms-3"
      >
        <i class="bi bi-arrow-clockwise me-1"></i>
        Retry
      </button>
    </div>

    <!-- Invoice Content -->
    <div v-else-if="paymentDetails" id="invoice-content">
      <!-- Invoice Card -->
      <div class="card border-0 shadow-sm">
        <div class="card-body p-0">
          <!-- Invoice Header -->
          <div class="invoice-header bg-primary text-white p-4">
            <div class="row align-items-center">
              <div class="col-md-6">
                <h1 class="h3 mb-0 fw-bold">INVOICE</h1>
                <p class="mb-0 opacity-75">Payment Receipt & Details</p>
              </div>
              <div class="col-md-6 text-md-end">
                <div class="company-logo">
                  <h2 class="h4 mb-1 fw-bold">{{ companyInfo.name }}</h2>
                  <p class="mb-0 small opacity-75">{{ companyInfo.tagline }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Invoice Info Section -->
          <div class="p-4 bg-light border-bottom">
            <div class="row">
              <div class="col-md-3">
                <h6 class="text-muted mb-2">Invoice Number</h6>
                <p class="fw-bold mb-0">INV-{{ paymentDetails.payment_id }}</p>
              </div>
              <div class="col-md-3">
                <h6 class="text-muted mb-2">Invoice Date</h6>
                <p class="fw-bold mb-0">
                  {{ formatDate(paymentDetails.created_at) }}
                </p>
              </div>
              <div class="col-md-3">
                <h6 class="text-muted mb-2">Payment Status</h6>
                <span
                  class="badge"
                  :class="getStatusBadgeClass(paymentDetails.status)"
                >
                  {{ paymentDetails.status || "Completed" }}
                </span>
              </div>
              <div class="col-md-3">
                <h6 class="text-muted mb-2">Payment Method</h6>
                <p class="fw-bold mb-0">
                  <i class="bi bi-credit-card me-1"></i>
                  {{ paymentDetails.payment_method || "PayFast" }}
                </p>
              </div>
            </div>
          </div>

          <!-- Bill To / Company Info -->
          <div class="p-4 border-bottom">
            <div class="row">
              <div class="col-md-6">
                <h6 class="text-primary mb-3">
                  <i class="bi bi-building me-2"></i>
                  Company Details
                </h6>
                <address class="mb-0">
                  <strong>{{ companyInfo.name }}</strong
                  ><br />
                  {{ companyInfo.address.line1 }}<br />
                  <span v-if="companyInfo.address.line2"
                    >{{ companyInfo.address.line2 }}<br
                  /></span>
                  {{ companyInfo.address.city }},
                  {{ companyInfo.address.country }}<br />
                  <strong>Email:</strong> {{ companyInfo.email }}<br />
                  <strong>Phone:</strong> {{ companyInfo.phone }}
                </address>
              </div>
              <div class="col-md-6">
                <h6 class="text-primary mb-3">
                  <i class="bi bi-person me-2"></i>
                  Customer Details
                </h6>
                <address class="mb-0">
                  <strong>{{ paymentDetails.customer_name || "N/A" }}</strong
                  ><br />
                  <strong>Email:</strong>
                  {{ paymentDetails.customer_email || "N/A" }}<br />
                  <strong>Customer ID:</strong>
                  {{ paymentDetails.customer_id || "N/A" }}
                </address>
              </div>
            </div>
          </div>

          <!-- Transaction Details -->
          <div class="p-4 border-bottom">
            <h6 class="text-primary mb-3">
              <i class="bi bi-receipt me-2"></i>
              Transaction Information
            </h6>
            <div class="row g-3">
              <div class="col-md-4">
                <div class="detail-item">
                  <small class="text-muted">Payment ID</small>
                  <p class="fw-medium mb-0 font-monospace">
                    {{ paymentDetails.payment_id }}
                  </p>
                </div>
              </div>
              <div class="col-md-4" v-if="paymentDetails.transaction_id">
                <div class="detail-item">
                  <small class="text-muted">Transaction ID</small>
                  <p class="fw-medium mb-0 font-monospace">
                    {{ paymentDetails.transaction_id }}
                  </p>
                </div>
              </div>
              <div class="col-md-4" v-if="paymentDetails.pf_payment_id">
                <div class="detail-item">
                  <small class="text-muted">PayFast ID</small>
                  <p class="fw-medium mb-0 font-monospace">
                    {{ paymentDetails.pf_payment_id }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Service Details Table -->
          <div class="p-4">
            <h6 class="text-primary mb-3">
              <i class="bi bi-list-check me-2"></i>
              Service Details
            </h6>
            <div class="table-responsive">
              <table class="table table-borderless">
                <thead class="table-light">
                  <tr>
                    <th scope="col" class="border-0">Description</th>
                    <th scope="col" class="border-0 text-center">Duration</th>
                    <th scope="col" class="border-0 text-center">Start Date</th>
                    <th scope="col" class="border-0 text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="py-3">
                      <div>
                        <h6 class="mb-1">
                          {{
                            paymentDetails.ad_title ||
                            paymentDetails.item_name ||
                            "Ad Campaign"
                          }}
                        </h6>
                        <small class="text-muted">
                          {{
                            paymentDetails.item_description ||
                            "Digital advertising campaign purchase"
                          }}
                        </small>
                      </div>
                    </td>
                    <td class="py-3 text-center">
                      <span class="badge bg-info">
                        {{ paymentDetails.duration || "N/A" }}
                        <span v-if="paymentDetails.duration">days</span>
                      </span>
                    </td>
                    <td class="py-3 text-center">
                      {{
                        paymentDetails.start_date
                          ? formatDate(paymentDetails.start_date)
                          : "Immediate"
                      }}
                    </td>
                    <td class="py-3 text-end">
                      <strong class="h6 mb-0">{{
                        formatCurrency(paymentDetails.amount)
                      }}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Totals Section -->
          <div class="p-4 bg-light border-top">
            <div class="row justify-content-end">
              <div class="col-md-4">
                <table class="table table-borderless mb-0">
                  <tbody>
                    <tr>
                      <td class="text-end fw-medium">Subtotal:</td>
                      <td class="text-end">
                        {{ formatCurrency(paymentDetails.amount) }}
                      </td>
                    </tr>
                    <tr>
                      <td class="text-end fw-medium">Tax (0%):</td>
                      <td class="text-end">{{ formatCurrency(0) }}</td>
                    </tr>
                    <tr class="border-top">
                      <td class="text-end fw-bold h6">Total Paid:</td>
                      <td class="text-end fw-bold h5 text-success mb-0">
                        {{ formatCurrency(paymentDetails.amount) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="p-4 text-center border-top">
            <div class="row">
              <div class="col-12">
                <p class="text-muted mb-2">
                  <i class="bi bi-shield-check me-1 text-success"></i>
                  This is a computer-generated invoice and serves as proof of
                  payment.
                </p>
                <p class="text-muted small mb-0">
                  For any queries regarding this invoice, please contact us at
                  <a
                    :href="`mailto:${companyInfo.email}`"
                    class="text-decoration-none"
                    >{{ companyInfo.email }}</a
                  >
                  or call {{ companyInfo.phone }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Print Styles -->
    <!-- <style media="print"></style>  -->
  </div>
</template>

<script setup>
import { getPaymentStatus } from "@/features/payments/PayfastService";
import { getReceiptPdf } from "@/features/payments/PaymentsService";
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();

// Reactive data
const loading = ref(true);
const paymentDetails = ref(null);
const error = ref(null);

// Company information
const companyInfo = ref({
  name: "Your Company Name",
  tagline: "Digital Advertising Solutions",
  address: {
    line1: "123 Business Street",
    line2: "Suite 100",
    city: "Lusaka",
    country: "Zambia",
  },
  email: "support@yourcompany.com",
  phone: "+260 XXX XXX XXX",
});

// Fetch payment details on mount
onMounted(() => {
  fetchPaymentDetails();
});

// Fetch payment details from API
const fetchPaymentDetails = async () => {
  try {
    loading.value = true;
    error.value = null;

    const paymentId = route.params.id;
    if (!paymentId) {
      throw new Error("Payment ID is required");
    }
    const response = await getPaymentStatus(paymentId);

    if (response.status != 200) {
      if (response.status === 404) {
        throw new Error("Payment not found");
      } else if (response.status === 403) {
        throw new Error("Access denied");
      } else {
        throw new Error("Failed to load payment details");
      }
    }

    paymentDetails.value = await response.data;
  } catch (err) {
    console.error("Error fetching payment details:", err);
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

// Format currency for Zambian Kwacha
const formatCurrency = (amount) => {
  if (!amount) return "ZMW 0.00";
  const num = parseFloat(amount);
  return new Intl.NumberFormat("en-ZM", {
    style: "currency",
    currency: "ZMW",
    minimumFractionDigits: 2,
  }).format(num);
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-ZM", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

// Get status badge class
const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case "completed":
    case "success":
    case "paid":
      return "bg-success";
    case "pending":
      return "bg-warning";
    case "failed":
    case "cancelled":
      return "bg-danger";
    default:
      return "bg-secondary";
  }
};

// Print invoice
const printInvoice = () => {
  window.print();
};

// Download PDF
const downloadPDF = async () => {
  if (!paymentDetails.value) return;

  try {
    const response = await getReceiptPdf(paymentDetails.value.payment_id);

    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${paymentDetails.value.payment_id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error("Error downloading PDF:", err);
    alert("Unable to download PDF. Please try again later.");
  }
};
</script>

<style media="print" scoped>
.btn-group,
.breadcrumb,
.no-print {
  display: none !important;
}

.container-fluid {
  padding: 0 !important;
}

.card {
  border: none !important;
  box-shadow: none !important;
}

body {
  -webkit-print-color-adjust: exact !important;
  color-adjust: exact !important;
}

.bg-primary {
  background-color: #0d6efd !important;
}

.text-white {
  color: white !important;
}

.invoice-header {
  background: linear-gradient(135deg, #0d6efd, #0856d6) !important;
}

.company-logo h2 {
  font-family: "Arial Black", Arial, sans-serif;
}

.detail-item {
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #0d6efd;
}

.table th {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.875rem;
  letter-spacing: 0.5px;
}

.font-monospace {
  font-family: "Courier New", Courier, monospace;
  font-size: 0.9rem;
}

.card {
  border-radius: 12px;
}

.btn-group .btn {
  border-radius: 6px;
}

.btn-group .btn:first-child {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.btn-group .btn:last-child {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

@media (max-width: 768px) {
  .invoice-header .row {
    text-align: center;
  }

  .invoice-header .col-md-6:last-child {
    margin-top: 1rem;
  }

  .btn-group {
    width: 100%;
  }

  .btn-group .btn {
    flex: 1;
  }
}

/* Ensure proper printing */
@media print {
  .container-fluid {
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  .card {
    break-inside: avoid;
  }

  .invoice-header {
    -webkit-print-color-adjust: exact;
    color-adjust: exact;
  }
}
</style>
