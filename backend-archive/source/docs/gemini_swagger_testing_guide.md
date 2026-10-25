# Gemini API Swagger Testing Guide

**Project:** Laudiumbiz API  
**Migration:** Perplexity → Gemini 2.5 Pro  
**Date:** August 4, 2025

## Overview

This document provides guidance on testing the Gemini API endpoints using the Swagger UI. The Swagger UI provides an interactive interface for testing API endpoints without writing any code. This is particularly useful for verifying that the Gemini API endpoints are working correctly and returning the expected responses.

## Accessing Swagger UI

The Swagger UI can be accessed at:

```
http://localhost:9011/laudium/swagger-ui.html
```

Make sure the application is running before accessing the Swagger UI.

## Testing Endpoints

### Core Reasoning Endpoints

#### 1. Generate Text

- **Endpoint:** `/api/v1/gemini/generate-text`
- **Method:** POST
- **Request Body:**
  ```json
  {
    "prompt": "What are the latest developments in renewable energy?"
  }
  ```
- **Expected Response:** A text response with information about the latest developments in renewable energy.
- **Verification Points:**
  - Response should be well-structured and coherent
  - Response should include recent information (grounded via GoogleSearch)
  - Response should be relevant to the prompt

#### 2. Generate Reasoning

- **Endpoint:** `/api/v1/gemini/generate-reasoning`
- **Method:** POST
- **Request Body:**
  ```json
  {
    "prompt": "Explain the pros and cons of nuclear energy"
  }
  ```
- **Expected Response:** A step-by-step reasoning response about the pros and cons of nuclear energy.
- **Verification Points:**
  - Response should include clear steps and explanations
  - Response should consider different perspectives
  - Response should be grounded in factual information

### Asynchronous Endpoints

#### 1. Async Generate Text

- **Endpoint:** `/api/v1/gemini/async/generate-text`
- **Method:** POST
- **Request Body:**
  ```json
  {
    "prompt": "What are the latest developments in renewable energy?"
  }
  ```
- **Expected Response:** Same as the synchronous endpoint, but returned asynchronously.
- **Verification Points:**
  - Response should be the same as the synchronous endpoint
  - Response should be returned asynchronously (may take longer)

#### 2. Async Generate Reasoning

- **Endpoint:** `/api/v1/gemini/async/generate-reasoning`
- **Method:** POST
- **Request Body:**
  ```json
  {
    "prompt": "Explain the pros and cons of nuclear energy"
  }
  ```
- **Expected Response:** Same as the synchronous endpoint, but returned asynchronously.
- **Verification Points:**
  - Response should be the same as the synchronous endpoint
  - Response should be returned asynchronously (may take longer)

### Article Generation Endpoints

#### 1. Generate Article

- **Endpoint:** `/api/v1/gemini/generate-article`
- **Method:** POST
- **Request Body:**
  ```json
  {
    "prompt": "Write an article about sustainable urban development"
  }
  ```
- **Expected Response:** A well-structured article about sustainable urban development.
- **Verification Points:**
  - Response should be a well-structured article
  - Response should include an introduction, body, and conclusion
  - Response should be relevant to the prompt

#### 2. Generate Article with Metadata

- **Endpoint:** `/api/v1/gemini/article`
- **Method:** POST
- **Request Body:**
  ```json
  {
    "prompt": "Write an article about sustainable urban development"
  }
  ```
- **Expected Response:** A GeneratedArticleResponse object with title, slug, article, and summary.
- **Verification Points:**
  - Response should include a title, slug, article, and summary
  - Title should be relevant to the prompt
  - Slug should be a URL-friendly version of the title
  - Article should be well-structured
  - Summary should be a concise summary of the article

### Investigative Journalism Endpoints

#### 1. Investigative Journalism

- **Endpoint:** `/api/v1/gemini/investigative-journalism`
- **Method:** POST
- **Request Body:**
  ```json
  {
    "topic": "Climate change impact on coastal communities"
  }
  ```
