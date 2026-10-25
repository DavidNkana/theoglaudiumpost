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

const emits = defineEmits(["handle-edit", "handle-delete"]);

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
    pending: "bg-warning",
    cancelled: "bg-danger",
    refunded: "bg-info",
  };

  return `badge ${classes[status] || "bg-secondary"}`;
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
          <th>Customer</th>
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
          <td>{{ formatCurrency(payment.amount_gross) }}</td>
          <td>
            <span :class="getStatusBadgeClass(payment.status)">
              {{ payment.status }}
            </span>
          </td>
          <td>{{ formatDate(payment.created_at) }}</td>
          <td>{{ getPaymentMethodDisplay(payment.payment_method) }}</td>
          <td>{{ payment.customer_name }}</td>
          <td>
            <div class="btn-group">
              <button
                class="btn btn-sm btn-outline-primary"
                @click="$emit('handle-edit', payment.id)"
              >
                <i class="bi bi-pencil"></i> Edit
              </button>
              <button
                class="btn btn-sm btn-outline-danger"
                @click="$emit('handle-delete', payment.id)"
              >
                <i class="bi bi-trash"></i> Delete
              </button>
            </div>
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
</style>
