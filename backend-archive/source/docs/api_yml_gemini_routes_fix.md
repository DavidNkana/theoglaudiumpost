# API.yml Gemini Routes Fix

## Issue Description

The Gemini API routes in the api.yml file were incorrectly configured, resulting in duplicated path prefixes. The routes were being generated as:

```
/api/v1/api/v1/gemini/...
```

When they should have been:

```
/api/v1/gemini/...
```

## Root Cause

The api.yml file defines a base server URL at the beginning of the file:

```yaml
servers:
  - url: /laudium/api/v1
    description: Base API path
```

This means that all routes defined in the file are relative to this base path. When defining Gemini routes, they were incorrectly prefixed with "api/v1/" again, causing the duplication.

## Solution

The solution was to add the Gemini routes to the api.yml file with the correct relative path prefix. Instead of using "/api/v1/gemini/...", we used "/gemini/..." as the path prefix for all Gemini endpoints.

### Changes Made

1. Added all 10 Gemini endpoints to the api.yml file with the correct "/gemini/" path prefix:
   - POST /gemini/generate-text
   - POST /gemini/generate-reasoning
   - POST /gemini/async/generate-text
   - POST /gemini/async/generate-reasoning
   - POST /gemini/generate-article
   - POST /gemini/async/generate-article
   - POST /gemini/article
   - POST /gemini/async/article
   - POST /gemini/investigative-journalism
   - POST /gemini/async/investigative-journalism

2. Added a new "Gemini" tag to the tags section of the api.yml file:
   ```yaml
   - name: Gemini
     description: Operations for generating AI content using Gemini API with GoogleSearch tool
   ```

3. Defined appropriate request and response schemas for each endpoint.

## Result

With these changes, the Gemini API routes are now correctly defined in the api.yml file. When combined with the base server URL, they will result in the correct full paths:

```
/laudium/api/v1/gemini/...
```

This matches the @RequestMapping("/api/v1/gemini") annotation in the GeminiController class, ensuring that the API documentation accurately reflects the actual implementation.

## Testing

The changes have been implemented and should be tested to verify that the API routes are working correctly. This can be done by:

1. Starting the application
2. Accessing the API documentation (if available, e.g., Swagger UI)
3. Verifying that the Gemini endpoints are listed under the "Gemini" tag
4. Testing a few of the endpoints to ensure they're accessible at the correct paths

## References

- [OpenAPI Specification](https://swagger.io/specification/)
- [Spring Boot RequestMapping Documentation](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/bind/annotation/RequestMapping.html)