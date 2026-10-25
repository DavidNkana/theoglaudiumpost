/**
 * Test script for the media endpoint
 * 
 * This script tests the getMediaById function to ensure it correctly
 * handles the JSON response with an image URL and properly includes
 * the storyType parameter in the request.
 */

import { getMediaById } from './src/services/media.js';

// Test function for basic media endpoint functionality
async function testMediaEndpoint() {
  try {
    console.log('Testing media endpoint without storyType...');
    
    // Test with media ID 19 as mentioned in the issue description
    const response = await getMediaById(19);
    
    // Log the response data
    console.log('Response:', response.data);
    
    // Check if the response contains a URL property
    if (response.data && response.data.url) {
      console.log('Success! Received image URL:', response.data.url);
    } else {
      console.error('Error: Response does not contain an image URL');
    }
  } catch (error) {
    console.error('Error testing media endpoint:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Test function with storyType parameter
async function testMediaEndpointWithStoryType(storyType) {
  try {
    console.log(`Testing media endpoint with storyType=${storyType}...`);
    
    // Test with media ID 19 and the specified storyType
    const response = await getMediaById(19, storyType);
    
    // Log the response data
    console.log(`Response for storyType=${storyType}:`, response.data);
    
    // Check if the response contains a URL property
    if (response.data && response.data.url) {
      console.log(`Success! Received image URL for storyType=${storyType}:`, response.data.url);
    } else {
      console.error(`Error: Response for storyType=${storyType} does not contain an image URL`);
    }
  } catch (error) {
    console.error(`Error testing media endpoint with storyType=${storyType}:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the tests
async function runTests() {
  // Test without storyType
  await testMediaEndpoint();
  
  console.log('\n-----------------------------------\n');
  
  // Test with different storyType values
  await testMediaEndpointWithStoryType('top');
  
  console.log('\n-----------------------------------\n');
  
  await testMediaEndpointWithStoryType('featured');
  
  console.log('\n-----------------------------------\n');
  
  await testMediaEndpointWithStoryType('popular');
}

runTests();