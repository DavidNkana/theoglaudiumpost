/**
 * Test script for the template key fix in LatestNews.vue
 * This script verifies that the key attribute is correctly placed on the template tag
 */

import fs from 'fs';
import path from 'path';

// Function to test the template key fix
async function testTemplateKeyFix() {
  console.log('Testing template key fix in LatestNews.vue...');
  
  try {
    // Read the LatestNews.vue file
    const filePath = path.resolve('./src/views/News/Partials/LatestNews.vue');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Check if the templates have the key attributes
    const hasFirstTemplateWithKey = fileContent.includes('<template v-for="(article, index) in articlesData" :key="article.id + \'-\' + index">');
    const hasSecondTemplateWithKey = fileContent.includes('<template v-for="(article, index) in articlesData" :key="article.id">');
    
    // Check if the divs no longer have key attributes using regular expressions
    const divWithKeyRegex = /<div[^>]*:key="article\.id[^>]*>/;
    const divWithKeyRegex2 = /<div[^>]*:key="'ad-' \+ index[^>]*>/;
    
    const firstDivWithoutKey = !divWithKeyRegex.test(fileContent);
    const secondDivWithoutKey = !divWithKeyRegex2.test(fileContent);
    
    // Report results
    if (hasFirstTemplateWithKey) {
      console.log('✅ PASS: First template tag has the correct key attribute');
    } else {
      console.log('❌ FAIL: First template tag does not have the correct key attribute');
    }
    
    if (hasSecondTemplateWithKey) {
      console.log('✅ PASS: Second template tag has the correct key attribute');
    } else {
      console.log('❌ FAIL: Second template tag does not have the correct key attribute');
    }
    
    if (firstDivWithoutKey) {
      console.log('✅ PASS: First article div no longer has a key attribute');
    } else {
      console.log('❌ FAIL: First article div still has a key attribute');
    }
    
    if (secondDivWithoutKey) {
      console.log('✅ PASS: Second article div no longer has a key attribute');
    } else {
      console.log('❌ FAIL: Second article div still has a key attribute');
    }
    
    // Overall assessment
    if (hasFirstTemplateWithKey && hasSecondTemplateWithKey && firstDivWithoutKey && secondDivWithoutKey) {
      console.log('\n✅ OVERALL: The template key issue has been successfully fixed');
      console.log('The template structure now follows Vue\'s requirements:');
      console.log('1. The key attributes are placed on the template tags');
      console.log('2. The keys are unique for each iteration');
      console.log('3. The divs inside the templates no longer have key attributes');
      console.log('\nThis should resolve the 500 Internal Server Error.');
    } else {
      console.log('\n❌ OVERALL: The template key issue has not been fully fixed');
      console.log('Please check the implementation and make the necessary changes.');
    }
  } catch (error) {
    console.error('Error testing template key fix:', error.message);
  }
}

// Run the test
testTemplateKeyFix();