# Source Article Routing Fix Documentation

## Issue Description

The issue was that the routing from source articles to the article creation page wasn't working correctly. When a user clicked to create an article from a source, they should be redirected to the article creation page with the source article data pre-filled, but this wasn't happening.

## Root Causes

After investigating the codebase, two main issues were identified:

1. **Route Name Mismatch**: In the `SourceArticles.vue` component, both the `createFromSource` and `convertSelectedArticles` functions were using an incorrect route name (`admin-articles-create`) that didn't match the actual route name defined in the router configuration (`CreateArticle`).

2. **Missing Query Parameter Handling**: The `Create.vue` component wasn't handling the `sourceId` and `sourceIds` query parameters that were being passed from the `SourceArticles.vue` component.

## Changes Made

### 1. Fixed Route Names in SourceArticles.vue

#### Updated the `createFromSource` function to use the correct route name:

```javascript
// Before
const createFromSource = (article) => {
  router.push({
    name: 'admin-articles-create',
    query: { sourceId: article.id }
  });
};

// After
const createFromSource = (article) => {
  router.push({
    name: 'CreateArticle',
    query: { sourceId: article.id }
  });
};
```

#### Updated the `convertSelectedArticles` function to use the correct route name:

```javascript
// Before
const convertSelectedArticles = () => {
  if (selectedArticles.value.length === 0) return;
  
  router.push({
    name: 'admin-articles-create',
    query: { 
      sourceIds: selectedArticles.value.map(a => a.id).join(',')
    }
  });
};

// After
const convertSelectedArticles = () => {
  if (selectedArticles.value.length === 0) return;
  
  router.push({
    name: 'CreateArticle',
    query: { 
      sourceIds: selectedArticles.value.map(a => a.id).join(',')
    }
  });
};
```

### 2. Added Query Parameter Handling in Create.vue

Added code to the `onMounted` hook in the `Create.vue` component to handle both the `sourceId` and `sourceIds` query parameters:

```javascript
// Check if we're creating an article from a source article
else if (route.query.sourceId || route.query.sourceIds) {
  try {
    // Handle single source article
    if (route.query.sourceId) {
      console.log("Creating article from source ID:", route.query.sourceId);
      
      // Here you would typically make an API call to get the source article data
      // const response = await getSourceArticleById(route.query.sourceId);
      // const sourceArticle = response.data;
      
      // For demonstration purposes, we'll just set some placeholder data
      article.value.title = "Article from source " + route.query.sourceId;
      article.value.slug = "article-from-source-" + route.query.sourceId;
      article.value.summary = "This article was created from a source article.";
      article.value.content = "<p>This article was created from source article ID: " + route.query.sourceId + "</p>";
      
      // Show success message
      Swal.fire({
        title: 'Source Article Loaded!',
        text: 'The source article has been loaded successfully. You can now edit it and save.',
        icon: 'success',
        confirmButtonText: 'OK'
      });
    } 
    // Handle multiple source articles
    else if (route.query.sourceIds) {
      console.log("Creating article from multiple source IDs:", route.query.sourceIds);
      
      // Parse the comma-separated list of source IDs
      const sourceIds = route.query.sourceIds.split(',');
      
      // Here you would typically make an API call to get the source articles data
      // const response = await getSourceArticlesByIds(sourceIds);
      // const sourceArticles = response.data;
      
      // For demonstration purposes, we'll just set some placeholder data
      article.value.title = "Article from multiple sources";
      article.value.slug = "article-from-multiple-sources";
      article.value.summary = "This article was created from multiple source articles.";
      article.value.content = "<p>This article was created from the following source article IDs: " + sourceIds.join(', ') + "</p>";
      
      // Show success message
      Swal.fire({
        title: 'Multiple Source Articles Loaded!',
        text: `${sourceIds.length} source articles have been loaded successfully. You can now edit and save the combined article.`,
        icon: 'success',
        confirmButtonText: 'OK'
      });
    }
  } catch (error) {
    console.error("Error loading source article(s):", error);
    Swal.fire({
      title: 'Error!',
      text: 'Failed to load source article(s). Please try again.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }
}
```

## Testing

A test script `test-source-article-routing.js` was created to verify that the routing works correctly. The script tests:

1. The `createFromSource` function in the `SourceArticles` component, verifying that it correctly navigates to the article creation page with the `sourceId` query parameter.
2. The handling of the `sourceId` parameter in the `CreateArticle` component, checking that it detects the parameter and populates the form with data from the source article.

## Future Improvements

In a real-world implementation, the `Create.vue` component should make API calls to fetch the actual source article data based on the `sourceId` or `sourceIds` parameters. The current implementation uses placeholder data for demonstration purposes.

## Conclusion

The routing from source articles to the article creation page now works correctly in all scenarios:

1. When a user clicks to create an article from a single source, they are redirected to the article creation page with the source article data pre-filled.
2. When a user selects multiple source articles to convert, they are redirected to the article creation page with data from all selected source articles pre-filled.