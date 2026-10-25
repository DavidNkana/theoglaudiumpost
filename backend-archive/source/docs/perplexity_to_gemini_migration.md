
# 🔁 Migration Guide: Perplexity → Gemini (Web Grounded)
**System: Spring Boot | Target Model: Gemini 2.5 Pro | Source: Google Vertex AI**

---

## 🎯 Objective

Replace all routes currently calling Perplexity with Gemini 2.5 Pro, ensuring:

- Every Gemini route uses **grounding via GoogleSearch tool**
- Prompts are structured and JSON-compliant
- API response is streamed and parsed safely
- Output format matches the Perplexity contract where applicable
- All routes are duplicated under `/api/v1/gemini/...` or `/api/gemini/sourceArticles/...`

---

## 🌐 Gemini API Reference (Required Reading)

- 📘 [Vertex AI Gemini Model Reference](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini)
- 📘 [Java SDK Docs](https://cloud.google.com/java/docs/reference/genai/latest/overview)
- 📘 [Gemini SDK GitHub](https://github.com/google/generative-ai-java)

---

## ✅ Step-by-Step Migration Instructions

---

### 🔎 1. Identify All Routes Using Perplexity

#### Synchronous
```
POST /api/v1/perplexity/investigative-journalism
POST /api/v1/perplexity/generate-text
POST /api/v1/perplexity/generate-reasoning
POST /api/v1/perplexity/generate-article
POST /api/v1/perplexity/article
```

#### Asynchronous
```
POST /api/v1/perplexity/async/investigative-journalism
POST /api/v1/perplexity/async/generate-text
POST /api/v1/perplexity/async/generate-reasoning
POST /api/v1/perplexity/async/generate-article
POST /api/v1/perplexity/async/article
```

#### Source Article System
```
GET  /api/sourceArticles
GET  /api/sourceArticles/task/{taskId}
GET  /api/sourceArticles/all
POST /api/sourceArticles/custom
```

---

### 📁 2. Duplicate Controllers and Services

Create corresponding Gemini routes:

| Old Route                                      | New Route                                    |
|-----------------------------------------------|----------------------------------------------|
| `/api/v1/perplexity/generate-text`            | `/api/v1/gemini/generate-text`              |
| `/api/v1/perplexity/async/generate-article`   | `/api/v1/gemini/async/generate-article`     |
| `/api/sourceArticles`                         | `/api/gemini/sourceArticles`                |
| ...                                           | ...                                          |

**DO NOT override the old routes.** These are parallel endpoints.

---

### 🧠 3. Gemini Integration Code Pattern

Use the `generateContentStream(...)` method with `googleSearch` tool.

#### Example Service Method

```java
public String generateWithGemini(String userPrompt) {
    List<Tool> tools = List.of(
        Tools.builder()
            .googleSearch(GoogleSearch.builder().build())  // grounding
            .build()
    );

    List<Content> contents = List.of(
        Content.of("user", Part.fromText("""
        {
          "role": "system",
          "content": "You are an AI that only responds with JSON. You must use real-time web search to support all answers. Structure responses with 'title', 'description', 'date', and 'source'."
        }
        """)),
        Content.of("user", Part.fromText(userPrompt))
    );

    GenerateContentConfig config = GenerateContentConfig.builder()
        .temperature(1.5f)
        .thinkingConfig(ThinkingConfig.builder().thinkingBudget(-1).build())
        .tools(tools)
        .build();

    try (ResponseStream<GenerateContentResponse> stream =
             client.models.generateContentStream("gemini-2.5-pro", contents, config)) {

        for (GenerateContentResponse res : stream) {
            if (res.candidates().isPresent()) {
                return res.candidates().get().get(0).content().get().parts().get().get(0).text();
            }
        }
    }
    return "No response from Gemini.";
}
```

---

### 📤 4. Prompt Design Rules

All Gemini prompts must include:

- System role with structured output expectations
- Web search enforcement
- User role with original prompt

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

---

### 🧪 5. Output Validation

Ensure:
- JSON is valid
- Structure matches original Perplexity schema
- Hallucinations are avoided
- Output is sanitized before return

---

### 🔄 6. Asynchronous Jobs

If Perplexity used task IDs, store Gemini output under the same tracking mechanism (Redis, DB, etc.).

Reuse the same polling and storage logic — only the model call changes.

---

## 📌 Checklist for Each Migrated Route

| Requirement                                     | Status |
|------------------------------------------------|--------|
| Route copied under `/gemini/`                  | ✅     |
| Uses Gemini 2.5 Pro                            | ✅     |
| Uses `generateContentStream`                  | ✅     |
| `googleSearch` tool included                   | ✅     |
| Prompt includes system + user roles            | ✅     |
| Response is JSON-parseable                     | ✅     |
| Async output stored under task ID (if needed)  | ✅     |
| Swagger updated                                | ✅     |

---

## ✅ First Migration Targets

Start with:

- `/api/v1/gemini/async/generate-reasoning`
- `/api/v1/gemini/async/generate-article`
- `/api/gemini/sourceArticles`

Then proceed with the rest once these are stable.

---
