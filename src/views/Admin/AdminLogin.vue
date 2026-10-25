<!-- 
  Admin login page template that contains:
  1. A centered login form with the application logo
  2. Input fields for email and password with icons
  3. Remember me checkbox and login button
  4. Error message display for failed login attempts
  5. Link back to the homepage
-->
<template>
  <div class="admin-login-container">
    <div class="row justify-content-center">
      <!-- col-md-6 col-lg-5 col-xl-4 -->
      <div class="">
        <div class="card shadow-lg border-0">
          <div class="card-body p-4 p-sm-5">
            <!-- App Logo -->
            <div class="text-center mb-4">
              <img
                  src="/logo/laudium-icon-light.svg"
                  alt="Laudium POST"
                  height="60"
                  class="mb-3"
              />
              <h2 class="fw-bold">Admin Login</h2>
              <p class="text-muted">Sign in to manage your content</p>
            </div>

            <!-- Alert for error messages -->
            <div
                v-if="errorMessage"
                class="alert alert-danger alert-dismissible fade show"
                role="alert"
            >
              {{ errorMessage }}
              <button
                  type="button"
                  class="btn-close"
                  @click="errorMessage = ''"
              ></button>
            </div>

            <!-- Login Form -->
            <form @submit.prevent="handleLogin">
              <div class="mb-3">
                <label for="email" class="form-label">Email address</label>
                <div class="input-group">
                  <span class="input-group-text bg-light">
                    <i class="bi bi-envelope"></i>
                  </span>
                  <input
                      type="email"
                      class="form-control"
                      id="email"
                      v-model="email"
                      placeholder="admin@laudiumbiz.co.za"
                      required
                  />
                </div>
              </div>

              <div class="mb-4">
                <div class="d-flex justify-content-between align-items-center">
                  <label for="password" class="form-label">Password</label>
                  <!-- <a href="#" class="small text-decoration-none"
                    >Forgot password?</a
                  > -->
                </div>
                <div class="input-group">
                  <span class="input-group-text bg-light">
                    <i class="bi bi-lock"></i>
                  </span>
                  <input
                      :type="showPassword ? 'text' : 'password'"
                      class="form-control"
                      id="password"
                      v-model="password"
                      placeholder="Enter your password"
                      required
                  />
                  <button
                      class="input-group-text bg-light"
                      type="button"
                      @click="showPassword = !showPassword"
                  >
                    <i
                        :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"
                    ></i>
                  </button>
                </div>
              </div>

              <div class="mb-4 form-check">
                <input
                    type="checkbox"
                    class="form-check-input"
                    id="rememberMe"
                    v-model="rememberMe"
                />
                <label class="form-check-label" for="rememberMe"
                >Remember me</label
                >
              </div>

              <button
                  type="submit"
                  class="btn btn-dark w-100 py-2"
                  :disabled="isLoading"
              >
                <span
                    v-if="isLoading"
                    class="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                ></span>
                {{ isLoading ? "Signing In..." : "Sign In" }}
              </button>
            </form>

            <!-- <div class="text-center mt-4">
              <p class="text-muted">
                Need help?
                <a href="#" class="text-decoration-none">Contact support</a>
              </p>
            </div> -->
          </div>
        </div>

        <div class="text-center mt-3">
          <router-link to="/" class="text-decoration-none text-success">
            <i class="bi bi-arrow-left me-1"></i> Back to Homepage
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * AdminLogin.vue
 *
 * Admin authentication page for the Laudium Biz application.
 *
 * This component:
 * - Provides a login form for admin users
 * - Handles authentication using the useAuth composable
 * - Manages form validation and error display
 * - Redirects authenticated users to the admin dashboard
 */

import {useAuth} from "@/composables/useAuth";
import {ref} from "vue";
import {useRoute, useRouter} from "vue-router";

// Get authentication methods from the useAuth composable
const {login} = useAuth();
const route = useRoute()
const router = useRouter()
/**
 * Form state variables
 */
const email = ref(""); // User's email address
const password = ref(""); // User's password
const rememberMe = ref(false); // Remember me checkbox state
const showPassword = ref(false); // Toggle for password visibility
const isLoading = ref(false); // Loading state during authentication
const errorMessage = ref(""); // Error message for failed login attempts

/**
 * Handles the login form submission
 *
 * This function:
 * 1. Sets the loading state and clears any previous error messages
 * 2. Attempts to authenticate the user with the provided credentials
 * 3. Redirects to the admin dashboard on successful login
 * 4. Displays an error message if authentication fails
 * 5. Resets the loading state when complete
 */
const handleLogin = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await login(email.value, password.value);
    if (route?.query?.redirect) {
      await router.push(route.query.redirect)
    } else {
      await router.push('/admin/dashboard');
    }
  } catch (error) {
    const status = error.response?.status;
    if (status === 401 && error.response?.data?.message) {
      errorMessage.value = error.response.data.message;
    } else if (status === 401) {
      errorMessage.value = "Invalid email or password";
    } else {
      errorMessage.value = error.response?.data?.message || error.message || "Login failed";
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<!-- 
  Scoped styles that only apply to this component
  These styles create a clean, modern login form with subtle visual enhancements
-->
<style scoped>
.admin-login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8f9fada;
  padding: 2rem 0;
  /*  #f8f9fa */
}

.input-group-text {
  border-right: none;
}

.input-group .form-control {
  border-left: none;
}

.form-control:focus {
  box-shadow: none;
  border-color: #ced4da;
}

.input-group .form-control:focus + .input-group-text,
.input-group .input-group-text + .form-control:focus {
  border-color: var(--primary);
}

.btn {
  background-color: var(--primary-dark);
  color: white;
}

.btn:hover {
  background-color: var(--primary);
  /* color: white; */
}
</style>
