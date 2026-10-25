<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getPayments } from "@/features/businesses/BusinessesService";
import { Modal } from "bootstrap";
import { debounce } from "lodash";
import { useAuth } from "@/composables/useAuth";
import PaymentsTable from "./Partials/PaymentsTable.vue";

const route = useRoute();
const router = useRouter();
const { user } = useAuth();

const previewModal = ref(null);
let previewModalInstance = null;

const selectedPayment = ref(null);

// payments data
const payments = ref([]);
const loading = ref(false);

// Filters
const filters = ref({
  search: "",
  status: "",
});

// Pagination
const pagination = ref({
  current_page: 0,
  per_page: 10,
  last_page: 1,
  total: 0,
});

// Fetch payments based on filters
const fetchPayments = async () => {
  if (loading.value) return;
  loading.value = true;

  try {
    const response = await getPayments({
      businessId: user.value.businessId,
      page: pagination.value.current_page,
      search: filters.value.search,
      size: pagination.value.per_page,
      status: filters.value.status.toUpperCase(),
    });
    if (response.status != 200) {
      throw new Error("Unexpected Error");
    }
    payments.value = response.data.payments;
    pagination.value = {
      current_page: response.data.page,
      per_page: response.data.size,
      last_page: response.data.totalPages - 1,
      total: response.data.totalPages,
    };
    loading.value = false;
  } catch (error) {
    console.error("Error fetching payments:", error);
    loading.value = false;
  }
};

const debouncedFetchPayments = debounce(fetchPayments, 500); // 500ms delay

// Handle page change
const changePage = (page) => {
  if (page < 0 || page > pagination.value.last_page) {
    return;
  }

  pagination.value.current_page = page;
  fetchPayments();
};

// Get array of page numbers for pagination
const getPageNumbers = () => {
  const pages = [];
  const currentPage = pagination.value.current_page + 1; // Convert 0-based to 1-based for display
  const lastPage = pagination.value.total; // From backend

  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(lastPage, startPage + 4);

  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return pages;
};

// Apply filters
const applyFilters = () => {
  pagination.value.current_page = 0;
  fetchPayments();
};

const clearFilters = () => {
  filters.value = {
    search: "",
    status: "",
  };
  pagination.value.current_page = 0;
  fetchPayments();
};

const changeStatus = (status) => {
  filters.value.status = filters.value.status === status ? "" : status;
  fetchPayments();
};

const handlePreview = (id) => {
  selectedPayment.value = payments.value.find((el) => el.id == id);
  if (selectedPayment.value) {
    previewModalInstance?.show();
  }
};

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

watch(
  () => filters.value.search,
  () => {
    pagination.value.page = 0; // reset to first page on search
    debouncedFetchPayments();
  }
);

onMounted(() => {
  filters.value.search = route.query.search || "";
  filters.value.status = route.query.status || "";
  pagination.value.current_page = parseInt(route.query.page) || 0;
  pagination.value.per_page = parseInt(route.query.size) || 10;

  // Fetch initial data
  fetchPayments();

  // Initialize modals (the previewModal element is always rendered)
  previewModalInstance = new Modal(previewModal.value);
});

watch(
  [
    () => filters.value.search,
    () => filters.value.status,
    () => pagination.value.current_page,
    () => pagination.value.per_page,
  ],
  () => {
    router.replace({
      query: {
        search: filters.value.search || undefined,
        status: filters.value.status || undefined,
        page: pagination.value.current_page,
        size: pagination.value.per_page,
      },
    });
  }
);
</script>

