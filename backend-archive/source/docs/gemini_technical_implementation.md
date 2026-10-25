# Gemini Technical Implementation Guide

**Project:** Laudiumbiz API  
**Migration:** Perplexity → Gemini 2.5 Pro  
**Date:** August 4, 2025

## Overview

This document provides technical implementation details for migrating from Perplexity to Gemini 2.5 Pro, focusing on the actual code changes required.

## Dependencies

Add the following dependencies to your `pom.xml`:

```xml
<!-- Google AI SDK for Gemini -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>google-cloud-aiplatform</artifactId>
    <version>3.50.0</version>
</dependency>
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>google-cloud-vertexai</artifactId>
    <version>0.5.0</version>
</dependency>
```

## Configuration

Add the following to your `application.properties`:

```properties
# Gemini API Configuration
gemini.api.key=YOUR_GEMINI_API_KEY
gemini.model=gemini-2.5-pro
```

## GeminiService Implementation

Create a new service class called `GeminiService`:

```java
package com.laudiumbiz.Laudiumbiz.Services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.vertexai.VertexAI;
import com.google.cloud.vertexai.api.Content;
import com.google.cloud.vertexai.api.GenerateContentResponse;
import com.google.cloud.vertexai.api.Part;
import com.google.cloud.vertexai.generativeai.GenerativeModel;
import com.google.cloud.vertexai.generativeai.ResponseStream;
import com.google.cloud.vertexai.generativeai.tools.GoogleSearch;
import com.google.cloud.vertexai.generativeai.tools.Tool;
import com.google.cloud.vertexai.generativeai.tools.Tools;
import com.laudiumbiz.Laudiumbiz.Models.DTO.GeneratedArticleResponse;
import com.laudiumbiz.Laudiumbiz.Models.SourceArticle;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.logging.Logger;

@Service
public class GeminiService {

    private static final Logger logger = Logger.getLogger(GeminiService.class.getName());
    
    @Value("${gemini.api.key}")
    private String geminiApiKey;
    
    @Value("${gemini.model}")
    private String geminiModel;
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    private VertexAI vertexAI;
    private GenerativeModel model;
    
    /**
     * Initialize the Gemini client
     */
    public void initializeClient() {
        vertexAI = new VertexAI(geminiApiKey);
        model = new GenerativeModel(geminiModel, vertexAI);
    }
    
    /**
     * Generate text using Gemini API with GoogleSearch tool
     * 
     * @param prompt the prompt for text generation
     * @return the generated text as a string
     * @throws IOException if there's an error in the API call
     */
    public String generateText(String prompt) throws IOException {
        logger.info("Generating text with prompt: " + prompt);
        
        // Initialize client if not already initialized
        if (vertexAI == null) {
            initializeClient();
        }
        
        // Configure GoogleSearch tool
        List<Tool> tools = List.of(
            Tools.builder()
                .googleSearch(GoogleSearch.builder().build())
                .build()
        );
        
        // Create content with system and user messages
        List<Content> contents = List.of(
            Content.newBuilder()
                .setRole("user")
                .addParts(Part.newBuilder().setText("""
                {
                  "role": "system",
                  "content": "You are an assistant that provides helpful, accurate, and concise information. Base all answers on recent information using live Google Search."
                }
                """).build())
                .build(),
            Content.newBuilder()
                .setRole("user")
                .addParts(Part.newBuilder().setText(prompt).build())
                .build()
        );
        
        // Generate content with streaming
        try (ResponseStream<GenerateContentResponse> stream = 
                 model.generateContentStream(contents, tools)) {
            
            StringBuilder response = new StringBuilder();
            for (GenerateContentResponse res : stream) {
                if (res.getCandidatesCount() > 0) {
                    String text = res.getCandidates(0).getContent().getParts(0).getText();
                    response.append(text);
                }
            }
            
            return response.toString();
        } catch (Exception e) {
            logger.severe("Gemini API Error: " + e.getMessage());
            throw new IOException("Error generating text with Gemini: " + e.getMessage(), e);
        }
    }
    
    /**
     * Generate reasoning using Gemini API with GoogleSearch tool
     * 
     * @param prompt the prompt for reasoning generation
     * @return the generated reasoning as a string
     * @throws IOException if there's an error in the API call
     */
    public String generateReasoning(String prompt) throws IOException {
        logger.info("Generating reasoning with prompt: " + prompt);
        
        // Initialize client if not already initialized
        if (vertexAI == null) {
            initializeClient();
        }
        
        // Configure GoogleSearch tool
        List<Tool> tools = List.of(
            Tools.builder()
                .googleSearch(GoogleSearch.builder().build())
                .build()
        );
        
        // Create content with system and user messages
        List<Content> contents = List.of(
            Content.newBuilder()
                .setRole("user")
                .addParts(Part.newBuilder().setText("""
                {
                  "role": "system",
                  "content": "You are an assistant that provides step-by-step reasoning. Analyze the problem thoroughly, consider different perspectives, and draw logical conclusions. Structure your response with clear steps and explanations. Base all answers on recent information using live Google Search."
                }
                """).build())
                .build(),
            Content.newBuilder()
                .setRole("user")
                .addParts(Part.newBuilder().setText(prompt).build())
                .build()
        );
        
        // Generate content with streaming
        try (ResponseStream<GenerateContentResponse> stream = 
                 model.generateContentStream(contents, tools)) {
            
            StringBuilder response = new StringBuilder();
            for (GenerateContentResponse res : stream) {
                if (res.getCandidatesCount() > 0) {
                    String text = res.getCandidates(0).getContent().getParts(0).getText();
                    response.append(text);
                }
            }
            
            return response.toString();
        } catch (Exception e) {
            logger.severe("Gemini API Error: " + e.getMessage());
            throw new IOException("Error generating reasoning with Gemini: " + e.getMessage(), e);
        }
    }
    
    /**
     * Generate an article using Gemini API with GoogleSearch tool
     * 
     * @param prompt the prompt for article generation
     * @return the generated article as a string
     * @throws IOException if there's an error in the API call
     */
    public String generateArticle(String prompt) throws IOException {
        logger.info("Generating article with prompt: " + prompt);
        
        // Initialize client if not already initialized
        if (vertexAI == null) {
            initializeClient();
        }
        
        // Configure GoogleSearch tool
        List<Tool> tools = List.of(
            Tools.builder()
                .googleSearch(GoogleSearch.builder().build())
                .build()
        );
        
        // Create content with system and user messages
        List<Content> contents = List.of(
            Content.newBuilder()
                .setRole("user")
                .addParts(Part.newBuilder().setText("""
                {
                  "role": "system",
                  "content": "You are an assistant that generates well-structured articles. Create a comprehensive article with a clear introduction, body, and conclusion. Include relevant facts, examples, and insights. Base all information on recent data using live Google Search."
                }
                """).build())
                .build(),
            Content.newBuilder()
                .setRole("user")
                .addParts(Part.newBuilder().setText(prompt).build())
                .build()
        );
        
        // Generate content with streaming
        try (ResponseStream<GenerateContentResponse> stream = 
                 model.generateContentStream(contents, tools)) {
            
            StringBuilder response = new StringBuilder();
            for (GenerateContentResponse res : stream) {
                if (res.getCandidatesCount() > 0) {
                    String text = res.getCandidates(0).getContent().getParts(0).getText();
                    response.append(text);
                }
            }
            
            return response.toString();
        } catch (Exception e) {
            logger.severe("Gemini API Error: " + e.getMessage());
            throw new IOException("Error generating article with Gemini: " + e.getMessage(), e);
        }
    }
    
    /**
     * Generate an article with metadata using Gemini API with GoogleSearch tool
     * 
     * @param prompt the prompt for article generation
     * @return GeneratedArticleResponse containing title, slug, article, and summary
     * @throws IOException if there's an error in the API call
     */
    public GeneratedArticleResponse generateArticleWithMetadata(String prompt) throws IOException {
        logger.info("Generating article with metadata for prompt: " + prompt);
        
        // Initialize client if not already initialized
        if (vertexAI == null) {
            initializeClient();
        }
        
        // Configure GoogleSearch tool
        List<Tool> tools = List.of(
            Tools.builder()
                .googleSearch(GoogleSearch.builder().build())
                .build()
        );
        
        // Create content with system and user messages
        List<Content> contents = List.of(
            Content.newBuilder()
                .setRole("user")
                .addParts(Part.newBuilder().setText("""
                {
                  "role": "system",
                  "content": "You are an assistant that generates well-structured articles with metadata. Create a comprehensive article with a clear title, content, and summary. Format your response as JSON with 'title', 'article', and 'summary' fields. Base all information on recent data using live Google Search."
                }
                """).build())
                .build(),
            Content.newBuilder()
                .setRole("user")
                .addParts(Part.newBuilder().setText(prompt).build())
                .build()
        );
        
        // Generate content with streaming
        try (ResponseStream<GenerateContentResponse> stream = 
                 model.generateContentStream(contents, tools)) {
            
            StringBuilder response = new StringBuilder();
            for (GenerateContentResponse res : stream) {
                if (res.getCandidatesCount() > 0) {
                    String text = res.getCandidates(0).getContent().getParts(0).getText();
                    response.append(text);
                }
            }
            
            String generatedContent = response.toString();
            
            // Parse the generated content to extract title, article, and summary
            try {
                JsonNode jsonNode = objectMapper.readTree(generatedContent);
                
                String title = jsonNode.has("title") ? jsonNode.get("title").asText() : extractTitle(generatedContent);
                String article = jsonNode.has("article") ? jsonNode.get("article").asText() : extractArticle(generatedContent);
                String summary = jsonNode.has("summary") ? jsonNode.get("summary").asText() : extractSummary(generatedContent);
                String slug = generateSlug(title);
                
                return new GeneratedArticleResponse(title, slug, article, summary);
            } catch (Exception e) {
                logger.warning("Failed to parse Gemini response as JSON: " + e.getMessage());
                
                // Fallback to extracting title, article, and summary from plain text
                String title = extractTitle(generatedContent);
                String article = extractArticle(generatedContent);
                String summary = extractSummary(generatedContent);
                String slug = generateSlug(title);
                
                return new GeneratedArticleResponse(title, slug, article, summary);
            }
        } catch (Exception e) {
            logger.severe("Gemini API Error: " + e.getMessage());
            throw new IOException("Error generating article with metadata using Gemini: " + e.getMessage(), e);
        }
    }
    
    /**
     * Get source articles based on task type and parameters
     * 
     * @param taskType the type of task
     * @param parameters the parameters for the task
     * @return list of source articles
     * @throws IOException if there's an error in the API call
     */
    public List<SourceArticle> getSourceArticles(int taskType, Map<String, Object> parameters) throws IOException {
        logger.info("Getting source articles for task type: " + taskType);
        
        // Initialize client if not already initialized
        if (vertexAI == null) {
            initializeClient();
        }
        
        // Construct prompt based on task type and parameters
        String prompt = constructPrompt(taskType, parameters);
        
        // Configure GoogleSearch tool
        List<Tool> tools = List.of(
            Tools.builder()
                .googleSearch(GoogleSearch.builder().build())
                .build()
        );
        
        // Create content with system and user messages
        List<Content> contents = List.of(
            Content.newBuilder()
                .setRole("user")
                .addParts(Part.newBuilder().setText("""
                {
                  "role": "system",
                  "content": "Format your response as a JSON array of objects, with each object representing a source article. Each article should have 'title', 'url', 'platform', 'timestamp', 'author', and 'content' fields. Base all information on recent data using live Google Search."
                }
                """).build())
                .build(),
            Content.newBuilder()
                .setRole("user")
                .addParts(Part.newBuilder().setText(prompt).build())
                .build()
        );
        
        // Generate content with streaming
        try (ResponseStream<GenerateContentResponse> stream = 
                 model.generateContentStream(contents, tools)) {
            
            StringBuilder response = new StringBuilder();
            for (GenerateContentResponse res : stream) {
                if (res.getCandidatesCount() > 0) {
                    String text = res.getCandidates(0).getContent().getParts(0).getText();
                    response.append(text);
                }
            }
            
            String generatedContent = response.toString();
            
            // Parse the generated content to extract source articles
            try {
                JsonNode articlesNode = objectMapper.readTree(generatedContent);
                List<SourceArticle> sourceArticles = new ArrayList<>();
                
                if (articlesNode.isArray()) {
                    for (JsonNode articleNode : articlesNode) {
                        SourceArticle article = parseSourceArticle(articleNode);
                        if (article != null) {
                            sourceArticles.add(article);
                        }
                    }
                }
                
                if (!sourceArticles.isEmpty()) {
                    return processSourceArticles(taskType, sourceArticles);
                } else {
                    logger.warning("No source articles found in Gemini API response");
                    throw new IOException("No source articles found in Gemini API response");
                }
            } catch (Exception e) {
                logger.severe("Failed to parse Gemini API response: " + e.getMessage());
                throw new IOException("Failed to parse Gemini API response: " + e.getMessage(), e);
            }
        } catch (Exception e) {
            logger.severe("Gemini API Error: " + e.getMessage());
            throw new IOException("Error getting source articles with Gemini: " + e.getMessage(), e);
        }
    }
    
    /**
     * Construct a prompt based on task type and parameters
     * 
     * @param taskType the type of task
     * @param parameters the parameters for the task
     * @return the constructed prompt
     */
    private String constructPrompt(int taskType, Map<String, Object> parameters) {
        StringBuilder prompt = new StringBuilder();
        
        // Construct prompt based on task type
        switch (taskType) {
            case 1:
                prompt.append("Find recent news articles");
                break;
            case 2:
                prompt.append("Find trending topics");
                break;
            case 3:
                prompt.append("Find research papers");
                break;
            default:
                prompt.append("Find articles");
                break;
        }
        
        // Add parameters to the prompt
        if (parameters != null) {
            if (parameters.containsKey("timeframe")) {
                prompt.append(" from the past ").append(parameters.get("timeframe"));
            }
            if (parameters.containsKey("platforms")) {
                prompt.append(" from ").append(parameters.get("platforms"));
            }
            if (parameters.containsKey("topics")) {
                prompt.append(" about ").append(parameters.get("topics"));
            }
        }
        
        return prompt.toString();
    }
    
    /**
     * Parse a JSON node into a SourceArticle object
     * 
     * @param node the JSON node to parse
     * @return the parsed SourceArticle object, or null if parsing fails
     */
    private SourceArticle parseSourceArticle(JsonNode node) {
        try {
            String url = node.has("url") ? node.get("url").asText() : "https://example.com/" + UUID.randomUUID().toString().substring(0, 8);
            String platform = node.has("platform") ? node.get("platform").asText() : "unknown";
            
            // Parse timestamp
            LocalDateTime timestamp;
            if (node.has("timestamp") && !node.get("timestamp").isNull()) {
                try {
                    timestamp = LocalDateTime.parse(node.get("timestamp").asText());
                } catch (Exception e) {
                    timestamp = LocalDateTime.now().minusHours(new Random().nextInt(24));
                }
            } else {
                timestamp = LocalDateTime.now().minusHours(new Random().nextInt(24));
            }
            
            String title = node.has("title") ? node.get("title").asText() : "Untitled Article";
            String author = node.has("author") ? node.get("author").asText() : "Unknown Author";
            String content = node.has("content") ? node.get("content").asText() : "";
            
            return new SourceArticle(url, platform, timestamp, title, author, content);
        } catch (Exception e) {
            logger.warning("Failed to parse source article: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * Process source articles based on task type
     * 
     * @param taskType the type of task
     * @param sourceArticles the list of source articles to process
     * @return the processed list of source articles
     */
    private List<SourceArticle> processSourceArticles(int taskType, List<SourceArticle> sourceArticles) {
        // Process source articles based on task type
        switch (taskType) {
            case 1:
                // Sort by timestamp (newest first)
                sourceArticles.sort(Comparator.comparing(SourceArticle::getTimestamp).reversed());
                break;
            case 2:
                // Sort by platform
                sourceArticles.sort(Comparator.comparing(SourceArticle::getPlatform));
                break;
            case 3:
                // Sort by author
                sourceArticles.sort(Comparator.comparing(SourceArticle::getAuthor));
                break;
            default:
                // No sorting
                break;
        }
        
        return sourceArticles;
    }
    
    /**
     * Extract title from content
     * 
     * @param content the content to extract title from
     * @return the extracted title
     */
    private String extractTitle(String content) {
        // Implementation similar to PerplexityService
        // ...
        return "Title";
    }
    
    /**
     * Extract article from content
     * 
     * @param content the content to extract article from
     * @return the extracted article
     */
    private String extractArticle(String content) {
        // Implementation similar to PerplexityService
        // ...
        return content;
    }
    
    /**
     * Extract summary from content
     * 
     * @param content the content to extract summary from
     * @return the extracted summary
     */
    private String extractSummary(String content) {
        // Implementation similar to PerplexityService
        // ...
        return "Summary";
    }
    
    /**
     * Generate slug from title
     * 
     * @param title the title to generate slug from
     * @return the generated slug
     */
    private String generateSlug(String title) {
        // Implementation similar to PerplexityService
        // ...
        return title.toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-");
    }
}
```

