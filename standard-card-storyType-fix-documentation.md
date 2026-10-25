# StandardCard storyType Parameter Fix

This document outlines the changes made to fix the issue with the StandardCard component not passing the storyType parameter correctly when fetching media.

## Issue Description

The StandardCard component was experiencing an error when fetching media:

```
StandardCard.vue:81 Error fetching media: 
AxiosError {message: 'Request failed with status code 400', name: 'AxiosError', code: 'ERR_BAD_REQUEST', config: {…}, request: XMLHttpRequest, …}
```

The error occurred because the storyType parameter was not being passed correctly when calling the getMediaById function. The storyType parameter is required for the media endpoint to return the correct image for different types of articles (featured, top, popular).

## Root Cause Analysis

After investigating the issue, the following root causes were identified:

1. The StandardCard component was only checking article properties to determine the storyType, but not all articles have these properties set.
2. Unlike the NewsCard component, StandardCard did not have props for isFeatured, isTopStory, and isPopular to explicitly indicate the article type.
3. The components using StandardCard (FeaturedArticles.vue and LatestNews.vue) were not passing any props to indicate the article type.

## Changes Made

### 1. Added Props to StandardCard Component

Added props for isFeatured, isTopStory, and isPopular to the StandardCard component:

```javascript
/**
 * Whether this is a featured article
 * @type {Boolean}
 * @default false
 */
isFeatured: {
  type: Boolean,
  default: false,
},

/**
 * Whether this is a top story article
 * @type {Boolean}
 * @default false
 */
isTopStory: {
  type: Boolean,
  default: false,
},

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

### 2. Updated fetchMedia Function in StandardCard

Modified the fetchMedia function to check the props when determining the storyType:

```javascript
// Determine the appropriate storyType based on props and article properties
let storyType = null;

if (props.isFeatured || 
    props.article.type === "featured" || 
    (props.article.tags && props.article.tags.some(tag => tag.name.toLowerCase() === "featured"))) {
  storyType = "featured";
} else if (props.isTopStory || 
          props.article.isTopStory || 
          props.article.type === "topStories" ||
          (props.article.tags && props.article.tags.some(tag => tag.name.toLowerCase() === "top story"))) {
  storyType = "top";
} else if (props.isPopular || 
          props.article.type === "popular" ||
          (props.article.tags && props.article.tags.some(tag => tag.name.toLowerCase() === "popular"))) {
  storyType = "popular";
}
```

### 3. Updated Components Using StandardCard

#### FeaturedArticles.vue

Updated FeaturedArticles.vue to pass the isFeatured prop to StandardCard:

```html
<StandardCard v-else :article="article" :isFeatured="true" />
```

#### LatestNews.vue

Updated LatestNews.vue to pass the isTopStory prop to StandardCard when props.page is "home":

```html
<StandardCard v-else :article="article" :isTopStory="props.page === 'home'" />
```

## Testing

A test script (test-standard-card-storyType.js) was created to verify that the fix works correctly. The script tests:

1. The media URL construction with different storyType parameters (none, top, featured, popular)
2. The StandardCard component's logic for determining the storyType based on props and article properties

The test script includes comprehensive test cases for all the ways the storyType can be determined:
- Via props (isFeatured, isTopStory, isPopular)
- Via article properties (type, isTopStory)
- Via article tags

## Verification

The changes ensure that:

1. When StandardCard is used in FeaturedArticles.vue, it passes storyType="featured" to the getMediaById function.
2. When StandardCard is used in LatestNews.vue with props.page="home", it passes storyType="top" to the getMediaById function.
3. When StandardCard is used in other contexts, it determines the storyType based on article properties.

This fix ensures that the media endpoint receives the correct storyType parameter, which prevents the 400 Bad Request error and allows the correct image to be displayed for each article type.

## Summary

The issue was fixed by:

1. Adding props to StandardCard to explicitly indicate the article type
2. Updating the fetchMedia function to check these props when determining the storyType
3. Updating the components that use StandardCard to pass the appropriate props

These changes ensure that the storyType parameter is correctly passed to the getMediaById function, which prevents the 400 Bad Request error and allows the correct image to be displayed for each article type.