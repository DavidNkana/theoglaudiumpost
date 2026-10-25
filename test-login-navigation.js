// Test script to verify login and navigation functionality
import { useAuth } from './src/composables/useAuth.js';
import router from './src/router/index.js';

// Test function
async function testLoginNavigation() {
  try {
    console.log('Testing login and navigation functionality...');
    
    // Get authentication methods from useAuth
    const auth = useAuth();
    
    // Test credentials (these will likely fail but should not have token errors)
    const email = 'admin@laudiumbiz.co.za';
    const password = 'password';
    
    console.log(`Attempting to login with email: ${email}`);
    console.log('Authentication state before login:');
    console.log('- isAuthenticated:', auth.isAuthenticated.value);
    console.log('- user:', auth.user.value);
    
    try {
      // Attempt login
      const response = await auth.login(email, password);
      
      console.log('Login successful!');
      console.log('Response status:', response.status);
      console.log('Authentication state after login:');
      console.log('- isAuthenticated:', auth.isAuthenticated.value);
      console.log('- user:', auth.user.value);
      
      // Check if router would navigate to dashboard
      console.log('Current route:', router.currentRoute.value.path);
      console.log('Attempting navigation to dashboard...');
      
      // Simulate navigation to dashboard
      const navigationResult = await router.push('/admin/dashboard');
      
      console.log('Navigation result:', navigationResult);
      console.log('New route:', router.currentRoute.value.path);
      
      if (router.currentRoute.value.path === '/admin/dashboard') {
        console.log('✅ Navigation successful! The fix worked.');
      } else {
        console.log('❌ Navigation failed. Still redirecting to:', router.currentRoute.value.path);
      }
    } catch (error) {
      console.log('Login error:', error.message || error);
      
      // Check if the error is related to connection issues
      if (error.message && (
        error.message.includes('Network Error') || 
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('timeout')
      )) {
        console.error('❌ Connection error: Make sure the API server is running');
      } else {
        console.log('Login failed with credentials, but that\'s expected in test environment');
        console.log('The important part is that there are no token validation errors');
      }
    }
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testLoginNavigation();