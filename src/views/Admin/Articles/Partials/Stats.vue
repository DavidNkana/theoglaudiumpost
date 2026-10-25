<script setup>
  import { ref, onMounted } from "vue";
  import { getStats } from "@/features/articles/ArticlesService";

  const props = defineProps({
    currentStatus: String,
  });

  const isLoading = ref(false);

  // Stats
  const stats = ref({});

  onMounted(() => {
    fetchStats();
  });

  const fetchStats = async () => {
    isLoading.value = true;

    try {
      const response = await getStats();
      //   console.log("Stats Response");
      //   console.log(response);
      if (response.status != 200) throw new Error("Unable to Fetch Stats");
      stats.value = response.data;
      isLoading.value = false;
    } catch (error) {
      console.error(error);
      isLoading.value = false;
    }
  };

  const emit = defineEmits(["change-status"]);

  function toggleStatus(status) {
    emit("change-status", status);
  }
</script>
<!-- :class="{
  'border border-2 border-primary shadow-lg scale-up':
    props.currentStatus === 'published',
}" -->

<template>
  <div class="row">
    <template v-if="!isLoading">
      <div class="col-lg-3 col-md-6 col-6 mb-3 mb-xl-0">
        <div
          class="card bg-success text-white"
          @click="toggleStatus('published')"
          style="cursor: pointer"
        >
          <div
            class="card-body d-flex align-items-center justify-content-between"
          >
            <div>
              <h5 class="card-title">Published</h5>
              <h3 class="card-text">{{ stats.total_published ?? "-" }}</h3>
            </div>
            <div v-if="props.currentStatus === 'published'">
              <i class="bi bi-check-circle responsive-icon"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-3 col-md-6 col-6 mb-3 mb-xl-0">
        <div
          class="card bg-info text-white"
          @click="toggleStatus('draft')"
          style="cursor: pointer"
        >
          <div
            class="card-body d-flex align-items-center justify-content-between"
          >
            <div>
              <h5 class="card-title">Draft</h5>
              <h3 class="card-text">{{ stats.total_draft ?? "-" }}</h3>
            </div>
            <div v-if="props.currentStatus === 'draft'">
              <i class="bi bi-check-circle responsive-icon"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-3 col-md-6 col-6 mb-3 mb-xl-0">
        <div
          class="card bg-warning text-white"
          @click="toggleStatus('scheduled')"
          style="cursor: pointer"
        >
          <div
            class="card-body d-flex align-items-center justify-content-between"
          >
            <div>
              <h5 class="card-title">Scheduled</h5>
              <h3 class="card-text">{{ stats.total_upcoming ?? "-" }}</h3>
            </div>
            <div v-if="props.currentStatus === 'scheduled'">
              <i class="bi bi-check-circle responsive-icon"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-3 col-md-6 col-6 mb-3 mb-xl-0">
        <div
          class="card bg-danger text-white"
          @click="toggleStatus('archived')"
          style="cursor: pointer"
        >
          <div
            class="card-body d-flex align-items-center justify-content-between"
          >
            <div>
              <h5 class="card-title">Archived</h5>
              <h3 class="card-text">{{ stats.total_archived ?? "-" }}</h3>
            </div>
            <div v-if="props.currentStatus === 'archived'">
              <i class="bi bi-check-circle responsive-icon"></i>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <div
        v-for="index in 4"
        :key="'shimmer' + index"
        class="col-md-3 col-sm-6 mb-3"
      >
        <div class="card bg-ghost text-white shimmer" style="height: 100px">
          <div class="card-body"></div>
        </div>
      </div>
    </template>
  </div>
</template>
<style scoped>
  .responsive-icon {
    font-size: 1.25rem; /* default for mobile (sm) */
  }

  @media (min-width: 768px) {
    .responsive-icon {
      font-size: 1.75rem; /* md */
    }
  }

  @media (min-width: 992px) {
    .responsive-icon {
      font-size: 2rem; /* lg */
    }
  }
  .shimmer {
    position: relative;
    overflow: hidden;
    background: #e0e0e0;
  }

  .shimmer::after {
    content: "";
    position: absolute;
    top: 0;
    left: -150px;
    width: 100px;
    height: 100%;
    background: linear-gradient(
      to right,
      transparent 0%,
      #f8f9fa 50%,
      transparent 100%
    );
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% {
      left: -150px;
    }
    100% {
      left: 100%;
    }
  }
</style>
