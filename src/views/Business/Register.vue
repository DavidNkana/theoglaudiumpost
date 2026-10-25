<script setup>
import { useAuth } from "@/composables/useAuth";
import { useRouter } from "vue-router";
import { devLog } from "@/utils/devLog";
import { ref, onBeforeMount } from "vue";
const router = useRouter();
const { businessRegisteration: register, isAuthenticated, hasRole } = useAuth();

const form = ref({
  name: "",
  email: "",
  phone: "",
  location: "",
  password: "",
  cpassword: "",
});

const rememberMe = ref(false);
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref("");

onBeforeMount(() => {
  devLog.info("Authenticated: ", isAuthenticated.value);
  if (isAuthenticated.value && hasRole("advertiser")) {
    router.push("/business/dashboard");
  }
});

const handleRegister = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const res = await register(form.value);
    // Check if there's a redirect query parameter
    const redirectPath = router.currentRoute.value.query.redirect;
    // Redirect to the original destination if available, otherwise to advertise page
    router.push(redirectPath || "/business/advertise");
  } catch (error) {
    errorMessage.value = error;
    console.log(error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="form-container">
    <div class="row justify-content-center">
      <!-- col-md-6 col-lg-5 col-xl-4 -->
      <div class="">
        <div class="card shadow-lg border-0">
          <div class="card-body p-4 p-sm-5">
            <!-- App Logo -->
            <div class="text-center mb-4">
              <!-- <img
              <img
                src="@/assets/logo.png"
                alt="Laudium POST"
                height="84"
                class="mb-3"
              /> -->
              <h2 class="fw-bold">Business Registration</h2>
              <!-- <p class="text-muted">Sign in to manage your content</p> -->
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
            <form @submit.prevent="handleRegister">
              <div class="mb-3">
                <label for="name" class="form-label">Name</label>
                <div class="input-group">
                  <span class="input-group-text bg-light">
                    <i class="bi bi-building"></i>
                  </span>
                  <input
                    type="name"
                    class="form-control"
                    id="name"
                    v-model="form.name"
                    placeholder="Enter Business Name"
                    required
                  />
                </div>
              </div>
              <div class="row">
                <div class="col-12 col-md mb-3">
                  <label for="email" class="form-label">Email address</label>
                  <div class="input-group">
                    <span class="input-group-text bg-light">
                      <i class="bi bi-envelope"></i>
                    </span>
                    <input
                      type="email"
                      class="form-control"
                      id="email"
                      v-model="form.email"
                      placeholder="admin@laudiumbiz.co.za"
                      required
                    />
                  </div>
                </div>
                <div class="col-12 col-md mb-3">
                  <label for="phone" class="form-label">Phone Number</label>
                  <div class="input-group">
                    <span class="input-group-text bg-light">
                      <i class="bi bi-telephone"></i>
                    </span>
                    <input
                      type="phone"
                      class="form-control"
                      id="phone"
                      v-model="form.phone"
                      placeholder="Enter Phone Number"
                      required
                    />
                  </div>
                </div>
              </div>

              <!-- <div class="mb-3">
                <label for="location" class="form-label"> Location </label>
                <div>
                  <textarea
                    class="form-control"
                    id="location"
                    v-model="form.location"
                    placeholder="Enter Location"
                    required
                  ></textarea>
                </div>
              </div> -->
              <div class="row">
                <div class="col-12 col-md mb-4">
                  <div
                    class="d-flex justify-content-between align-items-center"
                  >
                    <label for="password" class="form-label">Password</label>
                  </div>
                  <div class="input-group">
                    <span class="input-group-text bg-light">
                      <i class="bi bi-lock"></i>
                    </span>
                    <input
                      :type="showPassword ? 'text' : 'password'"
                      class="form-control"
                      id="password"
                      v-model="form.password"
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
                <div class="col-12 col-md mb-4">
                  <div
                    class="d-flex justify-content-between align-items-center"
                  >
                    <label for="cpassword" class="form-label"
                      >Confirm Password</label
                    >
                  </div>
                  <div class="input-group">
                    <span class="input-group-text bg-light">
                      <i class="bi bi-lock"></i>
                    </span>
                    <input
                      :type="showPassword ? 'text' : 'password'"
                      class="form-control"
                      id="cpassword"
                      v-model="form.cpassword"
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
                {{ isLoading ? "Registering..." : "Register" }}
              </button>
            </form>

            <div class="text-center mt-4">
              <p class="text-muted">
                Already have an account?
                <router-link to="/business/login" class="link"
                  >Login</router-link
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

<style scoped>
.form-container {
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

.link {
  color: var(--primary);
  border-color: #000000;
}
</style>
