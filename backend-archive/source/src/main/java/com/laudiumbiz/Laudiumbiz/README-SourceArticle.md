# Source Article Route Implementation

This document provides an overview of the implementation of the sourceArticle route, which allows retrieving source articles from social media platforms using Perplexity.

## Overview

The sourceArticle route provides three endpoints:

1. `GET /api/sourceArticles` - Get source articles based on task type with optional parameters
2. `GET /api/sourceArticles/task/{taskId}` - Get source articles for a specific task
3. `POST /api/sourceArticles/custom` - Get source articles with a custom prompt

These endpoints allow querying Perplexity for social media content related to specific locations (Laudium, Claudius, Erasmia, Lotus Gardens, Atteridgeville) with various filtering and processing options.

## Implementation Details

### Models

- **SourceArticle**: Represents a source article from social media platforms with fields for url, platform, timestamp, author, content, engagement metrics, hashtags, and additional data.

### Services

- **PerplexityService**: Handles constructing prompts, querying Perplexity (simulated), and processing results. Includes methods for:
  - Constructing prompts based on task type
  - Simulating Perplexity responses
  - Processing source articles based on task type (ranking, filtering, etc.)

### Controllers

- **SourceArticleController**: Exposes the endpoints for retrieving source articles. Includes methods for:
  - Getting source articles based on task type with optional parameters
  - Getting source articles for a specific task
  - Getting source articles with a custom prompt

### Configuration

- Updated **api.yml** to include:
  - New SourceArticles tag
  - Path definitions for the three endpoints
  - Schema definition for the SourceArticle model

## Task Types

The implementation supports 8 different task types:

1. Top engaged topics in the last 24 hours
2. Volume changes in local topics over the past 7 days
3. Unverified rumors or conspiracy posts in the past 72 hours
4. Fast-rising hashtags in the last 48 hours
5. Top shared images/videos with specific tags in the last 24 hours
6. Posts about specific topics (power outage, water, crime, protest) ranked by volume
7. Promotions, grocery deals, or discounts with 100+ shares in the last 24 hours
8. Places or streets mentioned most in geo-tagged posts within 10km of Laudium in the past 48 hours

## Usage Examples

### Basic Task Query

```
GET /api/sourceArticles?taskType=1
```

### Task with Parameters

```
GET /api/sourceArticles?taskType=1&timeframe=48 hours&platforms=Facebook, Twitter&topics=water, crime
```

### Specific Task

```
GET /api/sourceArticles/task/3
```

### Custom Prompt

```
POST /api/sourceArticles/custom
Content-Type: application/json

{
  "prompt": "Show all posts from Laudium mentioning school closures in the last week"
}
```

## Notes

- The current implementation simulates Perplexity responses since we can't actually query Perplexity in this environment.
- In a production environment, you would need to implement the actual Perplexity API integration.
- The response data is randomized for simulation purposes, so each request will return different results.
- For detailed testing instructions, see the `SourceArticleEndpointTest.md` file in the test directory.