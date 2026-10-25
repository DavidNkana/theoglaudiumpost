/**
 * Test script for the Gemini article generation endpoint
 * 
 * This script tests the Gemini article generation endpoint to ensure it returns
 * the expected data format with title, article, summary, and slug.
 */

import axios from 'axios';

// Test function
async function testGeminiArticleGeneration() {
  console.log('Testing Gemini article generation endpoint...');
  
  try {
    // Make a request to the Gemini endpoint
    const response = await axios.get('http://192.168.0.246:9011/laudium/api/v1/gemini/generate-article');
    
    console.log('Response received:', response.data);
    
    // Check if the response includes the expected fields
    const { title, article, summary, slug } = response.data;
    
    // Validate each field
    let passedChecks = 0;
    let totalChecks = 4;
    
    if (title) {
      console.log('✅ Title is present:', title);
      passedChecks++;
    } else {
      console.log('❌ Title is missing');
    }
    
    if (article) {
      console.log('✅ Article content is present (first 100 chars):', article.substring(0, 100) + '...');
      passedChecks++;
    } else {
      console.log('❌ Article content is missing');
    }
    
    if (summary) {
      console.log('✅ Summary is present:', summary);
      passedChecks++;
    } else {
      console.log('❌ Summary is missing');
    }
    
    if (slug) {
      console.log('✅ Slug is present:', slug);
      passedChecks++;
    } else {
      console.log('❌ Slug is missing');
    }
    
    // Print summary
    console.log(`\nTest summary: ${passedChecks}/${totalChecks} checks passed`);
    
    if (passedChecks === totalChecks) {
      console.log('✅ All checks passed! The endpoint is returning the expected data format.');
    } else {
      console.log('❌ Some checks failed. The endpoint is not returning all expected fields.');
    }
    
  } catch (error) {
    console.error('Error testing Gemini article generation:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testGeminiArticleGeneration();