- **Expected Response:** An investigative journalism article about the topic.
- **Verification Points:**
  - Response should be a well-researched article
  - Response should include facts, evidence, and insights
  - Response should have a compelling headline, introduction, key findings, and conclusion
  - Response should be grounded in factual information

#### 2. Async Investigative Journalism

- **Endpoint:** `/api/v1/gemini/async/investigative-journalism`
- **Method:** POST
- **Request Body:**
  ```json
  {
    "topic": "Climate change impact on coastal communities"
  }
  ```
- **Expected Response:** Same as the synchronous endpoint, but returned asynchronously.
- **Verification Points:**
  - Response should be the same as the synchronous endpoint
  - Response should be returned asynchronously (may take longer)

### Source Article Endpoints

#### 1. Get Source Articles

- **Endpoint:** `/api/gemini/sourceArticles`
- **Method:** GET
- **Query Parameters:**
  - `taskType`: 1 (default)
  - `timeframe`: "24 hours" (optional)
  - `platforms`: "Twitter, Facebook" (optional)
  - `topics`: "technology, politics" (optional)
- **Expected Response:** A list of source articles based on the task type and parameters.
- **Verification Points:**
  - Response should include a list of source articles
  - Each article should have url, platform, timestamp, author, content, etc.
  - Articles should be sorted according to the task type
  - Articles should be relevant to the parameters

#### 2. Get Source Articles by Task

- **Endpoint:** `/api/gemini/sourceArticles/task/{taskId}`
- **Method:** GET
- **Path Parameters:**
  - `taskId`: 1-8
- **Expected Response:** A list of source articles for the specified task.
- **Verification Points:**
  - Response should include a list of source articles
  - Articles should be relevant to the task type
  - Invalid task IDs should return an error

#### 3. Get Source Articles with Custom Prompt

- **Endpoint:** `/api/gemini/sourceArticles/custom`
- **Method:** POST
- **Request Body:**
  ```json
  {
    "prompt": "Find articles about climate change in South Africa"
  }
  ```
- **Expected Response:** A list of source articles based on the custom prompt.
- **Verification Points:**
  - Response should include a list of source articles
  - Articles should be relevant to the custom prompt
  - Empty prompt should return an error

#### 4. Get All Source Articles

- **Endpoint:** `/api/gemini/sourceArticles/all`
- **Method:** GET
- **Expected Response:** A combined list of source articles from all tasks.
- **Verification Points:**
  - Response should include a list of source articles from all tasks
  - Response should include task information for each task
  - Response should include the total number of articles

## Comparing Gemini and Perplexity Responses

When testing the Gemini API endpoints, it's important to compare the responses with the corresponding Perplexity endpoints to ensure consistency. Here are some key points to consider:

1. **Response Format:** The response format should be the same for both Gemini and Perplexity endpoints.
2. **Response Quality:** The quality of the responses should be comparable or better with Gemini.
3. **Response Time:** The response time should be comparable or better with Gemini.
4. **Error Handling:** Error responses should be consistent between Gemini and Perplexity.

## Troubleshooting

If you encounter any issues while testing the Gemini API endpoints, consider the following:

1. **API Key:** Make sure the Gemini API key is correctly configured in the application.properties file.
2. **Dependencies:** Ensure all required dependencies are correctly installed and configured.
3. **Network:** Check that the application has internet access to call the Gemini API.
4. **Logs:** Check the application logs for any error messages or warnings.

## Conclusion

Testing the Gemini API endpoints via Swagger UI is an essential step in verifying that the migration from Perplexity to Gemini has been successful. By following this guide, you can ensure that all endpoints are working correctly and returning the expected responses.

Remember to test all endpoints thoroughly and compare the responses with the corresponding Perplexity endpoints to ensure consistency. If you encounter any issues, refer to the troubleshooting section or consult the development team for assistance.