<template>
  <div class="container-fluid py-4">
    <div class="row mb-4">
      <div class="col-12">
        <h2>Payment History</h2>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-body">
            <div class="mb-4">
              <div class="row align-items-center">
                <!-- Left-aligned filter elements -->
                <div class="col-12 col-lg-auto mb-3 mb-lg-0">
                  <input
                    type="text"
                    v-model="filters.search"
                    class="form-control"
                    placeholder="Search payments..."
                  />
                </div>
                <!-- Status filters -->
                <div class="col-12 col-lg-auto mb-3 mb-lg-0">
                  <div class="btn-group" role="group">
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="[
                        filters.status === 'completed' ||
                        filters.status === 'paid'
                          ? 'btn-success'
                          : 'btn-outline-success',
                      ]"
                      @click="changeStatus('complete')"
                    >
                      Completed
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="[
                        filters.status === 'pending'
                          ? 'btn-warning'
                          : 'btn-outline-warning',
                      ]"
                      @click="changeStatus('pending')"
                    >
                      Pending
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="[
                        filters.status === 'cancelled' ||
                        filters.status === 'failed'
                          ? 'btn-danger'
                          : 'btn-outline-danger',
                      ]"
                      @click="changeStatus('cancelled')"
                    >
                      Cancelled
                    </button>
                  </div>
                </div>
                <!-- Clear filters button -->
                <div class="col-12 col-lg-auto mb-3 mb-lg-0">
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="clearFilters"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

            <!-- Payments Table -->
            <PaymentsTable
              :payments="payments ?? []"
              :is-loading="loading"
              :page="pagination.current_page"
              :page-size="pagination.per_page"
              @handle-preview="handlePreview"
            />

            <nav
              aria-label="Payments pagination"
              v-if="pagination.total > 0"
              class="d-sm-flex items-align-center justify-content-between mt-4 mt-md-0"
            >
              <div class="">
                <label for="pageSizeSelect" class="form-label me-2"
                  >Page Size</label
                >
                <select
                  id="pageSizeSelect"
                  class="form-select w-auto d-inline-block"
                  v-model="pagination.per_page"
                  @change="applyFilters"
                >
                  <option :value="5">5</option>
                  <option :value="10">10</option>
                  <option :value="25">25</option>
                  <option :value="50">50</option>
                </select>
              </div>
              <ul class="pagination justify-content-center mt-2 mt-sm-0">
                <li
                  class="page-item"
                  :class="{ disabled: pagination.current_page === 0 }"
                >
                  <a
                    class="page-link"
                    href="#"
                    @click.prevent="changePage(pagination.current_page - 1)"
                    >Previous</a
                  >
                </li>
                <li
                  v-for="page in getPageNumbers()"
                  :key="page"
                  class="page-item"
                  :class="{ active: page - 1 === pagination.current_page }"
                >
                  <a
                    class="page-link"
                    href="#"
                    @click.prevent="changePage(page - 1)"
                    >{{ page }}</a
                  >
                </li>
                <li
                  class="page-item"
                  :class="{
                    disabled: pagination.current_page === pagination.last_page,
                  }"
                >
                  <a
                    class="page-link"
                    href="#"
                    @click.prevent="changePage(pagination.current_page + 1)"
                    >Next</a
                  >
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Preview Modal -->
    <div
      class="modal fade"
      id="previewModal"
      tabindex="-1"
      aria-hidden="true"
      ref="previewModal"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Payment Details</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body" v-if="selectedPayment">
            <div class="row">
              <div class="col-md-6">
                <p>
                  <strong>Reference:</strong>
                  {{ selectedPayment.reference || selectedPayment.payment_id }}
                </p>
                <p>
                  <strong>Amount:</strong>
                  {{
                    formatCurrency(
                      selectedPayment.amount || selectedPayment.amount_gross
                    )
                  }}
                </p>
                <p>
                  <strong>Status:</strong>
                  <span :class="getStatusBadgeClass(selectedPayment.status)">
                    {{ selectedPayment.status }}
                  </span>
                </p>
                <p>
                  <strong>Payment Date:</strong>
                  {{
                    formatDate(
                      selectedPayment.payment_date || selectedPayment.created_at
                    )
                  }}
                </p>
              </div>
              <div class="col-md-6">
                <p>
                  <strong>Payment Method:</strong>
                  {{ getPaymentMethodDisplay(selectedPayment.payment_method) }}
                </p>
                <p>
                  <strong>Description:</strong>
                  {{ selectedPayment.description || "Advertisement payment" }}
                </p>
                <p v-if="selectedPayment.ad_id">
                  <strong>Ad ID:</strong> {{ selectedPayment.ad_id }}
                </p>
                <p v-if="selectedPayment.campaign_id">
                  <strong>Campaign ID:</strong>
                  {{ selectedPayment.campaign_id }}
                </p>
              </div>
            </div>
            <div class="row mt-3" v-if="selectedPayment.notes">
              <div class="col-12">
                <h6>Notes</h6>
                <p>{{ selectedPayment.notes }}</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-filter {
  cursor: pointer;
}
</style>
