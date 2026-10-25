<template>
  <div class="terms-page">
    <!-- Page Header -->
    <div class="page-header bg-success text-white py-2">
      <div class="container">
        <div class="row">
          <div class="col-12">
            <h1 class="display-4 mb-2">Terms of Use & Content Usage Policy</h1>
            <p class="lead mb-0">
              Please read these terms carefully before using our website
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Terms Content -->
    <div class="container py-3">
      <div class="">
        <div class="">
          <!-- Effective Date -->
          <div class="mb-4">
            <div class="d-flex justify-content-between align-items-center">
              <h5><strong>Effective Date:</strong> 01-06-2025</h5>
              <!-- <div><strong>Website:</strong> www.laudiumbiz.co.za</div> -->
            </div>
          </div>

          <!-- Terms Sections -->
          <div>
            <!-- Section 1 -->
            <section class="mb-3">
              <h2 class="section-title">1. Acceptance of Terms</h2>
              <div class="section-content">
                <p>
                  By accessing and using this website, you agree to be bound by
                  these Terms of Use. If you do not agree with any part of these
                  terms, please do not use this site.
                </p>
              </div>
            </section>

            <!-- Section 2 -->
            <section class="mb-3">
              <h2 class="section-title">2. Intellectual Property</h2>
              <div class="section-content">
                <p>
                  All content created by Laudium Post, including text, logos,
                  graphics, and design, is protected by intellectual property
                  laws and may not be reproduced, distributed, or used without
                  prior written permission.
                </p>

                <div class="row">
                  <div class="col-md-6">
                    <div class="">
                      <h5 class="">
                        <i class="fas fa-check-circle me-2"></i>You may:
                      </h5>
                      <ul>
                        <li>
                          Share links to our content with proper attribution
                        </li>
                        <li>
                          Use our content for personal, non-commercial use
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="">
                      <h5 class="">
                        <i class="fas fa-times-circle me-2"></i>You may not:
                      </h5>
                      <ul>
                        <li>
                          Repost full articles or media without permission
                        </li>
                        <li>
                          Use our branding for your own projects without consent
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div class="contact-info mt-2">
                  <p>
                    <strong
                      >For permissions or syndication requests, contact:
                    </strong>
                    <a href="mailto:info@lauduimbiz.co.za"
                      >info@lauduimbiz.co.za</a
                    >
                  </p>
                </div>
              </div>
            </section>

            <!-- Section 3 -->
            <section class="mb-3">
              <h2 class="section-title">3. Trademarks</h2>
              <div class="section-content">
                <p>
                  The name <strong>Laudium POST Community News</strong>, its
                  logo, and tagline are trademarks of this platform.
                  Unauthorized use is prohibited.
                </p>
              </div>
            </section>

            <!-- Section 4 -->
            <section class="mb-3">
              <h2 class="section-title">4. Disclaimer</h2>
              <div class="section-content">
                <div class="">
                  <p class="m-0">
                    The content on Laudium POST is for informational purposes
                    only and reflects the views of the community contributors.
                    We do not guarantee the accuracy, completeness, or
                    reliability of any information shared on the app.
                  </p>

                  <p class="mb-0">
                    We are not liable for any loss or damage resulting from your
                    reliance on information provided by the app. Always verify
                    news independently before taking any action based on it.
                  </p>
                </div>
              </div>
            </section>

            <!-- Section 5 -->
            <section class="mb-3">
              <h2 class="section-title">5. Third-Party Links</h2>
              <div class="section-content">
                <p>
                  Our site may contain links to other websites. We are not
                  responsible for the privacy practices of those sites.
                </p>
              </div>
            </section>

            <!-- Section 6 -->
            <section class="mb-3">
              <h2 class="section-title">6. Changes to These Terms</h2>
              <div class="section-content">
                <p>
                  We may update these Terms of Use from time to time. Continued
                  use of the site after changes means you accept the revised
                  terms.
                </p>
              </div>
            </section>

            <!-- Section 7 -->
            <section class="mb-3">
              <h2 class="section-title">7. Contact Us</h2>
              <div class="section-content">
                <div class="">
                  <p class="m-0">
                    For questions about these terms or for legal inquiries,
                    contact:
                  </p>
                  <p class="mb-0">
                    <strong>Email: </strong>
                    <a href="mailto:info@lauduimbiz.co.za" class="contact-link"
                      >info@lauduimbiz.co.za</a
                    >
                  </p>
                </div>
              </div>
            </section>
          </div>

          <!-- Footer Actions -->
          <!-- <div class="terms-footer text-center mt-5 pt-4 border-top">
            <p class="text-muted mb-3">Last updated: June 1, 2025</p>
            <div class="d-flex justify-content-center gap-3">
              <button @click="$router.go(-1)" class="btn btn-outline-secondary">
                <i class="fas fa-arrow-left me-2"></i>Go Back
              </button>
              <button @click="printPage" class="btn btn-outline-primary">
                <i class="fas fa-print me-2"></i>Print Terms
              </button>
            </div>
          </div> -->
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "TermsOfUsePage",
  mounted() {
    // Set page title
    document.title = "Terms of Use - Laudium Post Community News";

    // Add meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Terms of Use and Content Usage Policy for Laudium Post Community News website."
      );
    }
  },
};
</script>

