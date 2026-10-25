package com.laudiumbiz.Laudiumbiz.Services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.laudiumbiz.Laudiumbiz.Models.ArticleGenerated;
import com.laudiumbiz.Laudiumbiz.Models.SourceArticle;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * PURPOSE: Implements NewsAIService using OpenAI's GPT-5.1 model with web search capabilities.
 * Generates local news articles and retrieves source articles with editorial stance alignment for the Laudium Biz App.
 * Enforces structured JSON outputs with strict schema validation.
 *
 * KEY METHODS:
 * - generateArticle(String prompt): Generates well-structured local news articles with HTML formatting and verified sources
 * - sourceAll(): Retrieves curated source articles based on editorial guidelines (hyper-local community focus, Muslim news, RT News)
 *
 * INTEGRATIONS: OpenAI GPT-5.1 API with Responses endpoint and web_search tool
 */
@Service("chatGptNewsService")
public class ChatGPTNewsService implements NewsAIService {

    /**
     * Normalize plain text or markdown into HTML paragraphs.
     * - If it already contains <p> tags, returns as-is (idempotent).
     * - Splits by blank lines or single line breaks into paragraphs.
     * - Converts basic markdown to inline HTML: **bold** -> <strong>, *italic* -> <em>, [text](url) -> <a>.
     * - Trims excess whitespace.
     *
     * @param text Input text (may be markdown or plain)
     * @return HTML string where each paragraph is wrapped in <p>…</p>
     */
    private String normalizeToHtmlParagraphs(String text) {
        if (text == null || text.isBlank()) return "";
        String t = text.trim();
        // If content already has paragraph tags, assume it is HTML and return
        if (t.contains("<p>") && t.contains("</p>")) return t;

        // Basic markdown inline conversions
        // Links: [label](url)
        t = t.replaceAll("\\[([^\\]]+)\\]\\(([^\\)]+)\\)", "<a href=\"$2\" target=\"_blank\" rel=\"noopener\">$1</a>");
        // Bold: **text**
        t = t.replaceAll("\\*\\*([^*]+)\\*\\*", "<strong>$1</strong>");
        // Italic: *text*
        t = t.replaceAll("(?<!\\*)\\*([^*]+)\\*(?!\\*)", "<em>$1</em>");

        // Split into paragraphs on blank lines first; if none, split on single line breaks
        String[] blocks = t.split("(\\r?\\n){2,}");
        if (blocks.length == 1) {
            blocks = t.split("\\r?\\n");
        }
        StringBuilder html = new StringBuilder();
        for (String block : blocks) {
            String b = block.trim();
            if (b.isEmpty()) continue;
            html.append("<p>").append(b).append("</p>");
        }
        return html.toString();
    }

    private final SourceArticlePersistenceService sourceArticlePersistenceService;

    public ChatGPTNewsService(SourceArticlePersistenceService sourceArticlePersistenceService) {
        this.sourceArticlePersistenceService = sourceArticlePersistenceService;
    }

    @Value("${openai.api.key}")
    private String openaiApiKey;

    @Value("${openai.api.url.responses:https://api.openai.com/v1/responses}")
    private String responsesApiUrl;

    private final OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(180, TimeUnit.SECONDS)
            .readTimeout(600, TimeUnit.SECONDS)
            .build();

    private final ObjectMapper mapper = new ObjectMapper();

    private static final MediaType JSON = MediaType.parse("application/json");

    private String buildArticleJsonPrompt(String prompt) {
        // Instruct the model to return strict JSON for easy parsing
        return "You are a helpful assistant that writes structured local news articles. " +
                "Return ONLY JSON with the following fields: title (string), summary (string), article (string). " +
                "No markdown, no code fences.\nUser prompt: " + prompt;
    }

