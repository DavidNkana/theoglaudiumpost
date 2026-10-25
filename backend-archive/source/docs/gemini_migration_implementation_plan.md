# 🚀 Gemini Migration Implementation Plan

**Project: Laudiumbiz API**  
**Migration: Perplexity → Gemini 2.5 Pro**  
**Date: August 4, 2025**

---

## 📋 Overview

This document outlines the step-by-step implementation plan for migrating all Perplexity API routes to Gemini 2.5 Pro. The migration will be executed in 4 sprints, with each sprint focusing on a specific set of routes.

## 🎯 Migration Goals

1. Replace all Perplexity routes with Gemini 2.5 Pro equivalents
2. Ensure all Gemini routes use grounding via GoogleSearch tool
3. Structure prompts to be JSON-compliant
4. Stream and safely parse API responses
5. Match output format to the Perplexity contract where applicable
6. Duplicate all routes under new paths (`/api/v1/gemini/...` or `/api/gemini/sourceArticles/...`)

## 🧰 Prerequisites

1. Google Cloud Platform account with Vertex AI API access
2. Gemini 2.5 Pro API key
3. Java SDK for Gemini (Google AI SDK)
4. Understanding of the current Perplexity implementation
5. Test environment for validating the migration

## 🗺️ Implementation Plan

### 🔄 Sprint 1: Core Infrastructure and Initial Routes

**Duration: 1 week**  
**Focus: Setup infrastructure and implement core reasoning routes**

#### Tasks:

1. **Setup and Configuration**
   - Add Gemini API key to application.properties
   - Add Google AI SDK dependencies to pom.xml
   - Create GeminiService class with base methods
   - Implement GoogleSearch tool integration

2. **Implement Core Routes**
   - Create GeminiController with base path `/api/v1/gemini`
   - Implement `/api/v1/gemini/generate-reasoning` endpoint
   - Implement `/api/v1/gemini/generate-text` endpoint

3. **Testing**
   - Create unit tests for GeminiService
   - Create integration tests for new endpoints
   - Compare responses with Perplexity endpoints for consistency

#### Deliverables:
- Working GeminiService with GoogleSearch integration
- Two functional Gemini endpoints with proper error handling
- Test suite for validating the implementation

---

### 🔄 Sprint 2: Async Routes and Article Generation

**Duration: 1 week**  
**Focus: Implement asynchronous routes and article generation**

#### Tasks:

1. **Implement Async Routes**
   - Add async support to GeminiService
   - Implement `/api/v1/gemini/async/generate-reasoning` endpoint
   - Implement `/api/v1/gemini/async/generate-text` endpoint

2. **Implement Article Generation**
   - Implement `/api/v1/gemini/generate-article` endpoint
   - Implement `/api/v1/gemini/async/generate-article` endpoint
   - Implement `/api/v1/gemini/article` endpoint
   - Implement `/api/v1/gemini/async/article` endpoint

3. **Testing**
   - Create unit tests for async methods
   - Create integration tests for article generation
   - Validate response format matches Perplexity contract

#### Deliverables:
- Functional async routes with proper error handling
- Article generation endpoints with metadata extraction
- Test suite for validating async and article generation

---

### 🔄 Sprint 3: Source Article System

**Duration: 1 week**  
**Focus: Implement source article routes**

#### Tasks:

1. **Create Source Article Controller**
   - Create GeminiSourceArticleController with base path `/api/gemini/sourceArticles`
   - Implement source article model for Gemini responses

2. **Implement Source Article Routes**
   - Implement `/api/gemini/sourceArticles` endpoint
   - Implement `/api/gemini/sourceArticles/task/{taskId}` endpoint
   - Implement `/api/gemini/sourceArticles/custom` endpoint
   - Implement `/api/gemini/sourceArticles/all` endpoint

3. **Testing**
   - Create unit tests for source article methods
   - Create integration tests for source article endpoints
   - Validate source article format matches Perplexity contract

#### Deliverables:
- Functional source article routes with proper error handling
- Source article model compatible with Gemini responses
- Test suite for validating source article functionality

---

