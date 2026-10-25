# Gemini REST API Implementation

## Overview

This document describes the implementation of the Gemini API using REST calls instead of the Google Cloud Vertex AI SDK. The implementation follows the REST API format provided in the issue description.

## Changes Made

### 1. Created Model Classes for REST API

Created the following model classes in the `com.laudiumbiz.Laudiumbiz.Models.GeminiRest` package:

- `Part` - Represents a part of content with text
- `Content` - Represents content with a role and parts
- `GoogleSearch` - Represents the Google Search tool
- `Tool` - Represents a tool with Google Search
- `GeminiRequest` - Represents the request body with contents, tools, and model
- `Candidate` - Represents a candidate in the response
- `GroundingMetadata` - Represents grounding metadata in the response
- `UsageMetadata` - Represents usage metadata in the response
- `GeminiResponse` - Represents the response body with candidates, usage metadata, etc.

### 2. Modified GeminiService to Use RestTemplate

Updated the `GeminiService` class to use `RestTemplate` instead of the Google Cloud Vertex AI SDK:

- Removed the `VertexAI` and `GenerativeModel` fields
- Added a `RestTemplate` field
- Added methods to get the API URL and create headers
- Updated all methods to use `RestTemplate` to make REST calls to the Gemini API
- Maintained the same method signatures to ensure backward compatibility

### 3. Updated Tests

Updated the following test files to work with the new implementation:

- `GeminiServiceTest` - Updated to mock `RestTemplate` instead of Google Cloud Vertex AI SDK classes
- `GeminiServiceSourceArticleTest` - Updated to mock `RestTemplate` and test the new implementation
- `GeminiServiceRoleTest` - Updated to test the roles in the new implementation
- `GeminiServiceInitializationTest` - Updated to test the initialization of `RestTemplate`
- `GeminiServiceRetrySettingsTest` - Updated to test the HTTP request configuration for `RestTemplate`

## API Format

The REST API format follows the format provided in the issue description:

```
POST https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL_ID:generateContent
```

Request body:

```json
{
  "contents": [{
    "role": "user",
    "parts": [{
      "text": "TEXT"
    }]
  }],
  "tools": [{
    "googleSearch": {}
  }],
  "model": "projects/PROJECT_ID/locations/LOCATION/publishers/google/models/MODEL_ID"
}
```

Response body:

```json
{
  "candidates": [
    {
      "content": {
        "role": "model",
        "parts": [
          {
            "text": "..."
          }
        ]
      },
      "finishReason": "STOP",
      "groundingMetadata": {
        "webSearchQueries": ["weather in Chicago this weekend"],
        "searchEntryPoint": {
          "renderedContent": "..."
        },
        "groundingChunks": [
          {
            "web": {
              "uri": "https://www.google.com/search?q=weather+in+Chicago,+IL",
              "title": "Weather information for locality: Chicago, administrative_area: IL",
              "domain": "google.com"
            }
          }
        ],
        "groundingSupports": [
          {
            "segment": {
              "startIndex": 85,
              "endIndex": 214,
              "text": "The temperature will be between 49°F (9°C) and 55°F (13°C) on Saturday and between 51°F (11°C) and 56°F (13°C) on Sunday."
            },
            "groundingChunkIndices": [0],
            "confidenceScores": [0.8662828]
          }
        ],
        "retrievalMetadata": {}
      }
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 10,
    "candidatesTokenCount": 98,
    "totalTokenCount": 108,
    "trafficType": "ON_DEMAND",
    "promptTokensDetails": [
      {
        "modality": "TEXT",
        "tokenCount": 10
      }
    ],
    "candidatesTokensDetails": [
      {
        "modality": "TEXT",
        "tokenCount": 98
      }
    ]
  },
  "modelVersion": "gemini-2.0-flash",
  "createTime": "2025-05-19T14:42:55.000643Z",
  "responseId": "..."
}
```

## Configuration

The following configuration values are used:

- `gemini.api.key` - The Gemini API key
- `gemini.model` - The Gemini model name
- `gemini.project.id` - The Google Cloud project ID
- `gemini.location` - The location for the API endpoint

These values are injected using Spring's `@Value` annotation.

## Error Handling

The implementation includes error handling for the following scenarios:

- No candidates returned from Gemini
- No content parts returned from Gemini candidate
- API call errors

## Testing

The implementation includes tests for all methods in the `GeminiService` class, including:

- `generateText`
- `generateStructuredArticle`
- `generateReasoning`
- `getSourceArticles`
- `getSourceArticlesWithCustomPrompt`
- `investigativeJournalism`

The tests mock the `RestTemplate` to return predefined responses and verify that the methods behave as expected.