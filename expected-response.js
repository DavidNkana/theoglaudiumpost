/**
 * expected-response.js
 * 
 * This file defines the expected response structure for the perplexity/async/generate-article endpoint.
 * It can be used to validate the response from the API to ensure it matches the expected format.
 */

/**
 * Expected response structure for the perplexity/async/generate-article endpoint
 * 
 * Based on actual API behavior, the response is a string containing the generated article content.
 * 
 * @typedef {string} GenerateArticleAsyncResponse - The generated article content as a string
 */

/**
 * Validates that the response matches the expected structure
 * 
 * @param {any} response - The response to validate
 * @returns {boolean} - True if the response matches the expected structure, false otherwise
 */
export function validateResponse(response) {
  // Check if response is a string
  if (typeof response !== 'string') {
    console.error('Response is not a string');
    return false;
  }

  // Check if the response has a reasonable length for an article
  if (response.length < 10) {
    console.error('Response string is too short to be a valid article');
    return false;
  }

  return true;
}

/**
 * Example of a valid response
 */
export const pendingResponseExample = 
`This is a Test Summary for Article Generation

Introduction
In the context of software development and quality assurance, a test summary report serves as a vital communication tool that encapsulates the core findings, methodologies, and implications of testing activities undertaken during a project iteration.

What is a Test Summary Report?
A test summary report, sometimes called a Test Closure Report, provides a formal overview of the outcomes and processes associated with a particular test cycle.

Key Components of a Test Summary Report
A well-structured test summary report commonly includes the following elements:
1. Test Objectives
2. Test Areas Covered and Not Covered
3. Testing Approach
4. Test Environment Details
5. Results Summary
6. Defect Report
7. Lessons Learned and Recommendations
8. Exit Criteria Status`;

/**
 * Example of a valid response with HTML formatting
 */
export const htmlResponseExample = 
`<h1>This is a Test Summary for Article Generation</h1>

<h2>Introduction</h2>
<p>In the context of software development and quality assurance, a test summary report serves as a vital communication tool that encapsulates the core findings, methodologies, and implications of testing activities undertaken during a project iteration.</p>

<h2>What is a Test Summary Report?</h2>
<p>A test summary report, sometimes called a Test Closure Report, provides a formal overview of the outcomes and processes associated with a particular test cycle.</p>

<h2>Key Components of a Test Summary Report</h2>
<p>A well-structured test summary report commonly includes the following elements:</p>
<ol>
  <li>Test Objectives</li>
  <li>Test Areas Covered and Not Covered</li>
  <li>Testing Approach</li>
  <li>Test Environment Details</li>
  <li>Results Summary</li>
  <li>Defect Report</li>
  <li>Lessons Learned and Recommendations</li>
  <li>Exit Criteria Status</li>
</ol>`;