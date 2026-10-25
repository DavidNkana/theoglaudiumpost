/**
 * Test script for the updated Gemini article generation with prompt implementation
 * 
 * This script tests the updated implementation of the generateArticleWithGemini function
 * to ensure it correctly handles both regular prompts and structured prompts from source articles.
 */

import axios from 'axios';

// Test function for regular prompt
async function testRegularPrompt() {
  console.log('Testing Gemini article generation with regular prompt...');
  
  try {
    // Regular prompt as a string
    const prompt = "Generate a news article about climate change";
    
    // Make a request to the Gemini endpoint with the prompt
    const response = await axios.post(
      'http://192.168.0.246:9011/laudium/api/v1/gemini/generate-article',
      { prompt },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Response received for regular prompt:', response.data);
    
    // Check if the response includes the expected fields
    const { title, article, summary, slug, sources } = response.data;
    
    // Validate each field
    let passedChecks = 0;
    let totalChecks = 5;
    
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
    
    if (sources && Array.isArray(sources)) {
      console.log('✅ Sources are present:', sources);
      passedChecks++;
    } else {
      console.log('❌ Sources are missing or not an array');
    }
    
    // Print summary
    console.log(`\nRegular prompt test summary: ${passedChecks}/${totalChecks} checks passed`);
    
    return passedChecks === totalChecks;
  } catch (error) {
    console.error('Error testing Gemini article generation with regular prompt:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Test function for structured prompt from source article
async function testStructuredPrompt() {
  console.log('\nTesting Gemini article generation with structured prompt from source article...');
  
  try {
    // Structured prompt as an object
    const promptObj = {
      title: "Climate Change Impact on Global Agriculture",
      source: "source123",
      summary: "A comprehensive analysis of how climate change is affecting agricultural practices worldwide."
    };
    
    // Convert object prompt to string format (same logic as in the generateArticleWithGemini function)
    const promptString = `Generate an article with the following details:
Title: ${promptObj.title || ''}
Source: ${promptObj.source || ''}
Summary: ${promptObj.summary || ''}`;
    
    console.log("Converted object prompt to string:", promptString);
    
    // Make a request to the Gemini endpoint with the string prompt
    const response = await axios.post(
      'http://192.168.0.246:9011/laudium/api/v1/gemini/generate-article',
      { prompt: promptString },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Response received for structured prompt:', response.data);
    
    // Check if the response includes the expected fields
    const { title, article, summary, slug, sources } = response.data;
    
    // Validate each field
    let passedChecks = 0;
    let totalChecks = 5;
    
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
    
    if (sources && Array.isArray(sources)) {
      console.log('✅ Sources are present:', sources);
      passedChecks++;
    } else {
      console.log('❌ Sources are missing or not an array');
    }
    
    // Print summary
    console.log(`\nStructured prompt test summary: ${passedChecks}/${totalChecks} checks passed`);
    
    return passedChecks === totalChecks;
  } catch (error) {
    console.error('Error testing Gemini article generation with structured prompt:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Test function for missing prompt (should throw an error)
async function testMissingPrompt() {
  console.log('\nTesting Gemini article generation with missing prompt (should fail)...');
  
  try {
    // Make a request to the Gemini endpoint without a prompt
    const response = await axios.post(
      'http://192.168.0.246:9011/laudium/api/v1/gemini/generate-article',
      {}, // Empty payload, no prompt
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('❌ Request succeeded when it should have failed:', response.data);
    return false;
  } catch (error) {
    console.log('✅ Request failed as expected with missing prompt');
    console.log('Error message:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
    return true;
  }
}

// Run all tests
async function runTests() {
  console.log('Running tests for the updated Gemini article generation implementation...\n');
  
  const regularPromptResult = await testRegularPrompt();
  const structuredPromptResult = await testStructuredPrompt();
  const missingPromptResult = await testMissingPrompt();
  
  console.log('\n=== OVERALL TEST RESULTS ===');
  console.log(`Regular prompt test: ${regularPromptResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Structured prompt test: ${structuredPromptResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Missing prompt test: ${missingPromptResult ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = regularPromptResult && structuredPromptResult && missingPromptResult;
  console.log(`\nOverall result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
}

// Run the tests
runTests();