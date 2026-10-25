# Laudium Biz Development Guidelines

This document provides essential information for developers working on the Laudium Biz project. It covers build configuration, testing procedures, and other development guidelines specific to this project.

## Project Overview

Laudium Biz is a Vue 3 application built with Vite that serves as a news platform for the Laudium community. The application includes:

- News articles and content management
- Business listings and advertisements
- Admin and business user dashboards
- Integration with various third-party services (OneSignal, Sentry, PayFast)

## Build and Configuration

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Environment Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables by creating or updating the `.env` file with the following variables:

```
# API Configuration
VITE_DEV_API_BASE_URL=https://server.safai.co.za/Laudiumbiz/api/v1/
VITE_TEST_API_BASE_URL=https://server.safai.co.za/Laudiumbiz/api/v1/
VITE_PROD_API_BASE_URL=https://server.safai.co.za/Laudiumbiz/api/v1/

# Third-party Services
VITE_SENTRY_DNS=your_sentry_dsn
VITE_ONE_SIGNAL_APP_ID=your_onesignal_app_id
VITE_YOUTUBE_API_KEY=your_youtube_api_key
VITE_YOUTUBE_DEFAULT_CHANNEL_ID=your_default_channel_id

# Payment Gateway (PayFast)
VITE_PAYFAST_MERCHANT_ID=your_merchant_id
VITE_PAYFAST_MERCHANT_KEY=your_merchant_key
VITE_PAYFAST_PASSPHRASE=your_passphrase
VITE_PAYFAST_RETURN_URL=your_return_url
VITE_PAYFAST_CANCEL_URL=your_cancel_url
VITE_PAYFAST_NOTIFY_URL=your_notify_url
VITE_PAYFAST_SANDBOX=true_or_false
```

### Development Server

Run the development server with:

```bash
npm run dev
```

This starts a Vite development server with hot module replacement. The server will be available at `http://localhost:5173` by default.

### Building for Production

Build the application for production with:

```bash
npm run build
```

This generates optimized assets in the `dist` directory.

### Preview Production Build

Preview the production build locally with:

```bash
npm run preview
```

## Project Structure

The project follows a standard Vue 3 application structure:

- `src/` - Application source code
  - `assets/` - Static assets (CSS, images)
  - `components/` - Reusable Vue components
  - `composables/` - Vue composition API functions
  - `config/` - Configuration files
  - `layouts/` - Page layout components
  - `plugins/` - Vue plugins
  - `router/` - Vue Router configuration
  - `services/` - API and external service integrations
  - `store/` - Vuex store modules
  - `utils/` - Utility functions
  - `views/` - Page components organized by feature

## Testing

### Testing Approach

The project uses standalone Node.js scripts for testing specific functionality. These scripts are located in the project root with the naming pattern `test-*.js`.

### Running Tests

Tests are executed directly with Node.js:

```bash
node test-file-name.js
```

For example:

```bash
node test-format-time-ago.js
```

### Creating New Tests

To create a new test:

1. Create a new JavaScript file in the project root with the naming pattern `test-*.js`
2. Import the necessary modules and functions to test
3. Write test cases and assertions
4. Run the test with Node.js

#### Example Test

Here's an example test for the `formatTimeAgo` utility function:

```javascript
/**
 * Test script for the formatTimeAgo utility function
 */

// Import the function to test
import { formatTimeAgo } from './src/utils/index.js';

// Test function
async function testFormatTimeAgo() {
  console.log('Testing formatTimeAgo utility function...');
  
  // Use a fixed reference date to ensure consistent test results
  const referenceDate = new Date('2025-08-05T12:00:00Z');
  
  // Create test cases
  const fiveMinutesAgo = new Date(referenceDate.getTime() - 5 * 60 * 1000);
  const twoHoursAgo = new Date(referenceDate.getTime() - 2 * 60 * 60 * 1000);
  
  // Mock the current date for consistent testing
  const originalDate = global.Date;
  const mockDate = '2025-08-05T12:00:00Z';
  
  global.Date = class extends originalDate {
    constructor(...args) {
      if (args.length === 0) {
        super(mockDate);
      } else {
        super(...args);
      }
    }
    
    static now() {
      return new originalDate(mockDate).getTime();
    }
  };
  
  // Run tests
  const testCases = [
    { input: fiveMinutesAgo, expected: '5 minutes ago' },
    { input: twoHoursAgo, expected: '2 hours ago' },
    { input: null, expected: 'Unknown time' }
  ];
  
  // Track results
  let passedTests = 0;
  let failedTests = 0;
  
  for (const testCase of testCases) {
    const result = formatTimeAgo(testCase.input);
    const passed = result === testCase.expected;
    
    if (passed) {
      console.log(`✅ PASS: formatTimeAgo(${testCase.input}) => "${result}"`);
      passedTests++;
    } else {
      console.log(`❌ FAIL: formatTimeAgo(${testCase.input})`);
      console.log(`   Expected: "${testCase.expected}"`);
      console.log(`   Received: "${result}"`);
      failedTests++;
    }
  }
  
  // Summary
  console.log(`\nTotal tests: ${testCases.length}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  
  // Restore original Date
  global.Date = originalDate;
}

// Run the test
testFormatTimeAgo();
```

### Testing API Endpoints

For testing API endpoints, use the axios library to make requests and validate responses:

```javascript
import axios from 'axios';

async function testEndpoint() {
  try {
    const response = await axios.post(`${BASE_URL}${ENDPOINT}`, testData);
    console.log('Response:', response.data);
    // Add validation logic here
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

## Additional Development Information

### Code Style

- The project uses ESM (ECMAScript modules) with `import`/`export` syntax
- Vue components use the Composition API with `<script setup>` syntax
- CSS uses SCSS with scoped styles in components

### Environment-Specific Configuration

The application uses different configurations based on the environment:

- Development: Uses local API endpoints and disables some features (Sentry, OneSignal)
- Production: Uses production API endpoints and enables all features

Environment detection is done using:
- `process.env.NODE_ENV` for Node.js environment
- `import.meta.env.MODE` for Vite-specific environment
- `import.meta.env.VITE_*` for custom environment variables

### Authentication

Authentication is handled through the `useAuth` composable which provides:
- Login/logout functionality
- User state management
- Token handling and validation

### API Integration

API requests are made using axios through the global `$api` property:

```javascript
// In a component
const response = await this.$api.get('/endpoint');

// In a composable or service
import api from '@/services/api';
const response = await api.get('/endpoint');
```

### Progressive Web App (PWA)

The application is configured as a PWA using the Vite PWA plugin with:
- Service worker for offline support
- Manifest file for installation
- Cache strategies for different resource types

### Error Handling and Logging

- Sentry is used for error tracking in production
- The `devLog` utility is used for development logging
- API errors are handled consistently through interceptors

### Third-Party Integrations

- **OneSignal**: For push notifications (only enabled in production)
- **Sentry**: For error tracking and monitoring
- **PayFast**: For payment processing
- **YouTube API**: For video integration

### Performance Considerations

- Use lazy loading for routes to reduce initial bundle size
- Implement infinite scrolling for long lists (using v3-infinite-loading)
- Use proper caching strategies for API responses and assets