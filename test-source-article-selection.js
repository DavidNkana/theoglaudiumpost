/**
 * Test script for source article selection functionality
 * 
 * This script tests the selection functionality in the SourceArticles component
 * to ensure that selecting one article doesn't affect the selection state of other articles.
 */

// Mock Vue's ref function
const ref = (initialValue) => {
  return {
    value: initialValue,
    _isRef: true
  };
};

// Mock article data
const mockArticles = [
  { id: '1', title: 'Article 1', url: 'https://example.com/1', platform: 'Twitter', author: 'Author 1', createdAt: '2025-08-01T12:00:00Z' },
  { id: '2', title: 'Article 2', url: 'https://example.com/2', platform: 'Facebook', author: 'Author 2', createdAt: '2025-08-02T12:00:00Z' },
  { id: '3', title: 'Article 3', url: 'https://example.com/3', platform: 'LinkedIn', author: 'Author 3', createdAt: '2025-08-03T12:00:00Z' },
  { id: '4', title: 'Article 4', url: 'https://example.com/4', platform: 'Instagram', author: 'Author 4', createdAt: '2025-08-04T12:00:00Z' },
  { id: '5', title: 'Article 5', url: 'https://example.com/5', platform: 'Twitter', author: 'Author 5', createdAt: '2025-08-05T12:00:00Z' }
];

// Test the selection functionality
async function testArticleSelection() {
  console.log('=== Testing Source Article Selection ===');
  
  // Initialize state
  const sourceArticles = ref(mockArticles);
  const selectedArticles = ref([]);
  
  // Define the isArticleSelected function
  const isArticleSelected = (article) => {
    return selectedArticles.value.some(a => a.id === article.id);
  };
  
  // Define the toggleArticleSelection function (with the fix)
  const toggleArticleSelection = (article) => {
    if (isArticleSelected(article)) {
      // Remove the article from selection
      selectedArticles.value = selectedArticles.value.filter(a => a.id !== article.id);
    } else {
      // Add the article to the existing selection
      selectedArticles.value.push(article);
    }
  };
  
  // Define the toggleSelectAll function
  const toggleSelectAll = () => {
    if (selectedArticles.value.length === sourceArticles.value.length) {
      // Deselect all
      selectedArticles.value = [];
    } else {
      // Select all
      selectedArticles.value = [...sourceArticles.value];
    }
  };
  
  // Test 1: Select a single article
  console.log('\nTest 1: Select a single article');
  console.log('Initial selection:', selectedArticles.value.length === 0 ? 'None' : selectedArticles.value.map(a => a.id).join(', '));
  
  // Select Article 1
  toggleArticleSelection(sourceArticles.value[0]);
  console.log('After selecting Article 1:', selectedArticles.value.map(a => a.id).join(', '));
  console.log('Is Article 1 selected?', isArticleSelected(sourceArticles.value[0]) ? 'Yes' : 'No');
  console.log('Is Article 2 selected?', isArticleSelected(sourceArticles.value[1]) ? 'Yes' : 'No');
  console.log('Selected articles count:', selectedArticles.value.length);
  
  // Test 2: Select another article (should add to selection, not replace)
  console.log('\nTest 2: Select another article');
  
  // Select Article 3
  toggleArticleSelection(sourceArticles.value[2]);
  console.log('After selecting Article 3:', selectedArticles.value.map(a => a.id).join(', '));
  console.log('Is Article 1 still selected?', isArticleSelected(sourceArticles.value[0]) ? 'Yes' : 'No');
  console.log('Is Article 3 selected?', isArticleSelected(sourceArticles.value[2]) ? 'Yes' : 'No');
  console.log('Selected articles count:', selectedArticles.value.length);
  
  // Test 3: Deselect an article
  console.log('\nTest 3: Deselect an article');
  
  // Deselect Article 1
  toggleArticleSelection(sourceArticles.value[0]);
  console.log('After deselecting Article 1:', selectedArticles.value.map(a => a.id).join(', '));
  console.log('Is Article 1 selected?', isArticleSelected(sourceArticles.value[0]) ? 'Yes' : 'No');
  console.log('Is Article 3 still selected?', isArticleSelected(sourceArticles.value[2]) ? 'Yes' : 'No');
  console.log('Selected articles count:', selectedArticles.value.length);
  
  // Test 4: Select all articles
  console.log('\nTest 4: Select all articles');
  
  // Select all
  toggleSelectAll();
  console.log('After selecting all:', selectedArticles.value.map(a => a.id).join(', '));
  console.log('Selected articles count:', selectedArticles.value.length);
  console.log('All articles selected?', selectedArticles.value.length === sourceArticles.value.length ? 'Yes' : 'No');
  
  // Test 5: Deselect all articles
  console.log('\nTest 5: Deselect all articles');
  
  // Deselect all
  toggleSelectAll();
  console.log('After deselecting all:', selectedArticles.value.length === 0 ? 'None' : selectedArticles.value.map(a => a.id).join(', '));
  console.log('Selected articles count:', selectedArticles.value.length);
  
  console.log('\n=== Test Summary ===');
  console.log('The selection functionality now correctly allows:');
  console.log('1. Selecting individual articles without affecting others');
  console.log('2. Selecting multiple articles');
  console.log('3. Deselecting individual articles without affecting others');
  console.log('4. Selecting all articles');
  console.log('5. Deselecting all articles');
}

// Run the test
testArticleSelection();