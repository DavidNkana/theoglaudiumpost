package com.laudiumbiz.Laudiumbiz.Services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.laudiumbiz.Laudiumbiz.Models.DTO.TavilySearchResult;
import com.laudiumbiz.Laudiumbiz.Models.SourceArticle;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

/**
 * PURPOSE: Single HTTP boundary for Tavily web research used when AI providers need better source material.
 *
 * KEY METHODS:
 * - search(String query, boolean deepSearch): POST /search with basic or advanced depth
 * - mergeDeepSearchResults(List<SourceArticle> existing, String query): runs Tavily deep search and appends results to the provider's list
 * - isConfigured(): whether an API key is present
 *
 * INTEGRATIONS: Tavily Search API (https://api.tavily.com/search)
 */
@Service
public class TavilySearchService {

    private static final Logger logger = Logger.getLogger(TavilySearchService.class.getName());

    @Value("${tavily.api.key:}")
    private String tavilyApiKey;

    @Value("${tavily.api.url:https://api.tavily.com/search}")
    private String tavilyApiUrl;

    @Value("${tavily.max-results:8}")
    private int maxResults;

    @Value("${tavily.topic:news}")
    private String topic;

    @Value("${tavily.country:south africa}")
    private String country;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * @return true when a Tavily API key is configured
     */
    public boolean isConfigured() {
        return tavilyApiKey != null && !tavilyApiKey.isBlank();
    }

    /**
     * Execute a Tavily search. {@code deepSearch=true} uses {@code search_depth=advanced}; otherwise {@code basic}.
     *
     * @param query      research query derived from the article prompt
     * @param deepSearch when true, run Tavily advanced (deep) search
     * @return parsed result rows; empty when Tavily is not configured
     * @throws IOException when Tavily returns a non-success HTTP status or malformed payload
     */
    public List<TavilySearchResult> search(String query, boolean deepSearch) throws IOException {
        if (!isConfigured()) {
            return List.of();
        }
        if (query == null || query.isBlank()) {
            throw new IOException("Tavily search query is required");
        }

        Map<String, Object> body = new HashMap<>();
        body.put("api_key", tavilyApiKey);
        body.put("query", query.trim());
        body.put("search_depth", deepSearch ? "advanced" : "basic");
        body.put("topic", topic);
        body.put("max_results", maxResults);
        body.put("include_answer", false);
        if (country != null && !country.isBlank()) {
            body.put("country", country);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        logger.info("Tavily search depth=" + (deepSearch ? "advanced" : "basic") + ", queryLength=" + query.length());

        ResponseEntity<String> response = restTemplate.postForEntity(tavilyApiUrl, entity, String.class);
        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new IOException("Tavily search failed: HTTP " + response.getStatusCode());
        }

        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode results = root.path("results");
        if (!results.isArray() || results.isEmpty()) {
            return List.of();
        }

        List<TavilySearchResult> parsed = new ArrayList<>();
        for (JsonNode row : results) {
            String title = row.path("title").asText("");
            String url = row.path("url").asText("");
            String content = row.path("content").asText("");
            if (url.isBlank()) {
                continue;
            }
            parsed.add(new TavilySearchResult(title, url, content, row.path("score").asDouble(0.0)));
        }
        return parsed;
    }

    /**
     * Run Tavily deep search and append the results to an existing list of provider source articles.
     * Each Tavily result is mapped to a {@link SourceArticle} with {@code platform="tavily"} and
     * {@code type="deep_search"} so the frontend can render the merged list with provider results first
     * and Tavily results appended after.
     *
     * @param existing provider results to preserve (order preserved; may be empty but never null in practice)
     * @param query    research query to send to Tavily advanced search
     * @return merged list with Tavily results appended after the provider results
     * @throws IOException when Tavily returns a non-success HTTP status or malformed payload
     */
    // @ModifiedByJunie 2026-07-08
    public List<SourceArticle> mergeDeepSearchResults(List<SourceArticle> existing, String query) throws IOException {
        List<SourceArticle> base = existing != null ? existing : new ArrayList<>();
        List<TavilySearchResult> tavilyResults = search(query, true);
        if (tavilyResults == null || tavilyResults.isEmpty()) {
            return base;
        }
        List<SourceArticle> merged = new ArrayList<>(base);
        String timestamp = LocalDateTime.now().toString();
        for (TavilySearchResult tr : tavilyResults) {
            SourceArticle article = new SourceArticle();
            article.setTitle(tr.getTitle());
            article.setUrl(tr.getUrl());
            article.setSummary(tr.getContent());
            article.setPlatform("tavily");
            article.setType("deep_search");
            article.setTimestamp(timestamp);
            merged.add(article);
        }
        return merged;
    }
}