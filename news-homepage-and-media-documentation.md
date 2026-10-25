# News Homepage and Media URL Implementation

This document outlines the changes made to implement two requirements:

1. Make `/news` the home page on desktop while preserving the Pinterest view on mobile
2. Pass the `storyType` parameter in media URLs for news stories

## Changes Made

### 1. Device Detection Utility

Added a device detection utility function in `src/utils/index.js`:

```javascript
/**
 * Detects if the current device is a mobile device
 * 
 * @returns {boolean} - True if the device is mobile, false otherwise
 */
export const isMobileDevice = () => {
  // Check if window is defined (for SSR compatibility)
  if (typeof window === 'undefined') return false;
  
  // Use matchMedia to check if the viewport width is less than 768px
  return window.matchMedia('(max-width: 767px)').matches ||
    // Fallback to user agent detection if matchMedia is not available
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};
```

This function uses a combination of viewport width detection (using matchMedia) and user agent detection to determine if the user is on a mobile device.

### 2. Responsive Routing

Updated the router configuration in `src/router/index.js` to make `/news` the home page on desktop while preserving the Pinterest view on mobile:

1. Imported the device detection utility:
   ```javascript
   import { isMobileDevice } from "@/utils";
   ```

2. Added a navigation guard to the root route:
   ```javascript
   {
     path: "", // this means '/'
     name: "Home",
     meta: {
       title: "Pinterest Gallery",
     },
     beforeEnter: (to, from, next) => {
       // Redirect desktop users to /news, keep mobile users on Pinterest view
       if (!isMobileDevice()) {
         next('/news');
       } else {
         next();
       }
     },
     component: () => import("@/views/Pinterest/PinterestView.vue"),
   }
   ```

This navigation guard checks if the user is on a desktop device, and if so, redirects them to the `/news` route. If they're on a mobile device, they'll continue to see the Pinterest view.

### 3. Media URL Construction

Updated the `NewsCard.vue` component to pass the appropriate `storyType` parameter based on the article type:

```javascript
/**
 * Fetches media using cover_id if available
 */
const fetchMedia = async () => {
  if (props.article?.cover_id) {
    isLoadingImage.value = true;
    try {
      // Determine the appropriate storyType based on article properties
      let storyType = null;
      
      if (props.featured) {
        storyType = "featured";
      } else if (props.article.isTopStory || 
                (props.article.type && props.article.type === "topStories") ||
                (props.article.tags && props.article.tags.some(tag => tag.name.toLowerCase() === "top story"))) {
        storyType = "top";
      }
      
      const response = await getMediaById(props.article.cover_id, storyType);
      if (response.data && response.status === 200) {
        // Handle blob response
        const blob = response.data;
        imageUrl.value = URL.createObjectURL(blob);
      }
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      isLoadingImage.value = false;
    }
  } else if (props.article?.cover?.file) {
    // Use existing cover.file if available
    imageUrl.value = props.article.cover.file;
  }
};
```

The function now determines the storyType based on several conditions:
- If the article is featured (props.featured is true), it passes "featured" as the storyType
- If the article is a top story (determined by checking several properties), it passes "top" as the storyType
- Otherwise, it passes null as the storyType

The conditions for determining if an article is a top story include:
- If the article has an isTopStory property set to true
- If the article has a type property set to "topStories"
- If the article has a tag with the name "top story"

## Testing

Created a test script `test-news-homepage-and-media.js` that tests both the routing behavior and the media URL construction:

1. Tests the device detection function by simulating both desktop and mobile environments
2. Tests the routing behavior by simulating the navigation guard and checking if it redirects correctly based on device type
3. Tests the media URL construction by checking if the storyType parameter is correctly included in the URL

## Summary

These changes ensure that:
1. Desktop users are automatically redirected to the `/news` route when they visit the home page, while mobile users continue to see the Pinterest view
2. Media URLs for top stories include the `storyType=top` parameter, which allows the backend to serve the appropriate image for top stories