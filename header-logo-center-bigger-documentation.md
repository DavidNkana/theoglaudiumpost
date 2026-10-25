# Header Logo Centering and Size Increase Documentation

## Issue Description
Make the logo a bit bigger and make sure it's centered in the header.

## Changes Made

The following changes were made to implement the requested logo modifications:

1. Modified `src/components/Header.vue`:
   - Moved the logo from the right side to a centered position at the top of the header
   - Increased the logo size from 128×40px to 150×47px (approximately 17% larger)
   - Added appropriate CSS classes for centering
   - Updated the max-height CSS property from 40px to 47px to accommodate the larger size

## Implementation Details

### Before:
```html
<!-- Logo on right side -->
<div class="d-flex align-items-center">
  <div class="ms-2 d-none d-lg-block" v-if="!isHeaderFixed">
    <AdvertiseCTA />
  </div>
  <router-link class="navbar-brand ms-2" to="/">
    <img
      src="/logo/Lauduim Header Logo.png"
      alt="Laudium Biz"
      height="40"
      width="128"
      class="header-logo"
    />
  </router-link>
</div>

<!-- CSS -->
.header-logo {
  display: block;
  max-height: 40px;
  width: auto;
  object-fit: contain;
  transition: all 0.3s ease;
}
```

### After:
```html
<!-- Centered logo at the top -->
<div class="text-center mb-2 mt-2">
  <router-link class="navbar-brand d-inline-block" to="/">
    <img
      src="/logo/Lauduim Header Logo.png"
      alt="Laudium Biz"
      height="47"
      width="150"
      class="header-logo"
    />
  </router-link>
</div>

<!-- Right side without logo -->
<div class="d-flex align-items-center">
  <div class="ms-2 d-none d-lg-block" v-if="!isHeaderFixed">
    <AdvertiseCTA />
  </div>
</div>

<!-- CSS -->
.header-logo {
  display: block;
  max-height: 47px;
  width: auto;
  object-fit: contain;
  transition: all 0.3s ease;
}
```

## Responsive Behavior

The changes maintain responsive behavior across different screen sizes:
- The logo is centered using Bootstrap's `text-center` class, which works across all screen sizes
- The `d-inline-block` class on the navbar-brand ensures proper centering
- Margin classes (`mb-2 mt-2`) provide appropriate spacing
- The increased size (150×47px) is approximately 17% larger than before but still smaller than the original image dimensions (183×57px) to avoid being too large
- The max-height CSS property was updated to match the new height while maintaining proper scaling

These changes ensure that the logo is properly centered in the header and slightly larger than before, while maintaining the overall functionality and responsiveness of the site.