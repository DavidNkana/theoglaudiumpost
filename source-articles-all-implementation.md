# Source Articles from All Tasks Implementation

## Overview

This document describes the implementation of the `/api/v1/sourceArticles/all` endpoint, which retrieves source articles from all tasks (1-8) without requiring any parameters. The endpoint combines results from all tasks into a single comprehensive response, providing a complete overview of social media activity.

## Changes Made

### 1. Backend Service Integration

Added a new function to the `articles.js` service file to call the `/api/v1/sourceArticles/all` endpoint:

```javascript
/**
 * Retrieves source articles from all tasks (1-8) without requiring any parameters
 * 
 * This function fetches source articles from social media platforms by searching
 * all suggested tasks and combines the results into a single comprehensive response.
 * 
 * @returns {Promise<Object>} - Promise that resolves to the combined source articles data
 * @returns {Array} tasks - Information about each task that was queried
 * @returns {number} totalArticles - The total number of source articles retrieved
 * @returns {Array} sourceArticles - Combined list of source articles from all tasks
 */
export const getSourceArticlesFromAllTasks = () => {
  return api.get("/api/v1/sourceArticles/all");
};
```

### 2. Frontend Component Updates

Updated the `SourceArticles.vue` component to:

1. Import and use the new `getSourceArticlesFromAllTasks` function
2. Display task information in a table showing Task ID, Prompt, and Article Count
3. Add checkboxes for selecting articles
4. Add functionality to convert selected articles to full articles

#### Key Features Added:

- **Task Information Display**: Shows details about each task that was queried
- **Article Selection**: Users can select individual articles or use "Select All"
- **Batch Conversion**: Users can convert multiple selected articles at once
- **Enhanced Table**: Updated columns to show source and task ID information

## Response Structure

The endpoint returns a JSON object with the following structure:

```json
{
  "tasks": [
    {
      "taskId": 1,
      "prompt": "Example prompt for task 1",
      "articleCount": 5
    }
  ],
  "totalArticles": 25,
  "sourceArticles": [
    {
      "id": "article-id-1",
      "title": "Article Title",
      "source": "Twitter",
      "taskId": 1,
      "createdAt": "2025-08-01T12:00:00Z",
      "content": "Article content..."
    }
  ]
}
```

Note: The actual response will contain multiple tasks and source articles.

## Usage

1. Navigate to the Source Articles page
2. The page will automatically fetch source articles from all tasks
3. View task information in the table at the top
4. Select articles using the checkboxes
5. Click "Convert Selected Articles" to create full articles from the selected sources

## Future Improvements

- Add filtering options to filter articles by task, source, or date
- Implement pagination for large result sets
- Add sorting functionality for the articles table
- Enhance the selection UI with bulk actions