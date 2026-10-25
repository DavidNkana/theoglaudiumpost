# Header Layout Changes Documentation

## Issue Description
Remove the search button and move the logo to the right side of the header.

## Changes Made

The following changes were made to implement the requested header layout modifications:

1. Modified `src/components/Header.vue`:
   - Removed the import statement for the HeaderSearch component
   - Removed the HeaderSearch component from the template
   - Moved the logo (router-link with navbar-brand class) from the left side to the right side of the header

## Implementation Details

### Before:
```html
<!-- Import statement -->
import HeaderSearch from "./HeaderSearch.vue";

<!-- Left side of header with logo -->
<button class="navbar-toggler border-0 me-2 text-dark" type="button" @click="openDrawer">
  <i class="bi bi-list fs-4"></i>
</button>

<router-link class="navbar-brand" to="/">
  <img
    src="/logo/logo-notext.png"
    alt="Laudium Biz"
    height="64"
    width="72"
    class="me-2"
  />
</router-link>

<!-- Right side of header with search -->
<div class="d-flex align-items-center">
  <div class="ms-2 d-none d-lg-block" v-if="!isHeaderFixed">
    <AdvertiseCTA />
  </div>
  <HeaderSearch />
</div>
```

### After:
```html
<!-- Import statement - HeaderSearch removed -->
<!-- No HeaderSearch import -->

<!-- Left side of header - logo removed -->
<button class="navbar-toggler border-0 me-2 text-dark" type="button" @click="openDrawer">
  <i class="bi bi-list fs-4"></i>
</button>

<!-- Right side of header with logo added -->
<div class="d-flex align-items-center">
  <div class="ms-2 d-none d-lg-block" v-if="!isHeaderFixed">
    <AdvertiseCTA />
  </div>
  <router-link class="navbar-brand" to="/">
    <img
      src="/logo/logo-notext.png"
      alt="Laudium Biz"
      height="64"
      width="72"
      class="me-2"
    />
  </router-link>
</div>
```

These changes ensure that:
1. The search button is completely removed from the header
2. The logo is moved from the left side to the right side of the header
3. The overall layout structure is maintained with proper spacing and alignment