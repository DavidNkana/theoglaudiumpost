# Source Article Endpoint Testing Guide

This document provides guidance on how to test the newly implemented Source Article endpoints.

## Endpoints Overview

The following endpoints have been implemented:

1. `GET /api/sourceArticles` - Get source articles based on task type with optional parameters
2. `GET /api/sourceArticles/task/{taskId}` - Get source articles for a specific task
3. `POST /api/sourceArticles/custom` - Get source articles with a custom prompt

## Testing the Endpoints

### 1. Basic Task Query

**Request:**
```
GET /api/sourceArticles?taskType=1
```

**Expected Response:**
```json
{
  "task": 1,
  "prompt": "Show the top 30 most shared or most commented posts from Facebook, X (Twitter), and Instagram in the last 24 hours that mention Laudium, Claudius, Erasmia, Lotus Gardens, Atteridgeville",
  "sourceArticles": [
    {
      "url": "https://facebook.com/post/12345678",
      "platform": "facebook",
      "timestamp": "2025-08-01T15:30:00",
      "author": "Laudium John Smith",
      "content": "BREAKING: power outage reported in Laudium. Residents are advised to stay indoors.",
      "shareCount": 450,
      "commentCount": 120,
      "hashtags": ["#Laudium", "#PowerOutage", "#Community"],
      "additionalData": {
        "location": "Laudium",
        "topic": "power outage",
        "likes": 780
      }
    }
  ]
}
```

### 2. Task with Parameters

**Request:**
```
GET /api/sourceArticles?taskType=1&timeframe=48 hours&platforms=Facebook, Twitter&topics=water, crime
```

**Expected Response:**
Similar to the basic query but with the prompt and results reflecting the specified parameters.

### 3. Specific Task

**Request:**
```
GET /api/sourceArticles/task/3
```

**Expected Response:**
```json
{
  "task": 3,
  "prompt": "List unverified rumors or conspiracy posts from Laudium, Claudius, Erasmia, Lotus Gardens, Atteridgeville in past 72h. Include who's posting and any evidence.",
  "sourceArticles": [
    {
      "url": "https://twitter.com/post/87654321",
      "platform": "twitter",
      "timestamp": "2025-08-01T10:15:00",
      "author": "@laudiumThabo",
      "content": "BREAKING: Unverified reports of water contamination in Laudium. Officials have not confirmed. Exercise caution.",
      "shareCount": 320,
      "commentCount": 180,
      "hashtags": ["#Laudium", "#WaterAlert", "#Unverified"],
      "additionalData": {
        "location": "Laudium",
        "topic": "water",
        "retweets": 320,
        "likes": 450
      }
    }
  ]
}
```

### 4. Custom Prompt

**Request:**
```
POST /api/sourceArticles/custom
Content-Type: application/json

{
  "prompt": "Show all posts from Laudium mentioning school closures in the last week"
}
```

**Expected Response:**
```json
{
  "prompt": "Show all posts from Laudium mentioning school closures in the last week",
  "sourceArticles": [
    {
      "url": "https://facebook.com/post/56781234",
      "platform": "facebook",
      "timestamp": "2025-07-30T08:45:00",
      "author": "Laudium School Updates",
      "content": "NOTICE: All schools in Laudium area will be closed tomorrow due to scheduled maintenance of water infrastructure.",
      "shareCount": 280,
      "commentCount": 150,
      "hashtags": ["#Laudium", "#SchoolClosure", "#Notice"],
      "additionalData": {
        "location": "Laudium",
        "topic": "event",
        "likes": 520
      }
    }
  ]
}
```

## Verification Points

When testing, verify the following:

1. **Response Format**: The response should be valid JSON with the expected structure.
2. **Source Article Fields**: Each source article should have all the required fields (url, platform, timestamp, author, content, engagement metrics, hashtags).
3. **Task-Specific Processing**: For each task type, verify that the appropriate processing is applied (e.g., sorting by engagement for task 1).
4. **Error Handling**: Test with invalid inputs to verify proper error responses.

## Notes

- The current implementation simulates Perplexity responses since we can't actually query Perplexity in this environment.
- In a production environment, you would need to implement the actual Perplexity API integration.
- The response data is randomized for simulation purposes, so each request will return different results.