<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getPayments, removePayment } from "@/features/payments/PaymentsService";
import { Modal } from "bootstrap";
import { debounce } from "lodash";
import PaymentsTable from "./Partials/PaymentsTable.vue";
import PaymentForm from "./PaymentForm.vue";

const route = useRoute();
const router = useRouter();

const deleteModal = ref(null);
let modalInstance = null;

let formModalInstance = null;
const formModal = ref(null);

const isDeleting = ref(false);
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

// Fetch payments based on current filters
const fetchPayments = async () => {
  if (loading.value) return;
  loading.value = true;

  try {
    const response = await getPayments({
      page: pagination.value.current_page,
      search: filters.value.search,
      size: pagination.value.per_page,
      status: filters.value.status,
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

// Delete Payment
const deletePayment = async () => {
  isDeleting.value = true;

  try {
    await removePayment(selectedPayment.value.id);
    payments.value = payments.value.filter(
      (payment) => payment.id !== selectedPayment.value.id
    );
    modalInstance?.hide();

    selectedPayment.value = {};
  } catch (err) {
    console.error("Error deleting payment:", err);
    alert("Failed to delete payment. Please try again.");
  } finally {
    isDeleting.value = false;
  }
};

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
    ...filters.value,
    search: "",
    status: "",
  };
  pagination.value.current_page = 0;
  fetchPayments();
};

const confirmDelete = (id) => {
  selectedPayment.value = payments.value.find((el) => el.id == id);
  if (selectedPayment.value) {
    modalInstance?.show();
  }
};

const openUpdateModal = async (id) => {
  selectedPayment.value = payments.value.find((el) => el.id == id);
  if (selectedPayment.value) {
    formModalInstance?.show();
  }
};

const closeForm = () => {
  formModalInstance?.hide();
  selectedPayment.value = null;
};

const addPayment = (payload) => {
  payments.value = [payload, ...payments.value];
};

const updatePayment = (payload) => {
  payments.value = payments.value.map((payment) => {
    if (payment.id == payload.id) {
      return { ...payment, ...payload };
    }
    return payment;
  });
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

  modalInstance = new Modal(deleteModal.value);
  formModalInstance = new Modal(formModal.value);
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
        <h2>Payments Management</h2>
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
                <div class="col-6 col-lg-auto mb-3 mb-lg-0">
                  <select v-model="filters.status" class="form-select">
                    <option value="">All Statuses</option>
                    <option value="COMPLETED">Paid</option>
                    <option value="PENDING">Pending</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                </div>
                <div
                  v-if="filters.search || filters.status"
                  class="col-6 col-lg-auto mb-3 mb-lg-0"
                >
                  <button
                    class="btn btn-outline-secondary"
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
              @handle-delete="confirmDelete"
              @handle-edit="openUpdateModal"
            />

            <!-- Pagination -->
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

    <div class="modal fade" id="formModal" tabindex="-1" ref="formModal">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-body p-0">
            <PaymentForm
              :payment="selectedPayment"
              @close="closeForm"
              @add-payment="addPayment"
              @update-payment="updatePayment"
            />
          </div>
        </div>
      </div>
    </div>

    <div
      class="modal fade"
      id="deleteModal"
      tabindex="-1"
      aria-hidden="true"
      ref="deleteModal"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">Confirm Deletion</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete this payment?</p>
            <p class="fw-bold">{{ selectedPayment?.reference }}</p>
            <p class="text-danger">
              <strong>Warning:</strong> This action cannot be undone.
            </p>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-danger"
              @click="deletePayment"
              :disabled="isDeleting"
            >
              {{ isDeleting ? "Deleting..." : "Delete Payment" }}
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
