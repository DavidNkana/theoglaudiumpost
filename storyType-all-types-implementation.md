# StoryType Parameter Implementation for All Story Types

This document outlines the changes made to implement the storyType parameter for all three story types (popular, featured, top) in the `/news` page, following the same approach used in the Pinterest gallery.

## Issue Overview

The issue required implementing the storyType parameter for all three story types in the `/news` page:

1. Popular stories: `http://192.168.0.247:9011/laudium/api/v1/media/23?storyType=popular`
2. Featured stories: `http://192.168.0.247:9011/laudium/api/v1/media/25?storyType=featured`
3. Top stories: `http://192.168.0.247:9011/laudium/api/v1/media/27?storyType=top`

The goal was to use the same approach as the Pinterest gallery for fetching media with the storyType parameter.

## Changes Made

### 1. NewsCard Component Updates

The NewsCard component was updated to handle all three story types consistently:

1. Added an `isPopular` prop to identify popular stories:

```javascript
/**
 * Whether this is a popular story article
 * @type {Boolean}
 * @default false
 */
isPopular: {
  type: Boolean,
  default: false,
},
```

2. Updated the `fetchMedia` function to check for all three story types:

```javascript
// Determine the appropriate storyType based on article properties
let storyType = null;

if (props.featured) {
  storyType = "featured";
} else if (props.isTopStory || 
          props.article.isTopStory || 
          (props.article.type && props.article.type === "topStories") ||
          (props.article.tags && props.article.tags.some(tag => tag.name.toLowerCase() === "top story"))) {
  storyType = "top";
} else if (props.isPopular || 
          (props.article.type && props.article.type === "popular") ||
          (props.article.tags && props.article.tags.some(tag => tag.name.toLowerCase() === "popular"))) {
  storyType = "popular";
}
```

This ensures that the appropriate storyType parameter is passed to the `getMediaById` function based on the article type.

### 2. ArticlesRow Component Updates

The ArticlesRow component, which is used by the PopularStories component, was updated to use the NewsCard component with the isPopular prop:

1. Imported the NewsCard component:

```javascript
import NewsCard from "@/components/NewsCard.vue";
```

2. Updated the template to use the NewsCard component with isPopular={true}:

```html
<div class="flex-shrink-0 popular-image">
  <NewsCard 
    :article="newsItem" 
    :isPopular="true" 
    :minDetails="true"
  />
</div>
```

3. Added CSS to maintain a similar layout:

```css
.popular-image {
  width: 100px;
  height: 70px;
  overflow: hidden;
}

.popular-image .news-card {
  box-shadow: none !important;
  transform: none !important;
  height: 70px !important;
}

.popular-image .card-img-container {
  height: 70px !important;
}

.popular-item {
  align-items: flex-start;
}

.popular-content {
  padding-top: 0;
}
```

## How the StoryType Parameter is Used

The storyType parameter is passed to the `getMediaById` function in the media service:

```javascript
export const getMediaById = (id, storyType) => {
  // If storyType is provided, add it as a query parameter
  const params = storyType ? { storyType } : {};
  return api.get(`/media/${id}`, { params });
};
```

This results in the following API requests:

1. Popular stories: `/media/23?storyType=popular`
2. Featured stories: `/media/25?storyType=featured`
3. Top stories: `/media/27?storyType=top`

The backend can then use this parameter to serve the appropriate image for each story type.

## Testing and Verification

A test script (`test-storyType-all-types.js`) was created to verify that the storyType parameter is being passed correctly for all three story types. The script tests:

1. Media URL construction for all three story types using the specific media IDs mentioned in the issue description
2. NewsCard component logic for determining the storyType based on various props and article properties

The test script includes a comprehensive set of test cases covering all the ways the storyType can be determined:
- Via props (featured, isTopStory, isPopular)
- Via article properties (isTopStory, type)
- Via article tags

## Summary

These changes ensure that all three story types (popular, featured, top) in the `/news` page use the same approach as the Pinterest gallery for fetching media with the storyType parameter. This provides a consistent experience across the application and allows the backend to serve the appropriate image for each story type.

The implementation is backward compatible with existing code and maintains the same visual appearance while using the improved media fetching approach.