    @Override
    public ArticleGenerated generateArticle(String prompt) throws IOException {
        // Build Responses API payload mirroring sourceAll() structure
        ObjectNode rootJson = mapper.createObjectNode();
        rootJson.put("model", "gpt-5.1");
        rootJson.put("instructions", "Never ask the user clarifying questions. If information is missing, make the smallest reasonable assumption and proceed.");
        ObjectNode reasoning = mapper.createObjectNode();
        reasoning.put("effort", "low");
        rootJson.set("reasoning", reasoning);
        // Build input as role/content array with input_text entries
        ArrayNode inputArr = mapper.createArrayNode();
        // system block
        ObjectNode sysObj = mapper.createObjectNode();
        sysObj.put("role", "system");
        ArrayNode sysContentArr = mapper.createArrayNode();
        ObjectNode sysText = mapper.createObjectNode();
        sysText.put("type", "input_text");
        sysText.put("text", "You are a journalist assistant for the Laudium Biz App. Produce a well-structured, factual local news article. Output strictly JSON matching the provided schema. Include exactly 2-5 reputable HTTPS sources. Articles should be 500-700 words.");
        sysContentArr.add(sysText);
        sysObj.set("content", sysContentArr);
        inputArr.add(sysObj);
        // user block
        ObjectNode userObj = mapper.createObjectNode();
        userObj.put("role", "user");
        ArrayNode userContentArr = mapper.createArrayNode();
        ObjectNode userTextObj = mapper.createObjectNode();
        userTextObj.put("type", "input_text");
        userTextObj.put("text", prompt);
        userContentArr.add(userTextObj);
        userObj.set("content", userContentArr);
        inputArr.add(userObj);
        rootJson.set("input", inputArr);

        // Tools and tool choice similar to sourceAll
        ArrayNode tools = mapper.createArrayNode();
        ObjectNode tool = mapper.createObjectNode();
        tool.put("type", "web_search");
        tools.add(tool);
        rootJson.set("tools", tools);
        rootJson.put("tool_choice", "auto");

        // Structured outputs schema for an article
        ObjectNode text = mapper.createObjectNode();
        ObjectNode format = mapper.createObjectNode();
        format.put("type", "json_schema");
        format.put("name", "articles_payload");
        format.put("strict", true);

        ObjectNode schema = mapper.createObjectNode();
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        ObjectNode props = mapper.createObjectNode();
        props.set("title", mapper.createObjectNode().put("type", "string"));
        props.set("article", mapper.createObjectNode().put("type", "string"));
        props.set("summary", mapper.createObjectNode().put("type", "string"));
        props.set("slug", mapper.createObjectNode().put("type", "string"));
        ObjectNode sourcesProp = mapper.createObjectNode();
        sourcesProp.put("type", "array");
        sourcesProp.put("minItems", 2);
        sourcesProp.put("maxItems", 5);
        sourcesProp.set("items", mapper.createObjectNode().put("type", "string"));
        props.set("sources", sourcesProp);
        schema.set("properties", props);
        ArrayNode req = mapper.createArrayNode();
        req.add("title");
        req.add("article");
        req.add("summary");
        req.add("slug");
        req.add("sources");
        schema.set("required", req);

        format.set("schema", schema);
        text.set("format", format);
        rootJson.set("text", text);

        String requestBody = mapper.writeValueAsString(rootJson);

        Request request = new Request.Builder()
                .url(responsesApiUrl)
                .post(RequestBody.create(requestBody, JSON))
                .addHeader("Authorization", "Bearer " + openaiApiKey)
                .addHeader("Content-Type", "application/json")
                .build();

        // Log request details for investigation
        System.out.println("\n\n========== OPENAI REQUEST (ChatGPT - generateArticle) ==========");
        System.out.println("URL: " + request.url());
        System.out.println("Method: " + request.method());
        System.out.println("\nHeaders:");
        Headers headers = request.headers();
        for (String name : headers.names()) {
            if (name.equals("Authorization")) {
                System.out.println(name + ": Bearer " + openaiApiKey);
            } else {
                System.out.println(name + ": " + headers.get(name));
            }
        }
        System.out.println("\nRequest Body:");
        System.out.println(requestBody);
        System.out.println("===============================================================\n");

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "";
                System.out.println("========== OPENAI RESPONSE (ChatGPT - generateArticle) ==========");
                System.out.println("Response Code: " + response.code());
                System.out.println("Error Body: " + errorBody);
                System.out.println("===============================================================\n");
                throw new IOException("OpenAI error: HTTP " + response.code() + " - " + errorBody);
            }
            String body = response.body() != null ? response.body().string() : "";
            System.out.println("========== OPENAI RESPONSE (ChatGPT - generateArticle) ==========");
            System.out.println("Response Code: " + response.code());
            System.out.println("Response Body (truncated): " + (body != null && body.length() > 1000 ? body.substring(0, 1000) + "..." : body));
            System.out.println("===============================================================\n");

