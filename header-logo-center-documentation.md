# Header Logo Centering Documentation

## Issue Description
Center the logo in the header.

## Changes Made

The following changes were made to implement the requested logo centering:

1. Modified `src/components/Header.vue`:
   - Moved the logo out of the right-side container and placed it in its own centered container at the top of the header
   - Added appropriate CSS classes for centering
   - Maintained the overall layout and functionality of the header

## Implementation Details

### Before:
```html
<div class="d-flex align-items-center justify-content-between">
  <!-- Mobile toggle drawer button -->
  <button
    class="navbar-toggler border-0 me-2 text-dark"
    type="button"
    @click="openDrawer"
  >
    <i class="bi bi-list fs-4"></i>
  </button>

  <nav
    class="d-none d-lg-block navbar navbar-expand-lg navbar-light navbar-only"
  >
    <!-- Navigation items -->
  </nav>

  <div class="d-flex align-items-center">
    <div class="ms-2 d-none d-lg-block" v-if="!isHeaderFixed">
      <AdvertiseCTA />
    </div>
    <router-link class="navbar-brand" to="/">
      <img
        src="/logo/Lauduim Header Logo.png"
        alt="Laudium Biz"
        height="57"
        width="183"
        class="header-logo me-2"
      />
    </router-link>
  </div>
</div>
```

### After:
```html
<!-- Logo centered at the top -->
<div class="text-center mb-2 mt-2">
  <router-link class="navbar-brand d-inline-block" to="/">
    <img
      src="/logo/Lauduim Header Logo.png"
      alt="Laudium Biz"
      height="57"
      width="183"
      class="header-logo"
    />
  </router-link>
</div>

<div class="d-flex align-items-center justify-content-between">
  <!-- Mobile toggle drawer button -->
  <button
    class="navbar-toggler border-0 me-2 text-dark"
    type="button"
    @click="openDrawer"
  >
    <i class="bi bi-list fs-4"></i>
  </button>

  <nav
    class="d-none d-lg-block navbar navbar-expand-lg navbar-light navbar-only"
  >
    <!-- Navigation items -->
  </nav>

  <div class="d-flex align-items-center">
    <div class="ms-2 d-none d-lg-block" v-if="!isHeaderFixed">
      <AdvertiseCTA />
    </div>
  </div>
</div>
```

## Responsive Behavior

The changes maintain responsive behavior across different screen sizes:
- The logo is centered using Bootstrap's `text-center` class, which works across all screen sizes
- The `d-inline-block` class on the navbar-brand ensures proper centering
- Margin classes (`mb-2 mt-2`) provide appropriate spacing
- The existing responsive layout of the header is preserved, including the mobile toggle button and navigation menu

These changes ensure that the logo is properly centered in the header while maintaining the overall functionality and responsiveness of the site.