<style scoped>
.terms-page {
  min-height: 100vh;
  /* background-color: #f8f9fa; */
}

.page-header {
  background: linear-gradient(
    135deg,
    rgba(var(--bs-success-rgb), var(--bs-bg-opacity)) 0%,
    rgba(var(--bs-success-rgb), var(--bs-bg-opacity)) 100%
  );
}

.terms-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.section-title {
  color: #2c3e50;
  font-size: 1.5rem;
  font-weight: 600;
  /* margin-bottom: 2rem; */
  /* padding-bottom: 0.5rem; */
  /* border-bottom: 2px solid #007bff; */
}

.section-content p {
  line-height: 1.6;
  color: #495057;
  margin-bottom: 1rem;
}

.permissions-box {
  margin: 1.5rem 0;
}

.permission-card {
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.permission-card.allowed {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}

.permission-card.not-allowed {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}

.permission-card ul {
  margin: 0.5rem 0 0 0;
  padding-left: 1.2rem;
}

.permission-card li {
  margin-bottom: 0.5rem;
}

.disclaimer-box {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 1.5rem;
}

.contact-card {
  background-color: #e3f2fd;
  border: 1px solid #bbdefb;
  border-radius: 8px;
  padding: 1.5rem;
}

.contact-info a,
.contact-link {
  color: #007bff;
  text-decoration: none;
  font-weight: 500;
}

.contact-info a:hover,
.contact-link:hover {
  color: #0056b3;
  text-decoration: underline;
}

.terms-footer {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.btn {
  border-radius: 6px;
  padding: 0.5rem 1.5rem;
  font-weight: 500;
}

.btn i {
  font-size: 0.9rem;
}

section:not(:last-child) {
  border-bottom: 1px solid #000;
}

/* Mobile phones (up to 575px) */
@media (max-width: 575px) {
  .page-header {
    padding: 1.5rem 0;
  }

  .page-header h1 {
    font-size: 1.75rem;
    margin-bottom: 0.75rem;
  }

  .page-header .lead {
    font-size: 1rem;
  }

  .container {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  .terms-content {
    padding: 1.5rem;
    margin-bottom: 1rem;
  }

  .section-title {
    font-size: 1.25rem;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
  }

  .section-content p {
    font-size: 0.95rem;
    line-height: 1.6;
  }

  .alert-info {
    padding: 1rem;
    flex-direction: column;
    text-align: center;
  }

  .alert-info .d-flex {
    flex-direction: column;
    gap: 0.5rem;
  }

  .permission-card {
    padding: 1.25rem;
  }

  .permission-card h5 {
    font-size: 1rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .permission-card i {
    font-size: 1.2rem;
  }

  .disclaimer-box,
  .contact-card {
    padding: 1.25rem;
  }

  .disclaimer-box::before,
  .contact-card::before {
    position: static;
    display: block;
    text-align: center;
    margin-bottom: 0.5rem;
    background: none;
    padding: 0;
  }

  .terms-footer {
    padding: 1.5rem;
  }

  .terms-footer p {
    font-size: 0.9rem;
  }

  .btn {
    font-size: 0.9rem;
    padding: 0.625rem 1rem;
  }
}

/* Extra small phones (up to 480px) */
@media (max-width: 480px) {
  .page-header h1 {
    font-size: 1.5rem;
  }

  .terms-content {
    padding: 1rem;
  }

  .section-title {
    font-size: 1.1rem;
  }

  .section-content p {
    font-size: 0.9rem;
  }

  .permission-card,
  .disclaimer-box,
  .contact-card {
    padding: 1rem;
  }

  .terms-footer {
    padding: 1rem;
  }
}

/* Print Styles */
@media print {
  .page-header,
  .terms-footer {
    display: none !important;
  }

  .terms-page {
    background: white !important;
  }

  .terms-content {
    box-shadow: none !important;
    padding: 0 !important;
  }

  .section-title {
    color: black !important;
    border-bottom-color: black !important;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .page-header {
    padding: 2rem 0 !important;
  }

  .page-header h1 {
    font-size: 2rem !important;
  }

  .terms-content {
    padding: 1.5rem;
  }

  .permissions-box .row {
    margin: 0;
  }

  .permissions-box .col-md-6 {
    padding: 0 0 1rem 0;
  }

  .terms-footer .d-flex {
    flex-direction: column;
    gap: 1rem !important;
  }
}
</style>
