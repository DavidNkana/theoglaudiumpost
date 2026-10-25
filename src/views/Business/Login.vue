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
              <h2 class="fw-bold">Business Login</h2>
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
                    placeholder="business@example.com"
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

            <div class="mt-4">
              <p class="text-muted">
                No account?
                <router-link to="/business/register" class="link"
                  >Register</router-link
                >
              </p>
            </div>
          </div>
        </div>

        <div class="text-center mt-3">
          <router-link to="/" class="link">
            <i class="bi bi-arrow-left me-1"></i> Back to Homepage
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuth } from "@/composables/useAuth";
import { useRouter } from "vue-router";
import { ref, onBeforeMount } from "vue";
const router = useRouter();
const { login, isAuthenticated, hasRole } = useAuth();

const email = ref("");
const password = ref("");
const rememberMe = ref(false);
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref("");

onBeforeMount(() => {
  if (isAuthenticated.value && hasRole("advertiser")) {
    router.push("/business/dashboard");
  }
});

const handleLogin = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await login(email.value, password.value);
    // Check if there's a redirect query parameter
    const redirectPath = router.currentRoute.value.query.redirect;
    // Redirect to the original destination if available, otherwise to dashboard
    router.push(redirectPath || "/business/dashboard");
  } catch (error) {
    errorMessage.value = "Invalid email or password. Please try again.";
    // console.log(error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.admin-login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: f8f9fada;
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

.link {
  color: var(--primary);
}

img {
  height: 200px;
  width: auto;
  object-fit: contain;
  border-color: #000000;

}
</style>
