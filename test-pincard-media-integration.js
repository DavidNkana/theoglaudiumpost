/**
 * Test script for PinCard component media integration
 * 
 * This script tests the integration between the PinCard component
 * and the media endpoint to ensure images are correctly displayed
 * using the URL from the media endpoint response.
 * It also tests the storyType parameter functionality.
 */

import { getMediaById } from './src/services/media.js';

// Mock article with cover_id 7
const mockArticle = {
  id: 123,
  title: "City of Tshwane Officials Arrested in R7 Million Transformer Theft Scandal",
  slug: "tshwane-officials-arrested",
  cover_id: 7
};

// Test function for basic media endpoint functionality
async function testPinCardMediaIntegration() {
  try {
    console.log('Testing PinCard media integration without storyType...');
    
    // Test fetching media with ID 7 without storyType
    console.log('Fetching media with ID 7 without storyType...');
    const response = await getMediaById(7);
    
    // Log the response data
    console.log('Media endpoint response:', response.data);
    
    // Check if the response contains a URL property
    if (response.data && response.data.url) {
      console.log('Success! Received image URL:', response.data.url);
      console.log('PinCard component will now use this URL to display the image.');
      
      // Simulate how PinCard would use this URL
      console.log('In PinCard component:');
      console.log('- Previous implementation would create a blob URL from binary data');
      console.log('- Updated implementation directly uses the URL from the response');
      console.log(`- Image element will have src="${response.data.url}"`);
    } else {
      console.error('Error: Response does not contain an image URL');
    }
  } catch (error) {
    console.error('Error testing PinCard media integration:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Test function with storyType parameter
async function testPinCardMediaIntegrationWithStoryType(storyType) {
  try {
    console.log(`Testing PinCard media integration with storyType=${storyType}...`);
    
    // Test fetching media with ID 7 and the specified storyType
    console.log(`Fetching media with ID 7 and storyType=${storyType}...`);
    const response = await getMediaById(7, storyType);
    
    // Log the response data
    console.log(`Media endpoint response for storyType=${storyType}:`, response.data);
    
    // Check if the response contains a URL property
    if (response.data && response.data.url) {
      console.log(`Success! Received image URL for storyType=${storyType}:`, response.data.url);
      console.log(`PinCard component will now use this URL to display the image for ${storyType} story.`);
      
      // Simulate how PinCard would use this URL
      console.log(`In PinCard component with isTopStory=${storyType === 'top'}, isFeatured=${storyType === 'featured'}, isPopular=${storyType === 'popular'}:`);
      console.log(`- Image element will have src="${response.data.url}"`);
    } else {
      console.error(`Error: Response for storyType=${storyType} does not contain an image URL`);
    }
  } catch (error) {
    console.error(`Error testing PinCard media integration with storyType=${storyType}:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the tests
async function runTests() {
  // Test without storyType
  await testPinCardMediaIntegration();
  
  console.log('\n-----------------------------------\n');
  
  // Test with different storyType values
  await testPinCardMediaIntegrationWithStoryType('top');
  
  console.log('\n-----------------------------------\n');
  
  await testPinCardMediaIntegrationWithStoryType('featured');
  
  console.log('\n-----------------------------------\n');
  
  await testPinCardMediaIntegrationWithStoryType('popular');
}

// Run all tests
runTests();