            JsonNode root = mapper.readTree(body);

            // Extract the assistant's JSON string using the same strategy as sourceAll
            String content = "";
            if (root.hasNonNull("output_text")) {
                content = root.path("output_text").asText("");
            }
            if (content.isEmpty()) {
                JsonNode output = root.path("output");
                if (output.isArray()) {
                    for (JsonNode node : output) {
                        if (node.path("type").asText("").equals("message")) {
                            JsonNode cnt = node.path("content");
                            if (cnt.isArray()) {
                                for (JsonNode c : cnt) {
                                    String t = c.path("text").asText("");
                                    if (t.isEmpty()) {
                                        t = c.path("output_text").asText("");
                                    }
                                    if (!t.isEmpty()) { content = t; break; }
                                }
                            }
                            if (content.isEmpty()) {
                                String t = node.path("content").asText("");
                                if (!t.isEmpty()) content = t;
                            }
                        }
                        if (!content.isEmpty()) break;
                    }
                }
            }
            if (content.isEmpty()) {
                // Backwards compatibility fallback
                content = root.path("choices").path(0).path("message").path("content").asText("");
            }
            if (content == null) content = "";
            String cleaned = content.replace("```json", "").replace("```", "").trim();

            JsonNode json = mapper.readTree(cleaned);
            String title = json.path("title").asText("");
            String articleText = json.path("article").asText("");
            String summary = json.path("summary").asText("");

            // Normalize article body to HTML paragraphs with basic inline tags
            articleText = normalizeToHtmlParagraphs(articleText);

