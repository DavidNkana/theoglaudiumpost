# StandardCard Component Implementation

This document outlines the implementation of the StandardCard component in the Laudium Biz application.

## Issue Description

The application needed a consistent standard card component for displaying article information in a horizontal layout. The HTML structure for this component was provided, but it was not implemented as a reusable component. Instead, the structure was duplicated in multiple places, leading to inconsistency and maintenance challenges.

The required HTML structure was:

```html
<div class="standard-card">
  <div class="card border-0 shadow-sm hover-card row-article">
    <div class="row g-0">
      <div class="col-4 col-sm-12 d-lg-none d-xl-block col-xl-4">
        <img class="img-fluid rounded rounded-lg-start article-img" alt="News Image">
      </div>
      <div class="col-8 col-sm-12 col-xl-8">
        <div class="card-body">
          <h3 class="card-title h5">
            <a href="/news/article-slug" class="nav-link title article-excerpt">Article Title</a>
          </h3>
          <p class="card-text article-excerpt">Article Summary</p>
          <div class="d-flex mb-2">
            <span class="badge bg-success me-2">Category</span>
            <small class="text-muted">Date</small>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

## Solution

The solution was to create a reusable StandardCard component that implements this structure and can be used consistently throughout the application. The component:

1. Accepts an article object as a prop
2. Handles image loading with a loading spinner
3. Displays the article title, summary, category, and date
4. Adapts to different screen sizes with responsive column classes
5. Includes hover effects for better user experience

## Changes Made

### 1. Created StandardCard Component

Created a new file `src/components/StandardCard.vue` that implements the required structure:

```vue
<script setup>
/**
 * StandardCard.vue
 * 
 * A standard card component for displaying article information in a horizontal layout.
 * 
 * This component:
 * - Renders article previews with image on the left and content on the right
 * - Displays title, summary, category badge, and publication date
 * - Adapts to different screen sizes with responsive column classes
 * - Includes hover effects for better user experience
 */

import { formatDateToLongString, setDefaultImage } from "@/utils";
import { ref, onMounted, watch } from "vue";
import { getMediaById } from "@/services/media";

// Component props and implementation...
</script>

<template>
  <div class="standard-card">
    <div class="card border-0 shadow-sm hover-card row-article">
      <!-- Component template... -->
    </div>
  </div>
</template>

<style scoped>
/* Component styles... */
</style>
```

The component includes:
- Props for article data
- Image loading with a loading spinner
- Responsive layout with Bootstrap grid classes
- Hover effects and animations
- Proper handling of story types for media loading

### 2. Updated FeaturedArticles.vue

Modified `src/views/News/Partials/FeaturedArticles.vue` to use the new StandardCard component:

1. Added import for StandardCard:
   ```javascript
   import StandardCard from "@/components/StandardCard.vue";
   ```

2. Replaced the inline card implementation with the StandardCard component:
   ```html
   <StandardCard v-else :article="article" />
   ```

### 3. Updated LatestNews.vue

Modified `src/views/News/Partials/LatestNews.vue` to use the new StandardCard component:

1. Added import for StandardCard:
   ```javascript
   import StandardCard from "@/components/StandardCard.vue";
   ```

2. Updated the template to use StandardCard for non-featured articles:
   ```html
   <!-- Use NewsCard for featured article, StandardCard for others -->
   <NewsCard v-if="index === 0" :article="article" :featured="true" min-details />
   <StandardCard v-else :article="article" />
   ```

## Testing

A test script has been created to verify the implementation: `test-standard-card-implementation.js`

This script tests:
1. The existence and structure of the StandardCard component
2. Its usage in FeaturedArticles.vue
3. Its usage in LatestNews.vue

To run the test:

```bash
node test-standard-card-implementation.js
```

The test will check that:
- The StandardCard component exists and has the correct structure
- FeaturedArticles.vue imports and uses the StandardCard component
- LatestNews.vue imports and uses the StandardCard component for non-featured articles

## Benefits

This implementation provides several benefits:

1. **Consistency**: The same card structure is now used consistently throughout the application
2. **Maintainability**: Changes to the card structure only need to be made in one place
3. **Reusability**: The StandardCard component can be easily used in other parts of the application
4. **Improved User Experience**: The component includes loading indicators and hover effects

## Future Enhancements

Potential future enhancements for the StandardCard component:

1. Add more customization options through props
2. Implement skeleton loading for better loading experience
3. Add support for different card layouts (horizontal, vertical, compact)
4. Improve accessibility with ARIA attributes and keyboard navigation