## GeminiController Implementation

Create a new controller class called `GeminiController`:

```java
package com.laudiumbiz.Laudiumbiz.Controllers;

import com.laudiumbiz.Laudiumbiz.Models.DTO.GeneratedArticleResponse;
import com.laudiumbiz.Laudiumbiz.Models.DTO.PromptRequest;
import com.laudiumbiz.Laudiumbiz.Models.DTO.TopicRequest;
import com.laudiumbiz.Laudiumbiz.Services.GeminiService;
import com.laudiumbiz.Laudiumbiz.Utils.ErrorHandlig;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.logging.Level;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/v1/gemini")
@Validated
public class GeminiController {

    private final GeminiService geminiService;
    private final ErrorHandlig errorHandler;
    private final ExecutorService virtualThreadExecutor;

    public GeminiController(
            @Qualifier("virtualThreadExecutor") ExecutorService virtualThreadExecutor,
            GeminiService geminiService,
            ErrorHandlig errorHandler) {
        this.virtualThreadExecutor = virtualThreadExecutor;
        this.geminiService = geminiService;
        this.errorHandler = errorHandler;
    }

    /**
     * Endpoint to generate text using Gemini API
     * 
     * @param request DTO containing the prompt
     * @return Generated text response
     * @throws IOException If there's an error in the API call
     */
    @PostMapping("/generate-text")
    public String generateText(@Valid @RequestBody PromptRequest request) throws IOException {
        return geminiService.generateText(request.getPrompt());
    }

    /**
     * Endpoint to generate reasoning using Gemini API
     * 
     * @param request DTO containing the prompt
     * @return Generated reasoning response
     * @throws IOException If there's an error in the API call
     */
    @PostMapping("/generate-reasoning")
    public String generateReasoning(@Valid @RequestBody PromptRequest request) throws IOException {
        return geminiService.generateReasoning(request.getPrompt());
    }

    /**
     * Asynchronous endpoint to generate text using Gemini API
     * 
     * @param request DTO containing the prompt
     * @return CompletableFuture with ResponseEntity containing the generated text
     */
    @PostMapping(path = "/async/generate-text", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> generateTextAsync(@Valid @RequestBody PromptRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                String result = geminiService.generateText(request.getPrompt());
                return ResponseEntity.ok().body(result);
            } catch (Exception ex) {
                Logger.getLogger(GeminiController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }

    /**
     * Asynchronous endpoint to generate reasoning using Gemini API
     * 
     * @param request DTO containing the prompt
     * @return CompletableFuture with ResponseEntity containing the generated reasoning
     */
    @PostMapping(path = "/async/generate-reasoning", produces = MediaType.APPLICATION_JSON_VALUE)
    public CompletableFuture<ResponseEntity<?>> generateReasoningAsync(@Valid @RequestBody PromptRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                String result = geminiService.generateReasoning(request.getPrompt());
                return ResponseEntity.ok().body(result);
            } catch (Exception ex) {
                Logger.getLogger(GeminiController.class.getName()).log(Level.SEVERE, null, ex);
                return errorHandler.getError(ex);
            }
        }, virtualThreadExecutor);
    }
    
    // Additional endpoints will be implemented in subsequent sprints
}
```

