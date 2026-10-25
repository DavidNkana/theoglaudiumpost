/**
 * Test script for the news homepage and media URL changes
 * 
 * This script tests:
 * 1. The routing behavior that makes /news the home page on desktop
 * 2. The media URL construction that includes the storyType parameter
 */

import { isMobileDevice } from './src/utils/index.js';
import { getMediaById } from './src/services/media.js';
import axios from 'axios';

// Mock window.matchMedia for testing
global.window = {
  matchMedia: (query) => {
    // Return different values to simulate desktop and mobile
    return {
      matches: false, // Set to true to simulate mobile, false for desktop
    };
  },
};

// Mock navigator.userAgent
global.navigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
};

// Mock axios for testing
jest.mock('axios');

/**
 * Test the device detection function
 */
async function testDeviceDetection() {
  console.log('Testing device detection...');
  
  // Test desktop detection
  global.window.matchMedia = (query) => ({ matches: false });
  global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  
  console.log('Is mobile device (desktop):', isMobileDevice());
  console.log('Expected: false');
  
  // Test mobile detection via matchMedia
  global.window.matchMedia = (query) => ({ matches: true });
  
  console.log('Is mobile device (mobile via matchMedia):', isMobileDevice());
  console.log('Expected: true');
  
  // Test mobile detection via user agent
  global.window.matchMedia = (query) => ({ matches: false });
  global.navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)';
  
  console.log('Is mobile device (mobile via user agent):', isMobileDevice());
  console.log('Expected: true');
}

/**
 * Test the routing behavior
 */
async function testRouting() {
  console.log('\nTesting routing behavior...');
  
  // Simulate the beforeEnter navigation guard
  function beforeEnter(to, from, next) {
    if (!isMobileDevice()) {
      console.log('Desktop detected, redirecting to /news');
      next('/news');
    } else {
      console.log('Mobile detected, staying on Pinterest view');
      next();
    }
  }
  
  // Test desktop routing
  global.window.matchMedia = (query) => ({ matches: false });
  global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  
  let nextPath = '';
  beforeEnter({}, {}, (path) => { nextPath = path; });
  
  console.log('Redirect path (desktop):', nextPath);
  console.log('Expected: /news');
  
  // Test mobile routing
  global.window.matchMedia = (query) => ({ matches: true });
  
  nextPath = '';
  beforeEnter({}, {}, (path) => { nextPath = path; });
  
  console.log('Redirect path (mobile):', nextPath);
  console.log('Expected: ');
}

/**
 * Test the media URL construction
 */
async function testMediaUrl() {
  console.log('\nTesting media URL construction...');
  
  // Mock axios.get to return the URL that was requested
  axios.get.mockImplementation((url, config) => {
    return Promise.resolve({
      status: 200,
      data: `Requested URL: ${url}${config?.params ? '?' + new URLSearchParams(config.params).toString() : ''}`,
    });
  });
  
  // Test with no storyType
  const response1 = await getMediaById(123);
  console.log('Media URL (no storyType):', response1.data);
  console.log('Expected: Requested URL: /media/123');
  
  // Test with featured storyType
  const response2 = await getMediaById(123, 'featured');
  console.log('Media URL (featured):', response2.data);
  console.log('Expected: Requested URL: /media/123?storyType=featured');
  
  // Test with top storyType
  const response3 = await getMediaById(123, 'top');
  console.log('Media URL (top):', response3.data);
  console.log('Expected: Requested URL: /media/123?storyType=top');
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    await testDeviceDetection();
    await testRouting();
    await testMediaUrl();
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests();