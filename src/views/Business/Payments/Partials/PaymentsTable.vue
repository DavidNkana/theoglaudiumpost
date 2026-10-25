<script setup>
import { computed } from "vue";

const props = defineProps({
  payments: {
    type: Array,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  page: {
    type: Number,
    default: 0,
  },
  pageSize: {
    type: Number,
    default: 10,
  },
});

const emits = defineEmits(["handle-preview"]);

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(amount);
};

// Format date
const formatDate = (dateString) => {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Get status badge class
const getStatusBadgeClass = (status) => {
  const classes = {
    paid: "bg-success",
    completed: "bg-success",
    pending: "bg-warning",
    cancelled: "bg-danger",
    failed: "bg-danger",
    refunded: "bg-info",
  };

  return `badge ${classes[status.toLowerCase()] || "bg-secondary"}`;
};

// Get payment method display name
const getPaymentMethodDisplay = (method) => {
  const methods = {
    bank_transfer: "Bank Transfer",
    credit_card: "Credit Card",
    payfast: "PayFast",
    cash: "Cash",
    other: "Other",
  };

  return methods[method] || method;
};

// Calculate row number based on pagination
const getRowNumber = (index) => {
  return props.page * props.pageSize + index + 1;
};
</script>

<template>
  <div class="table-responsive">
    <table class="table table-striped table-hover">
      <thead>
        <tr>
          <th>#</th>
          <th>Reference</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Payment Date</th>
          <th>Payment Method</th>
          <th>Description</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="isLoading">
          <td colspan="8" class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading payments...</p>
          </td>
        </tr>
        <tr v-else-if="payments.length === 0">
          <td colspan="8" class="text-center py-4">
            <p class="mb-0">No payments found</p>
          </td>
        </tr>
        <tr v-for="(payment, index) in payments" :key="payment.id">
          <td>{{ getRowNumber(index) }}</td>
          <td>
            {{
              payment.payment_method == "eft"
                ? payment.eft_reference
                : payment.pf_payment_id
            }}
          </td>
          <td>{{ formatCurrency(payment.amount || payment.amount_gross) }}</td>
          <td>
            <span :class="getStatusBadgeClass(payment.status)">
              {{ payment.status }}
            </span>
          </td>
          <td>{{ formatDate(payment.payment_date || payment.created_at) }}</td>
          <td>{{ getPaymentMethodDisplay(payment.payment_method) }}</td>
          <td>{{ payment.description || "Advertisement payment" }}</td>
          <td>
            <button
              class="btn btn-sm btn-outline-primary"
              @click="$emit('handle-preview', payment.id)"
            >
              <i class="bi bi-eye"></i> View
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table th {
  font-weight: 600;
}

.table td {
  vertical-align: middle;
}

.shimmer {
  height: 16px;
  background: #f6f7f8;
  background-image: linear-gradient(
    to right,
    #f6f7f8 0%,
    #edeef1 20%,
    #f6f7f8 40%,
    #f6f7f8 100%
  );
  background-repeat: no-repeat;
  background-size: 800px 104px;
  position: relative;
  animation-duration: 1.5s;
  animation-fill-mode: forwards;
  animation-iteration-count: infinite;
  animation-name: shimmer;
  animation-timing-function: linear;
  border-radius: 4px;
}

.shimmer-badge {
  width: 70px;
  height: 20px;
  border-radius: 12px;
}

@keyframes shimmer {
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
}
</style>
