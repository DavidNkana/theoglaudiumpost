package com.laudiumbiz.Laudiumbiz.Services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.laudiumbiz.Laudiumbiz.Models.ArticleGenerated;
import com.laudiumbiz.Laudiumbiz.Models.SourceArticle;
import com.laudiumbiz.Laudiumbiz.Utils.ArticleResearchEnricher;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.*;
import java.util.logging.Logger;

/**
 * PURPOSE: Provides web search capabilities using MiniMax AI Coding Plan MCP and routes
 * results through the MiniMax M3 chat model for reasoning. Implements NewsAIService
 * for both article generation and M3-filtered source retrieval.
 *
 * KEY METHODS:
 * - searchWeb(String query): Shared web-search tool returning structured SearchResult DTOs
 * - generateArticle(String prompt): Uses searchWeb + M3 to build ArticleGenerated with source URLs/snippets
 * - sourceAll(): Uses searchWeb + M3 source-filter to return only current, relevant SourceArticle objects
 *   (platform="minimax", type="web_search"). Raw search results are NOT surfaced directly.
 * - filterSourcesWithM3(String context): Private helper that calls /v1/text/chatcompletion_v2 with
 *   a news-editor prompt, returning JSON array [{title,url,summary,timestamp}].
 * - parseFilteredSourcesJson(String filterJson): Private helper that parses M3 JSON into SourceArticle list.
 *
 * INTEGRATIONS: MiniMax Coding Plan MCP API (${minimax.host}/v1/coding_plan/search) for web search,
 * plus the MiniMax M3 chat model (${minimax.host}/v1/text/chatcompletion_v2, reasoning controlled by
 * ${minimax.thinking}) for grounded article generation AND for source-article recency/relevance filtering.
 * Official endpoint: POST /v1/coding_plan/search with JSON body { "q": query }
 * Official response: { "organic": [{ "title", "link", "snippet", "date?" }], "related_searches": [...], "base_resp": {...} }
 *
 * @author Sacha
 */
@Service("miniMaxWebSearchService")
public class MiniMaxWebSearchService implements NewsAIService {

    private static final Logger logger = Logger.getLogger(MiniMaxWebSearchService.class.getName());

    @Value("${minimax.api.key}")
    private String minimaxApiKey;

    @Value("${minimax.host:https://api.minimax.io}")
    private String minimaxHost;

    @Value("${minimax.model:MiniMax-M3}")
    private String minimaxModel;

    @Value("${minimax.thinking:adaptive}")
    private String minimaxThinking;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();
    private final ArticleResearchEnricher articleResearchEnricher;

    public MiniMaxWebSearchService(ArticleResearchEnricher articleResearchEnricher) {
        this.articleResearchEnricher = articleResearchEnricher;
    }

    /**
     * Resolves the MiniMax M3 thinking mode accepted by chatcompletion_v2.
     * The legacy local value {@code enabled} maps to the current {@code adaptive}
     * mode; any other unsupported value fails before an external request is made.
     */
    // @ModifiedByJunie 2026-07-10
    String resolveThinkingType() throws IOException {
        String configured = minimaxThinking == null ? "" : minimaxThinking.trim().toLowerCase(java.util.Locale.ROOT);
        return switch (configured) {
            case "adaptive", "disabled" -> configured;
            case "enabled" -> "adaptive";
            default -> throw new IOException(
                    "Invalid MiniMax thinking type: expected adaptive or disabled"
            );
        };
    }

    /**
     * Nested DTO for structured web search results.
     * Parsed from MiniMax Coding Plan MCP official response shape.
     */
    public static class SearchResult {
        private String title;
        private String url;
        private String snippet;
        private String source;
        private String date;

        public SearchResult() {}

        public SearchResult(String title, String url, String snippet, String source, String date) {
            this.title = title;
            this.url = url;
            this.snippet = snippet;
            this.source = source;
            this.date = date;
        }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
        public String getSnippet() { return snippet; }
        public void setSnippet(String snippet) { this.snippet = snippet; }
        public String getSource() { return source; }
        public void setSource(String source) { this.source = source; }
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
    }

