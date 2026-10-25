<script setup>
import { ref, onMounted } from "vue";
import { getBusinessRecentPayments } from "@/features/businesses/BusinessDashboardService";
import { useAuth } from "@/composables/useAuth";
const { user } = useAuth();

const isLoading = ref(false);
const recentPayments = ref([]);

onMounted(() => {
  fetchData();
});

const fetchData = async () => {
  isLoading.value = true;

  try {
    if (!user.value || !user.value?.businessId)
      throw new Error("User Not Found");

    const response = await getBusinessRecentPayments(user.value?.businessId); // Get 5 recent payments
    console.log(response);
    if (response.status != 200)
      throw new Error("Unable to fetch business recent payments");
    recentPayments.value = response.data || [];
    isLoading.value = false;
  } catch (error) {
    console.error(error);
    isLoading.value = false;
    // Fallback to empty array in case of error
    recentPayments.value = [];
  }
};

const getStatusBadgeClass = (status) => {
  switch (status.toLowerCase()) {
    case "completed":
      return "bg-success";
    case "pending":
      return "bg-warning";
    case "failed":
      return "bg-danger";
    default:
      return "bg-secondary";
  }
};
</script>

<template>
  <div class="card border-0 shadow-lg h-100">
    <div class="card-header bg-white d-flex justify-content-between">
      <h5 class="card-title mb-0">Recent Payments</h5>
      <router-link
        to="/business/payments"
        class="text-decoration-none text-success"
        >View all</router-link
      >
    </div>
    <div class="card-body p-0">
      <div class="table-responsive">
        <table class="table table-hover mb-0">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Method</th>
            </tr>
          </thead>
          <tbody v-if="!isLoading">
            <tr v-for="payment in recentPayments" :key="payment.id">
              <td>{{ payment.payment_id }}</td>
              <td>R{{ payment.amount_gross.toLocaleString() }}</td>
              <td>
                <span
                  class="badge"
                  :class="getStatusBadgeClass(payment.status)"
                >
                  {{ payment.status }}
                </span>
              </td>
              <td>{{ payment.created_at.split("T")[0] }}</td>
              <td>{{ payment.payment_method }}</td>
            </tr>
          </tbody>
          <tbody v-else>
            <tr v-for="i in 5" :key="i">
              <td>
                <div class="shimmer" style="height: 20px; width: 120px"></div>
              </td>
              <td>
                <div class="shimmer" style="height: 20px; width: 80px"></div>
              </td>
              <td>
                <div class="shimmer shimmer-badge"></div>
              </td>
              <td>
                <div class="shimmer" style="height: 20px; width: 80px"></div>
              </td>
              <td>
                <div class="shimmer" style="height: 20px; width: 80px"></div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Shimmer loading effect */
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
