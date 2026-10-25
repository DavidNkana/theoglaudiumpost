// Test script to verify token validation fix
import apiClient from './src/services/api.js';

// Test function
async function testTokenValidation() {
  try {
    console.log('Testing API client with token validation fix...');
    
    // Make a simple API request that would normally require authentication
    // The fix should prevent the "InvalidTokenError: Invalid token specified: must be a string" error
    const response = await apiClient.get('/articles');
    
    console.log('API request successful!');
    console.log('Response status:', response.status);
  } catch (error) {
    // We expect a different error than "InvalidTokenError: Invalid token specified: must be a string"
    console.log('Error type:', error.name);
    console.log('Error message:', error.message);
    
    if (error.message.includes('InvalidTokenError: Invalid token specified: must be a string')) {
      console.error('❌ Test failed: The token validation fix did not work!');
    } else {
      console.log('✅ Test passed: No InvalidTokenError about token not being a string!');
      console.log('(Note: Other errors are expected since we might not be authenticated)');
    }
  }
}

// Run the test
testTokenValidation();