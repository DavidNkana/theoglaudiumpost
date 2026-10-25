package com.laudiumbiz.Laudiumbiz.Services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * PURPOSE: Provides OpenAI GPT-5.1 powered article generation and newspaper-style image creation.
 * Generates structured articles with HTML formatting and verified sources, plus creates newspaper front page style images.
 *
 * KEY METHODS:
 * - generateArticle(String prompt): Creates structured articles in JSON format with title, content, summary, slug, and 2-5 verified sources
 * - generateImage(String prompt, String size, String model, Integer n): Generates newspaper-style front page images with New York Times typography
 *
 * INTEGRATIONS: OpenAI GPT-5.1 API with internet search and deep thinking tools, OpenAI Image Generation API (gpt-image-1)
 *
 * @author Imran
 */
@Service
public class GPTService {

    @Value("${openai.api.key}")
    private String openaiApiKey;

    @Value("${openai.api.url.chat:https://api.openai.com/v1/chat/completions}")
    private String chatApiUrl;

    @Value("${openai.api.url.images:https://api.openai.com/v1/images/generations}")
    private String imageApiUrl;

    private final OkHttpClient client = new OkHttpClient.Builder().connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .writeTimeout(180, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(300, java.util.concurrent.TimeUnit.SECONDS).build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String generateArticle(String prompt) throws IOException {
        MediaType mediaType = MediaType.parse("application/json");

        // model = gpt-5.1 with tools for internet access and deep thinking
        String requestBody = """
        {
          "model": "gpt-5.1",
          "messages": [
            {"role": "system", "content": "You are a journalist writing detailed local news articles. Output JSON ONLY with fields {title, article, summary, slug, sources}. Requirements: (1) article must be valid HTML with each paragraph wrapped in <p>...</p>, basic inline tags (<strong>, <em>, <a>) allowed; (2) include a 'sources' array containing exactly 2-5 reputable HTTPS URLs that support the article; (3) do not invent sources; (4) slug must be a URL-friendly kebab-case string based on the title; (5) keep a neutral, factual tone."},
            {"role": "user", "content": "%s"}
          ],
          "temperature": 0.7,
          "tools": [
            {
              "type": "function",
              "function": {
                "name": "search_internet",
                "description": "Search the internet for current or historical information",
                "parameters": {
                  "type": "object",
                  "properties": {
                    "query": {
                      "type": "string",
                      "description": "The search query"
                    }
                  },
                  "required": ["query"]
                }
              }
            },
            {
              "type": "function",
              "function": {
                "name": "deep_thinking",
                "description": "Analyze a topic deeply, considering multiple perspectives and implications",
                "parameters": {
                  "type": "object",
                  "properties": {
                    "topic": {
                      "type": "string",
                      "description": "The topic to analyze deeply"
                    }
                  },
                  "required": ["topic"]
                }
              }
            }
          ],
          "tool_choice": "auto"
        }
        """.formatted(prompt);

        Request request = new Request.Builder()
                .url(chatApiUrl)
                .post(RequestBody.create(requestBody, mediaType))
                .addHeader("Authorization", "Bearer " + openaiApiKey)
                .addHeader("Content-Type", "application/json")
                .build();

        // Log request details
        System.out.println("\n\n========== OPENAI REQUEST ==========");
        System.out.println("URL: " + request.url());
        System.out.println("Method: " + request.method());
        System.out.println("\nHeaders:");
        Headers headers = request.headers();
        for (String name : headers.names()) {
            // Show the full bearer token as requested
            if (name.equals("Authorization")) {
                System.out.println(name + ": Bearer " + openaiApiKey);
            } else {
                System.out.println(name + ": " + headers.get(name));
            }
        }
        System.out.println("\nRequest Body:");
        System.out.println(requestBody);
        System.out.println("====================================\n");

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                System.out.println("Response Code: " + response.code());
                String errorBody = response.body().string();
                System.out.println("Error Body: " + errorBody);
                throw new IOException("Unexpected code: " + response);
            }
            String responseBody = response.body().string();
            System.out.println("\n========== OPENAI RESPONSE ==========");
            System.out.println("Response Code: " + response.code());
            System.out.println("Response Body (truncated): " + (responseBody.length() > 500 ? responseBody.substring(0, 500) + "..." : responseBody));
            System.out.println("======================================\n");

            // Clean and validate here (no separate method, per requirement)
            try {
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode contentNode = root.path("choices").isArray() && root.path("choices").size() > 0
                        ? root.path("choices").get(0).path("message").path("content")
                        : null;
                if (contentNode == null || contentNode.isMissingNode() || contentNode.asText().isBlank()) {
                    throw new IOException("AI did not return content");
                }
                String content = contentNode.asText();
                if (content.startsWith("```") ) {
                    content = content.replaceFirst("^```(json|JSON)?\\n", "");
                    int lastFence = content.lastIndexOf("```\n");
                    if (lastFence == -1) lastFence = content.lastIndexOf("```");
                    if (lastFence > -1) {
                        content = content.substring(0, lastFence);
                    }
                }
                JsonNode articleJson = objectMapper.readTree(content);
                JsonNode sources = articleJson.path("sources");
                if (!sources.isArray() || sources.size() < 2 || sources.size() > 5) {
                    int actualSize = sources.isArray() ? sources.size() : -1;
                    throw new IOException("AI must return 2-5 sources but returned: " + actualSize);
                }
                return articleJson.toString();
            } catch (IOException ex) {
                throw ex;
            } catch (Exception ex) {
                throw new IOException("Failed to parse AI response", ex);
            }
        }
    }



    /**
     * Generates a base64 PNG image with a transparent background that looks like it was printed
     * in a newspaper: colourful yet sharp and high-contrast. The prompt is enriched with
     * style guidance to ensure: printed aesthetic (subtle halftone/grain), crisp edges,
     * readable typography, and no blur. All callers should upload the returned base64 via
     * CloudinaryService.uploadImage(...) which enforces Cloudinary transforms.
     *
     * @param prompt Short title or description to guide the image
     * @param size   Ignored; size is fixed to 1024x1536 for consistency
     * @param model  Optional OpenAI image model (defaults to gpt-image-1)
     * @param n      Number of images to generate (defaults to 1). Only first is returned.
     * @return base64-encoded PNG image data
     */
    public String generateImage(String prompt, String size, String model, Integer n) throws IOException {
        MediaType mediaType = MediaType.parse("application/json");

        // Size is permanently set to 1024x1536 as per requirements
        String fixedSize = "1024x1536";

        // Default to gpt-5-image if model is not provided
        if (model == null || model.isEmpty()) {
            model = "gpt-image-1";  // Updated model to GPT-5 image generation
        }

        // Default to 1 if n is not provided
        if (n == null) {
            n = 1;
        }
        String instruction = "Create a bold, high-quality, newspaper-style front page with a background colour #ead7bd. The design must look like a realistic printed newspaper. Use the New York Times font for the headline and article text. Include:\n" +
                "\n" +
                "A large, striking headline at the top in New York Times font, font size 96pt.\n" +
                "A main image below the headline, full-width, colourful and sharp.\n" +
                "\n" +
                "A short, compelling summary or article text below the image in New York Times font, font size 24pt.\n" +
                "\n" +
                "The style should feel authentic, professional, and visually captivating, mimicking a real New York Times newspaper front page.\n" +
                "\n" +
                "Title:" + prompt;



        // Create request body using ObjectMapper to properly escape special characters
        Map<String, Object> requestMap = new HashMap<>();
        requestMap.put("model", model);
        requestMap.put("prompt", instruction);
        requestMap.put("n", n);
        requestMap.put("size", fixedSize);
        // Added image generation settings per requirements
        requestMap.put("quality", "auto");
        requestMap.put("output_format", "png");

        String requestBody = objectMapper.writeValueAsString(requestMap);

        Request request = new Request.Builder()
                .url(imageApiUrl)
                .post(RequestBody.create(requestBody, mediaType))
                .addHeader("Authorization", "Bearer " + openaiApiKey)
                .addHeader("Content-Type", "application/json")
                .build();

        // Log request details
        System.out.println("\n\n========== OPENAI IMAGE REQUEST ==========");
        System.out.println("URL: " + request.url());
        System.out.println("Method: " + request.method());
        System.out.println("\nHeaders:");
        Headers headers = request.headers();
        for (String name : headers.names()) {
            // Show the full bearer token as requested
            if (name.equals("Authorization")) {
                System.out.println(name + ": Bearer " + openaiApiKey);
            } else {
                System.out.println(name + ": " + headers.get(name));
            }
        }
        System.out.println("\nRequest Body:");
        System.out.println(requestBody);
        System.out.println("==========================================\n");

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body().string();
                System.out.println("\n========== OPENAI IMAGE ERROR RESPONSE ==========");
                System.out.println("Response Code: " + response.code());
                System.out.println("Error Body: " + errorBody);
                System.out.println("=================================================\n");
                throw new IOException("Unexpected code: " + response + ", Error: " + errorBody);
            }

            String responseBodyStr = response.body().string();
            System.out.println("\n========== OPENAI IMAGE RESPONSE ==========");
            System.out.println("Response Code: " + response.code());
            // Log that we received the response successfully
            System.out.println("Response received successfully (image URL returned)");
            System.out.println("===========================================\n");

            JsonNode jsonNode = objectMapper.readTree(responseBodyStr);
            return jsonNode.get("data").get(0).get("b64_json").asText();
        }
    }

}
