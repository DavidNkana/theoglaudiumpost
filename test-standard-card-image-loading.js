/**
 * Test script for verifying the StandardCard component's image loading
 * 
 * This script tests:
 * 1. How StandardCard loads images with different storyType parameters
 * 2. How it handles different response formats (URL and blob)
 */

import { getMediaById } from './src/services/media.js';
import axios from 'axios';

// Mock axios for testing
global.axios = axios;
axios.get = jest.fn();

/**
 * Test the StandardCard's image loading with different storyType parameters
 */
async function testStandardCardImageLoading() {
  console.log('Testing StandardCard image loading with different storyType parameters...');
  
  // Mock axios.get to return different responses based on the storyType
  axios.get.mockImplementation((url, config) => {
    const storyType = config?.params?.storyType;
    
    // Return different responses based on the storyType
    if (storyType === 'top') {
      return Promise.resolve({
        status: 200,
        data: {
          url: "https://res.cloudinary.com/example/image/upload/top-story-image.jpg"
        }
      });
    } else if (storyType === 'featured') {
      return Promise.resolve({
        status: 200,
        data: {
          url: "https://res.cloudinary.com/example/image/upload/featured-story-image.jpg"
        }
      });
    } else if (storyType === 'popular') {
      return Promise.resolve({
        status: 200,
        data: {
          url: "https://res.cloudinary.com/example/image/upload/popular-story-image.jpg"
        }
      });
    } else {
      // No storyType parameter
      return Promise.resolve({
        status: 200,
        data: {
          url: "https://res.cloudinary.com/example/image/upload/default-image.jpg"
        }
      });
    }
  });
  
  // Test with different storyType parameters
  const testCases = [
    { id: 57, storyType: 'top', expectedUrl: "https://res.cloudinary.com/example/image/upload/top-story-image.jpg" },
    { id: 57, storyType: 'featured', expectedUrl: "https://res.cloudinary.com/example/image/upload/featured-story-image.jpg" },
    { id: 57, storyType: 'popular', expectedUrl: "https://res.cloudinary.com/example/image/upload/popular-story-image.jpg" },
    { id: 57, storyType: null, expectedUrl: "https://res.cloudinary.com/example/image/upload/default-image.jpg" }
  ];
  
  for (const testCase of testCases) {
    const response = await getMediaById(testCase.id, testCase.storyType);
    const passed = response.data.url === testCase.expectedUrl;
    
    console.log(`${passed ? '✅' : '❌'} Media ID ${testCase.id} with storyType=${testCase.storyType || 'null'}:`);
    console.log(`   Expected URL: ${testCase.expectedUrl}`);
    console.log(`   Actual URL: ${response.data.url}`);
  }
}

/**
 * Test how StandardCard handles different response formats
 */
async function testResponseFormatHandling() {
  console.log('\nTesting how StandardCard handles different response formats...');
  
  // Mock the StandardCard component's fetchMedia function
  function handleMediaResponse(response) {
    let imageUrl = null;
    
    if (response.data && response.status === 200) {
      // Handle JSON response with URL
      if (response.data.url) {
        imageUrl = response.data.url;
        return { success: true, imageUrl, method: 'direct' };
      } 
      // Fallback for backward compatibility (blob response)
      else {
        const blob = response.data;
        imageUrl = URL.createObjectURL(blob);
        return { success: true, imageUrl, method: 'blob' };
      }
    }
    
    return { success: false, imageUrl: null, method: 'none' };
  }
  
  // Create a mock URL.createObjectURL function
  global.URL = {
    createObjectURL: (blob) => `blob:${blob.type}/${blob.size}`
  };
  
  // Test cases
  const testCases = [
    {
      name: "JSON response with URL",
      response: {
        status: 200,
        data: {
          url: "https://res.cloudinary.com/example/image/upload/top-story-image.jpg"
        }
      },
      expected: {
        success: true,
        method: 'direct',
        imageUrl: "https://res.cloudinary.com/example/image/upload/top-story-image.jpg"
      }
    },
    {
      name: "Blob response (backward compatibility)",
      response: {
        status: 200,
        data: new Blob(['fake image data'], { type: 'image/jpeg', size: 1234 })
      },
      expected: {
        success: true,
        method: 'blob',
        imageUrl: "blob:image/jpeg/1234"
      }
    },
    {
      name: "Error response",
      response: {
        status: 404,
        data: null
      },
      expected: {
        success: false,
        method: 'none',
        imageUrl: null
      }
    }
  ];
  
  // Run test cases
  for (const testCase of testCases) {
    const result = handleMediaResponse(testCase.response);
    const passed = result.success === testCase.expected.success && 
                  result.method === testCase.expected.method &&
                  result.imageUrl === testCase.expected.imageUrl;
    
    console.log(`${passed ? '✅' : '❌'} ${testCase.name}:`);
    console.log(`   Expected: success=${testCase.expected.success}, method=${testCase.expected.method}, imageUrl=${testCase.expected.imageUrl}`);
    console.log(`   Actual: success=${result.success}, method=${result.method}, imageUrl=${result.imageUrl}`);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    await testStandardCardImageLoading();
    await testResponseFormatHandling();
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests();