<!-- 
  Main application footer component
  Provides site navigation, contact information, and branding
-->
<template>
  <footer class="app-footer text-white py-4">
    <div class="container">
      <!-- Main Footer Content -->
      <div class="row py-5">
        <!-- Logo & Description Column -->
        <div class="col-lg-3 col-md-6 mb-4">
          <div class="footer-brand">
            <img
              src="/logo/laudium-logo-light.svg"
              alt="Laudium POST"
              class="img-fluid mb-3"
              style="max-height: 100px; width: 200px"
            />
            <p class="footer-description">
              <!-- Your trusted source for Laudium community news, business updates, -->
              Your trusted source for Laudium community news, and local events
              for Laudium, South Africa.
            </p>
            <!-- Social Media Links -->
            <div class="social-icons mb-3">
              <a href="#" class="text-white me-3" aria-label="Facebook">
                <i class="bi bi-facebook fs-5"></i>
              </a>

              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://x.com/vukaagroup"
                class="text-white me-3 d-inline-flex align-items-center"
                aria-label="Visit Vukaa Group on X (formerly Twitter)"
              >
                <i class="bi bi-twitter-x fs-5" aria-hidden="true"></i>
                <span class="visually-hidden">X (formerly Twitter)</span>
              </a>
              <a href="#" class="text-white me-3" aria-label="Instagram">
                <i class="bi bi-instagram fs-5"></i>
              </a>
              <a href="#" class="text-white me-3" aria-label="WhatsApp">
                <i class="bi bi-whatsapp fs-5"></i>
              </a>

              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://www.youtube.com/channel/UC0Om9sgYVeTUmn8ZErnJt6w"
                class="text-white me-3 d-inline-flex align-items-center"
                aria-label="Visit Laudiumbiz YouTube Channel"
              >
                <i class="bi bi-youtube fs-5" aria-hidden="true"></i>
                <span class="visually-hidden">Laudiumbiz YouTube Channel</span>
              </a>
            </div>
          </div>
        </div>

        <!-- Quick Links Column -->
        <div class="col-lg-2 col-md-6 mb-4">
          <h5 class="footer-title">Quick Links</h5>
          <ul class="footer-links">
            <li><router-link to="/">Home</router-link></li>
            <li><router-link to="/news">News</router-link></li>
            <li><router-link to="/podcasts">Podcasts</router-link></li>
            <li><router-link to="/community">Community</router-link></li>
            <li>
              <router-link to="/announcements">Announcements</router-link>
            </li>
          </ul>
        </div>

        <!-- More Column -->
        <div class="col-lg-2 col-md-6 mb-4">
          <h5 class="footer-title">More</h5>
          <ul class="footer-links">
            <li>
              <a href="https://wa.me/27774806048" target="_blank" rel="noopener noreferrer">Advertise With Us</a>
            </li>
            <li><router-link to="/about">About</router-link></li>
            <li><router-link to="/editorial-policy">Editorial Policy</router-link></li>
            <li><router-link to="/corrections">Corrections</router-link></li>
            <!-- <li><router-link to="/submit-news">Submit News</router-link></li>
            <li><router-link to="/categories">Categories</router-link></li>
            <li><router-link to="/archive">Archive</router-link></li>
            <li><router-link to="/newsletter">Newsletter</router-link></li> -->
          </ul>
        </div>

        <!-- Legal Column -->
        <div class="col-lg-2 col-md-6 mb-4">
          <h5 class="footer-title">Legal</h5>
          <ul class="footer-links">
            <li><router-link to="/terms-of-use">Terms of Use</router-link></li>
            <li>
              <router-link to="/privacy-policy">Privacy Policy</router-link>
            </li>
            <!-- <li><router-link to="/cookies">Cookie Policy</router-link></li> -->
            <!-- <li><router-link to="/disclaimer">Disclaimer</router-link></li> -->
            <!-- <li><router-link to="/dmca">DMCA</router-link></li> -->
          </ul>
        </div>

        <!-- Contact Info Column -->
        <div class="col-lg-3 col-md-12 mb-4">
          <h5 class="footer-title">Contact Info</h5>
          <div class="contact-info">
            <!-- Email -->
            <div class="contact-item mb-3">
              <div class="d-flex align-items-start">
                <!-- <i class="fas fa-envelope contact-icon me-3"></i> -->
                <!-- <i class="fas fa-envelope me-3"></i> -->
                <div>
                  <p class="contact-label mb-1">Email</p>
                  <a href="mailto:info@lauduimbiz.co.za" class="contact-link">
                    info@lauduimbiz.co.za
                  </a>
                </div>
              </div>
            </div>


            <!-- Location -->
            <div class="contact-item mb-3">
              <div class="d-flex align-items-start">
                <!-- <i class="fas fa-map-marker-alt contact-icon me-3"></i> -->
                <div>
                  <p class="contact-label mb-1">Location</p>
                  <address class="contact-address mb-0">
                    Laudium, Pretoria<br />
                    Gauteng, South Africa
                  </address>
                </div>
              </div>
            </div>

            <!-- Business Hours -->
            <!-- <div class="contact-item">
              <div class="d-flex align-items-start">
                <i class="fas fa-clock contact-icon me-3"></i>
                <div>
                  <p class="contact-label mb-1">Hours</p>
                  <p class="contact-hours mb-0">
                    Mon - Fri: 9:00 AM - 6:00 PM<br />
                    <small class="text-muted">Online 24/7</small>
                  </p>
                </div>
              </div>
            </div> -->
          </div>
        </div>
      </div>

      <!-- Bottom Bar with Copyright -->
      <hr class="bg-secondary" />
      <div class="row text-center">
        <p class="mb-0 text-white-50">
          © {{ new Date().getFullYear() }} Laudium POST Community News. All
          rights reserved.
        </p>
      </div>
    </div>
  </footer>
