# App Background and Advertise With Us Changes

## Changes Made

### 1. Changed App Background Color to #f9ebd0

Modified the CSS variables in `src\assets\base.css`:

- Changed `--body-bg` from `#000000` to `#f9ebd0`
- Changed `--body-color` from `#ffffff` to `#000000` to ensure text is readable on the lighter background
- Updated `--color-background` to use `var(--body-bg)` instead of `var(--vt-c-black)`
- Updated `--color-background-soft` and `--color-background-mute` to use white variants instead of black variants
- Updated text color variables to use light variants for better readability on the light background

### 2. Changed "Advertise With Us" Background to Green

Modified `src\views\Business\AdvertiseWithUs.vue`:

- Added `advertise-container` class to the container div
- Added CSS rules in the style section to make the background green:
  ```css
  .advertise-container {
    background-color: green;
    color: white;
    border-radius: 8px;
  }
  ```

## Result

The application now has a light beige background (#f9ebd0) instead of the previous black background, and the "Advertise With Us" page has a green background with white text for better contrast.

## Note

There are duplicate declarations in the existing code in `AdvertiseWithUs.vue` (lines 176-177 have duplicate declarations of "amount_fee"), but these are unrelated to the changes made and were present in the original code.