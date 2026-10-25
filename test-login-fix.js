// Test script to verify the login fix
import { useAuth } from './src/composables/useAuth.js';
import apiClient from './src/services/api.js';
import { API_URL } from './src/config/api.js';

// Test function
async function testLoginFix() {
  try {
    console.log('Testing login fix with updated user data handling...');
    console.log('API URL:', API_URL);
    
    // Get authentication methods from useAuth
    const auth = useAuth();
    
    // Test credentials
    const email = 'user@test.com';
    const password = 'password'; // This won't actually work, just for testing
    
    console.log(`Attempting to login with email: ${email}`);
    
    // Mock the API response to simulate a successful login
    // This allows us to test the code without making an actual API call
    const mockLoginResponse = {
      id: 5,
      name: "Test User 2",
      email: "user@test.com",
      password: "$2a$10$o7bxdz0OuOexUacYFmFxPenKI08K42bMgVp6F.XjGONOG5GnicqXa",
      role_id: 1,
      role: {
        id: 1,
        name: "admin"
      },
      created_at: "2025-04-29T14:45:27",
      updated_at: "2025-05-20T11:02:58"
    };
    
    // Override the post method temporarily for testing
    const originalPost = apiClient.post;
    apiClient.post = async (url, data) => {
      if (url === '/auth/login') {
        return { data: mockLoginResponse, status: 200 };
      }
      return originalPost(url, data);
    };
    
    try {
      // Call the login function
      const response = await auth.login(email, password);
      
      console.log('Login successful!');
      console.log('User data stored:', auth.user.value);
      console.log('Is authenticated:', auth.isAuthenticated.value);
      
      // Test hasRole function
      const hasAdminRole = auth.hasRole('admin');
      console.log('Has admin role:', hasAdminRole);
      
      if (auth.isAuthenticated.value && hasAdminRole) {
        console.log('✅ Authentication and role checking are working correctly!');
      } else {
        console.log('❌ Something is still wrong with authentication or role checking.');
        if (!auth.isAuthenticated.value) {
          console.log('  - isAuthenticated is false even though user data is set');
        }
        if (!hasAdminRole) {
          console.log('  - hasRole("admin") returned false even though the user has admin role');
          console.log('  - User role:', auth.user.value?.role);
        }
      }
    } catch (error) {
      console.log('Login error:', error.message || error);
    } finally {
      // Restore the original post method
      apiClient.post = originalPost;
    }
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testLoginFix();