# StandardCard News Page Image Loading Fix

This document outlines the changes made to fix the issue with images not displaying in the StandardCard component on the news page.

## Issue Description

The issue was that images were not displaying in the news page view. The HTML structure in the issue description showed:

```html
<div data-v-67105849="" class="col-md-4"><img data-v-67105849="" class="img-fluid rounded-start article-img" alt="News Image"></div>
```

This indicated that the image element was present but not displaying any content (no src attribute value).

## Root Cause Analysis

After investigating the code, the root cause was identified in the `LatestNews.vue` component. When `page === 'news'`, the component was using a direct HTML structure with an img tag that relied on `article.cover?.file` as the image source:

```html
<div class="col-md-4">
  <img
    :src="article.cover?.file"
    class="img-fluid rounded-start article-img"
    alt="News Image"
    @error="setDefaultImage"
  />
</div>
```

This approach had several issues:
1. It didn't use the `getMediaById` function to fetch the image with the appropriate storyType parameter
2. It relied on the article object having a cover.file property, which might not always be available
3. It didn't handle loading states or errors properly
4. It didn't benefit from the improvements made to the StandardCard component for handling different response formats

## Changes Made

The solution was to update the LatestNews.vue component to use the StandardCard component for the news page view instead of the direct HTML structure:

```html
<StandardCard 
  v-for="article in articlesData"
  :key="article.id"
  :article="article"
  :isTopStory="true"
  class="mb-4"
/>
```

This change ensures that:
1. The StandardCard component is used consistently throughout the application
2. The getMediaById function is used to fetch the image with the appropriate storyType parameter
3. Loading states and errors are handled properly
4. Both URL responses and blob responses are handled correctly

## Why This Fixes the Issue

The StandardCard component has a robust image loading mechanism that:

1. Determines the appropriate storyType parameter based on props and article properties
2. Uses the getMediaById function to fetch the image with the storyType parameter
3. Handles both URL responses and blob responses
4. Includes loading indicators and error handling

By using the StandardCard component for the news page view, we ensure that images are loaded correctly with the appropriate storyType parameter, which is essential for displaying the correct image for each article type.

## Testing

A test script (test-standard-card-image-loading.js) was created to verify that the StandardCard component correctly loads images with the appropriate storyType parameter. The test script:

1. Tests how the StandardCard component loads images with different storyType parameters (top, featured, popular, null)
2. Tests how it handles different response formats (URL and blob)
3. Verifies that the correct URL is used based on the storyType parameter
4. Checks that both URL responses and blob responses are handled correctly

The test results confirm that the implementation works correctly.

## Summary

The issue was fixed by updating the LatestNews.vue component to use the StandardCard component for the news page view instead of a direct HTML structure. This ensures that images are loaded correctly with the appropriate storyType parameter, which is essential for displaying the correct image for each article type.

The fix is minimal and focused on the specific issue, while also being robust enough to handle similar cases in the future. It also improves consistency across the application by using the StandardCard component in more places.