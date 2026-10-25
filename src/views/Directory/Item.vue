<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const item = ref(null);
const isLoading = ref(true);

onMounted(async () => {
  try {
    // Placeholder - replace with actual API call
    // const response = await fetch(`/api/directory/${route.params.slug}`);
    // item.value = await response.json();
    
    // Simulating data for now
    setTimeout(() => {
      item.value = {
        id: 1,
        name: "Sample Business",
        description: "This is a sample business listing with detailed information about the services offered, business history, and other relevant details that potential customers might want to know. The business has been serving the Laudium community for over 10 years with quality products and excellent customer service.",
        category: "Services",
        address: "123 Main Street, Laudium",
        phone: "(123) 456-7890",
        email: "contact@samplebusiness.com",
        website: "https://www.example.com",
        hours: "Mon-Fri: 9am-5pm, Sat: 10am-2pm, Sun: Closed",
        socialMedia: {
          facebook: "https://facebook.com/samplebusiness",
          twitter: "https://twitter.com/samplebusiness",
          instagram: "https://instagram.com/samplebusiness"
        }
      };
      isLoading.value = false;
    }, 1000);
  } catch (error) {
    console.error("Error fetching directory item:", error);
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="container py-5">
    <div v-if="isLoading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3">Loading business details...</p>
    </div>
    
    <div v-else-if="item" class="row">
      <div class="col-lg-8">
        <div class="card mb-4">
          <div class="card-body">
            <h2 class="card-title">{{ item.name }}</h2>
            <span class="badge bg-secondary mb-3">{{ item.category }}</span>
            
            <p class="card-text">{{ item.description }}</p>
            
            <hr>
            
            <h5>Contact Information</h5>
            <ul class="list-unstyled">
              <li class="mb-2">
                <i class="bi bi-geo-alt text-primary me-2"></i>
                <strong>Address:</strong> {{ item.address }}
              </li>
              <li class="mb-2">
                <i class="bi bi-telephone text-primary me-2"></i>
                <strong>Phone:</strong> {{ item.phone }}
              </li>
              <li class="mb-2">
                <i class="bi bi-envelope text-primary me-2"></i>
                <strong>Email:</strong> {{ item.email }}
              </li>
              <li class="mb-2">
                <i class="bi bi-globe text-primary me-2"></i>
                <strong>Website:</strong> 
                <a :href="item.website" target="_blank" rel="noopener noreferrer">
                  {{ item.website }}
                </a>
              </li>
            </ul>
            
            <h5>Business Hours</h5>
            <p>{{ item.hours }}</p>
            
            <div v-if="item.socialMedia" class="mt-4">
              <h5>Connect With Us</h5>
              <div class="d-flex gap-3">
                <a v-if="item.socialMedia.facebook" :href="item.socialMedia.facebook" 
                   target="_blank" rel="noopener noreferrer" 
                   class="btn btn-outline-primary">
                  <i class="bi bi-facebook me-2"></i>Facebook
                </a>
                <a v-if="item.socialMedia.twitter" :href="item.socialMedia.twitter" 
                   target="_blank" rel="noopener noreferrer" 
                   class="btn btn-outline-info">
                  <i class="bi bi-twitter me-2"></i>Twitter
                </a>
                <a v-if="item.socialMedia.instagram" :href="item.socialMedia.instagram" 
                   target="_blank" rel="noopener noreferrer" 
                   class="btn btn-outline-danger">
                  <i class="bi bi-instagram me-2"></i>Instagram
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div class="card mb-4">
          <div class="card-header bg-light">
            <h5 class="mb-0">Reviews</h5>
          </div>
          <div class="card-body">
            <p class="text-center text-muted py-4">
              No reviews yet. Be the first to review this business!
            </p>
            <button class="btn btn-outline-primary" disabled>
              <i class="bi bi-star me-2"></i>Write a Review
            </button>
          </div>
        </div>
      </div>
      
      <div class="col-lg-4">
        <div class="card mb-4">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">Location</h5>
          </div>
          <div class="card-body">
            <div class="ratio ratio-4x3 mb-3">
              <div class="bg-light d-flex align-items-center justify-content-center">
                <p class="text-muted">Map placeholder</p>
              </div>
            </div>
            <a href="#" class="btn btn-outline-primary w-100">
              <i class="bi bi-map me-2"></i>Get Directions
            </a>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header bg-success text-white">
            <h5 class="mb-0">Contact Business</h5>
          </div>
          <div class="card-body">
            <form>
              <div class="mb-3">
                <label for="name" class="form-label">Your Name</label>
                <input type="text" class="form-control" id="name">
              </div>
              <div class="mb-3">
                <label for="email" class="form-label">Your Email</label>
                <input type="email" class="form-control" id="email">
              </div>
              <div class="mb-3">
                <label for="message" class="form-label">Message</label>
                <textarea class="form-control" id="message" rows="3"></textarea>
              </div>
              <button type="submit" class="btn btn-success w-100">
                <i class="bi bi-send me-2"></i>Send Message
              </button>
            </form>
          </div>
        </div>
        
        <div class="card mt-4">
          <div class="card-header bg-warning">
            <h5 class="mb-0">Similar Businesses</h5>
          </div>
          <div class="list-group list-group-flush">
            <a href="#" class="list-group-item list-group-item-action">
              <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">Related Business 1</h6>
                <small>1.2 km</small>
              </div>
              <small class="text-muted">Category</small>
            </a>
            <a href="#" class="list-group-item list-group-item-action">
              <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">Related Business 2</h6>
                <small>2.5 km</small>
              </div>
              <small class="text-muted">Category</small>
            </a>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="alert alert-danger">
      <i class="bi bi-exclamation-triangle me-2"></i>
      Business not found. The listing you're looking for may have been removed or is temporarily unavailable.
    </div>
    
    <div class="mt-4">
      <router-link to="/directory" class="btn btn-outline-secondary">
        <i class="bi bi-arrow-left me-2"></i>Back to Directory
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.card {
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}

.card-header {
  border-top-left-radius: 0.5rem !important;
  border-top-right-radius: 0.5rem !important;
}

.badge {
  font-size: 0.85rem;
  padding: 0.5em 0.85em;
}
</style>