# Header Color Change Documentation

## Issue Description
Change the header background color to rgb(248, 200, 28).

## Changes Made

The following changes were made to implement the requested header color change:

1. Modified `src/components/Header.vue`:
   - Removed the `bg-dark` class from the header element
   - Added `background-color: rgb(248, 200, 28);` to the `.app-header` CSS class
   - Changed `navbar-dark` to `navbar-light` for better text contrast against the new yellow background
   - Changed `text-white` to `text-dark` for the mobile toggle button for better visibility

## Implementation Details

### Before:
```html
<header class="app-header bg-dark fixed-header">
```

```css
.app-header {
  transition: all 0.3s ease;
}
```

### After:
```html
<header class="app-header fixed-header">
```

```css
.app-header {
  transition: all 0.3s ease;
  background-color: rgb(248, 200, 28);
}
```

### Additional Changes for Better Contrast:
- Changed the navbar class from `navbar-dark` to `navbar-light`
- Changed the mobile toggle button class from `text-white` to `text-dark`

These changes ensure that the text and icons in the header have good contrast against the new yellow background color.