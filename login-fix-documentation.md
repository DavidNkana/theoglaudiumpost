# Login Issue Fix Documentation

## Issue Description
The login functionality at http://192.168.0.246:5173/admin/login was not working.

## Root Cause
The application was configured to connect to `http://localhost:9011/laudium/api/v1/` for API requests, but the frontend was running at `http://192.168.0.246:5173`. This mismatch in URLs caused the login requests to fail because:

1. The frontend was sending requests to localhost instead of the correct server IP
2. Cross-origin requests may have been blocked by the browser
3. The API server might not have been accessible at localhost from the client's perspective

## Changes Made

### 1. Updated API Base URL
Modified `src/config/api.js` to use the correct server IP address:

```javascript
// Before
export const API_BASE_URL = "http://localhost:9011/laudium/api/v1/";

// After
export const API_BASE_URL = "http://192.168.0.246:9011/laudium/api/v1/";
```

This change ensures that the frontend connects to the correct backend server for all API requests, including authentication.

### 2. Removed Token Validation
As part of previous work, token validation was removed from the application:

- Removed token handling from request interceptors in `src/services/api.js`
- Updated the authentication composable in `src/composables/useAuth.js` to work without tokens
- Removed token-related functions from `src/utils/auth.js`

### 3. Created Test Scripts
Created test scripts to verify the changes:

- `test-no-tokens.js`: Verifies that token validation has been removed
- `test-login.js`: Tests the login functionality with the updated API URL

## Testing
To test the login functionality:

1. Run the application at http://192.168.0.246:5173/admin/login
2. Enter valid admin credentials
3. Verify that you are redirected to the admin dashboard after successful login

## Additional Notes
- The application now uses cookies for authentication (`withCredentials: true` in the API client)
- The API server must be running at http://192.168.0.246:9011/laudium/api/v1/ for the login to work
- If the server address changes in the future, update the `API_BASE_URL` in `src/config/api.js` accordingly