# Perplexity API Response Documentation

This document describes the expected response format for the Perplexity API endpoints used in the Laudium Biz application.

## Endpoint: `perplexity/async/generate-article`

### Request Format

The endpoint expects a POST request with the following JSON payload:

```json
{
  "prompt": "Summary text that will be used to generate an article"
}
```

### Response Format

Despite the endpoint name suggesting an asynchronous operation, the API actually returns the generated article content directly as a string. The response is not a structured JSON object with a task ID or status, but rather the full text of the generated article.

#### Example Response

```
This is a Test Summary for Article Generation

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
8. Exit Criteria Status
```

### Validation

To validate that the response is in the expected format, you can use the `validateResponse` function from `expected-response.js`:

```javascript
import { validateResponse } from './expected-response.js';

// Make the API request
const response = await axios.post(`${BASE_URL}${ENDPOINT}`, { prompt: 'Your prompt here' });

// Validate the response
const isValid = validateResponse(response.data);
if (isValid) {
  console.log('Response validation successful! The response matches the expected structure.');
} else {
  console.error('Response validation failed! The response does not match the expected structure.');
}
```

The validation function checks that:
1. The response is a string
2. The response has a reasonable length for an article (at least 10 characters)

### Usage in the Application

In the Laudium Biz application, this endpoint is used to generate articles based on a summary text. The generated article content is then displayed to the user or saved for further processing.

Example usage in the application:

```javascript
import { generateArticleFromSummary } from '@/services/perplexity';

// Generate an article from a summary
const summaryText = 'This is a summary of the article I want to generate.';
const response = await generateArticleFromSummary(summaryText);

// The response.data contains the generated article content as a string
const articleContent = response.data;

// Display or process the article content
console.log(articleContent);
```

## Notes

- The endpoint name `perplexity/async/generate-article` suggests an asynchronous operation, but the current implementation is synchronous, returning the generated content directly.
- If the API behavior changes in the future to truly implement asynchronous article generation (returning a task ID instead of the content), the validation and handling code will need to be updated accordingly.
- The response format is a plain text string, not HTML. If HTML formatting is required, additional processing may be needed.