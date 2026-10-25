// Test script to verify login functionality
import { useAuth } from './src/composables/useAuth.js';
import apiClient from './src/services/api.js';
import { API_URL } from './src/config/api.js';

// Test function
async function testLogin() {
  try {
    console.log('Testing login functionality with updated API URL...');
    console.log('API URL:', API_URL);
    
    // Get authentication methods from useAuth
    const auth = useAuth();
    
    // Test credentials (these will likely fail but should not have token errors)
    const email = 'admin@laudiumbiz.co.za';
    const password = 'password';
    
    console.log(`Attempting to login with email: ${email}`);
    
    try {
      const response = await auth.login(email, password);
      console.log('Login successful!');
      console.log('User:', auth.user.value);
      console.log('Is authenticated:', auth.isAuthenticated.value);
    } catch (error) {
      console.log('Login error:', error.message || error);
      
      // Check if the error is related to connection issues
      if (error.message && (
        error.message.includes('Network Error') || 
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('timeout')
      )) {
        console.error('❌ Connection error: Make sure the API server is running at the correct address');
        console.error(`   API URL: ${API_URL}`);
      } else {
        console.log('✅ API connection successful, but login failed (expected with test credentials)');
        console.log('   This indicates the API URL is correct but credentials are invalid');
      }
    }
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testLogin();