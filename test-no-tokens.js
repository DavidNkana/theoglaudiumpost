// Test script to verify token validation has been removed
import apiClient from './src/services/api.js';
import { useAuth } from './src/composables/useAuth.js';

// Test function
async function testNoTokenValidation() {
  try {
    console.log('Testing API client with token validation removed...');
    
    // 1. Test authentication without tokens
    console.log('1. Testing authentication without tokens');
    const auth = useAuth();
    console.log('Auth object:', auth);
    console.log('Is authenticated:', auth.isAuthenticated.value);
    
    // 2. Test API request without tokens
    console.log('\n2. Testing API request without tokens');
    try {
      const response = await apiClient.get('/articles');
      console.log('API request successful!');
      console.log('Response status:', response.status);
    } catch (error) {
      // We should not see any token-related errors
      console.log('Error type:', error.name);
      console.log('Error message:', error.message);
      
      if (error.message.includes('token')) {
        console.error('❌ Test failed: Token-related error occurred!');
      } else {
        console.log('✅ Test passed: No token-related errors!');
        console.log('(Note: Other errors are expected and normal)');
      }
    }
    
    // 3. Test login functionality
    console.log('\n3. Testing login functionality');
    try {
      // This will likely fail with invalid credentials, but should not have token errors
      await auth.login('test@example.com', 'password');
    } catch (error) {
      console.log('Login error:', error.message);
      
      if (error.message.includes('token')) {
        console.error('❌ Test failed: Token-related error in login!');
      } else {
        console.log('✅ Test passed: No token-related errors in login!');
        console.log('(Note: Authentication errors are expected and normal)');
      }
    }
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testNoTokenValidation();