## GeminiSourceArticleController Implementation

Create a new controller class called `GeminiSourceArticleController`:

```java
package com.laudiumbiz.Laudiumbiz.Controllers;

import com.laudiumbiz.Laudiumbiz.Models.SourceArticle;
import com.laudiumbiz.Laudiumbiz.Services.GeminiService;
import com.laudiumbiz.Laudiumbiz.Utils.ErrorHandlig;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.logging.Level;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/gemini/sourceArticles")
public class GeminiSourceArticleController {

    private final ExecutorService virtualThreadExecutor;
    private final ErrorHandlig errorHandler;
    private final GeminiService geminiService;

    public GeminiSourceArticleController(
            @org.springframework.beans.factory.annotation.Qualifier("virtualThreadExecutor") ExecutorService virtualThreadExecutor,
            ErrorHandlig errorHandler,
            GeminiService geminiService) {
        this.virtualThreadExecutor = virtualThreadExecutor;
        this.errorHandler = errorHandler;
        this.geminiService = geminiService;
    }

    /**
     * Get source articles based on task type, timeframe, platforms, and topics
     * 
     * @param taskType the type of task
     * @param timeframe the timeframe for the articles
     * @param platforms the platforms to search
     * @param topics the topics to search for
     * @return CompletableFuture with ResponseEntity containing the source articles
     */
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
    
    // Additional endpoints will be implemented in subsequent sprints
}
```

