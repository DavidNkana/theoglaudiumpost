# Card Border Fix Documentation

## Overview

This document outlines the changes made to move the border from the entire newspaper view container to each individual card, as requested in the issue description.

## Issue Description

The original issue requested adding a thin black border around the Pinterest view (now renamed to Newspaper view) and renaming everything from "Pinterest" to "newspaper". A follow-up issue specified that "the border must be around each card not the entire frame."

## Implementation Details

### 1. Removed Border from Container

The border was previously applied to the entire newspaper view container:

```css
.newspaper-view {
  padding: 0;
  background-color: #e9d8b8;
  color: #333;
  border: 1px solid black; /* This border was removed */
}
```

This border was removed from the `.newspaper-view` class in `src/views/Newspaper/NewspaperView.vue`.

### 2. Added Border to Individual Cards

The border was then added to each individual card by modifying the `.pin-card` class in `src/components/PinCard.vue`:

```css
.pin-card {
  width: 100%;
  height: 100%;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: none;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  border: 1px solid black; /* Added thin black border around each card */
}
```

This change ensures that each card has its own individual border, rather than having a single border around the entire container.

## Testing

The changes were tested to ensure:
1. The border appears correctly around each individual card
2. The border is consistent across different card types (top stories, featured, popular)
3. The border works well with the existing card styling (border-radius, hover effects)

## Visual Comparison

### Before:
- A single border around the entire newspaper view container
- Individual cards had no borders

### After:
- No border around the newspaper view container
- Each individual card has its own thin black border
- The border follows the rounded corners of each card (16px border-radius)

## Notes

- The border is applied to all cards regardless of their type (top story, featured, popular)
- The border is visible on both mobile and desktop views
- The border works with the existing hover effects on the cards