    /**
     * Generate a URL-friendly slug from the title
     */
    private String generateSlug(String title) {
        if (title == null || title.isEmpty()) {
            return "generated-article";
        }
        String slug = title.toLowerCase();
        slug = slug.replaceAll("\\s+", "-");
        slug = slug.replaceAll("[^a-z0-9-]", "");
        slug = slug.replaceAll("-+", "-");
        slug = slug.replaceAll("^-|-$", "");
        return slug;
    }

    /**
     * Shared web-search tool: searches the web for the given query.
     * Uses official MiniMax Coding Plan MCP endpoint: POST /v1/coding_plan/search
     * with JSON body { "q": query }.
     *
     * Official response shape:
     * {
     *   "organic": [{ "title", "link", "snippet", "date?" }],
     *   "related_searches": [...],
     *   "base_resp": { "status_code": 0, ... }
     * }
     *
     * @param query the search query string
     * @return list of SearchResult objects
     * @throws IOException on network errors or API errors
     */
    public List<SearchResult> searchWeb(String query) throws IOException {
        String url = minimaxHost + "/v1/coding_plan/search";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + minimaxApiKey);
        headers.set("MM-API-Source", "Minimax-MCP");

        // Official MiniMax Coding Plan MCP request body: { "q": query }
        Map<String, String> requestBody = new HashMap<>();
        requestBody.put("q", query);

        logger.info("MiniMax web search initiated, endpoint: " + url);

        try {
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            logger.info("MiniMax web search response status: " + response.getStatusCode());

            String rawResponse = response.getBody();
            if (rawResponse == null || rawResponse.isBlank()) {
                throw new IOException("Empty response from MiniMax web search API");
            }

            JsonNode root = objectMapper.readTree(rawResponse);

            // Check for base_resp error status
            JsonNode baseResp = root.path("base_resp");
            if (baseResp.has("status_code")) {
                int statusCode = baseResp.get("status_code").asInt();
                if (statusCode != 0) {
                    String errorMsg = baseResp.has("status_msg") ? baseResp.get("status_msg").asText() : "Unknown error";
                    logger.severe("MiniMax API error: status_code=" + statusCode + ", msg=" + errorMsg);
                    throw new IOException("MiniMax API error: " + errorMsg);
                }
            }

            List<SearchResult> results = new ArrayList<>();

            // Parse official response: organic[] array
            JsonNode organicNode = root.path("organic");
            if (organicNode.isArray()) {
                for (JsonNode item : organicNode) {
                    String title = item.has("title") && !item.get("title").isNull() ? item.get("title").asText() : "";
                    String link = item.has("link") && !item.get("link").isNull() ? item.get("link").asText() : "";
                    String snippet = item.has("snippet") && !item.get("snippet").isNull() ? item.get("snippet").asText() : "";
                    String date = item.has("date") && !item.get("date").isNull() ? item.get("date").asText() : null;

                    if (!title.isEmpty() || !link.isEmpty()) {
                        results.add(new SearchResult(title, link, snippet, null, date));
                    }
                }
            }

            // Preserve related searches for potential future use
            JsonNode relatedSearches = root.path("related_searches");
            if (relatedSearches.isArray() && !relatedSearches.isEmpty()) {
                logger.info("MiniMax web search found " + relatedSearches.size() + " related searches");
            }

            logger.info("MiniMax web search extracted " + results.size() + " results");
            return results;

        } catch (IOException e) {
            logger.severe("MiniMax web search error: " + e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.severe("MiniMax web search error: " + e.getMessage());
            throw new IOException("Error performing MiniMax web search: " + e.getMessage(), e);
        }
    }

