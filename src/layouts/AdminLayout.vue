<!-- src/layouts/AdminLayout.vue -->
<template>
  <div class="admin-layout">
    <!-- Admin Header -->
    <header class="admin-header navbar navbar-dark bg-dark sticky-top">
      <div class="container-fluid">
        <!-- Sidebar toggle (mobile) -->
        <button
            class="navbar-toggler d-md-none"
            type="button"
            @click="toggleSidebar"
        >
          <!-- <span class="navbar-toggler-icon"></span> -->
          <span v-if="!sidebarOpen" class="navbar-toggler-icon"></span>
          <span v-else class="fs-2"><i class="bi bi-x-lg"></i></span>
        </button>

        <!-- Brand logo -->
        <router-link
            to="/admin/dashboard"
            class="navbar-brand d-flex align-items-center"
        >
          <img
              src="/logo/laudium-icon-light.svg"
              height="30"
              class="me-2"
              alt="Laudium POST"
          />
          <span class="text-white">Admin Panel</span>
        </router-link>

        <div
            class="sidebar-backdrop"
            v-if="sidebarOpen"
            @click="toggleSidebar"
        ></div>

        <!-- Right navigation items -->
        <div class="d-flex align-items-center">
          <!-- User profile -->
          <!-- <div class="dropdown">
            <button
              class="btn btn-success d-flex align-items-center"
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
          </div> -->
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
              <a
                  href="#"
                  class="nav-link"
                  @click.prevent="navigateTo('/admin/dashboard')"
                  :class="{ 'active': $route.path === '/admin/dashboard' }"
              >
                <i class="bi bi-speedometer2 me-2"></i>
                <span>Dashboard</span>
              </a>
            </li>

            <li class="nav-item">
              <a
                  href="#"
                  class="nav-link"
                  @click.prevent="navigateTo('/admin/articles')"
                  :class="{ 'active': $route.path.startsWith('/admin/articles') }"
              >
                <i class="bi bi-play-btn me-2"></i>
                <span>Articles</span>
              </a>
            </li>

            <li class="nav-item">
              <a
                  href="#"
                  class="nav-link"
                  @click.prevent="navigateTo('/admin/source-articles')"
                  :class="{ 'active': $route.path.startsWith('/admin/source-articles') }"
              >
                <i class="bi bi-file-earmark-text me-2"></i>
                <span>Source Articles</span>
              </a>
            </li>

            <li v-if="!hasRole('superadmin')" class="nav-item">
              <router-link
                  to="/admin/ads"
                  class="nav-link"
                  active-class="active"
              >
                <i class="bi bi-badge-ad me-2"></i>
                <span>Ads</span>
              </router-link>
            </li>

            <SidebarMenuItem
                v-else
                label="Advertisements"
                icon="bi bi-badge-ad me-2"
                basePath="/admin/ads"
                :children="[
                // { label: 'Campaigns', to: '/campaigns' },
                { label: 'Ads', to: '' },
                { label: 'Placements', to: '/ad-placements' },
                { label: 'Payments', to: '/payments' },
              ]"
            />

            <li class="nav-item">
              <a
                  href="#"
                  class="nav-link"
                  @click.prevent="navigateTo('/admin/businesses')"
                  :class="{ 'active': $route.path.startsWith('/admin/businesses') }"
              >
                <i class="bi bi-people me-2"></i>
                <span>Businesses</span>
              </a>
            </li>

            <li class="nav-item">
              <a
                  href="#"
                  class="nav-link"
                  @click.prevent="navigateTo('/admin/users')"
                  :class="{ 'active': $route.path.startsWith('/admin/users') }"
              >
                <i class="bi bi-person-gear me-2"></i>
                <span>Users</span>
              </a>
            </li>

            <li v-if="!hasRole('superadmin')" class="nav-item">
              <router-link
                  to="/admin/announcements"
                  class="nav-link"
                  active-class="active"
              >
                <i class="bi bi-megaphone-fill me-2"></i>
                <span>Announcements</span>
              </router-link>
            </li>

            <li v-else class="nav-item">
              <SidebarMenuItem
                  label="Announcements"
                  icon="bi bi-megaphone-fill me-2"
                  basePath="/admin/announcements"
                  :children="[
                  { label: 'Announcements', to: '' },
                  { label: 'Categories', to: '/categories' },
                ]"
              />
            </li>
            <li v-if="hasRole('superadmin')" class="nav-item">
              <router-link
                  to="/admin/articles/prompts"
                  class="nav-link"
                  active-class="active"
              >
                <i class="bi bi-gear me-2"></i>
                <span>Manage AI Prompts</span></router-link
              >
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
                <div class="user-name fw-medium">Admin User</div>
                <small class="text-muted">Administrator</small>
              </div>
            </div>
            <button
                class="btn btn-outline-danger btn-sm w-100"
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
        <div class="p-4">
          <router-view />
        </div>
      </main>

      <footer class="main-footer bg-success shadow text-white py-4">
        <div class="container">
          <div class="row text-center">
            <p class="mb-0 text-white">
              © {{ new Date().getFullYear() }} Laudium Post Community News. All
              rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import SidebarMenuItem from "./Partials/SidebarMenuItem.vue";
import { ref } from "vue";
import { onBeforeMount, onMounted } from "vue";
import { useAuth } from "@/composables/useAuth";
const router = useRouter();
const { logout, isAuthenticated, user, hasRole } = useAuth();

const sidebarOpen = ref(false);

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

// Custom navigation function with debugging
const navigateTo = (path) => {
  console.log(`Navigation triggered to: ${path}`);
  console.log(`Current authentication state: ${isAuthenticated.value ? 'Authenticated' : 'Not authenticated'}`);
  console.log(`Has admin role: ${hasRole('admin')}`);

  try {
    // Try to navigate to the specified path
    console.log(`Attempting to navigate to: ${path}`);
    router.push(path).then(() => {
      console.log(`Navigation to ${path} successful`);
    }).catch(error => {
      console.error(`Navigation error:`, error);
    });
  } catch (error) {
    console.error(`Error during navigation to ${path}:`, error);
  }
};

const handleLogout = () => {
  logout();
};

onBeforeMount(() => {
  if (!isAuthenticated.value) {
    console.log("Not authenticated, redirecting to login page");
    router.push("/admin/login");
  }
});

// Add debugging for authentication and role
onMounted(() => {
  console.log("AdminLayout mounted");
  console.log("Is authenticated:", isAuthenticated.value);
  console.log("User object:", user.value);
  console.log("Has admin role:", hasRole("admin"));
});
</script>

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
  z-index: 1050;
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

.main-footer {
  margin-top: auto;
  flex: 1;
  margin-left: 260px;
}

.admin-main {
  flex: 1;
  margin-left: 260px;
  margin-bottom: 2rem;
  background-color: #f8f9fa;
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

.sidebar-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1040;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.navbar-toggler {
  border: none !important;
}

.navbar-toggler:focus {
  box-shadow: none !important;
  outline: none !important;
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

  .main-footer {
    margin-left: 0;
  }
}
</style>