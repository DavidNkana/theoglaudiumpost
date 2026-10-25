# GPT-5.1 Upgrade & Article Generation Enhancements

## Summary of Changes

This document outlines the updates made to the LaudiumAPP backend for article generation, specifically upgrading to GPT-5.1 and implementing enhanced source validation.

## Date: 2025-11-21

---

## 1. Upgrade to GPT-5.1 Model

### Changed Files:

#### GPTService.java
- **Line 35**: Changed model from `"gpt-4o"` to `"gpt-5.1"`
- **Line 37**: Updated system prompt to enforce 2-5 sources (was previously exactly 4)

**Before:**
```json
"model": "gpt-4o",
...
"content": "You are a journalist writing detailed local news articles... minimum 4, maximum 4"
```

**After:**
```json
"model": "gpt-5.1",
...
"content": "You are a journalist writing detailed local news articles... include a 'sources' array containing 2-5 reputable HTTPS URLs"
```

#### ChatGPTNewsService.java
- **Line 98**: Changed model from `"gpt-5-nano"` to `"gpt-5.1"` in `generateArticle()`
- **Line 274**: Changed model from `"gpt-5-nano"` to `"gpt-5.1"` in `sourceAll()`
- **Line 111**: Updated system prompt to specify "Include exactly 2-5 reputable HTTPS sources"

---

## 2. Enhanced Source Validation

### ChatGPTNewsService.java - Structured Output Schema

Added `minItems` and `maxItems` constraints to the `sources` array in the JSON schema:

**File**: `ChatGPTNewsService.java`
**Lines**: 150-154 (generateArticle method)

**Changes:**
```json
ObjectNode sourcesProp = mapper.createObjectNode();
sourcesProp.put("type", "array");
sourcesProp.put("minItems", 2);    // NEW
sourcesProp.put("maxItems", 5);    // NEW
sourcesProp.set("items", mapper.createObjectNode().put("type", "string"));
props.set("sources", sourcesProp);
```

This ensures the OpenAI Responses API enforces 2-5 sources at the schema level, making it impossible for the model to return fewer than 2 or more than 5 sources.

---

## 3. GeminiService Prompt Updates

### File: GeminiService.java
**Lines**: 179-190

Updated prompts to emphasize 2-5 sources requirement:

**Changes:**
- Line 187: `"5. Sources: Include exactly 2-5 reputable HTTPS sources that support the article"`
- Line 190: `"Research and get 2-5 sources so we have proper attribution and verification, re-write and make it our own"`

**Before:**
```text
"5. Sources: List of sources used for the article (URLs, references, etc.)"
...
"Research and get as many sources as possible so we dont rely on a single source"
```

**After:**
```text
"5. Sources: Include exactly 2-5 reputable HTTPS sources that support the article"
...
"Research and get 2-5 sources so we have proper attribution and verification"
```

---

## 4. Impact on Article Generation

### Before Changes:
- **GPTService**: Used gpt-4o, required exactly 4 sources
- **ChatGPTNewsService**: Used gpt-5-nano, no source count validation
- **GeminiService**: Used gemini-2.5-pro, requested "as many sources as possible"

### After Changes:
- **GPTService**: Uses gpt-5.1, requires 2-5 sources
- **ChatGPTNewsService**: Uses gpt-5.1 with strict schema validation (2-5 sources enforced by API)
- **GeminiService**: Uses gemini-2.5-pro, requests exactly 2-5 sources

---

## 5. Structured Output Implementation

### ChatGPTNewsService.java
The service already had structured output implemented using OpenAI's Responses API with JSON schema validation. The enhancement adds source count constraints:

**Key Features:**
- Strict JSON schema enforcement (`strict: true`)
- Type validation for all fields
- Source count validation (min: 2, max: 5)
- Automatic parsing and validation

**Schema Structure:**
```json
{
  "type": "json_schema",
  "name": "articles_payload",
  "strict": true,
  "schema": {
    "type": "object",
    "properties": {
      "title": {"type": "string"},
      "article": {"type": "string"},
      "summary": {"type": "string"},
      "slug": {"type": "string"},
      "sources": {
        "type": "array",
        "minItems": 2,
        "maxItems": 5,
        "items": {"type": "string"}
      }
    },
    "required": ["title", "article", "summary", "slug", "sources"],
    "additionalProperties": false
  }
}
```

---

## 6. Benefits

### 1. **Consistency Across AI Providers**
All three AI services (GPT, ChatGPT, Gemini) now enforce 2-5 sources, ensuring consistent article quality and attribution.

### 2. **Improved Article Quality**
- Minimum 2 sources ensure adequate attribution
- Maximum 5 sources prevent source pollution
- All sources are HTTPS for security

### 3. **API-Level Validation**
For ChatGPT service, the validation is enforced at the OpenAI API level via structured output, making it impossible to bypass.

### 4. **GPT-5.1 Model**
Upgrading to GPT-5.1 provides:
- Enhanced language understanding
- Better structured output compliance
- Improved article quality
- More consistent results

### 5. **Better Frontend Compatibility**
The structured output with proper validation ensures the frontend receives properly formatted articles with the correct number of sources.

---

## 7. Testing Recommendations

### Unit Tests
1. Validate ArticleGenerated model with 2-5 sources
2. Test validation fails with < 2 sources
3. Test validation fails with > 5 sources

### Integration Tests
1. Test GPT-5.1 article generation via `/api/v1/ai/generate-article`
2. Test ChatGPT article generation via `/api/v1/chatgpt/generate-article`
3. Test Gemini article generation via `/api/v1/gemini/generate-article`
4. Verify source count in responses

### Manual Testing
1. Generate article from prompt
2. Verify sources array has 2-5 HTTPS URLs
3. Verify article is valid HTML with <p> tags
4. Verify slug is properly formatted

---

## 8. Configuration

### application.properties
No changes required to application.properties. Model names are hardcoded in services as per current architecture.

If you want to make model configurable in the future, add:
```properties
# OpenAI GPT model
openai.model=gpt-5.1

# Gemini model
gemini.model=gemini-2.5-pro
```

---

## 9. Rollback Plan

If issues arise, the following files can be reverted:

1. **GPTService.java**
   - Change line 35 from `"gpt-5.1"` to `"gpt-4o"`
   - Change line 37 to reference "minimum 4, maximum 4"

2. **ChatGPTNewsService.java**
   - Change line 98 from `"gpt-5.1"` to `"gpt-5-nano"`
   - Change line 274 from `"gpt-5.1"` to `"gpt-5-nano"`
   - Remove lines 152-153 (minItems/maxItems)

3. **GeminiService.java**
   - Revert lines 187 and 190 to original prompts

---

## 10. Next Steps

1. ✅ Update API documentation (api.yaml)
2. ✅ Update INIT.md with runtime information
3. ⏳ Test with real article generation requests
4. ⏳ Monitor API costs with GPT-5.1
5. ⏳ Gather feedback on article quality

---

## Files Modified

1. `/src/main/java/com/laudiumbiz/Laudiumbiz/Services/GPTService.java`
2. `/src/main/java/com/laudiumbiz/Laudiumbiz/Services/ChatGPTNewsService.java`
3. `/src/main/java/com/laudiumbiz/Laudiumbiz/Services/GeminiService.java`

---

## Build Status

✅ **BUILD SUCCESSFUL**
- Compilation: SUCCESS
- No errors introduced
- All 151 source files compiled successfully
- Warnings are pre-existing and unrelated to this change

---

**Author**: Claude Code
**Date**: 2025-11-21
**Version**: 1.0