    /**
     * Generate an article with the MiniMax M3 model (reasoning/thinking controlled by
     * {@code minimax.thinking}), grounded by live web-search results. Any failure in the
     * web search or the M3 generation call propagates as an IOException — fail fast, no fallback.
     *
     * @param prompt the article topic/guidance
     * @return structured ArticleGenerated with title, article, summary, slug, sources
     * @throws IOException on search or generation errors
     */
    @Override
    public ArticleGenerated generateArticle(String prompt) throws IOException {
        logger.info("Generating article with MiniMax " + minimaxModel + " (thinking=" + minimaxThinking + ")");

        // 1) Ground the article with live web-search results.
        List<SearchResult> searchResults = searchWeb(prompt);
        prompt = articleResearchEnricher.enrichWhenResultsWeak(prompt, searchResults);

        // 2) Collect candidate source URLs and a context block for the model.
        List<String> sourceUrls = new ArrayList<>();
        StringBuilder context = new StringBuilder();
        for (SearchResult result : searchResults) {
            if (result.getUrl() != null && !result.getUrl().isEmpty()) {
                sourceUrls.add(result.getUrl());
            }
            context.append("- ")
                    .append(result.getTitle() != null ? result.getTitle() : "")
                    .append(" (").append(result.getUrl() != null ? result.getUrl() : "").append("): ")
                    .append(result.getSnippet() != null ? result.getSnippet() : "")
                    .append("\n");
        }

        // 3) Have MiniMax M3 write the grounded article. Any failure propagates loudly.
        return generateWithThinking(prompt, context.toString(), sourceUrls);
    }

    /**
     * Call the MiniMax M3 chat-completions endpoint (/v1/text/chatcompletion_v2) with
     * reasoning/thinking controlled by {@code minimax.thinking}, asking the model to
     * write a grounded article as strict JSON, and parse it into an ArticleGenerated.
     */
    private ArticleGenerated generateWithThinking(String prompt, String context, List<String> sourceUrls) throws IOException {
        String url = minimaxHost + "/v1/text/chatcompletion_v2";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + minimaxApiKey);

        String systemPrompt = "You are a professional local journalist for the Laudium Biz App, writing for the Muslim "
                + "community of Laudium and surrounding areas. Write a comprehensive, factual article (300-700 words) "
                + "grounded ONLY in the supplied sources. Output JSON ONLY in the exact shape "
                + "{\"title\":\"\",\"article\":\"\",\"summary\":\"\",\"slug\":\"\",\"sources\":[]}: "
                + com.laudiumbiz.Laudiumbiz.Utils.ArticleContentFormatter.HTML_PARAGRAPH_RULES + " "
                + "(2) sources must be 2-5 of the provided HTTPS URLs; "
                + "(3) slug must be kebab-case derived from the title; (4) keep a neutral, factual tone.";

