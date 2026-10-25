/**
 * Test script for the Gemini article generation with sources
 * 
 * This script tests the Gemini article generation endpoint to ensure it returns
 * the expected data format with title, article, summary, slug, and sources.
 * It also verifies that sources are properly formatted and added to the article content.
 */

import axios from 'axios';

// Test function
async function testGeminiArticleWithSources() {
  console.log('Testing Gemini article generation with sources...');
  
  try {
    // Make a request to the Gemini endpoint
    // Using POST instead of GET as the endpoint requires POST method
    // Specify content type as application/json
    const response = await axios.post(
      'http://192.168.0.246:9011/laudium/api/v1/gemini/generate-article',
      { prompt: "Generate a news article about current events" }, // Include prompt in the payload
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Response received:', response.data);
    
    // Check if the response includes the expected fields
    const { title, article, summary, slug, sources } = response.data;
    
    // Validate each field
    let passedChecks = 0;
    let totalChecks = 5; // Now including sources
    
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
    
    // Check for sources
    if (sources && Array.isArray(sources) && sources.length > 0) {
      console.log('✅ Sources are present:', sources);
      passedChecks++;
      
      // Simulate the processing done in the autoGenArticle function
      let content = article || '';
      
      if (sources.length > 0) {
        content += '<hr>';
        content += '<h3>Source:</h3>';
        content += '<ul>';
        sources.forEach(source => {
          content += `<li>${source}</li>`;
        });
        content += '</ul>';
      }
      
      console.log('\nProcessed article content with sources:');
      console.log(content.substring(content.length - 500)); // Show the last 500 characters to see the sources
    } else {
      console.log('❌ Sources are missing or empty');
    }
    
    // Print summary
    console.log(`\nTest summary: ${passedChecks}/${totalChecks} checks passed`);
    
    if (passedChecks === totalChecks) {
      console.log('✅ All checks passed! The endpoint is returning the expected data format with sources.');
    } else {
      console.log('❌ Some checks failed. The endpoint is not returning all expected fields.');
    }
    
  } catch (error) {
    console.error('Error testing Gemini article generation with sources:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testGeminiArticleWithSources();