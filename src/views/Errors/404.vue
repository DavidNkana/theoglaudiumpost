<template>
  <div class="error-container">
    <div class="error-content">
      <div class="error-icon">
        <i class="bi bi-question-circle-fill"></i>
      </div>
      <h1 class="error-title">404</h1>
      <h2 class="error-subtitle">Page Not Found</h2>
      <p class="error-message">
        Sorry, the page you are looking for doesn't exist or has been moved.
      </p>
      <div class="error-actions">
        <router-link to="/" class="btn btn-primary">
          <i class="bi bi-house-door me-2"></i>Go to Homepage
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
// No additional script needed for this static error page
</script>

<style scoped>
.error-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 2rem;
}

.error-content {
  text-align: center;
  max-width: 500px;
  padding: 2rem;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.error-icon {
  font-size: 4rem;
  color: var(--primary);
  margin-bottom: 1rem;
}

.error-title {
  font-size: 5rem;
  font-weight: 700;
  color: var(--primary);
  margin: 0;
  line-height: 1;
}

.error-subtitle {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.error-message {
  color: #6c757d;
  margin-bottom: 2rem;
}

.error-actions .btn {
  background-color: var(--primary-dark);
  border: none;
  padding: 0.5rem 1.5rem;
  font-weight: 500;
}

.error-actions .btn:hover {
  background-color: var(--primary);
}
</style>