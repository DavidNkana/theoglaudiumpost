/**
 * Test script for admin sidebar navigation
 * 
 * This script tests the admin sidebar navigation with the debugging changes
 * to help diagnose why the navigation is not working correctly.
 */

// Import required modules
import { createApp, h } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from './src/composables/useAuth.js';

// Mock components for testing
const Dashboard = { template: '<div>Dashboard</div>' };
const Articles = { template: '<div>Articles</div>' };
const SourceArticles = { template: '<div>Source Articles</div>' };
const Businesses = { template: '<div>Businesses</div>' };

// Create a mock AdminLayout component with the same structure as the real one
const AdminLayout = {
  template: `
    <div class="admin-layout">
      <header class="admin-header">Admin Header</header>
      <div class="admin-sidebar">
        <ul class="nav flex-column">
          <li class="nav-item">
            <a href="#" class="nav-link" @click.prevent="navigateTo('/admin/dashboard')">Dashboard</a>
          </li>
          <li class="nav-item">
            <a href="#" class="nav-link" @click.prevent="navigateTo('/admin/articles')">Articles</a>
          </li>
          <li class="nav-item">
            <a href="#" class="nav-link" @click.prevent="navigateTo('/admin/source-articles')">Source Articles</a>
          </li>
          <li class="nav-item">
            <a href="#" class="nav-link" @click.prevent="navigateTo('/admin/businesses')">Businesses</a>
          </li>
        </ul>
      </div>
      <main class="admin-main">
        <router-view></router-view>
      </main>
    </div>
  `,
  setup() {
    const router = useRouter();
    const { isAuthenticated, hasRole } = useAuth();
    
    // Custom navigation function with debugging
    const navigateTo = (path) => {
      console.log(`[Test] Navigation triggered to: ${path}`);
      console.log(`[Test] Current authentication state: ${isAuthenticated.value ? 'Authenticated' : 'Not authenticated'}`);
      console.log(`[Test] Has admin role: ${hasRole('admin')}`);
      
      try {
        // Try to navigate to the specified path
        console.log(`[Test] Attempting to navigate to: ${path}`);
        router.push(path).then(() => {
          console.log(`[Test] Navigation to ${path} successful`);
        }).catch(error => {
          console.error(`[Test] Navigation error:`, error);
        });
      } catch (error) {
        console.error(`[Test] Error during navigation to ${path}:`, error);
      }
    };
    
    return { navigateTo };
  }
};

// Create router instance with mock routes
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/admin',
      component: AdminLayout,
      children: [
        { path: 'dashboard', component: Dashboard },
        { path: 'articles', component: Articles },
        { path: 'source-articles', component: SourceArticles },
        { path: 'businesses', component: Businesses }
      ]
    }
  ]
});

// Create Vue app
const app = createApp({
  render() {
    return h(AdminLayout);
  }
});

// Use router
app.use(router);

// Mount app to a DOM element (in a browser environment)
// For testing purposes, we'll just log that the app would be mounted
console.log('App would be mounted in a browser environment');

// Simulate clicking on sidebar links
async function testSidebarNavigation() {
  try {
    console.log('=== Testing Admin Sidebar Navigation ===');
    
    // Set up authentication state for testing
    const auth = useAuth();
    auth.user.value = { role: { name: 'admin' } }; // Mock authenticated admin user
    
    console.log('Authentication state:', auth.isAuthenticated.value ? 'Authenticated' : 'Not authenticated');
    console.log('Has admin role:', auth.hasRole('admin') ? 'Yes' : 'No');
    
    // Test navigation to Dashboard
    console.log('\n--- Testing navigation to Dashboard ---');
    await simulateClick('/admin/dashboard');
    
    // Test navigation to Articles
    console.log('\n--- Testing navigation to Articles ---');
    await simulateClick('/admin/articles');
    
    // Test navigation to Source Articles
    console.log('\n--- Testing navigation to Source Articles ---');
    await simulateClick('/admin/source-articles');
    
    // Test navigation to Businesses
    console.log('\n--- Testing navigation to Businesses ---');
    await simulateClick('/admin/businesses');
    
    console.log('\n=== Navigation Tests Complete ===');
    console.log('Check the logs above to diagnose any navigation issues');
    
    // Provide guidance based on test results
    console.log('\n=== Diagnostic Guidance ===');
    console.log('1. If you see "Navigation triggered" but no "Navigation successful" logs, check for navigation guards blocking navigation');
    console.log('2. If you see "Not authenticated" or "Has admin role: No", check authentication state and role assignment');
    console.log('3. If you see navigation errors, check the router configuration and component loading');
  } catch (error) {
    console.error('Error during navigation tests:', error);
  }
}

// Helper function to simulate clicking on a sidebar link
async function simulateClick(path) {
  try {
    console.log(`Simulating click on link to ${path}`);
    
    // Get the AdminLayout component instance
    const adminLayout = app._component;
    
    // Call the navigateTo function directly
    adminLayout.navigateTo(path);
    
    // Wait for navigation to complete
    await router.isReady();
    
    // Log the current route
    console.log('Current route:', router.currentRoute.value.path);
  } catch (error) {
    console.error(`Error simulating click to ${path}:`, error);
  }
}

// Run the tests
testSidebarNavigation();