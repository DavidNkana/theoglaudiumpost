# Source Article Conversion Implementation Documentation

## Issue Description

When converting a source article, post it to the following endpoint:

```
http://192.168.0.246:9011/laudium/api/v1/gemini/generate-article
```

with the following request format:

```json
{
    "prompt":"Article Source Municipal Call Centre Capacity Limited Due to SAMWU March url https://bnnbreaking.com/politics/city-of-tshwane-municipal-call-centre-operates-at-limited-capacity-due-to-samwu-march content:The City of Tshwane's municipal call centre is operating at limited capacity on August 6th due to a march by SAMWU members. Services for roads, waste management, and by-law issues are affected, but essential services remain operational."
}
```

The response should be in the following format:

```json
{
    "Title:": "Municipal Call Centre Capacity Limited Due to SAMWU March",
    "Article:": "<p>The City of Tshwane's municipal call centre is operating at limited capacity...</p>",
    "Summary:": "The City of Tshwane's municipal call centre is operating with reduced staff..."
}
```

Then open the create article screen and populate it with the data from this response.

## Changes Made

### 1. Added a new function in `src/services/perplexity.js`

Created a new function called `generateArticleFromSource` that takes a source article object and formats it as a prompt to send to the specified endpoint:

```javascript
/**
 * Generates an article from a source article
 * 
 * This function sends a request to the gemini/generate-article endpoint with the source article
 * information formatted as a prompt. The response includes title, article content, and summary.
 * 
 * @param {Object} sourceArticle - The source article object
 * @param {string} sourceArticle.title - The title of the source article
 * @param {string} sourceArticle.url - The URL of the source article
 * @param {string} sourceArticle.platform - The platform/source of the article
 * @param {string} sourceArticle.content - The content of the source article
 * @returns {Promise} - Promise that resolves to the generated article with title, content, and summary
 */
export const generateArticleFromSource = (sourceArticle) => {
  // Format the prompt according to the required structure
  const prompt = `Article Source ${sourceArticle.title} url ${sourceArticle.url} content:${sourceArticle.content}`;
  
  // Make the API request to the specified endpoint
  return api.post("gemini/generate-article", {
    prompt
  });
};
```

### 2. Updated the `createFromSourceArticle` method in `src/components/ArticlePromptModal.vue`

Modified the method to use the new `generateArticleFromSource` function and format the response data:

```javascript
// Create article from selected source article
const createFromSourceArticle = async () => {
  if (!selectedSourceArticle.value) return;
  
  isLoading.value = true;
  
  try {
    // Call the API to generate an article from the source article
    const response = await generateArticleFromSource(selectedSourceArticle.value);
    
    // Extract the article data from the response
    const articleData = response.data;
    
    // Format the data to match the expected structure
    const formattedData = {
      title: articleData["Title:"] || selectedSourceArticle.value.title,
      article: articleData["Article:"] || '',
      summary: articleData["Summary:"] || '',
      sourceId: selectedSourceArticle.value.id,
      sourceArticle: selectedSourceArticle.value
    };
    
    // Hide the modal
    hideModal();
    
    // Emit the article data to the parent component
    emit('article-generated', formattedData);
  } catch (error) {
    console.error('Error creating article from source:', error);
    
    // Show error message
    Swal.fire({
      title: 'Error!',
      text: 'Failed to create article from source. Please try again.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
    
    isLoading.value = false;
  }
};
```

### 3. Updated the `handleArticleGenerated` method in `src/views/Admin/Articles/ArticlePromptView.vue`

Modified the method to handle the response from the source article conversion and store it in localStorage:

```javascript
// Handle article generated event
const handleArticleGenerated = (articleData) => {
  // Check if we're creating from a source article
  if (articleData.sourceId) {
    // Store the article data in localStorage
    const articleDataForStorage = {
      title: articleData.title || '',
      slug: '', // Will be generated from title in the Create component
      content: articleData.article || '',
      summary: articleData.summary || '',
      sourceId: articleData.sourceId
    };
    localStorage.setItem('newArticleData', JSON.stringify(articleDataForStorage));
    
    // Navigate to the create article page with the generated article data
    router.push({
      path: '/admin/articles/create',
      query: { 
        newArticle: 'true',
        fromSource: 'true'
      },
      state: {
        articleData: articleDataForStorage
      }
    });
  } else {
    // Handle regular article generation (unchanged)
    const articleDataForStorage = {
      title: articleData.title,
      slug: articleData.slug,
      content: articleData.article,
      summary: articleData.summary
    };
    localStorage.setItem('newArticleData', JSON.stringify(articleDataForStorage));
    
    // Navigate to the create article page with the generated article data
    router.push({
      path: '/admin/articles/create',
      query: { 
        newArticle: 'true' 
      },
      state: {
        articleData: articleDataForStorage
      }
    });
  }
};
```

## Implementation Details

### API Integration

The implementation uses the following endpoint to convert a source article into a full article:

```
http://192.168.0.246:9011/laudium/api/v1/gemini/generate-article
```

The request payload is a JSON object with a single `prompt` field that contains the source article information formatted as:

```
Article Source [TITLE] url [URL] content:[CONTENT]
```

The response is a JSON object with the following fields:
- `Title:` - The title of the generated article
- `Article:` - The HTML content of the generated article
- `Summary:` - A summary of the generated article

### User Flow

1. User navigates to the "Create Article" page and sees the ArticlePromptModal
2. User selects the "Create from Source Article" tab
3. User selects a source article from the list
4. User clicks the "Create Article from Selected Source" button
5. The system sends a request to the API to convert the source article
6. The system receives the response and formats it
7. The system navigates to the create article form with the generated data pre-filled

## Testing

A test script (`test-source-article-conversion.cjs`) was created to verify the implementation. The test confirms that:

1. The `generateArticleFromSource` function hits the correct URL
2. The request payload has the correct format
3. The response contains the expected data structure

All tests passed, confirming that the implementation works as expected.

## Conclusion

The implementation successfully meets the requirements specified in the issue description:
- It posts to the specified endpoint with the correct request format
- It handles the response format correctly
- It populates the create article form with the data from the response

The changes were minimal and focused on adding a new function to handle the source article conversion and updating the existing components to use this function.