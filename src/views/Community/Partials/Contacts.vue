<template>
  <div>
    <!-- Emergency Contacts -->
    <div class="emergency-contact mb-4">
      <h5>Emergency Contacts</h5>
      <div class="d-grid gap-2 mt-3">
        <a href="tel:+270607911911" class="btn btn-danger">
          Laudium Disaster Emergency: 060 791 1911
        </a>
        <a href="tel:+270799110911" class="btn btn-danger">
          CMB: 079 911 0911
        </a>
        <a href="tel:10111" class="btn btn-outline-secondary">
          SAPS Emergency: 10111
        </a>
        <a href="tel:10177" class="btn btn-outline-secondary">
          Gauteng Ambulance: 10177
        </a>
        <a href="tel:084124" class="btn btn-outline-secondary">
          <i class="bi bi-truck me-2"></i> ER24: 084 124
        </a>
        <a href="tel:082911" class="btn btn-outline-secondary">
          <i class="bi bi-truck me-2"></i> Netcare911: 082 911
        </a>
        <a href="tel:0839000786" class="btn btn-outline-secondary">
          <i class="bi bi-truck me-2"></i> Rescue 786 (JHB): 083 900 0786
        </a>
      </div>
    </div>

    <!-- Important Contacts -->
    <div class="card contacts mb-4">
      <div
        class="card-header d-flex justify-content-between align-items-center"
      >
        <h5 class="mb-0">Important Contacts</h5>
        <button
          class="btn btn-sm btn-outline-secondary d-md-none"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#importantContactsCollapse"
          aria-expanded="false"
          aria-controls="importantContactsCollapse"
        >
          <i class="bi bi-chevron-down"></i>
        </button>
      </div>

      <div class="collapse d-md-block" id="importantContactsCollapse">
        <div class="card-body p-0">
          <div class="list-group list-group-flush">
            <!-- PMT BURIAL -->
            <div class="list-group-item">
              <h6 class="mb-1">PMT BURIAL</h6>
              <ul class="list-unstyled small mb-0">
                <li><a href="tel:0827786357">Yasser: 082 778 6357</a></li>
                <li><a href="tel:0824786660">Zain: 082 478 6660</a></li>
                <li><a href="tel:0828453875">Ebie: 082 845 3875</a></li>
                <li><a href="tel:0790786081">Naeem: 079 078 6081</a></li>
                <li><a href="tel:0606062786">Mukhtar: 060 606 2786</a></li>
                <li><a href="tel:0825047315">Faizaan: 082 504 7315</a></li>
              </ul>
            </div>

            <a
              href="tel:0860037566"
              class="list-group-item list-group-item-action"
            >
              <h6 class="mb-1">Eskom</h6>
              <small class="text-muted">086 003 7566</small>
            </a>

            <a
              href="tel:0116820911"
              class="list-group-item list-group-item-action"
            >
              <h6 class="mb-1">Rand Water Head Office</h6>
              <small class="text-muted">011 682 0911</small>
            </a>

            <a
              href="tel:0801111556"
              class="list-group-item list-group-item-action"
            >
              <h6 class="mb-1">Water & Sanitation</h6>
              <small class="text-muted">080 111 1556</small>
            </a>

            <!-- City of Tshwane -->
            <div class="list-group-item">
              <h6 class="mb-1">City of Tshwane</h6>
              <ul class="list-unstyled small mb-0">
                <li>
                  <a href="tel:0123582398">Office hours: 012 358 2398</a>
                </li>
                <li>
                  <a href="tel:0123582302">After hours: 012 358 2302</a>
                </li>
                <li>
                  <a href="tel:0123589999">Call Centre: 012 358 9999</a>
                </li>
              </ul>
            </div>

            <a
              href="tel:0860562874"
              class="list-group-item list-group-item-action"
            >
              <h6 class="mb-1">City of JHB</h6>
              <small class="text-muted">086 056 2874 / 0860-JOBURG</small>
            </a>

            <a
              href="tel:0609107742"
              class="list-group-item list-group-item-action"
            >
              <h6 class="mb-1">e-Joburg WhatsApp</h6>
              <small class="text-muted">060 910 7742</small>
            </a>

            <!-- SAPS -->
            <div class="list-group-item">
              <h6 class="mb-1">Laudium SAPS</h6>
              <ul class="list-unstyled small mb-0">
                <li>
                  <a href="tel:0123749840">Station: 012 374 9840/1</a>
                </li>
                <li>
                  <a href="tel:0716756484">Relief Commander: 071 675 6484</a>
                </li>
              </ul>
            </div>

            <a
              href="tel:0716757338"
              class="list-group-item list-group-item-action"
            >
              <h6 class="mb-1">Erasmia SAPS (Capt Van De Vyfer)</h6>
              <small class="text-muted">071 675 7338</small>
            </a>

            <a
              href="tel:0860010111"
              class="list-group-item list-group-item-action"
            >
              <h6 class="mb-1">SAPS Crime Stop</h6>
              <small class="text-muted">086 001 0111</small>
            </a>

            <!-- Tshwane Metro -->
            <div class="list-group-item">
              <h6 class="mb-1">Tshwane Metro Police</h6>
              <ul class="list-unstyled small mb-0">
                <li><a href="tel:0124814000">012 481 4000</a></li>
                <li><a href="tel:0808746433">080 874 6433</a></li>
              </ul>
            </div>

            <a
              href="tel:0799834880"
              class="list-group-item list-group-item-action"
            >
              <h6 class="mb-1">Laudium CPF</h6>
              <small class="text-muted">079 983 4880</small>
            </a>

            <a
              href="tel:0123741584"
              class="list-group-item list-group-item-action"
            >
              <h6 class="mb-1">IIS</h6>
              <small class="text-muted">012 374 1584</small>
            </a>

            <a
              href="tel:0827047497"
              class="list-group-item list-group-item-action"
            >
              <h6 class="mb-1">Centurion Funeral Directors (non-Muslim)</h6>
              <small class="text-muted">082 704 7497</small>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.emergency-contact {
  background-color: #f8d7da;
  border-left: 4px solid #dc3545;
  padding: 15px;
  border-radius: 6px;
}
.contact-card {
  transition: transform 0.3s;
}
.contact-card:hover {
  transform: translateY(-5px);
}
.contracts {
  background-color: var(--secondary) !important;
}

.card-header > h2 {
  color: var(--secondary) !important;
}

a {
  text-decoration: none;
  color: inherit !important;
}

li {
  margin: 2px 0;
}
</style>
