# Source Article Selection Fix Documentation

## Issue Description

On the source article screen, there was an issue with the table selection functionality. When a user selected a single article, the animation showed that all articles were selected, even though only one was actually selected. This created confusion for users who couldn't tell which articles were actually selected.

## Root Cause Analysis

After examining the code in the `SourceArticles.vue` component, the issue was identified in the `toggleArticleSelection` function:

```javascript
const toggleArticleSelection = (article) => {
  if (isArticleSelected(article)) {
    // Remove the article from selection
    selectedArticles.value = selectedArticles.value.filter(a => a.id !== article.id);
  } else {
    // Add only this article to selection (not all articles)
    selectedArticles.value = [article];
  }
};
```

The problem was in the `else` branch of the function. When a user selected an article that wasn't already selected, instead of adding that article to the existing selection, the function was replacing the entire selection array with a new array containing only the selected article:

```javascript
selectedArticles.value = [article];
```

This meant that even though the user intended to select multiple articles, only the most recently clicked article would be selected, and all previously selected articles would be deselected.

## Solution

The fix was to modify the `toggleArticleSelection` function to properly add the selected article to the existing selection array, rather than replacing the entire array:

```javascript
const toggleArticleSelection = (article) => {
  if (isArticleSelected(article)) {
    // Remove the article from selection
    selectedArticles.value = selectedArticles.value.filter(a => a.id !== article.id);
  } else {
    // Add the article to the existing selection
    selectedArticles.value.push(article);
  }
};
```

With this change, when a user selects an article, it's added to the existing selection without affecting other articles' selection state. This allows for proper multiple selection functionality while maintaining the ability to select individual articles.

## Testing

A test script was created to verify the fix. The script simulates various selection scenarios:

1. Selecting a single article
2. Selecting multiple articles
3. Deselecting an article
4. Selecting all articles
5. Deselecting all articles

The test results confirmed that the fix works correctly:

- When selecting a single article, only that article is selected
- When selecting another article while one is already selected, both articles remain selected
- When deselecting an article, it's removed from the selection without affecting other selected articles
- The "Select All" and "Deselect All" functionality works correctly

## Impact

This fix ensures that the table selection functionality in the source article screen works as expected, allowing users to:

1. Select individual articles without affecting others
2. Select multiple articles
3. Deselect individual articles without affecting others
4. Select all articles
5. Deselect all articles

The visual feedback (animation) now correctly reflects the actual selection state, eliminating confusion for users.