## Testing Implementation

Create unit tests for the GeminiService:

```java
package com.laudiumbiz.Laudiumbiz.Services;

import com.google.cloud.vertexai.api.GenerateContentResponse;
import com.google.cloud.vertexai.generativeai.GenerativeModel;
import com.google.cloud.vertexai.generativeai.ResponseStream;
import com.laudiumbiz.Laudiumbiz.Models.SourceArticle;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GeminiServiceTest {

    @InjectMocks
    private GeminiService geminiService;

    @Mock
    private GenerativeModel model;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        ReflectionTestUtils.setField(geminiService, "geminiApiKey", "test-api-key");
        ReflectionTestUtils.setField(geminiService, "geminiModel", "gemini-2.5-pro");
    }

    @Test
    void testGenerateText() throws IOException {
        // Mock the response stream
        ResponseStream<GenerateContentResponse> mockStream = mock(ResponseStream.class);
        GenerateContentResponse mockResponse = mock(GenerateContentResponse.class);
        
        // Set up the mock to return the expected response
        when(model.generateContentStream(any(), any())).thenReturn(mockStream);
        when(mockStream.iterator()).thenReturn(List.of(mockResponse).iterator());
        
        // Test the method
        String result = geminiService.generateText("Test prompt");
        
        // Verify the result
        assertNotNull(result);
    }

    @Test
    void testGetSourceArticles() throws IOException {
        // Mock the response stream
        ResponseStream<GenerateContentResponse> mockStream = mock(ResponseStream.class);
        GenerateContentResponse mockResponse = mock(GenerateContentResponse.class);
        
        // Set up the mock to return the expected response
        when(model.generateContentStream(any(), any())).thenReturn(mockStream);
        when(mockStream.iterator()).thenReturn(List.of(mockResponse).iterator());
        
        // Test the method
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("timeframe", "1 day");
        parameters.put("platforms", "news");
        parameters.put("topics", "technology");
        
        List<SourceArticle> result = geminiService.getSourceArticles(1, parameters);
        
        // Verify the result
        assertNotNull(result);
    }
}
```

## Implementation Checklist

For each route you implement, ensure:

1. The route is properly mapped under the correct path
2. The Gemini API is called with the GoogleSearch tool
3. The prompt includes system and user messages
4. The response is properly parsed and returned
5. Error handling is robust and consistent
6. Tests are written and passing

## Monitoring and Logging

Add the following logging to track API calls and responses:

```java
// Before API call
logger.info("Calling Gemini API with prompt: " + prompt);

// After API call
logger.info("Gemini API response: " + response.toString());

// Error handling
logger.severe("Gemini API Error: " + e.getMessage());
```

## Performance Considerations

1. Use streaming for all API calls to improve response time
2. Consider caching responses for frequently used prompts
3. Implement retry logic for transient errors
4. Monitor response times and adjust parameters as needed

## Security Considerations

1. Store API keys securely in application.properties
2. Do not log sensitive information
3. Validate all input before sending to the API
4. Sanitize all output before returning to the client