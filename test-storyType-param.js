/**
 * Test script for verifying the storyType parameter is passed correctly
 * 
 * This script tests:
 * 1. The NewsCard component's logic for determining the storyType parameter
 * 2. The media URL construction with the storyType parameter
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
  
  // Test with specific media ID 57
  console.log('\nTesting with media ID 57:');
  
  // Test with no storyType
  const response1 = await getMediaById(57);
  console.log('Media URL (no storyType):', response1.data);
  console.log('Expected: Requested URL: /media/57');
  
  // Test with top storyType
  const response2 = await getMediaById(57, 'top');
  console.log('Media URL (top):', response2.data);
  console.log('Expected: Requested URL: /media/57?storyType=top');
  
  // Test with featured storyType
  const response3 = await getMediaById(57, 'featured');
  console.log('Media URL (featured):', response3.data);
  console.log('Expected: Requested URL: /media/57?storyType=featured');
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
    }
    
    return storyType;
  }
  
  // Test cases
  const testCases = [
    {
      name: "Featured article",
      props: {
        featured: true,
        isTopStory: false,
        article: { id: 57, cover_id: 57 }
      },
      expectedStoryType: "featured"
    },
    {
      name: "Top story via isTopStory prop",
      props: {
        featured: false,
        isTopStory: true,
        article: { id: 57, cover_id: 57 }
      },
      expectedStoryType: "top"
    },
    {
      name: "Top story via article.isTopStory property",
      props: {
        featured: false,
        isTopStory: false,
        article: { id: 57, cover_id: 57, isTopStory: true }
      },
      expectedStoryType: "top"
    },
    {
      name: "Top story via article.type property",
      props: {
        featured: false,
        isTopStory: false,
        article: { id: 57, cover_id: 57, type: "topStories" }
      },
      expectedStoryType: "top"
    },
    {
      name: "Top story via article.tags property",
      props: {
        featured: false,
        isTopStory: false,
        article: { 
          id: 57, 
          cover_id: 57, 
          tags: [{ name: "Top Story" }] 
        }
      },
      expectedStoryType: "top"
    },
    {
      name: "Regular article (no storyType)",
      props: {
        featured: false,
        isTopStory: false,
        article: { id: 57, cover_id: 57 }
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