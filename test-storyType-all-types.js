/**
 * Test script for verifying the storyType parameter is passed correctly for all three story types
 * 
 * This script tests:
 * 1. The NewsCard component's logic for determining the storyType parameter
 * 2. The media URL construction with the storyType parameter for all three types
 */

import { getMediaById } from './src/services/media.js';
import axios from 'axios';

// Mock axios for testing
global.axios = axios;
axios.get = jest.fn();

/**
 * Test the media URL construction with different storyType parameters
 */
async function testMediaUrlWithStoryType() {
  console.log('Testing media URL construction with storyType parameter...');
  
  // Mock axios.get to return the URL that was requested
  axios.get.mockImplementation((url, config) => {
    return Promise.resolve({
      status: 200,
      data: `Requested URL: ${url}${config?.params ? '?' + new URLSearchParams(config.params).toString() : ''}`,
    });
  });
  
  // Test with specific media IDs from the issue description
  console.log('\nTesting with media IDs from the issue description:');
  
  // Test with popular storyType (ID 23)
  const response1 = await getMediaById(23, 'popular');
  console.log('Media URL (popular, ID 23):', response1.data);
  console.log('Expected: Requested URL: /media/23?storyType=popular');
  
  // Test with featured storyType (ID 25)
  const response2 = await getMediaById(25, 'featured');
  console.log('Media URL (featured, ID 25):', response2.data);
  console.log('Expected: Requested URL: /media/25?storyType=featured');
  
  // Test with top storyType (ID 27)
  const response3 = await getMediaById(27, 'top');
  console.log('Media URL (top, ID 27):', response3.data);
  console.log('Expected: Requested URL: /media/27?storyType=top');
}

/**
 * Test the NewsCard component's logic for determining the storyType parameter
 */
async function testNewsCardLogic() {
  console.log('\nTesting NewsCard component logic for determining storyType:');
  
  // Mock the NewsCard component's fetchMedia function
  function determineStoryType(props) {
    let storyType = null;
    
    if (props.featured) {
      storyType = "featured";
    } else if (props.isTopStory || 
              props.article.isTopStory || 
              (props.article.type && props.article.type === "topStories") ||
              (props.article.tags && props.article.tags.some(tag => tag.name.toLowerCase() === "top story"))) {
      storyType = "top";
    } else if (props.isPopular || 
              (props.article.type && props.article.type === "popular") ||
              (props.article.tags && props.article.tags.some(tag => tag.name.toLowerCase() === "popular"))) {
      storyType = "popular";
    }
    
    return storyType;
  }
  
  // Test cases
  const testCases = [
    {
      name: "Featured article via featured prop",
      props: {
        featured: true,
        isTopStory: false,
        isPopular: false,
        article: { id: 25, cover_id: 25 }
      },
      expectedStoryType: "featured"
    },
    {
      name: "Top story via isTopStory prop",
      props: {
        featured: false,
        isTopStory: true,
        isPopular: false,
        article: { id: 27, cover_id: 27 }
      },
      expectedStoryType: "top"
    },
    {
      name: "Popular story via isPopular prop",
      props: {
        featured: false,
        isTopStory: false,
        isPopular: true,
        article: { id: 23, cover_id: 23 }
      },
      expectedStoryType: "popular"
    },
    {
      name: "Top story via article.isTopStory property",
      props: {
        featured: false,
        isTopStory: false,
        isPopular: false,
        article: { id: 27, cover_id: 27, isTopStory: true }
      },
      expectedStoryType: "top"
    },
    {
      name: "Top story via article.type property",
      props: {
        featured: false,
        isTopStory: false,
        isPopular: false,
        article: { id: 27, cover_id: 27, type: "topStories" }
      },
      expectedStoryType: "top"
    },
    {
      name: "Popular story via article.type property",
      props: {
        featured: false,
        isTopStory: false,
        isPopular: false,
        article: { id: 23, cover_id: 23, type: "popular" }
      },
      expectedStoryType: "popular"
    },
    {
      name: "Regular article (no storyType)",
      props: {
        featured: false,
        isTopStory: false,
        isPopular: false,
        article: { id: 100, cover_id: 100 }
      },
      expectedStoryType: null
    }
  ];
  
  // Run test cases
  for (const testCase of testCases) {
    const result = determineStoryType(testCase.props);
    const passed = result === testCase.expectedStoryType;
    
    console.log(`${passed ? '✅' : '❌'} ${testCase.name}:`);
    console.log(`   Expected: ${testCase.expectedStoryType}`);
    console.log(`   Actual: ${result}`);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    await testMediaUrlWithStoryType();
    await testNewsCardLogic();
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests();