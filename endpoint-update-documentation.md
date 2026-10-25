# Endpoint Update Documentation

## Issue Description
Update the endpoint for article generation from `/api/v1/perplexity/generate-article-async` to `/api/v1/perplexity/async/generate-article`.

## Changes Made

### 1. Updated the API Endpoint Configuration
Updated the `GENERATE_ARTICLE_ASYNC` endpoint in `config/api.js` from `"perplexity/generate-article-async"` to `"perplexity/async/generate-article"`:

```javascript
// Before
GENERATE_ARTICLE_ASYNC: "perplexity/generate-article-async",

// After
GENERATE_ARTICLE_ASYNC: "perplexity/async/generate-article",
```

### 2. Updated Test Files
Updated the endpoint references in the test script `test-perplexity-async.js`:

```javascript
// Before
GENERATE_ARTICLE_ASYNC: 'perplexity/generate-article-async'
// ...
expect(mockPost).toHaveBeenCalledWith(
  'perplexity/generate-article-async',
  { text: summaryText }
);

// After
GENERATE_ARTICLE_ASYNC: 'perplexity/async/generate-article'
// ...
expect(mockPost).toHaveBeenCalledWith(
  'perplexity/async/generate-article',
  { text: summaryText }
);
```

### 3. Updated Documentation
Updated the endpoint references in the documentation file `perplexity-async-implementation.md`:

```markdown
// Before
expect(mockPost).toHaveBeenCalledWith(
  'perplexity/generate-article-async',
  { text: summaryText }
);
// ...
The API endpoint configuration in `config/api.js` already had the async endpoint defined as `GENERATE_ARTICLE_ASYNC: "perplexity/generate-article-async"`, so no changes were needed there.

// After
expect(mockPost).toHaveBeenCalledWith(
  'perplexity/async/generate-article',
  { text: summaryText }
);
// ...
The API endpoint configuration in `config/api.js` has been updated to use the new endpoint path: `GENERATE_ARTICLE_ASYNC: "perplexity/async/generate-article"`.
```

### 4. Created Test Script
Created a new test script `test-endpoint-update.js` to verify that the endpoint has been updated correctly:

```javascript
// Define the base URL and endpoint
const BASE_URL = 'http://192.168.0.246:9011/laudium/api/v1/';
const ENDPOINT = 'perplexity/async/generate-article';

// Define the test data
const testData = {
  text: 'This is a test summary for article generation.'
};

// Make the request
async function testEndpoint() {
  try {
    console.log(`Making POST request to ${BASE_URL}${ENDPOINT}`);
    console.log('Request data:', testData);
    
    const response = await axios.post(`${BASE_URL}${ENDPOINT}`, testData);
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
    console.log('Test successful! The endpoint is working correctly.');
  } catch (error) {
    // Error handling...
  }
}
```

## Testing
The implementation can be tested by:

1. Running the test script: `node test-endpoint-update.js`
2. Manually testing the "Generate" button in the article creation page to verify that it sends a request to the correct endpoint with the correct parameters.

## Notes
- The `generateArticleFromSummary` function in `perplexity.js` was already using the correct endpoint constant `API_ENDPOINTS.PERPLEXITY.GENERATE_ARTICLE_ASYNC`, so no changes were needed there.
- The `generateFromSummary` function in `Create.vue` was already calling the `generateArticleFromSummary` function correctly, so no changes were needed there.
- The only change needed was to update the endpoint path in the API configuration.
# Endpoint Update Documentation

## Issue Description
Update the endpoint for article generation from `/api/v1/perplexity/generate-article-async` to `/api/v1/perplexity/async/generate-article`.

## Production Server URL Update (2025-10-19)
- Updated production API base URL to: https://server.safai.co.za/Laudiumbiz/api/v1/
- Location: .env -> VITE_PROD_API_BASE_URL
- Rationale: Align application with the new production server.

## Changes Made

### 1. Updated the API Endpoint Configuration
Updated the `GENERATE_ARTICLE_ASYNC` endpoint in `config/api.js` from `"perplexity/generate-article-async"` to `"perplexity/async/generate-article"`:

```javascript
// Before
GENERATE_ARTICLE_ASYNC: "perplexity/generate-article-async",

// After
GENERATE_ARTICLE_ASYNC: "perplexity/async/generate-article",
```

### 2. Updated Test Files
Updated the endpoint references in the test script `test-perplexity-async.js`:

```javascript
// Before
GENERATE_ARTICLE_ASYNC: 'perplexity/generate-article-async'
// ...
expect(mockPost).toHaveBeenCalledWith(
  'perplexity/generate-article-async',
  { text: summaryText }
);

// After
GENERATE_ARTICLE_ASYNC: 'perplexity/async/generate-article'
// ...
expect(mockPost).toHaveBeenCalledWith(
  'perplexity/async/generate-article',
  { text: summaryText }
);
```

### 3. Updated Documentation
Updated the endpoint references in the documentation file `perplexity-async-implementation.md`:

```markdown
// Before
expect(mockPost).toHaveBeenCalledWith(
  'perplexity/generate-article-async',
  { text: summaryText }
);
// ...
The API endpoint configuration in `config/api.js` already had the async endpoint defined as `GENERATE_ARTICLE_ASYNC: "perplexity/generate-article-async"`, so no changes were needed there.

// After
expect(mockPost).toHaveBeenCalledWith(
  'perplexity/async/generate-article',
  { text: summaryText }
);
// ...
The API endpoint configuration in `config/api.js` has been updated to use the new endpoint path: `GENERATE_ARTICLE_ASYNC: "perplexity/async/generate-article"`.
```

### 4. Created Test Script
Created a new test script `test-endpoint-update.js` to verify that the endpoint has been updated correctly:

```javascript
// Define the base URL and endpoint
const BASE_URL = 'https://server.safai.co.za/Laudiumbiz/api/v1/';
const ENDPOINT = 'perplexity/async/generate-article';

// Define the test data
const testData = {
  text: 'This is a test summary for article generation.'
};

// Make the request
async function testEndpoint() {
  try {
    console.log(`Making POST request to ${BASE_URL}${ENDPOINT}`);
    console.log('Request data:', testData);
    
    const response = await axios.post(`${BASE_URL}${ENDPOINT}`, testData);
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
    console.log('Test successful! The endpoint is working correctly.');
  } catch (error) {
    // Error handling...
  }
}
```

## Testing
The implementation can be tested by:

1. Running the test script: `node test-endpoint-update.js`
2. Manually testing the "Generate" button in the article creation page to verify that it sends a request to the correct endpoint with the correct parameters.

## Notes
- The `generateArticleFromSummary` function in `perplexity.js` was already using the correct endpoint constant `API_ENDPOINTS.PERPLEXITY.GENERATE_ARTICLE_ASYNC`, so no changes were needed there.
- The `generateFromSummary` function in `Create.vue` was already calling the `generateArticleFromSummary` function correctly, so no changes were needed there.
- The only change needed was to update the endpoint path in the API configuration.


## Localhost URL Decommission (2025-10-19)
- Per request to point any `http://localhost:9011/laudium/` to the production server, the following updates were made:
  - src/config/api.js: API_BASE_URL set to `https://server.safai.co.za/Laudiumbiz/api/v1/`.
  - .env: VITE_DEV_API_BASE_URL and VITE_TEST_API_BASE_URL set to `https://server.safai.co.za/Laudiumbiz/api/v1/`.
  - Developer guidelines updated to reflect the new base URLs for all environments.
- Remaining references to the localhost URL exist only within historical documentation or built artifacts and do not affect runtime behavior.



## Legacy Articles Endpoint Guard (2025-10-19)
- Context: The Articles page was reported to call the legacy domain `https://lna.abc.co.zm/Laudiumbiz/api/v1/articles`.
- Action: Verified that `src/services/articles.js` uses the centralized API client with `API_URL` from `src/config/api.js`, which points to `https://server.safai.co.za/Laudiumbiz/api/v1/`.
- Added guard test: `test-no-legacy-articles-endpoint.js` to ensure no source/config file contains the legacy domain or the full legacy articles endpoint.

### How to verify
- Run: `node test-no-legacy-articles-endpoint.js`
  - Expected: `No legacy Laudiumbiz articles endpoint/domain found in source/config files.`

### Notes
- Any occurrences of legacy domains found in the repository are limited to unrelated services under `src/services/GlobalVariables.js` and generated assets under Android/iOS build folders. These do not affect the News Articles API calls.
- The shared axios client (`src/services/api.js`) sets `baseURL: API_URL`; updating `API_URL` centrally affects all endpoints, including `/articles`.