### 🔄 Sprint 4: Investigative Journalism and Final Testing

**Duration: 1 week**  
**Focus: Complete remaining routes and comprehensive testing**

#### Tasks:

1. **Implement Remaining Routes**
   - Implement `/api/v1/gemini/investigative-journalism` endpoint
   - Implement `/api/v1/gemini/async/investigative-journalism` endpoint
   - Address any remaining edge cases or issues

2. **Comprehensive Testing**
   - Create end-to-end tests for all routes
   - Perform load testing to ensure performance
   - Validate all response formats match Perplexity contract

3. **Documentation and Finalization**
   - Update Swagger documentation for all new endpoints
   - Create user documentation for the new Gemini routes
   - Prepare monitoring and logging for production

#### Deliverables:
- All routes fully implemented and tested
- Comprehensive test suite for all functionality
- Complete documentation for the new Gemini implementation

---

## 🧪 Testing Strategy

### Unit Testing
- Test each method in GeminiService independently
- Mock Gemini API responses for predictable testing
- Validate error handling and edge cases

### Integration Testing
- Test each endpoint with real Gemini API calls
- Compare responses with Perplexity endpoints
- Validate response format and structure

### End-to-End Testing
- Test complete user flows using the new endpoints
- Validate asynchronous job processing
- Test error scenarios and recovery

### Performance Testing
- Measure response times compared to Perplexity
- Test concurrent requests to ensure scalability
- Validate streaming performance for large responses

---

## 🔄 Rollback Plan

In case of critical issues during or after the migration, the following rollback plan will be executed:

1. **Immediate Issues**
   - If a specific Gemini endpoint fails, route traffic back to the corresponding Perplexity endpoint
   - Log the failure and continue with the migration of other endpoints

2. **Systematic Issues**
   - If multiple Gemini endpoints fail, pause the migration
   - Investigate the root cause and address the issues
   - Resume the migration once the issues are resolved

3. **Post-Deployment Issues**
   - Monitor error rates and performance metrics
   - If error rates exceed threshold, route traffic back to Perplexity endpoints
   - Address issues and redeploy the fixed Gemini implementation

---

## 📊 Success Metrics

The migration will be considered successful if:

1. All Gemini endpoints return valid responses with proper formatting
2. Response times are comparable to or better than Perplexity
3. Error rates are below 1% for all endpoints
4. All tests pass with at least 95% coverage
5. User feedback indicates satisfaction with the new implementation

---

## 📝 Route-by-Route Implementation Details

### 1. `/api/v1/gemini/generate-reasoning`

**Purpose:** Generate step-by-step reasoning for a given prompt

**Implementation:**
```java
@PostMapping("/generate-reasoning")
public String generateReasoning(@Valid @RequestBody PromptRequest request) throws IOException {
    return geminiService.generateReasoning(request.getPrompt());
}
```

**Service Method:**
```java
public String generateReasoning(String prompt) {
    List<Tool> tools = List.of(
        Tools.builder()
            .googleSearch(GoogleSearch.builder().build())
            .build()
    );

    List<Content> contents = List.of(
        Content.of("user", Part.fromText("""
        {
          "role": "system",
          "content": "You are an assistant that provides step-by-step reasoning. Analyze the problem thoroughly, consider different perspectives, and draw logical conclusions. Structure your response with clear steps and explanations. Base all answers on recent information using live Google Search."
        }
        """)),
        Content.of("user", Part.fromText(prompt))
    );

    GenerateContentConfig config = GenerateContentConfig.builder()
        .temperature(1.0f)
        .thinkingConfig(ThinkingConfig.builder().thinkingBudget(-1).build())
        .tools(tools)
        .build();

    try (ResponseStream<GenerateContentResponse> stream =
             client.models.generateContentStream("gemini-2.5-pro", contents, config)) {

        StringBuilder response = new StringBuilder();
        for (GenerateContentResponse res : stream) {
            if (res.candidates().isPresent()) {
                response.append(res.candidates().get().get(0).content().get().parts().get().get(0).text());
            }
        }
        return response.toString();
    }
}
```

