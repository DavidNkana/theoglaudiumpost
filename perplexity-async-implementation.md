# Perplexity Async Implementation

## Issue Description
Update the endpoint for article generation from `/api/v1/perplexity/generate-article` to `/api/v1/perplexity/async/generate-article`.

## Changes Made

### 1. Updated the `generateArticleFromSummary` function in `perplexity.js`

Changed the function to use the asynchronous endpoint and updated the parameter name to match the expected format:

```javascript
// Before
export const generateArticleFromSummary = (summaryText) => {
  return api.post(API_ENDPOINTS.PERPLEXITY.GENERATE_ARTICLE, {
    promt: summaryText
  });
};

// After
export const generateArticleFromSummary = (summaryText) => {
  return api.post(API_ENDPOINTS.PERPLEXITY.GENERATE_ARTICLE_ASYNC, {
    text: summaryText
  });
};
```

### 2. Updated the function documentation

Updated the JSDoc comments to reflect that the function now returns a task ID for the generated article instead of the article itself:

```javascript
/**
 * Generates an article asynchronously using the summary text as prompt
 * 
 * @param {string} summaryText - The summary text to use as prompt for article generation
 * @returns {Promise} - Promise that resolves to the task ID for the generated article
 */
```

### 3. Created a test script

Created a test script `test-perplexity-async.js` to verify that the updated function makes the correct API call with the right parameters:

```javascript
// Test that the function calls api.post with the correct endpoint and parameters
it('should call api.post with the correct endpoint and parameters', async () => {
  // Arrange
  const summaryText = 'This is a test summary';
  mockPost.mockResolvedValue({ data: { taskId: '123456' } });

  // Act
  await generateArticleFromSummary(summaryText);

  // Assert
  expect(mockPost).toHaveBeenCalledWith(
    'perplexity/async/generate-article',
    { text: summaryText }
  );
});
```

## Implementation Notes

1. The `generateFromSummary` function in `Create.vue` doesn't need to be modified because it already treats the API call as an asynchronous operation and doesn't do anything with the response data.

2. The API endpoint configuration in `config/api.js` has been updated to use the new endpoint path: `GENERATE_ARTICLE_ASYNC: "perplexity/async/generate-article"`.

3. The parameter name was changed from `promt` to `text` to match the expected format for the async endpoint, based on the existing `generateArticleAsync` function.

## Testing

The implementation can be tested by:

1. Running the test script: `npm test test-perplexity-async.js`
2. Manually testing the "Generate" button in the article creation page to verify that it sends a request to the correct endpoint with the correct parameters.

## Future Considerations

If the async endpoint returns a task ID that can be used to check the status of the article generation, the `generateFromSummary` function in `Create.vue` could be enhanced to:

1. Store the task ID
2. Periodically check the status of the task
3. Update the UI when the article is ready
4. Automatically populate the article content when it's available

This would provide a better user experience but would require additional API endpoints for checking the status of a task and retrieving the generated article.