</template>

<script>
/**
 * Footer.vue
 *
 * Main application footer component that provides navigation, contact information, and branding.
 *
 * This component:
 * - Displays the application logo and company description
 * - Provides navigation links to important pages
 * - Shows contact information and social media links
 * - Includes a newsletter subscription form
 * - Displays copyright information with the current year
 * - Features responsive design for different screen sizes
 */
export default {
  name: "AppFooter",

  /**
   * Component data properties
   * @returns {Object} Data properties used by the component
   */
  data() {
    return {
      newsletterEmail: "", // Stores the user's email for newsletter subscription
      currentYear: new Date().getFullYear(), // Current year for copyright notice
    };
  },
  /**
   * Component methods
   */
  methods: {
    /**
     * Handles newsletter subscription form submission
     *
     * This method:
     * 1. Validates the email address format
     * 2. Processes the subscription request
     * 3. Shows a success message and resets the form
     */
    subscribeNewsletter() {
      if (this.newsletterEmail && this.isValidEmail(this.newsletterEmail)) {
        // Handle newsletter subscription
        console.log("Subscribing email:", this.newsletterEmail);

        // You can add your newsletter subscription logic here
        // For example, API call to your backend

        // Show success message (you can use toast/notification)
        alert("Thank you for subscribing to our newsletter!");
        this.newsletterEmail = "";
      } else {
        alert("Please enter a valid email address.");
      }
    },

    /**
     * Validates an email address format
     *
     * @param {string} email - The email address to validate
     * @returns {boolean} True if the email format is valid, false otherwise
     */
    isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },
  },
};
</script>

<!-- 
  Scoped styles that only apply to this component
  Includes styling for footer sections, links, and responsive design
-->
<style scoped>
.app-footer {
  background-color: #1a1a1a;
  border-top: 3px solid #ffc107;
  margin-top: auto;
}

.footer-logo {
  max-height: 50px;
  width: auto;
}

.footer-description {
  color: #bdc3c7;
  font-size: 0.9rem;
  line-height: 1.5;
}

.footer-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #fff;
  position: relative;
}

.footer-title::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -5px;
  width: 30px;
  height: 2px;
  background: #ffc107;
}

.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-links li {
  margin-bottom: 0.5rem;
}

.footer-links a {
  color: #bdc3c7;
  text-decoration: none;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.footer-links a:hover {
  color: var(--secondary) !important;
  padding-left: 5px;
}

/* Social Links */
.social-links {
  display: flex;
  gap: 0.5rem;
}

.social-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(52, 152, 219, 0.1);
  color: #3498db;
  border-radius: 50%;
  text-decoration: none;
  transition: all 0.3s ease;
}

.social-link:hover {
  background: #3498db;
  color: white;
  transform: translateY(-2px);
}

/* Contact Info */
.contact-info {
  font-size: 0.9rem;
}

.contact-item {
  margin-bottom: 1rem;
}

.contact-icon {
  color: #3498db;
  font-size: 1.1rem;
  margin-top: 2px;
  width: 18px;
  text-align: center;
}

.contact-label {
  font-weight: 600;
  color: #fff;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

.contact-link {
  color: #bdc3c7;
  text-decoration: none;
  transition: color 0.3s ease;
}

.contact-link:hover {
  color: #3498db;
}

.contact-address {
  color: #bdc3c7;
  font-style: normal;
  line-height: 1.4;
}

.contact-hours {
  color: #bdc3c7;
  line-height: 1.4;
}

/* Newsletter Section */
.newsletter-section {
  background: rgba(0, 0, 0, 0.2);
}

.newsletter-title {
  color: #fff;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.newsletter-text {
  color: #bdc3c7;
  font-size: 0.9rem;
}

.newsletter-form .form-control {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 6px 0 0 6px;
}

.newsletter-form .form-control::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.newsletter-form .form-control:focus {
  background: rgba(255, 255, 255, 0.15);
  border-color: #3498db;
  color: #fff;
  box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25);
}

.newsletter-form .btn-primary {
  background: #3498db;
  border-color: #3498db;
  border-radius: 0 6px 6px 0;
  font-weight: 500;
}

.newsletter-form .btn-primary:hover {
  background: #2980b9;
  border-color: #2980b9;
}

/* Copyright Section */
.copyright-section {
  background: rgba(0, 0, 0, 0.3);
}

.copyright-text {
  color: #bdc3c7;
  font-size: 0.9rem;
}

.powered-by {
  font-size: 0.85rem;
}

.footer-brand img {
  height: 140px;
  width: 100%;
  object-fit: cover;
}

/* Responsive Design */
@media (max-width: 768px) {
  .footer-brand {
    text-align: center;
    margin-bottom: 2rem;
  }

  .social-links {
    justify-content: center;
  }

  .newsletter-section .col-md-6:first-child {
    text-align: center;
  }

  .copyright-section .col-md-6 {
    text-align: center;
  }

  .footer-title::after {
    /* left: 50%; */
    /* transform: translateX(-50%); */
  }
}

@media (max-width: 576px) {
  .app-footer .container {
    padding-left: 15px;
    padding-right: 15px;
  }

  .contact-item .d-flex {
    align-items: center;
  }

  .newsletter-form .input-group {
    flex-direction: column;
  }

  .newsletter-form .form-control {
    border-radius: 6px;
    margin-bottom: 10px;
  }

  .newsletter-form .btn {
    border-radius: 6px;
    width: 100%;
  }

  .footer-title::after {
    content: "";
    position: absolute;
    /* right: 2000px; */
    /* bottom: -5px; */
    /* width: 50px; */
    /* height: 2px; */
    /* background: red; */
  }
}
</style>