### 2. `/api/v1/gemini/async/generate-article`

**Purpose:** Asynchronously generate an article for a given prompt

**Implementation:**
```java
@PostMapping(path = "/async/generate-article", produces = MediaType.APPLICATION_JSON_VALUE)
public CompletableFuture<ResponseEntity<?>> generateArticleAsync(@Valid @RequestBody PromptRequest request) {
    return CompletableFuture.supplyAsync(() -> {
        try {
            String result = geminiService.generateArticle(request.getPrompt());
            return ResponseEntity.ok().body(result);
        } catch (Exception ex) {
            Logger.getLogger(GeminiController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
        }
    }, virtualThreadExecutor);
}
```

### 3. `/api/gemini/sourceArticles`

**Purpose:** Get source articles based on task type, timeframe, platforms, and topics

**Implementation:**
```java
@GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
public CompletableFuture<ResponseEntity<?>> getSourceArticles(
        @RequestParam(defaultValue = "1") int taskType,
        @RequestParam(required = false) String timeframe,
        @RequestParam(required = false) String platforms,
        @RequestParam(required = false) String topics) {
    
    return CompletableFuture.supplyAsync(() -> {
        try {
            Map<String, Object> parameters = new HashMap<>();
            if (timeframe != null) parameters.put("timeframe", timeframe);
            if (platforms != null) parameters.put("platforms", platforms);
            if (topics != null) parameters.put("topics", topics);
            
            List<SourceArticle> sourceArticles = geminiService.getSourceArticles(taskType, parameters);
            return ResponseEntity.ok().body(sourceArticles);
        } catch (Exception ex) {
            Logger.getLogger(GeminiSourceArticleController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
        }
    }, virtualThreadExecutor);
}
```

---

## 🔍 Detailed Technical Considerations

### 1. Gemini API Authentication

The Gemini API requires authentication using a Google Cloud API key. This key will be stored in the application.properties file:

```properties
# Gemini API Configuration
gemini.api.key=YOUR_GEMINI_API_KEY
```

### 2. Prompt Structure

All prompts to Gemini must include:
- System role with structured output expectations
- Web search enforcement
- User role with original prompt

Example:
```json
[
  {
    "role": "system",
    "content": "You are a research assistant. Only return valid JSON. Base all answers on recent information using live Google Search."
  },
  {
    "role": "user",
    "content": "What are the trending local news stories in Centurion on August 4, 2025?"
  }
]
```

### 3. Response Parsing

Gemini responses need to be carefully parsed to ensure compatibility with the existing application:

```java
private String parseGeminiResponse(ResponseStream<GenerateContentResponse> stream) {
    StringBuilder response = new StringBuilder();
    for (GenerateContentResponse res : stream) {
        if (res.candidates().isPresent()) {
            response.append(res.candidates().get().get(0).content().get().parts().get().get(0).text());
        }
    }
    return response.toString();
}
```

### 4. Error Handling

Robust error handling is essential for a smooth migration:

```java
try {
    // Gemini API call
} catch (Exception e) {
    logger.severe("Gemini API Error: " + e.getMessage());
    // Fall back to Perplexity if needed
    return perplexityService.generateText(prompt);
}
```

---

## 📈 Monitoring and Evaluation

Throughout the migration, the following metrics will be monitored:

1. **Response Time:** Compare Gemini vs. Perplexity response times
2. **Error Rate:** Track errors for each endpoint
3. **Completion Rate:** Ensure all requests complete successfully
4. **Response Quality:** Evaluate the quality of generated content
5. **User Satisfaction:** Collect feedback from users

Regular evaluations will be conducted after each sprint to ensure the migration is on track and meeting the expected quality standards.

---

## 🏁 Conclusion

This implementation plan provides a comprehensive roadmap for migrating from Perplexity to Gemini 2.5 Pro. By following this plan, the migration will be executed in a structured and controlled manner, ensuring minimal disruption to users and maintaining the quality of the API.

The 4-sprint approach allows for incremental implementation and testing, with each sprint building on the success of the previous one. This approach minimizes risk and allows for adjustments as needed throughout the migration process.