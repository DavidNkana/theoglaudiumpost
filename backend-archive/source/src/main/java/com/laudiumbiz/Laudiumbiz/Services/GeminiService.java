package com.laudiumbiz.Laudiumbiz.Services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.laudiumbiz.Laudiumbiz.Models.ArticleGenerated;
import com.laudiumbiz.Laudiumbiz.Models.DTO.GeneratedArticleResponse;
import com.laudiumbiz.Laudiumbiz.Models.GeminiRest.*;
import com.laudiumbiz.Laudiumbiz.Models.SourceArticle;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.logging.Logger;

/**
 * PURPOSE: Provides AI-powered content generation using Google's Gemini model with Google Search grounding.
 * Implements NewsAIService for article generation and source article retrieval with hyper-local focus.
 * Enforces editorial guidelines for the Laudium Biz App including Muslim community news and specific regional coverage.
 *
 * KEY METHODS:
 * - generateArticle(String prompt): Generates structured articles with title, content, summary, slug, and sources
 * - sourceAll(): Retrieves source articles from various platforms with Google Search grounding
 * - generateStructuredArticle(String prompt): Creates articles in structured JSON format
 * - generateReasoning(String prompt): Produces step-by-step analytical reasoning
 * - investigativeJournalism(String topic): Generates in-depth investigative reports
 * - getSourceArticlesWithCustomPrompt(String prompt): Retrieves source articles using custom search criteria
 *
 * INTEGRATIONS: Google Gemini API via Google Cloud Platform with GoogleSearch tool integration
 *
 * @author Junie
 */
@Service("geminiService")
public class GeminiService implements NewsAIService {

    /**
     * Normalize plain text or markdown into HTML paragraphs.
     * If content already contains <p> tags, returns as-is. Converts basic markdown to inline HTML.
     */
    private String normalizeToHtmlParagraphs(String text) {
        if (text == null || text.isBlank()) return "";
        String t = text.trim();
        if (t.contains("<p>") && t.contains("</p>")) return t;
        t = t.replaceAll("\\[([^\\]]+)\\]\\(([^\\)]+)\\)", "<a href=\"$2\" target=\"_blank\" rel=\"noopener\">$1</a>");
        t = t.replaceAll("\\*\\*([^*]+)\\*\\*", "<strong>$1</strong>");
        t = t.replaceAll("(?<!\\*)\\*([^*]+)\\*(?!\\*)", "<em>$1</em>");
        String[] blocks = t.split("(\\r?\\n){2,}");
        if (blocks.length == 1) blocks = t.split("\\r?\\n");
        StringBuilder html = new StringBuilder();
        for (String block : blocks) {
            String b = block.trim();
            if (b.isEmpty()) continue;
            html.append("<p>").append(b).append("</p>");
        }
        return html.toString();
    }