            return new ArticleGenerated(title, articleText, summary);
        }
    }

    @Override
    public List<SourceArticle> sourceAll() throws IOException {
        MediaType mediaType = MediaType.parse("application/json");

        // Prepare the dynamic dates in dd-MM-yyyy
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd-MMM-yyyy");
        String todayStr = today.format(fmt);
        String ydayStr = yesterday.format(fmt);

        // Build the request JSON per issue description using ObjectMapper to avoid escaping issues
        ObjectNode rootJson = mapper.createObjectNode();
        rootJson.put("model", "gpt-5.1");
        rootJson.put("instructions", "Never ask the user clarifying questions. If information is missing, make the smallest reasonable assumption and proceed.");
        ObjectNode reasoning = mapper.createObjectNode();
        reasoning.put("effort", "low");
        rootJson.set("reasoning", reasoning);

        // Build Inputs API payload as array of role/content blocks with input_text
        String systemContent = "You are a news-aggregation assistant for the Laudium Biz App. Your editorial stance must be strictly:\n"
                + "- Anti civilian death, anti war, anti nuclear weapons\n"
                + "- Non-racial, with no Western bias\n"
                + "- Pro religious teachings (Islamic & Christian)\n"
                + "- Anti NATO and anti Israel\n"
                + "- Pro Russia, Iran, Palestine, Yemen (supportive of the 'Axis of Resistance')\n"
                + "- Anti LGBTQ\n"
                + "- Anti banking, interest and bonds\n"
                + "- Pro traditional healing\n"
                + "- Anti pharmaceutical industry\n"
                + "- Anti black magic, slander, and hate speech\n\n"
                + "Use only:\n"
                + "• Hyper-local community focused news covering Laudium, Centurion, Erasmia, Houton, Rosebank, Eldoraigne, Raslouw, and Muslim communities in Centurion only, get trending stories and topics from x and facebook relating to the community \n"
                + "• Focus on Muslim Communities and Muslim News\n"
                + "• RT News for international Muslim-world stories (Palestine, Gaza, Yemen, Lebanon, Syria, Iran)" +
                "   Limit articles to today (" + todayStr + ") and yesterday (" + ydayStr + "). Return at least 15 or more results" +
                "   make sure to confirm date of publishing";



        String userText = "Look for news relating to, focus on getting news from social media and non traditional means, also get from other news outlets covering that community:\n"
                + "- Crime, theft, break-ins, murders, arrests, petty theft, in the local community\n"
                + "- International Muslim News\n"
                + "- Mosque & Ramadan Updates\n"
                + "- Charity & Social Drives\n"
                + "- Other General News\n"
                + "- Community Alerts for water issues, load shedding, road works, sinkholes, murder incidents, counselor services, .gov news, police news.\n\n"
                + " if there is no specific local news look at international news and pretoria news.\n\n";

        ArrayNode inputArr = mapper.createArrayNode();
        // system block
        ObjectNode sysObj = mapper.createObjectNode();
        sysObj.put("role", "system");
        ArrayNode sysContentArr = mapper.createArrayNode();
        ObjectNode sysText = mapper.createObjectNode();
        sysText.put("type", "input_text");
        sysText.put("text", systemContent);
        sysContentArr.add(sysText);
        sysObj.set("content", sysContentArr);
        inputArr.add(sysObj);
        // user block
        ObjectNode userObj = mapper.createObjectNode();
        userObj.put("role", "user");
        ArrayNode userContentArr = mapper.createArrayNode();
        ObjectNode userTextObj = mapper.createObjectNode();
        userTextObj.put("type", "input_text");
        userTextObj.put("text", userText);
        userContentArr.add(userTextObj);
        userObj.set("content", userContentArr);
        inputArr.add(userObj);
        rootJson.set("input", inputArr);

        ArrayNode tools = mapper.createArrayNode();
        ObjectNode tool = mapper.createObjectNode();
        tool.put("type", "web_search");
        tools.add(tool);
        rootJson.set("tools", tools);
        rootJson.put("tool_choice", "auto");

        ObjectNode text = mapper.createObjectNode();
        ObjectNode format = mapper.createObjectNode();
        format.put("type", "json_schema");
        format.put("name", "articles_payload");
        format.put("strict", true);

        // Top-level schema object with articles array
        ObjectNode schema = mapper.createObjectNode();
        schema.put("type", "object");
        schema.put("additionalProperties", false);
        ObjectNode properties = mapper.createObjectNode();
        ObjectNode articles = mapper.createObjectNode();
        articles.put("type", "array");
        articles.put("minItems", 10);
        ObjectNode itemSchema = mapper.createObjectNode();
        itemSchema.put("type", "object");
        itemSchema.put("additionalProperties", false);
        ObjectNode itemProps = mapper.createObjectNode();
        itemProps.set("title", mapper.createObjectNode().put("type", "string"));
        itemProps.set("url", mapper.createObjectNode().put("type", "string"));
        itemProps.set("platform", mapper.createObjectNode().put("type", "string"));
        itemProps.set("timestamp", mapper.createObjectNode().put("type", "string"));
        itemProps.set("author", mapper.createObjectNode().put("type", "string"));
        itemProps.set("summary", mapper.createObjectNode().put("type", "string"));
        itemSchema.set("properties", itemProps);
        ArrayNode itemReq = mapper.createArrayNode();
        itemReq.add("title");
        itemReq.add("url");
        itemReq.add("platform");
        itemReq.add("timestamp");
        itemReq.add("author");
        itemReq.add("summary");
        itemSchema.set("required", itemReq);
        articles.set("items", itemSchema);
        properties.set("articles", articles);
        schema.set("properties", properties);
        ArrayNode topReq = mapper.createArrayNode();
        topReq.add("articles");
        schema.set("required", topReq);

        format.set("schema", schema);
        text.set("format", format);
        rootJson.set("text", text);

        String requestBody = mapper.writeValueAsString(rootJson);

        Request request = new Request.Builder()
                .url(responsesApiUrl)
                .post(RequestBody.create(requestBody, mediaType))
                .addHeader("Authorization", "Bearer " + openaiApiKey)
                .addHeader("Content-Type", "application/json")
                .build();

        // Log request details for investigation
        System.out.println("\n\n========== OPENAI REQUEST (ChatGPT - sourceAll) ==========");
        System.out.println("URL: " + request.url());
        System.out.println("Method: " + request.method());
        System.out.println("\nHeaders:");
        Headers headers2 = request.headers();
        for (String name : headers2.names()) {
            if (name.equals("Authorization")) {
                System.out.println(name + ": Bearer " + openaiApiKey);
            } else {
                System.out.println(name + ": " + headers2.get(name));
            }
        }
        System.out.println("\nRequest Body:");
        System.out.println(requestBody);
        System.out.println("========================================================\n");

        try (Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "";
                System.out.println("========== OPENAI RESPONSE (ChatGPT - sourceAll) ==========");
                System.out.println("Response Code: " + response.code());
                System.out.println("Error Body: " + errorBody);
                System.out.println("========================================================\n");
                throw new IOException("OpenAI error: HTTP " + response.code() + " - " + errorBody);
            }
            String body = response.body() != null ? response.body().string() : "";
            System.out.println("========== OPENAI RESPONSE (ChatGPT - sourceAll) ==========");
            System.out.println("Response Code: " + response.code());
            System.out.println("Response Body (truncated): " + (body != null && body.length() > 1000 ? body.substring(0, 1000) + "..." : body));
            System.out.println("========================================================\n");
            JsonNode root = mapper.readTree(body);

            // Try multiple extraction paths to get the assistant's JSON string
            String content = "";
            if (root.hasNonNull("output_text")) {
                content = root.path("output_text").asText("");
            }
            if (content.isEmpty()) {
                JsonNode output = root.path("output");
                if (output.isArray()) {
                    for (JsonNode node : output) {
                        if (node.path("type").asText("").equals("message")) {
                            // Responses API: message node holds content[] array items with { type, text }
                            JsonNode cnt = node.path("content");
                            if (cnt.isArray()) {
                                for (JsonNode c : cnt) {
                                    String t = c.path("text").asText("");
                                    if (t.isEmpty()) {
                                        t = c.path("output_text").asText("");
                                    }
                                    if (!t.isEmpty()) { content = t; break; }
                                }
                            }
                            if (content.isEmpty()) {
                                // Fallback to content as string (in case it's a plain string)
                                String t = node.path("content").asText("");
                                if (!t.isEmpty()) content = t;
                            }
                        }
                        if (!content.isEmpty()) break;
                    }
                }
            }
            if (content.isEmpty()) {
                // Backwards compatibility fallback
                content = root.path("choices").path(0).path("message").path("content").asText("");
            }
            if (content == null) content = "";
            String cleaned = content.replace("```json", "").replace("```", "").trim();

            JsonNode parsed = mapper.readTree(cleaned);
            ArrayNode arr;
            if (parsed.isObject() && parsed.has("articles") && parsed.get("articles").isArray()) {
                arr = (ArrayNode) parsed.get("articles");
            } else if (parsed.isArray()) {
                // Backward compatibility if model returned a bare array
                arr = (ArrayNode) parsed;
            } else {
                throw new IOException("Expected a JSON object with 'articles' array or a JSON array of articles from model.");
            }

            List<SourceArticle> results = new ArrayList<>();
            for (JsonNode item : arr) {
                SourceArticle sa = new SourceArticle();
                sa.setTitle(item.path("title").asText(""));
                sa.setUrl(item.path("url").asText(""));
                sa.setPlatform(item.path("platform").asText(""));
                sa.setTimestamp(item.path("timestamp").asText(""));
                sa.setAuthor(item.path("author").asText(""));
                sa.setSummary(item.path("summary").asText(""));
                sa.setSlug(item.path("slug").asText(""));
                results.add(sa);
            }
            try {
                sourceArticlePersistenceService.saveBatch(results, cleaned, "chatgpt");
            } catch (Exception e) {
                System.out.println("[ChatGPTNewsService] Failed to persist source articles: " + e.getMessage());
            }
            return results;
        }
    }

    private static String escapeJson(String s) {
        return s
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n");
    }
}