        String userPrompt = "Topic: " + prompt + "\n\nUse these web search results as your sources:\n" + context;

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", minimaxModel);
        requestBody.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
        ));
        String thinkingType = resolveThinkingType();
        requestBody.put("thinking", Map.of("type", thinkingType));

        logger.info("MiniMax generate via " + minimaxModel + " (thinking=" + thinkingType + "), endpoint: " + url);

        String content;
        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            String raw = response.getBody();
            if (raw == null || raw.isBlank()) {
                throw new IOException("Empty response from MiniMax chat-completions API");
            }
            JsonNode root = objectMapper.readTree(raw);

            JsonNode baseResp = root.path("base_resp");
            if (baseResp.has("status_code") && baseResp.get("status_code").asInt() != 0) {
                String msg = baseResp.has("status_msg") ? baseResp.get("status_msg").asText() : "Unknown error";
                throw new IOException("MiniMax API error: " + msg);
            }

            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.isEmpty()) {
                throw new IOException("MiniMax returned no choices");
            }
            content = choices.get(0).path("message").path("content").asText("");
        } catch (IOException e) {
            throw e;
        } catch (Exception e) {
            throw new IOException("Error calling MiniMax chat-completions: " + e.getMessage(), e);
        }

        // Strip any reasoning <think> blocks and code fences, then parse the JSON article.
        String cleaned = content
                .replaceAll("(?s)<think>.*?</think>", "")
                .replace("```json", "")
                .replace("```", "")
                .trim();

        ArticleGenerated generated = Utils.getGson().fromJson(cleaned, ArticleGenerated.class);
        if (generated == null || generated.getTitle() == null || generated.getTitle().isBlank()) {
            throw new IOException("MiniMax M3 returned no usable article JSON");
        }
        generated.setArticle(generated.getArticle());
        generated.setSlug(generateSlug(generated.getTitle()));
        if ((generated.getSources() == null || generated.getSources().length == 0) && !sourceUrls.isEmpty()) {
            generated.setSources(sourceUrls.toArray(new String[0]));
        }
        return generated;
    }

    /**
     * Retrieve source articles from MiniMax web search, filtered through the M3 chat
     * model for recency and relevance. Raw {@link #searchWeb(String)} results include
     * stale content (old YouTube videos, Wikipedia pages, generic listings); routing
     * them through {@code filterSourcesWithM3} produces a current, locally-relevant
     * article set tagged {@code platform="minimax"}, {@code type="web_search"}.
     *
     * <p>Flow:
     * <ol>
     *   <li>{@code searchWeb("Laudium South Africa community news")} — raw SearchResult list.</li>
     *   <li>Build a context block from raw results (title, url, snippet, date).</li>
     *   <li>{@code filterSourcesWithM3(context)} — POST to {@code /v1/text/chatcompletion_v2}
     *       with a news-editor system prompt asking for a JSON array
     *       {@code [{title, url, summary, timestamp}]} containing only current (≤ 6 months),
     *       relevant, non-Wikipedia, non-generic, non-YouTube results.</li>
     *   <li>Parse M3 JSON output into {@link SourceArticle} objects.</li>
     * </ol>
     *
     * @return list of M3-filtered SourceArticle objects (may be empty if M3 filters everything out)
     * @throws IOException on search or M3 call errors, or if M3 returns no usable JSON
     */
    // @ModifiedByJunie 2026-07-08: Route raw searchWeb() results through M3 (/v1/text/chatcompletion_v2)
    //   for recency (≤ 6 months) and Laudium-relevance filtering. M3 returns JSON
    //   [{title,url,summary,timestamp}] which is parsed into SourceArticle with
    //   platform="minimax", type="web_search". Replaces direct mapping that returned
    //   stale Wikipedia / YouTube / generic listings.
    @Override
    public List<SourceArticle> sourceAll() throws IOException {
        logger.info("MiniMax sourceAll() called - performing web search + M3 source filtering");

        try {
            // 1) Raw web search via the official MiniMax Coding Plan MCP endpoint.
            List<SearchResult> searchResults = searchWeb("Laudium South Africa community news");

            if (searchResults.isEmpty()) {
                logger.warning("MiniMax web search returned no results; sourceAll() returning empty list");
                return new ArrayList<>();
            }

            // 2) Build context block for M3 source-filtering prompt.
            StringBuilder context = new StringBuilder();
            for (SearchResult result : searchResults) {
                context.append("- ")
                        .append(result.getTitle() != null ? result.getTitle() : "")
                        .append(" (").append(result.getUrl() != null ? result.getUrl() : "").append("): ")
                        .append(result.getSnippet() != null ? result.getSnippet() : "")
                        .append(result.getDate() != null && !result.getDate().isBlank() ? " [date=" + result.getDate() + "]" : "")
                        .append("\n");
            }

            // 3) M3 filters for recency (≤ 6 months) + relevance to Laudium, returns JSON array.
            String filterJson = filterSourcesWithM3(context.toString());

            // 4) Parse M3 JSON array into SourceArticle objects.
            List<SourceArticle> articles = parseFilteredSourcesJson(filterJson);

            // 5) Assign platform, type, id, and slug if M3 omitted them.
            int id = 1;
            for (SourceArticle article : articles) {
                article.setId(id++);
                article.setPlatform("minimax");
                article.setType("web_search");
                if (article.getSlug() == null || article.getSlug().isBlank()) {
                    article.setSlug(generateSlug(article.getTitle() != null ? article.getTitle() : "source-article"));
                }
            }

            logger.info("MiniMax sourceAll() returning " + articles.size() + " M3-filtered source articles");
            return articles;

        } catch (IOException e) {
            logger.severe("MiniMax sourceAll() error: " + e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.severe("MiniMax sourceAll() error: " + e.getMessage());
            throw new IOException("Error retrieving MiniMax source articles: " + e.getMessage(), e);
        }
    }

    /**
     * Call MiniMax M3 chat-completions to filter raw search results for recency and
     * relevance to the Laudium community. Returns the model's raw JSON array text
     * (shape {@code [{"title":"","url":"","summary":"","timestamp":"YYYY-MM-DD or null"}]})
     * with reasoning blocks and code fences stripped.
     *
     * @param context the formatted raw search-result block
     * @return raw JSON array string returned by M3
     * @throws IOException on API errors or if M3 returns no usable content
     */
    private String filterSourcesWithM3(String context) throws IOException {
        String url = minimaxHost + "/v1/text/chatcompletion_v2";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + minimaxApiKey);

        String systemPrompt = "You are a news editor for the Laudium community in South Africa "
                + "(a suburb of Centurion/Pretoria with a large Muslim community). "
                + "From the provided web search results, return ONLY current, relevant articles. "
                + "STRICT EXCLUSIONS: outdated content older than 6 months, Wikipedia pages, "
                + "generic informational pages, YouTube videos without a clear news angle, "
                + "social-media posts that are not articles. "
                + "Output a JSON array ONLY in the exact shape: "
                + "[{\"title\":\"\",\"url\":\"\",\"summary\":\"\",\"timestamp\":\"YYYY-MM-DD or null\"}]. "
                + "Preserve the URLs exactly as provided - do not invent or modify URLs. "
                + "Keep summaries to 1-2 sentences. If nothing meets the criteria, return [].";

        String userPrompt = "Filter these raw web search results for current Laudium community news:\n" + context;

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", minimaxModel);
        requestBody.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
        ));
        String thinkingType = resolveThinkingType();
        requestBody.put("thinking", Map.of("type", thinkingType));

        logger.info("MiniMax M3 source-filter via " + minimaxModel + " (thinking=" + thinkingType + "), endpoint: " + url);

        String content;
        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            String raw = response.getBody();
            if (raw == null || raw.isBlank()) {
                throw new IOException("Empty response from MiniMax chat-completions API");
            }
            JsonNode root = objectMapper.readTree(raw);

            JsonNode baseResp = root.path("base_resp");
            if (baseResp.has("status_code") && baseResp.get("status_code").asInt() != 0) {
                String msg = baseResp.has("status_msg") ? baseResp.get("status_msg").asText() : "Unknown error";
                throw new IOException("MiniMax API error: " + msg);
            }

            JsonNode choices = root.path("choices");
            if (!choices.isArray() || choices.isEmpty()) {
                throw new IOException("MiniMax returned no choices");
            }
            content = choices.get(0).path("message").path("content").asText("");
        } catch (IOException e) {
            throw e;
        } catch (Exception e) {
            throw new IOException("Error calling MiniMax chat-completions for source filtering: " + e.getMessage(), e);
        }

        if (content == null || content.isBlank()) {
            throw new IOException("MiniMax M3 returned empty source-filter content");
        }

        // Strip reasoning <think> blocks and markdown code fences before JSON parse.
        return content
                .replaceAll("(?s)<think>.*?</think>", "")
                .replace("```json", "")
                .replace("```", "")
                .trim();
    }

    /**
     * Parse the M3 source-filter JSON array (shape {@code [{title,url,summary,timestamp}]})
     * into a list of {@link SourceArticle}. Entries without a usable URL are dropped
     * (they cannot be surfaced to the admin UI). An empty array is a valid M3 response
     * meaning "nothing matches the recency/relevance criteria" — that is not an error.
     *
     * @param filterJson raw M3 JSON array text
     * @return list of SourceArticle objects; empty list if M3 returned []
     * @throws IOException if the JSON cannot be parsed
     */
    private List<SourceArticle> parseFilteredSourcesJson(String filterJson) throws IOException {
        if (filterJson == null || filterJson.isBlank()) {
            throw new IOException("MiniMax M3 returned empty source-filter JSON");
        }

        SourceArticle[] array;
        try {
            array = Utils.getGson().fromJson(filterJson, SourceArticle[].class);
        } catch (Exception e) {
            throw new IOException("MiniMax M3 returned malformed source-filter JSON: " + e.getMessage(), e);
        }

        if (array == null || array.length == 0) {
            return new ArrayList<>();
        }

        List<SourceArticle> articles = new ArrayList<>();
        for (SourceArticle a : array) {
            if (a == null || a.getUrl() == null || a.getUrl().isBlank()) {
                continue;
            }
            articles.add(a);
        }
        return articles;
    }
}
