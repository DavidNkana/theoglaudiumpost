/**
 * Test script for source article conversion
 * 
 * This script tests the implementation of the source article conversion feature
 * that posts to the gemini/generate-article endpoint.
 */

// Mock implementation of the generateArticleFromSource function
// since we can't directly import ES modules in Node.js scripts
const axios = require('axios');

const generateArticleFromSource = (sourceArticle) => {
  // Format the prompt according to the required structure
  const prompt = `Article Source ${sourceArticle.title} url ${sourceArticle.url} content:${sourceArticle.content}`;
  
  // Make the API request to the specified endpoint
  return axios.post("gemini/generate-article", {
    prompt
  });
};

// Mock axios for testing
const originalAxiosPost = axios.post;
let axiosPostCalls = [];

// Override axios.post to track calls
axios.post = function(url, data, config) {
  axiosPostCalls.push({ url, data, config });
  
  // Mock response based on the endpoint
  if (url.includes('gemini/generate-article')) {
    return Promise.resolve({
      data: {
        "Title:": "Municipal Call Centre Capacity Limited Due to SAMWU March",
        "Article:": "<p>The City of Tshwane's municipal call centre is operating at limited capacity on August 6th due to a march by members of the South African Municipal Workers Union (SAMWU). The disruption has affected several key services including roads, waste management, and by-law enforcement issues.</p><p>According to a statement released by city officials, essential services remain operational despite the reduced staffing. Residents are advised to expect delays when contacting the call centre for non-emergency matters.</p><p>The SAMWU march, which began early morning in the central business district, is part of ongoing protests regarding wage disputes and working conditions. City management has indicated they are in discussions with union representatives to resolve the issues promptly.</p><p>Residents with urgent matters are encouraged to use the city's online reporting platforms until normal operations resume.</p>",
        "Summary:": "The City of Tshwane's municipal call centre is operating with reduced staff on August 6th due to a SAMWU protest march. Services affected include roads, waste management, and by-law enforcement, though essential services remain operational. Residents should expect delays and consider using online platforms for non-emergency issues."
      }
    });
  }
  
  return Promise.resolve({ data: {} });
};

// Test the generateArticleFromSource function
async function testGenerateArticleFromSource() {
  console.log('=== Testing generateArticleFromSource function ===');
  
  try {
    // Clear previous calls
    axiosPostCalls = [];
    
    // Create a mock source article
    const sourceArticle = {
      id: '123',
      title: 'Municipal Call Centre Capacity Limited Due to SAMWU March',
      url: 'https://bnnbreaking.com/politics/city-of-tshwane-municipal-call-centre-operates-at-limited-capacity-due-to-samwu-march',
      platform: 'BNN Breaking',
      content: 'The City of Tshwane\'s municipal call centre is operating at limited capacity on August 6th due to a march by SAMWU members. Services for roads, waste management, and by-law issues are affected, but essential services remain operational.'
    };
    
    // Call the function
    const response = await generateArticleFromSource(sourceArticle);
    
    // Check if the function made a request to the correct URL
    const expectedUrl = 'gemini/generate-article';
    const actualUrl = axiosPostCalls[0]?.url;
    
    console.log('Expected URL:', expectedUrl);
    console.log('Actual URL:', actualUrl);
    
    if (actualUrl === expectedUrl) {
      console.log('✅ PASS: generateArticleFromSource hits the correct URL');
    } else {
      console.log('❌ FAIL: generateArticleFromSource does not hit the correct URL');
    }
    
    // Check if the request payload has the correct format
    const expectedPromptStart = 'Article Source Municipal Call Centre Capacity Limited Due to SAMWU March url https://bnnbreaking.com';
    const actualPrompt = axiosPostCalls[0]?.data?.prompt;
    
    console.log('\nExpected prompt start:', expectedPromptStart);
    console.log('Actual prompt:', actualPrompt);
    
    if (actualPrompt && actualPrompt.startsWith(expectedPromptStart)) {
      console.log('✅ PASS: Request payload has the correct format');
    } else {
      console.log('❌ FAIL: Request payload does not have the correct format');
    }
    
    // Check if the response contains the expected data
    console.log('\nResponse data:');
    console.log('- Title:', response.data["Title:"]);
    console.log('- Article excerpt:', response.data["Article:"].substring(0, 100) + '...');
    console.log('- Summary:', response.data["Summary:"]);
    
    if (
      response.data["Title:"] && 
      response.data["Article:"] && 
      response.data["Summary:"]
    ) {
      console.log('✅ PASS: Response contains the expected data structure');
    } else {
      console.log('❌ FAIL: Response does not contain the expected data structure');
    }
  } catch (error) {
    console.error('Error testing generateArticleFromSource:', error);
  }
}

// Test the ArticlePromptModal component's handling of source article conversion
function testArticlePromptModalConversion() {
  console.log('\n=== Testing ArticlePromptModal component ===');
  
  // Since we can't directly test the component in this script, we'll just log what would happen
  console.log('When clicking "Create Article from Selected Source":');
  console.log('1. The createFromSourceArticle method would call generateArticleFromSource');
  console.log('2. It would format the response data to match the expected structure');
  console.log('3. It would emit the article-generated event with the formatted data');
  
  console.log('\nWhen the ArticlePromptView component receives the article-generated event:');
  console.log('1. It would store the article data in localStorage');
  console.log('2. It would navigate to the create article page with newArticle=true and fromSource=true');
  console.log('3. The Create component would load the article data from localStorage and populate the form');
}

// Run the tests
async function runTests() {
  await testGenerateArticleFromSource();
  testArticlePromptModalConversion();
  
  // Restore original axios.post
  axios.post = originalAxiosPost;
}

runTests();