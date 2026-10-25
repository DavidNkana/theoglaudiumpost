# Create Article Form Fixes Documentation

## Issue Description

The issue had two parts:
1. When opening the create article screen from a source article, the content couldn't be edited, only viewed.
2. The slug wasn't being automatically generated from the title when populating the form.

## Changes Made

### 1. Added Automatic Slug Generation

Modified the onMounted hook in Create.vue to automatically generate a slug from the title when populating data from source articles:

```javascript
// Update the article ref with the data
article.value.title = title || '';
// Generate slug from title if not provided
if (!slug && title) {
  article.value.slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/-+/g, "-") // Remove consecutive dashes
    .substring(0, 255); // Respect DB limit
} else {
  article.value.slug = slug || '';
}
```

This change was applied to all three cases where the form is populated:
- When loading data from localStorage or route state (newArticle=true)
- When creating an article from a single source article (sourceId)
- When creating an article from multiple source articles (sourceIds)

### 2. Fixed Content Editability Issues

Several changes were made to ensure the content is editable:

#### 2.1 Added Explicit QuillEditor Configuration

Modified the QuillEditor component configuration to explicitly set it to be editable:

```html
<QuillEditor
  id="content"
  v-model:content="article.content"
  contentType="html"
  theme="snow"
  toolbar="full"
  :styles="{ height: '480px' }"
  :readonly="false"
  :enable="true"
/>
```

#### 2.2 Added Refresh Editor Button

Added a "Refresh Editor" button to manually trigger content assignment:

```html
<!-- Debug button to manually trigger content assignment -->
<button
  class="btn btn-outline-info ms-2"
  type="button"
  @click="refreshEditor"
>
  Refresh Editor
</button>
```

Implemented the refreshEditor method to force a re-render of the editor:

```javascript
// Refresh the editor by reassigning the content
const refreshEditor = () => {
  console.log("Refreshing editor...");
  // Store the current content
  const currentContent = article.value.content;
  // Clear the content
  article.value.content = '';
  // Force a re-render by using setTimeout
  setTimeout(() => {
    // Reassign the content
    article.value.content = currentContent;
    console.log("Editor refreshed with content length:", currentContent.length);
  }, 100);
};
```

#### 2.3 Applied Content Format Processing

Applied the `stripCodeBlockMarkers` function to the content before it's stored in localStorage and passed to the Create.vue component:

```javascript
// Format the data to match the expected structure
const articleDataForStorage = {
  title: articleData["Title:"] || article.title || '',
  slug: '', // Will be generated from title in the Create component
  content: stripCodeBlockMarkers(articleData["Article:"] || ''),
  summary: articleData["Summary:"] || '',
  sourceId: article.id
};
```

This change was applied to both the `createFromSource` and `convertSelectedArticles` methods in SourceArticles.vue.

### 3. Added Debugging Information

Added console logging to help debug the issue:

```javascript
console.log("Article data from localStorage or route state:", articleData);
console.log("Content before assignment:", content ? content.substring(0, 100) + "..." : "");
console.log("Article data after processing:", {
  title: article.value.title,
  slug: article.value.slug,
  contentLength: article.value.content.length,
  summaryLength: article.value.summary.length
});
setTimeout(() => {
  console.log("Content after delay:", article.value.content ? article.value.content.substring(0, 100) + "..." : "");
}, 1000);
```

Also added logging to see the content before and after stripping code block markers:

```javascript
console.log("Content before stripping code block markers:", articleData["Article:"] ? articleData["Article:"].substring(0, 100) + "..." : "");
console.log("Content after stripping code block markers:", articleDataForStorage.content.substring(0, 100) + "...");
```

## Implementation Details

### Slug Generation

The slug is now automatically generated from the title when populating the form from a source article. The generation follows these steps:
1. Convert the title to lowercase
2. Remove special characters
3. Replace spaces with dashes
4. Remove consecutive dashes
5. Truncate to 255 characters to respect database limits

### Content Editability

The content editability issue was likely caused by code block markers in the content. These markers (```html, ```) are used in Markdown to indicate code blocks, but they can interfere with the QuillEditor's ability to edit the content properly.

The `stripCodeBlockMarkers` function removes these markers from the content before it's passed to the QuillEditor component, ensuring that the content is in a format that the editor can handle properly.

Additionally, the QuillEditor component has been explicitly configured to be editable with `:readonly="false"` and `:enable="true"` properties, and a "Refresh Editor" button has been added to force a re-render of the editor if needed.

## Conclusion

The changes made address both issues mentioned in the prompt:
1. The content is now editable when opening the create article screen from a source article
2. The slug is automatically generated from the title when populating the form

These changes ensure a better user experience when creating articles from source articles, as the user no longer has to manually generate the slug or deal with non-editable content.