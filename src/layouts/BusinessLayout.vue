<script setup>
import { useRouter } from "vue-router";
import { ref } from "vue";
import { onBeforeMount } from "vue";
import { useAuth } from "@/composables/useAuth";
const router = useRouter();
const { logout, isAuthenticated, user, hasRole } = useAuth();

const sidebarOpen = ref(false);

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};
const handleLogout = () => {
  logout();
};

onBeforeMount(() => {
  if (!isAuthenticated.value || !hasRole("advertiser")) {
    router.push("/business/register");
  }
});
// console.log("User: ", user.value);
</script>

<template>
  <div class="admin-layout">
    <header class="admin-header navbar sticky-top">
      <div class="container-fluid">
        <!-- Sidebar toggle (mobile) -->
        <button
          class="navbar-toggler d-md-none"
          type="button"
          @click="toggleSidebar"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <!-- Brand logo -->
        <router-link
          to="/business/dashboard"
          class="navbar-brand d-flex align-items-center"
        >
          <img
            src="/logo/laudium-icon-light.svg"
            height="30"
            class="me-2"
            alt="Laudium POST"
          />
          <span class="text-white">Administrator Panel</span>
        </router-link>

        <!-- Right navigation items -->
        <div class="d-flex align-items-center">
          <div class="dropdown">
            <button
              class="btn d-flex align-items-center text-light"
              type="button"
              id="userMenu"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <span class="me-2 d-none d-sm-inline">Admin User</span>
              <i class="bi bi-person-circle fs-5"></i>
            </button>
            <ul
              class="dropdown-menu dropdown-menu-end"
              aria-labelledby="userMenu"
            >
              <li>
                <a class="dropdown-item" href="#" @click.prevent="handleLogout"
                  ><i class="bi bi-box-arrow-right me-2"></i>Logout</a
                >
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>

    <!-- <div class="admin-container"> -->
    <div>
      <!-- Sidebar navigation -->
      <div class="admin-sidebar" :class="{ show: sidebarOpen }">
        <div class="admin-sidebar-content">
          <ul class="nav flex-column">
            <li class="nav-item">
              <router-link
                to="/business/dashboard"
                class="nav-link"
                active-class="active"
                exact
              >
                <i class="bi bi-speedometer2 me-2"></i>
                <span>Dashboard</span>
              </router-link>
            </li>

            <li class="nav-item">
              <router-link
                to="/business/ads"
                class="nav-link"
                active-class="active"
              >
                <i class="bi bi-badge-ad me-2"></i>
                <span>Ads</span>
              </router-link>
            </li>

            <li class="nav-item">
              <router-link
                to="/business/payments"
                class="nav-link"
                active-class="active"
              >
                <i class="bi bi bi-wallet2 me-2"></i>
                <span>Payments</span>
              </router-link>
            </li>
          </ul>

          <hr class="my-3" />

          <div class="px-3 sidebar-footer">
            <div class="user-info d-flex align-items-center mb-3">
              <div
                class="user-avatar text-white rounded-circle d-flex align-items-center justify-content-center me-2"
              >
                <span>AU</span>
              </div>
              <div>
                <!-- <div class="user-name fw-medium">{{ user }}</div> -->
                <div class="user-name fw-medium">Admin User</div>
                <small class="text-muted">Administrator</small>
              </div>
            </div>
            <button
              class="btn btn-outline-secondary btn-sm w-100"
              @click="handleLogout"
            >
              <i class="bi bi-box-arrow-right me-2"></i>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <!-- Main content area -->
      <main class="admin-main">
        <div class="m-4">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>
<style scoped>
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.admin-container {
  display: flex;
  flex: 1;
}

.navbar {
  background-color: var(--primary-dark);
}

.admin-sidebar {
  width: 260px;
  background-color: #fff;
  border-right: 1px solid #e9ecef;
  position: fixed;
  top: 56px;
  left: 0;
  bottom: 0;
  z-index: 1000;
  overflow-y: auto;
  transition: transform 0.3s ease;
}

.admin-sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem 0;
}

.sidebar-footer {
  margin-top: auto;
}

.navbar-brand {
  height: 50px;
  width: auto;
  /* background-color: red; */
}

.navbar-brand span {
  font-size: 2rem;
  font-weight: 400;
  color: #ffffff;
}

.logo {
  height: auto;
  object-fit: cover;
  width: 160px;
}

.admin-main {
  flex: 1;
  margin-left: 260px;
  background-color: #f8f9fada;
  min-height: calc(100vh - 56px);
}

.nav-link {
  color: #495057;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  border: none;
}

.nav-link:hover {
  background-color: var(--primary-dark) !important;
  color: #ffffff !important;
}

.nav-link.active {
  color: var(--secondary);
  font-size: 1.2rem;
  font-weight: bolder;
  background-color: var(--primary);
  border-left: 4px solid var(--primary-dark);
}

.user-avatar {
  width: 38px;
  height: 38px;
  font-size: 16px;
  background-color: var(--primary-dark);
}

/* Mobile sidebar handling */
@media (max-width: 767.98px) {
  .admin-sidebar {
    transform: translateX(-100%);
  }

  .admin-sidebar.show {
    transform: translateX(0);
  }

  .admin-main {
    margin-left: 0;
  }
}
</style>
