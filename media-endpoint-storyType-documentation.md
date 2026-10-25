# Media Endpoint StoryType Parameter Implementation

## Issue Description

When making a call to the media endpoint `laudium/api/v1/media/19`, we needed to add a query parameter `?storyType=` where the value corresponds to the article type:
- `top` for top stories
- `featured` for featured stories
- `popular` for popular stories

## Implementation Details

### Changes Made

1. Modified the `getMediaById` function in `src/services/media.js` to accept a `storyType` parameter and include it as a query parameter in the API request.

Before:
```javascript
export const getMediaById = (id) => api.get(`/media/${id}`);
```

After:
```javascript
export const getMediaById = (id, storyType) => {
  // If storyType is provided, add it as a query parameter
  const params = storyType ? { storyType } : {};
  return api.get(`/media/${id}`, { params });
};
```

2. Updated the JSDoc comments to document the new parameter:
```javascript
/**
 * Fetches media by its ID
 * 
 * @param {number|string} id - The media ID
 * @param {string} storyType - The article type (e.g., "top", "featured", "popular")
 * @returns {Promise} - Promise that resolves to the media data
 */
```

3. Updated the test script `test-media-endpoint.js` to test the function with different `storyType` parameters:
   - Without a storyType parameter (original behavior)
   - With storyType="top"
   - With storyType="featured"
   - With storyType="popular"

### Usage Examples

The updated `getMediaById` function can be used in the following ways:

```javascript
// Without storyType (original behavior)
const response1 = await getMediaById(19);

// With storyType="top"
const response2 = await getMediaById(19, 'top');

// With storyType="featured"
const response3 = await getMediaById(19, 'featured');

// With storyType="popular"
const response4 = await getMediaById(19, 'popular');
```

When a `storyType` parameter is provided, the function will include it as a query parameter in the API request, resulting in a URL like:
- `laudium/api/v1/media/19?storyType=top`
- `laudium/api/v1/media/19?storyType=featured`
- `laudium/api/v1/media/19?storyType=popular`

## Testing

The changes have been tested using the updated `test-media-endpoint.js` script, which verifies that the function correctly includes the `storyType` parameter in the API request when provided.

## Conclusion

The implementation allows the media endpoint to receive the article type as a query parameter, enabling the backend to return the appropriate media based on the article type.