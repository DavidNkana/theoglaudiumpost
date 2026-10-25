/**
 * Test script for verifying the handling of the new media URL response format
 * 
 * This script tests:
 * 1. The media endpoint response format with a URL property
 * 2. How components handle the new response format
 */

import { getMediaById } from './src/services/media.js';
import axios from 'axios';

// Mock axios for testing
global.axios = axios;
axios.get = jest.fn();

/**
 * Test the media URL response format
 */
async function testMediaUrlResponse() {
  console.log('Testing media URL response format...');
  
  // Mock axios.get to return a JSON response with a URL property
  axios.get.mockImplementation((url, config) => {
    return Promise.resolve({
      status: 200,
      data: {
        url: "https://res.cloudinary.com/dzrldiajp/image/upload/,q_auto,f_auto,w_170,h_368/v1754161380/images/l6mbb7us3vocnrowhmbo.png"
      }
    });
  });
  
  // Test with media ID 23 (popular)
  const response = await getMediaById(23, 'popular');
  console.log('Media response:', response.data);
  console.log('Expected: { url: "https://res.cloudinary.com/dzrldiajp/image/upload/,q_auto,f_auto,w_170,h_368/v1754161380/images/l6mbb7us3vocnrowhmbo.png" }');
  
  // Verify the response has a url property
  if (response.data && response.data.url) {
    console.log('✅ Response has a url property');
  } else {
    console.log('❌ Response does not have a url property');
  }
}

/**
 * Test how components handle the new response format
 */
async function testComponentHandling() {
  console.log('\nTesting component handling of the new response format...');
  
  // Mock the NewsCard component's fetchMedia function
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
  
  // Test cases
  const testCases = [
    {
      name: "JSON response with URL",
      response: {
        status: 200,
        data: {
          url: "https://res.cloudinary.com/dzrldiajp/image/upload/,q_auto,f_auto,w_170,h_368/v1754161380/images/l6mbb7us3vocnrowhmbo.png"
        }
      },
      expected: {
        success: true,
        method: 'direct'
      }
    },
    {
      name: "Blob response (backward compatibility)",
      response: {
        status: 200,
        data: new Blob(['fake image data'], { type: 'image/jpeg' })
      },
      expected: {
        success: true,
        method: 'blob'
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
        method: 'none'
      }
    }
  ];
  
  // Run test cases
  for (const testCase of testCases) {
    const result = handleMediaResponse(testCase.response);
    const passed = result.success === testCase.expected.success && 
                  result.method === testCase.expected.method;
    
    console.log(`${passed ? '✅' : '❌'} ${testCase.name}:`);
    console.log(`   Expected: success=${testCase.expected.success}, method=${testCase.expected.method}`);
    console.log(`   Actual: success=${result.success}, method=${result.method}`);
    if (result.imageUrl) {
      console.log(`   Image URL: ${result.imageUrl}`);
    }
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    await testMediaUrlResponse();
    await testComponentHandling();
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests();