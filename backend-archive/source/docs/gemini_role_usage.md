# Gemini API Role Usage Guide

**Project:** Laudiumbiz API  
**Migration:** Perplexity → Gemini 2.5 Pro  
**Date:** August 4, 2025

## Overview

This document provides guidance on the correct way to set roles and content in the Gemini API. It explains the changes made to the GeminiService.java file to use `.setRole()` for roles and `.addParts()` for content.

## Correct Role Usage

When using the Gemini API, it's important to set roles correctly using the `.setRole()` method rather than embedding them in text strings. This ensures that the API understands the role of each message and can process it correctly.

### Before (Incorrect)

```java
Content.newBuilder()
    .setRole("user")
    .addParts(Part.newBuilder().setText("""
    {
      "role": "system",
      "content": "You are an assistant that provides helpful, accurate, and concise information. Base all answers on recent information using live Google Search."
    }
    """).build())
    .build()
```

In this approach, the system role is embedded in a JSON-like string inside a user message, which is not the correct way to use the Gemini API.

### After (Correct)

```java
Content.newBuilder()
    .setRole("system")
    .addParts(Part.newBuilder().setText("You are an assistant that provides helpful, accurate, and concise information. Base all answers on recent information using live Google Search.").build())
    .build()
```

In this approach, the system role is set directly using the `.setRole("system")` method, and the content is added using `.addParts()`.

## Multiple Messages

When you need to send multiple messages (e.g., a system message and a user message), create a list of Content objects and then combine them:

```java
// Create content with system and user messages
List<Content> contents = List.of(
    Content.newBuilder()
        .setRole("system")
        .addParts(Part.newBuilder().setText("System message here").build())
        .build(),
    Content.newBuilder()
        .setRole("user")
        .addParts(Part.newBuilder().setText("User message here").build())
        .build()
);

// Combine contents into a single Content object
Content combinedContent = Content.newBuilder()
    .setRole("user")
    .addAllParts(contents.stream()
        .flatMap(c -> c.getPartsList().stream())
        .collect(java.util.stream.Collectors.toList()))
    .build();
```

## Supported Roles

The Gemini API supports the following roles:

- `system`: Used for system instructions that guide the model's behavior
- `user`: Used for user messages
- `assistant`: Used for assistant (model) responses

## Best Practices

1. **Use `.setRole()` for roles**: Always use the `.setRole()` method to set the role of a message, rather than embedding it in a text string.

2. **Use `.addParts()` for content**: Use the `.addParts()` method to add content to a message, rather than embedding it in a JSON-like structure.

3. **Separate system and user messages**: Create separate Content objects for system and user messages, and then combine them if necessary.

4. **Be consistent**: Use the same approach throughout your codebase to ensure consistency and maintainability.

## Implementation in GeminiService

The following methods in GeminiService.java have been updated to use the correct approach:

- `generateText()`
- `generateReasoning()`
- `getSourceArticles()`
- `getSourceArticlesWithCustomPrompt()`
- `investigativeJournalism()`

## Testing

A test class called `GeminiServiceRoleTest.java` has been created to verify that the changes work correctly. The test class includes:

- A test method that verifies the generateText method creates Content objects with correct roles
- A documentation test that explains the changes made to use `.setRole()` for roles

## Conclusion

By using `.setRole()` for roles and `.addParts()` for content, we ensure that the Gemini API correctly understands the role of each message and can process it accordingly. This approach is more maintainable, easier to understand, and follows the recommended best practices for using the Gemini API.