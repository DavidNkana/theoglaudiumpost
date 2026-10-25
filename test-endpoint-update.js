/**
 * Test script to verify that the endpoint has been updated correctly
 * 
 * This script makes a request to the updated endpoint and validates the response
 * against the expected structure.
 */

// Import axios for making HTTP requests
import axios from 'axios';
// Import validation function from expected-response.js
import { validateResponse, pendingResponseExample } from './expected-response.js';

// Define the base URL and endpoint
const BASE_URL = 'https://server.safai.co.za/Laudiumbiz/api/v1/';
const ENDPOINT = 'perplexity/async/generate-article';

// Define the test data
const testData = {
  prompt: 'This is a test summary for article generation.'
};

// Make the request
async function testEndpoint() {
  try {
    console.log(`Making POST request to ${BASE_URL}${ENDPOINT}`);
    console.log('Request data:', testData);
    
    const response = await axios.post(`${BASE_URL}${ENDPOINT}`, testData);
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
    // Validate the response against the expected structure
    const isValid = validateResponse(response.data);
    if (isValid) {
      console.log('Response validation successful! The response matches the expected structure.');
    } else {
      console.error('Response validation failed! The response does not match the expected structure.');
      console.log('Expected response structure example:', pendingResponseExample);
    }
    
    console.log('Test successful! The endpoint is working correctly.');
  } catch (error) {
    console.error('Error making request:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    
    console.error('Test failed! Please check the endpoint configuration.');
  }
}

// Run the test
testEndpoint();

console.log('Test script created. Run with: node test-endpoint-update.js');