# StoryType Query Parameter Implementation

This document outlines the changes made to fix the issue with the storyType parameter not being passed for media ID 57 on the `/news` page.

## Issue Description

On the `/news` page, when fetching media with ID 57, the storyType parameter was not being passed in the GET request. This resulted in the media being fetched without the appropriate context, potentially affecting how the image is processed or displayed.

## Root Cause Analysis

After investigating the components on the `/news` page, the issue was identified in the TopStories component. This component displays articles in a horizontal scrollable list, using the NewsCard component to render each article.

The NewsCard component has logic to determine if an article is a top story based on various properties:
- props.article.isTopStory
- props.article.type === "topStories"
- props.article.tags containing a tag with name "top story"

However, for media ID 57, none of these conditions were being met, so the storyType parameter was not being passed when fetching the media.

## Changes Made

### 1. Added isTopStory prop to NewsCard component

Updated the NewsCard component to accept an explicit isTopStory prop:

```javascript
const props = defineProps({
  // ... existing props
  
  /**
   * Whether this is a top story article
   * @type {Boolean}
   * @default false
   */
  isTopStory: {
    type: Boolean,
    default: false,
  },
});
```

### 2. Updated TopStories component to pass isTopStory prop

Modified the TopStories component to explicitly pass isTopStory="true" to the NewsCard component:

```html
<NewsCard :article="story" :isTopStory="true" />
```

### 3. Updated fetchMedia function in NewsCard component

Updated the fetchMedia function to check the isTopStory prop when determining the storyType:

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
}
```

## Testing

### Verification of Changes

The changes made should logically fix the issue for the following reasons:

1. **Explicit prop passing**: By explicitly passing `:isTopStory="true"` from the TopStories component to the NewsCard component, we ensure that all articles in the TopStories section are correctly identified as top stories.

2. **Enhanced detection logic**: The updated logic in the NewsCard component now checks the isTopStory prop first, which provides a direct way for parent components to indicate that an article is a top story, regardless of the article's properties.

3. **Backward compatibility**: The existing logic for detecting top stories based on article properties is preserved, ensuring that the component continues to work with existing code.

### Manual Testing

To verify that these changes fix the issue, the following manual tests should be performed in the application:

1. Navigate to the `/news` page
2. Open the browser's developer tools and go to the Network tab
3. Filter for requests to `/media/57`
4. Verify that the request includes the `storyType=top` query parameter

This will confirm that the storyType parameter is being correctly passed for media ID 57.

## Summary

These changes ensure that all articles displayed in the TopStories component are correctly identified as top stories, regardless of their properties. This fixes the issue with media ID 57 not having the storyType parameter passed when fetching the media.

The solution is minimal and focused on the specific issue, while also being robust enough to handle similar cases in the future.