    private static final Logger logger = Logger.getLogger(GeminiService.class.getName());

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.model}")
    private String geminiModel;

    @Value("${gemini.project.id}")
    private String projectId;

    @Value("${gemini.location}")
    private String location;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();
    private final GoogleAuthService googleAuthService;
    private final SourceArticlePersistenceService sourceArticlePersistenceService;

    public GeminiService(GoogleAuthService googleAuthService, SourceArticlePersistenceService sourceArticlePersistenceService) {
        this.googleAuthService = googleAuthService;
        this.sourceArticlePersistenceService = sourceArticlePersistenceService;
    }

    /**
     * Log the request details including headers, URL, and request body
     *
     * @param url     the API URL
     * @param headers the HTTP headers
     * @param request the request body
     */
    private void logRequestDetails(String url, HttpHeaders headers, GeminiRequest request) {
        try {
            System.out.println("=== GEMINI API REQUEST ===");
            System.out.println("URL: " + url);
            System.out.println("HEADERS: " + headers);

            // Safely serialize the request body, providing a fallback for serialization failures
            String requestBody = null;
            try {
                requestBody = Utils.getGson().toJson(request);
            } catch (Exception e) {
                logger.warning("Failed to serialize request body: " + e.getMessage());
            }

            System.out.println("REQUEST BODY: " + requestBody);
            System.out.println("========================");
        } catch (Exception e) {
            logger.warning("Failed to log request details: " + e.getMessage());
        }
    }

    /**
     * Get the Gemini API endpoint URL
     *
     * @return the Gemini API endpoint URL
     */
    private String getGeminiApiUrl() {
        return "https://" + location + "-aiplatform.googleapis.com/v1/projects/" +
                projectId + "/locations/" + location + "/publishers/google/models/" +
                geminiModel + ":generateContent";
    }

    /**
     * Create HTTP headers for the Gemini API request
     *
     * @return the HTTP headers
     * @throws IOException if there's an error getting the access token
     */
    private HttpHeaders createHeaders() throws IOException {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Add bearer authentication with access token
        String accessToken = googleAuthService.getAccessToken();
        headers.setBearerAuth(accessToken);

        return headers;
    }

    /**
     * Generate a URL-friendly slug from the title
     * 
     * @param title the title to convert to a slug
     * @return the URL-friendly slug
     */
    private String generateSlug(String title) {
        if (title == null || title.isEmpty()) {
            return "generated-article";
        }
        
        // Convert to lowercase
        String slug = title.toLowerCase();
        
        // Replace spaces with hyphens
        slug = slug.replaceAll("\\s+", "-");
        
        // Remove special characters
        slug = slug.replaceAll("[^a-z0-9-]", "");
        
        // Remove multiple consecutive hyphens
        slug = slug.replaceAll("-+", "-");
        
        // Remove leading and trailing hyphens
        slug = slug.replaceAll("^-|-$", "");
        
        return slug;
    }

    /**
     * Generate text using Gemini API with GoogleSearch tool
     *
     * @param prompt the prompt for text generation
     * @return the generated article as an ArticleGenerated object
     * @throws IOException if there's an error in the API call
     */
    public ArticleGenerated generateArticle(String prompt) throws IOException {
        logger.info("Generating text with prompt: " + prompt);

        // Configure GoogleSearch tool


        // Create content with system and user messages
        List<Part> systemParts = new ArrayList<>();
        systemParts.add(new Part("You are a professional writer creating well-structured articles. " +
                "Generate a comprehensive article based on the given prompt. " +
                        "The article should be 300-700 words, written in a professional tone." +
                        "Include the following elements in your response:\n\n" +
                        "1. Title: A clean, catchy, and relevant title at the beginning of your response\n" +
                        "2. Article: The main article content with proper paragraphs\n" +
                        "3. Summary: A concise summary (1-3 sentences) of the article's main points at the end\n" +
                        "4. Slug: A URL-friendly version of the title (lowercase, hyphens instead of spaces, no special characters)\n" +
                        "5. Sources: Include exactly 2-5 reputable HTTPS sources that support the article\n\n" +
                        "Format your response with clear section headers to make it easy to parse these sections."));
        systemParts.add(new Part("Format Your Response Exactly Like this JSON Payload {\"title\":, \"article\":,\"summary\":, \"slug\":,\"sources\":[]}"));
        systemParts.add(new Part("Research and get 2-5 sources so we have proper attribution and verification, re-write and make it our own"));
        systemParts.add(new Part("Your lens: You are a local reporter so where necessary add context about Laudium or surrounding areas, keep it natural dont force adding that context, our main reader are the Muslim community write for them from there perspective and their community"));
        List<Part> userParts = new ArrayList<>();
        userParts.add(new Part(prompt));

        List<Content> contents = new ArrayList<>();
        contents.add(new Content("user", systemParts));
        contents.add(new Content("user", userParts));
        List<Map<String, Object>> tools = new ArrayList<>();
        tools.add(Map.of("googleSearch", new HashMap<>()));

        // Create the request
        GeminiRequest request = new GeminiRequest(
                contents,
                tools,
                "projects/" + projectId + "/locations/" + location + "/publishers/google/models/" + geminiModel
        );

        try {
            // Log request details
            String url = getGeminiApiUrl();
            HttpHeaders headers = createHeaders();
            logRequestDetails(url, headers, request);

            // Make the API call
            HttpEntity<GeminiRequest> entity = new HttpEntity<>(request, headers);
            ResponseEntity<GeminiResponse> response = restTemplate.postForEntity(
                    url,
                    entity,
                    GeminiResponse.class
            );

            GeminiResponse geminiResponse = response.getBody();
            if (geminiResponse == null || geminiResponse.getCandidates() == null || geminiResponse.getCandidates().isEmpty()) {
                logger.warning("No candidates returned from Gemini.");
                return new ArticleGenerated("", "", "", "");
            }

            Candidate candidate = geminiResponse.getCandidates().get(0);
            if (candidate.getContent() == null || candidate.getContent().getParts() == null || candidate.getContent().getParts().isEmpty()) {
                logger.warning("No content parts returned from Gemini candidate.");
                return new ArticleGenerated("", "", "", "");
            }
            System.out.println(Utils.getGson().toJson(candidate));
            // Step 5: Extract JSON string
            String rawJson = candidate.getContent().getParts().get(0).getText()
                    .replace("```json", "")
                    .replace("```", "")
                    .trim();
            System.out.println(rawJson);
            logger.info("Gemini response content: " + rawJson);

            //use gson to parse the raw response to a new ArticleGenerated Object
            ArticleGenerated articleGenerated = Utils.getGson().fromJson(rawJson, ArticleGenerated.class);
            
            // Generate slug from title
            if (articleGenerated.getTitle() != null && !articleGenerated.getTitle().isEmpty()) {
                String slug = generateSlug(articleGenerated.getTitle());
                articleGenerated.setSlug(slug);
            }
            
            return articleGenerated;
        } catch (Exception e) {
            logger.severe("Gemini API Error: " + e.getMessage());
            throw new IOException("Error generating text with Gemini: " + e.getMessage(), e);
        }
    }

    /**
     * Generate an article with structured format using Gemini API
     *
     * @param prompt the prompt for article generation
     * @return the generated article as a string with structured format
     * @throws IOException if there's an error in the API call
     */
    public String generateStructuredArticle(String prompt) throws IOException {
        logger.info("Generating structured article with prompt: " + prompt);

        // Configure GoogleSearch tool


        // Create content with instructions and user prompt
        List<Part> userParts = new ArrayList<>();
        userParts.add(new Part(
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
                        "expected in quality journalism. Base all information on recent data using live Google Search.\n\n" +
                        "Topic to write about: " + prompt
        ));

        List<Content> contents = new ArrayList<>();
        contents.add(new Content("user", userParts));
        List<Map<String, Object>> tools = new ArrayList<>();
        tools.add(Map.of("googleSearch", new HashMap<>()));
        // Create the request
        GeminiRequest request = new GeminiRequest(
                contents,
                tools,
                "projects/" + projectId + "/locations/" + location + "/publishers/google/models/" + geminiModel
        );

        try {
            // Log request details
            String url = getGeminiApiUrl();
            HttpHeaders headers = createHeaders();
            logRequestDetails(url, headers, request);

            // Make the API call
            HttpEntity<GeminiRequest> entity = new HttpEntity<>(request, headers);
            ResponseEntity<GeminiResponse> response = restTemplate.postForEntity(
                    url,
                    entity,
                    GeminiResponse.class
            );

            GeminiResponse geminiResponse = response.getBody();
            if (geminiResponse == null || geminiResponse.getCandidates() == null || geminiResponse.getCandidates().isEmpty()) {
                logger.warning("No candidates returned from Gemini.");
                return "";
            }

            Candidate candidate = geminiResponse.getCandidates().get(0);
            if (candidate.getContent() == null || candidate.getContent().getParts() == null || candidate.getContent().getParts().isEmpty()) {
                logger.warning("No content parts returned from Gemini candidate.");
                return "";
            }

            return candidate.getContent().getParts().get(0).getText();
        } catch (Exception e) {
            logger.severe("Gemini API Error: " + e.getMessage());
            e.printStackTrace();
            throw new IOException("Error generating structured article with Gemini: " + e.getMessage(), e);
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

        // Configure GoogleSearch tool


        // Create content with system and user messages
        List<Part> systemParts = new ArrayList<>();
        systemParts.add(new Part("You are an assistant that provides step-by-step reasoning. Analyze the problem thoroughly, consider different perspectives, and draw logical conclusions. Structure your response with clear steps and explanations. Base all answers on recent information using live Google Search."));

        List<Part> userParts = new ArrayList<>();
        userParts.add(new Part(prompt));

        List<Content> contents = new ArrayList<>();
        contents.add(new Content("user", systemParts));
        contents.add(new Content("user", userParts));
        List<Map<String, Object>> tools = new ArrayList<>();
        tools.add(Map.of("googleSearch", new HashMap<>()));
        // Create the request
        GeminiRequest request = new GeminiRequest(
                contents,
                tools,
                "projects/" + projectId + "/locations/" + location + "/publishers/google/models/" + geminiModel
        );

        try {
            // Log request details
            String url = getGeminiApiUrl();
            HttpHeaders headers = createHeaders();
            logRequestDetails(url, headers, request);

            // Make the API call
            HttpEntity<GeminiRequest> entity = new HttpEntity<>(request, headers);
            ResponseEntity<GeminiResponse> response = restTemplate.postForEntity(
                    url,
                    entity,
                    GeminiResponse.class
            );

            GeminiResponse geminiResponse = response.getBody();
            if (geminiResponse == null || geminiResponse.getCandidates() == null || geminiResponse.getCandidates().isEmpty()) {
                logger.warning("No candidates returned from Gemini.");
                return "";
            }

            Candidate candidate = geminiResponse.getCandidates().get(0);
            if (candidate.getContent() == null || candidate.getContent().getParts() == null || candidate.getContent().getParts().isEmpty()) {
                logger.warning("No content parts returned from Gemini candidate.");
                return "";
            }

            return candidate.getContent().getParts().get(0).getText();
        } catch (Exception e) {
            logger.severe("Gemini API Error: " + e.getMessage());
            throw new IOException("Error generating reasoning with Gemini: " + e.getMessage(), e);
        }
    }


    /**
     * Get source articles based on task type and parameters, grounded with Google Search.
     *
     * @return list of source articles
     * @throws IOException if there's an error in the API call or parsing
     */
    public List<SourceArticle> getSourceArticles() throws IOException {


        // Step 1: Construct the user prompt
        String today = LocalDate.now().format(DateTimeFormatter.ofPattern("dd-MM-yyyy"));
        String yesterday = LocalDate.now().minusDays(1).format(DateTimeFormatter.ofPattern("dd-MM-yyyy"));

        // Step 2: Enable Google Search tool for grounding


        // Step 3: Compose messages
        List<Part> systemParts = new ArrayList<>();
        systemParts.add(new Part("Use live Google Search. Limit articles to today (" + today + ") and yesterday (" + yesterday + "). Return at least 10 or more results."));
        systemParts.add(new Part("You are a strict JSON generator. Output only a JSON array of articles. Each object must include [{'title':, 'url':, 'platform':, 'timestamp':, 'author':,'summary':}]."));
        //systemParts.add(new Part("Focus strictly on Zambian Government, Zambian news, entertainment in Zambia, Politics in Zambia, Economics in Zambia."));
        systemParts.add(new Part("SYSTEM:\n" +
                "You are a news-aggregation assistant for the Laudium Biz App. Your editorial stance must be strictly:\n" +
                "- Anti civilian death, anti war, anti nuclear weapons  \n" +
                "- Non-racial, with no Western bias  \n" +
                "- Pro religious teachings (Islamic & Christian)  \n" +
                "- Anti NATO and anti Israel  \n" +
                "- Pro Russia, Iran, Palestine, Yemen (supportive of the “Axis of Resistance”)  \n" +
                "- Anti LGBTQ  \n" +
                "- Anti banking, interest and bonds  \n" +
                "- Pro traditional healing  \n" +
                "- Anti pharmaceutical industry  \n" +
                "- Anti black magic, slander, and hate speech  \n" +
                "\n" +
                "Use only:\n" +
                "• Hyper-local community outlets covering Laudium, Centurion, Erasmia, Houton, Rosebank, Eldoraigne, Raslouw, and Muslim communities in Centurion Only \n" +
                "• Focus on Muslim Communities and Muslim News  \n" +
                "• RT News for international Muslim-world stories (Palestine, Gaza, Yemen, Lebanon, Syria, Iran)  \n" +
                "\n" +
                "USER:\n" +
                "Every morning, generate the content for today’s digital edition Look for news relating to:\n" +
                "International Muslim News and  \n" +
                "Mosque & Ramadan Updates and \n" +
                "Charity & Social Drives  and \n" +
                "Other General News and  \n" +
                "Community Alerts for water issues, load shedding, road works, sinkholes, murder incidents, and counselor services, .gov news, police news  \n" +
                "\n" +
                ""));
//        systemParts.add(new Part("You are an investigative tabloid journalist writing for a South African paper aimed at an urban Black readership. For each of the following twelve beats, create:\n" +
//                "\n" +
//                "1. A click-bait headline  \n" +
//                "2. A two-sentence story teaser that hooks readers with juicy details  \n" +
//                "3. One bullet “angle” showing the sleaziest or most scandalous twist  \n" +
//                "\n" +
//                "Beats:\n" +
//                "1. ANC Love Scandals  \n" +
//                "2. Celebrity Rituals & Traditional Healers  \n" +
//                "3. Underground Music Feuds (Kwaito/Amapiano)  \n" +
//                "4. Soccer Star Private Lives (PSL players)  \n" +
//                "5. High-Society Crime Rings  \n" +
//                "6. VIP Nightlife Bust-Ups (township clubs)  \n" +
//                "7. Royal Family Rumblings (Zulu/Xhosa monarchies)  \n" +
//                "8. Phantom Influencer Exposés  \n" +
//                "9. Mystery Rich List (township millionaires)  \n" +
//                "10. Ghosts & Curses (haunted estates/mines)  \n" +
//                "11. TikTok-Driven Social Uproars  "));
        List<Content> contents = new ArrayList<>();
        contents.add(new Content("user", systemParts));
        List<Map<String, Object>> tools = new ArrayList<>();
        tools.add(Map.of("googleSearch", new HashMap<>()));
        // Step 4: Create the request
        GeminiRequest request = new GeminiRequest(
                contents,
                tools,
                "projects/" + projectId + "/locations/" + location + "/publishers/google/models/" + geminiModel
        );

        logger.info("Sending request to Gemini with Google Search grounding...");

        try {
            // Log request details
            String url = getGeminiApiUrl();
            HttpHeaders headers = createHeaders();
            logRequestDetails(url, headers, request);


            // Make the API call
            HttpEntity<GeminiRequest> entity = new HttpEntity<>(request, headers);
            ResponseEntity<GeminiResponse> response = restTemplate.postForEntity(
                    url,
                    entity,
                    GeminiResponse.class
            );

            GeminiResponse geminiResponse = response.getBody();
            System.out.println(geminiResponse);
            if (geminiResponse == null || geminiResponse.getCandidates() == null || geminiResponse.getCandidates().isEmpty()) {
                logger.warning("No candidates returned from Gemini.");
                return List.of();
            }

            Candidate candidate = geminiResponse.getCandidates().get(0);
            if (candidate.getContent() == null || candidate.getContent().getParts() == null || candidate.getContent().getParts().isEmpty()) {
                logger.warning("No content parts returned from Gemini candidate.");
                return List.of();
            }
            System.out.println(Utils.getGson().toJson(candidate));
            // Step 5: Extract JSON string
            String rawJson = candidate.getContent().getParts().get(0).getText()
                    .replace("```json", "")
                    .replace("```", "")
                    .trim();
            System.out.println(rawJson);
            logger.info("Gemini response content: " + rawJson);

            var root = Utils.getGson().fromJson(rawJson, SourceArticle[].class);
            if (root.length > 0 && root[0] == null) {
                logger.warning("Expected JSON array in Gemini response.");
                return List.of();
            }
            List<SourceArticle> articles = List.of(root);
            try {
                sourceArticlePersistenceService.saveBatch(articles, rawJson, "gemini");
            } catch (Exception e) {
                logger.warning("Failed to persist source articles: " + e.getMessage());
            }
            return articles;
        } catch (Exception e) {
            e.printStackTrace();
            logger.severe("Failed to process Gemini API response: " + e.getMessage());
            throw new IOException("Error calling Gemini API: " + e.getMessage(), e);
        }
    }

    @Override
    public List<SourceArticle> sourceAll() throws IOException {
        return getSourceArticles();
    }

    /**
     * Parse a JSON node into a SourceArticle object
     *
     * @param node the JSON node to parse
     * @return the parsed SourceArticle object, or null if parsing fails
     */
    private SourceArticle parseSourceArticle(JsonNode node) {
        try {
            String title = node.has("title") ? node.get("title").asText() : "Untitled Article";
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

            String author = node.has("author") ? node.get("author").asText() : "Unknown Author";
            String content = node.has("content") ? node.get("content").asText() : "";

            // Parse or generate engagement metrics
            Integer shareCount = node.has("shareCount") ? node.get("shareCount").asInt() : new Random().nextInt(500);
            Integer commentCount = node.has("commentCount") ? node.get("commentCount").asInt() : new Random().nextInt(200);

            // Parse or generate hashtags
            List<String> hashtags = new ArrayList<>();
            if (node.has("hashtags") && node.get("hashtags").isArray()) {
                for (JsonNode hashtagNode : node.get("hashtags")) {
                    hashtags.add(hashtagNode.asText());
                }
            } else {
                // Generate some default hashtags
                hashtags.add("#" + platform);
                if (content.length() > 10) {
                    String[] words = content.substring(0, 10).split("\\s+");
                    if (words.length > 0) {
                        hashtags.add("#" + words[0].replaceAll("[^a-zA-Z0-9]", ""));
                    }
                }
            }

            // Parse or generate additional data
            Map<String, Object> additionalData = new HashMap<>();
            if (node.has("additionalData") && node.get("additionalData").isObject()) {
                JsonNode additionalDataNode = node.get("additionalData");
                additionalDataNode.fieldNames().forEachRemaining(field -> {
                    JsonNode valueNode = additionalDataNode.get(field);
                    if (valueNode.isTextual()) {
                        additionalData.put(field, valueNode.asText());
                    } else if (valueNode.isNumber()) {
                        additionalData.put(field, valueNode.asInt());
                    } else if (valueNode.isBoolean()) {
                        additionalData.put(field, valueNode.asBoolean());
                    }
                });
            } else {
                // Add some default additional data
                additionalData.put("source", "Gemini");
                additionalData.put("generatedAt", LocalDateTime.now().toString());
            }

            // Create a new SourceArticle with the extracted properties
            return new SourceArticle(
                    title,
                    url,
                    platform,
                    "2025-01-01T00:00:00",
                    author,
                    content,
                    shareCount,
                    commentCount,
                    hashtags,
                    additionalData
            );
        } catch (Exception e) {
            logger.warning("Failed to parse source article: " + e.getMessage());
            return null;
        }
    }

    /**
     * Process source articles based on task type
     *
     * @param taskType       the type of task
     * @param sourceArticles the list of source articles to process
     * @return the processed list of source articles
     */


    /**
     * Get source articles using a custom prompt
     *
     * @param prompt the custom prompt for source article generation
     * @return list of source articles
     * @throws IOException if there's an error in the API call
     */
    public List<SourceArticle> getSourceArticlesWithCustomPrompt(String prompt) throws IOException {
        logger.info("Getting source articles with custom prompt: " + prompt);

        // Configure GoogleSearch tool


        // Create content with system and user messages
        List<Part> systemParts = new ArrayList<>();
        systemParts.add(new Part("Format your response as a JSON array of objects, with each object representing a source article. Each article should have 'title', 'url', 'platform', 'timestamp', 'author', and 'content' fields. Base all information on recent data using live Google Search."));

        List<Part> userParts = new ArrayList<>();
        userParts.add(new Part(prompt));

        List<Content> contents = new ArrayList<>();
        contents.add(new Content("user", systemParts));
        contents.add(new Content("user", userParts));
        List<Map<String, Object>> tools = new ArrayList<>();
        tools.add(Map.of("googleSearch", new HashMap<>()));
        // Create the request
        GeminiRequest request = new GeminiRequest(
                contents,
                tools,
                "projects/" + projectId + "/locations/" + location + "/publishers/google/models/" + geminiModel
        );

        try {
            // Log request details
            String url = getGeminiApiUrl();
            HttpHeaders headers = createHeaders();
            logRequestDetails(url, headers, request);

            // Make the API call
            HttpEntity<GeminiRequest> entity = new HttpEntity<>(request, headers);
            ResponseEntity<GeminiResponse> response = restTemplate.postForEntity(
                    url,
                    entity,
                    GeminiResponse.class
            );

            GeminiResponse geminiResponse = response.getBody();
            if (geminiResponse == null || geminiResponse.getCandidates() == null || geminiResponse.getCandidates().isEmpty()) {
                logger.warning("No candidates returned from Gemini.");
                return List.of();
            }

            Candidate candidate = geminiResponse.getCandidates().get(0);
            if (candidate.getContent() == null || candidate.getContent().getParts() == null || candidate.getContent().getParts().isEmpty()) {
                logger.warning("No content parts returned from Gemini candidate.");
                return List.of();
            }

            String generatedContent = candidate.getContent().getParts().get(0).getText();

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
                    // For custom prompts, we don't apply any specific processing
                    return sourceArticles;
                } else {
                    logger.warning("No source articles found in Gemini API response for custom prompt");
                    throw new IOException("No source articles found in Gemini API response for custom prompt");
                }
            } catch (Exception e) {
                logger.severe("Failed to parse Gemini API response for custom prompt: " + e.getMessage());
                throw new IOException("Failed to parse Gemini API response for custom prompt: " + e.getMessage(), e);
            }
        } catch (Exception e) {
            logger.severe("Gemini API Error for custom prompt: " + e.getMessage());
            throw new IOException("Error getting source articles with Gemini for custom prompt: " + e.getMessage(), e);
        }
    }

    /**
     * Generate investigative journalism content using Gemini API with GoogleSearch tool
     *
     * @param topic the topic to research
     * @return the generated investigative journalism article
     * @throws IOException if there's an error in the API call
     */
    public String investigativeJournalism(String topic) throws IOException {
        logger.info("Generating investigative journalism on topic: " + topic);

        // Configure GoogleSearch tool


        // Create content with system and user messages
        List<Part> systemParts = new ArrayList<>();
        systemParts.add(new Part("You are an investigative journalist researching important topics. Create a detailed investigative report that uncovers facts, presents evidence, and provides insights on the given topic. Structure your report with a compelling headline, introduction, key findings, and conclusion. Focus on accuracy, depth, and journalistic integrity. Base all information on recent data using live Google Search."));

        List<Part> userParts = new ArrayList<>();
        userParts.add(new Part("Research and write an investigative journalism article about: " + topic));

        List<Content> contents = new ArrayList<>();
        contents.add(new Content("user", systemParts));
        contents.add(new Content("user", userParts));
        List<Map<String, Object>> tools = new ArrayList<>();
        tools.add(Map.of("googleSearch", new HashMap<>()));
        // Create the request
        GeminiRequest request = new GeminiRequest(
                contents,
                tools,
                "projects/" + projectId + "/locations/" + location + "/publishers/google/models/" + geminiModel
        );

        try {
            // Log request details
            String url = getGeminiApiUrl();
            HttpHeaders headers = createHeaders();
            logRequestDetails(url, headers, request);

            // Make the API call
            HttpEntity<GeminiRequest> entity = new HttpEntity<>(request, headers);
            ResponseEntity<GeminiResponse> response = restTemplate.postForEntity(
                    url,
                    entity,
                    GeminiResponse.class
            );

            GeminiResponse geminiResponse = response.getBody();
            if (geminiResponse == null || geminiResponse.getCandidates() == null || geminiResponse.getCandidates().isEmpty()) {
                logger.warning("No candidates returned from Gemini.");
                return "";
            }

            Candidate candidate = geminiResponse.getCandidates().get(0);
            if (candidate.getContent() == null || candidate.getContent().getParts() == null || candidate.getContent().getParts().isEmpty()) {
                logger.warning("No content parts returned from Gemini candidate.");
                return "";
            }

            return candidate.getContent().getParts().get(0).getText();
        } catch (Exception e) {
            logger.severe("Gemini API Error: " + e.getMessage());
            throw new IOException("Error generating investigative journalism with Gemini: " + e.getMessage(), e);
        }
    }
}