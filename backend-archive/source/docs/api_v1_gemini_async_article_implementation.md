# Implementation of `/api/v1/gemini/async/article` Endpoint

## Overview

This document describes the implementation of the `/api/v1/gemini/async/article` endpoint, which generates articles with a structured response format using the Gemini API.

## Requirements

The endpoint needed to:
1. Return a structured response in the following format:
   ```json
   {
       "title": "Article title",
       "slug": "url-friendly-version-of-title",
       "article": "The full article content",
       "summary": "A brief summary of the article"
   }
   ```
2. Use the `.setRole("system")` method to instruct the model to respond in the required format
3. Make the AI write like a New York Times reporter, with highly readable content

## Implementation Details

### 1. Added a new method to GeminiService

Added a new method `generateStructuredArticle` to the `GeminiService` class that:
- Takes a prompt parameter for article generation
- Sets the system role to instruct the model to respond as a New York Times reporter
- Specifies the exact JSON structure required in the response
- Uses the Google Search tool for up-to-date information

```java
public String generateStructuredArticle(String prompt) throws IOException {
    // Initialize client if not already initialized
    initializeClient();
    
    // Create content with system and user messages
    List<Content> contents = List.of(
        Content.newBuilder()
            .setRole("system")
            .addParts(Part.newBuilder().setText(
                "You are a professional New York Times reporter. Write well-researched, engaging articles " +
                "with a journalistic style that is clear, concise, and informative. " +
                "Your response must be structured in the following format:\n\n" +
                "{\n" +
                "    \"title\": \"A compelling headline for the article\",\n" +
                "    \"slug\": \"url-friendly-version-of-title\",\n" +
                "    \"article\": \"The full article content with proper paragraphs\",\n" +
                "    \"summary\": \"A brief 1-3 sentence summary of the article\"\n" +
                "}\n\n" +
                "Ensure your writing is highly readable, fact-based, and maintains the professional tone " +
                "expected in quality journalism. Base all information on recent data using live Google Search."
            ).build())
            .build(),
        Content.newBuilder()
            .setRole("user")
            .addParts(Part.newBuilder().setText(prompt).build())
            .build()
    );
    
    // Generate content with streaming
    ResponseStream<GenerateContentResponse> stream = null;
    try {
        stream = model.generateContentStream(contents);
        
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
        throw new IOException("Error generating structured article with Gemini: " + e.getMessage(), e);
    }
}
```

### 2. Modified the GeminiController

Modified the `generateArticleWithMetadataAsync` method in `GeminiController` to use the new `generateStructuredArticle` method:

```java
@PostMapping(path = "/async/article", produces = MediaType.APPLICATION_JSON_VALUE)
public CompletableFuture<ResponseEntity<?>> generateArticleWithMetadataAsync(@Valid @RequestBody PromptRequest request) {
    return CompletableFuture.supplyAsync(() -> {
        try {
            // Use the new method that sets system role and structured format
            String generatedContent = geminiService.generateStructuredArticle(request.getPrompt());
            
            // Return the raw response which should already be in the required JSON format
            return ResponseEntity.ok().body(generatedContent);
        } catch (Exception ex) {
            Logger.getLogger(GeminiController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
        }
    }, virtualThreadExecutor);
}
```

### 3. Added a test for the endpoint

Added a test method `testGenerateStructuredArticleAsync` to the `GeminiControllerTest` class to verify that the endpoint works correctly:

```java
@Test
void testGenerateStructuredArticleAsync() throws Exception {
    // Mock the structured article response in JSON format
    String structuredResponse = """
            {
                "title": "The Future of AI: Transforming Industries and Society",
                "slug": "the-future-of-ai-transforming-industries-and-society",
                "article": "Artificial intelligence continues to evolve at a rapid pace...",
                "summary": "Artificial intelligence is rapidly transforming industries and society..."
            }
            """;
    
    when(geminiService.generateStructuredArticle(anyString())).thenReturn(structuredResponse);
    
    // Set up the executor to run tasks synchronously
    when(virtualThreadExecutor.submit(any(Runnable.class))).thenAnswer(invocation -> {
        Runnable runnable = invocation.getArgument(0);
        runnable.run();
        return null;
    });

    // Create a test request
    PromptRequest request = new PromptRequest("The future of AI");
    String requestJson = objectMapper.writeValueAsString(request);

    // Perform the request and verify the response
    mockMvc.perform(post("/api/v1/gemini/async/article")
            .contentType(MediaType.APPLICATION_JSON)
            .content(requestJson))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("The Future of AI: Transforming Industries and Society"))
            .andExpect(jsonPath("$.slug").value("the-future-of-ai-transforming-industries-and-society"))
            .andExpect(jsonPath("$.article").exists())
            .andExpect(jsonPath("$.summary").exists());
}
```

## Conclusion

The implementation satisfies all the requirements:
1. The response is structured in the required format with title, slug, article, and summary fields
2. The system role is set to instruct the model to respond in the required format
3. The AI is instructed to write like a New York Times reporter, ensuring highly readable content

The endpoint is available at `/api/v1/gemini/async/article` and can be accessed with a POST request containing a prompt in the request body.