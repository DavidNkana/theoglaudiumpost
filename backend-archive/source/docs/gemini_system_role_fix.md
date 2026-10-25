# Gemini API System Role Fix

## Issue Description

The `/api/v1/gemini/async/article` endpoint was failing with the following error:

```
java.io.IOException: Error generating structured article with Gemini: io.grpc.StatusRuntimeException: INVALID_ARGUMENT: Content with system role is not supported.
```

This error occurred in the `generateStructuredArticle` method in `GeminiService.java` (line 186) and was related to the `generateArticleWithMetadataAsync` method in `GeminiController.java` (line 196).

## Root Cause

The Gemini API does not support the "system" role in content messages. In our implementation, we were trying to use the system role to instruct the model to respond as a New York Times reporter and to format its response in a specific JSON structure:

```java
Content.newBuilder()
    .setRole("system")
    .addParts(Part.newBuilder().setText(
        "You are a professional New York Times reporter. Write well-researched, engaging articles " +
        // ... more instructions ...
    ).build())
    .build()
```

## Solution

We modified the `generateStructuredArticle` method to remove the system role while maintaining the same functionality. Instead of using separate Content objects for system and user roles, we combined the instructions and the user prompt into a single Content object with the "user" role:

```java
Content.newBuilder()
    .setRole("user")
    .addParts(Part.newBuilder().setText(
        "You are a professional New York Times reporter. Write well-researched, engaging articles " +
        // ... more instructions ...
        "Topic to write about: " + prompt
    ).build())
    .build()
```

This approach follows the pattern used in other methods in the service, such as `generateReasoning`, where all content is included in a single Content object with the "user" role.

We also updated the comments in the `GeminiController` to remove references to "system role" and accurately reflect the new implementation:

1. Changed "using Gemini API with system role set to respond as a New York Times reporter" to "using Gemini API with instructions to respond as a New York Times reporter".
2. Changed "Use the new method that sets system role and structured format" to "Use the method that provides instructions for structured format".

## Expected Outcome

With these changes, the `/api/v1/gemini/async/article` endpoint should no longer produce the "Content with system role is not supported" error. The functionality should remain the same, with the model still responding as a New York Times reporter and formatting its response in the required JSON structure.

## Testing

The changes have been implemented and should be tested in the actual environment to verify that the error is resolved. Since the Gemini API client is difficult to mock for unit testing, manual testing is recommended to ensure that the endpoint works correctly.

## References

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Vertex AI API Documentation](https://cloud.google.com/vertex-ai/docs/reference/rest)