package com.laudiumbiz.Laudiumbiz.Controllers.ai;

import com.laudiumbiz.Laudiumbiz.Models.DTO.*;
import com.laudiumbiz.Laudiumbiz.Services.MiniMaxWebSearchService;
import com.laudiumbiz.Laudiumbiz.Services.NewsAIService;
import com.laudiumbiz.Laudiumbiz.Services.TavilySearchService;
import com.laudiumbiz.Laudiumbiz.Utils.ErrorHandlig;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * MiniMax AI controller for /api/v1/minimax endpoints.
 * Provides web-search-based article generation and source article retrieval
 * using the MiniMax AI Coding Plan MCP.
 *
 * Endpoints:
 * - GET  /sourceArticles/all?deepSearch=true - Returns MiniMax source articles, optionally merged with Tavily deep-search results
 * - POST /generate-article                   - Generates article from prompt via web search
 * - POST /find-sources                       - Finds credible source URLs for an article topic
 * - POST /fact-check                         - Fact-checks an article using web search
 */
@RestController
@RequestMapping("/api/v1/minimax")
@Validated
public class MiniMaxController implements AiController {

    private static final String DEEP_SEARCH_QUERY = "Laudium South Africa community news";

    private final NewsAIService newsAIService;
    private final MiniMaxWebSearchService miniMaxWebSearchService;
    private final ErrorHandlig errorHandler;
    private final TavilySearchService tavilySearchService;

    public MiniMaxController(
            @Qualifier("miniMaxWebSearchService") NewsAIService newsAIService,
            @Qualifier("miniMaxWebSearchService") MiniMaxWebSearchService miniMaxWebSearchService,
            ErrorHandlig errorHandler,
            TavilySearchService tavilySearchService) {
        this.newsAIService = newsAIService;
        this.miniMaxWebSearchService = miniMaxWebSearchService;
        this.errorHandler = errorHandler;
        this.tavilySearchService = tavilySearchService;
    }

    /**
     * Get all source articles from MiniMax web search.
     * Returns a list of web search results mapped to SourceArticle objects.
     * When {@code deepSearch=true}, Tavily advanced search results are appended to the provider list.
     */
    @GetMapping(path = "/sourceArticles/all", produces = MediaType.APPLICATION_JSON_VALUE)
    // @ModifiedByJunie 2026-07-08
    @Override
    public ResponseEntity<?> getAllSourceArticles(
            @RequestParam(defaultValue = "false") boolean deepSearch) {
        try {
            List<com.laudiumbiz.Laudiumbiz.Models.SourceArticle> articles = newsAIService.sourceAll();
            if (deepSearch && tavilySearchService.isConfigured()) {
                articles = tavilySearchService.mergeDeepSearchResults(articles, DEEP_SEARCH_QUERY);
            }
            SourceArticleResponse response = new SourceArticleResponse(articles);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return errorHandler.getError(e);
        }
    }

    /**
     * Generate an article using MiniMax web search.
     * Uses the shared web-search tool to build an article with source URLs.
     */
    @PostMapping(path = "/generate-article", produces = MediaType.APPLICATION_JSON_VALUE)
    @Override
    public ResponseEntity<?> generateArticle(@Valid @RequestBody PromptRequest request) throws IOException {
        try {
            var generated = newsAIService.generateArticle(request.getPrompt());
            return ResponseEntity.ok(generated);
        } catch (Exception e) {
            return errorHandler.getError(e);
        }
    }

    /**
     * Generate an article by SourceArticles ID (not applicable for MiniMax web search).
     * Returns a "not implemented" response as MiniMax uses web search not social scraping.
     */
    @PostMapping(path = "/generate-article/by-id", produces = MediaType.APPLICATION_JSON_VALUE)
    @Override
    public ResponseEntity<?> generateArticleById(@Valid @RequestBody ArticleByIdRequest request) throws IOException {
        Map<String, Object> resp = new HashMap<>();
        resp.put("error", "not_implemented");
        resp.put("message", "MiniMax uses web search - source article ID generation is not applicable. Use /generate-article instead.");
        return ResponseEntity.ok(resp);
    }

    /**
     * Refine an article by source ID (not applicable for MiniMax web search).
     * Returns a "not implemented" response.
     */
    @PostMapping(path = "/refine-article/{sourceId}")
    @Override
    public ResponseEntity<?> refineArticleById(
            @Valid @RequestBody ArticleRefinementRequest request,
            @PathVariable("sourceId") Integer sourceId) {
        Map<String, Object> resp = new HashMap<>();
        resp.put("error", "not_implemented");
        resp.put("message", "MiniMax uses web search - source article refinement is not applicable. Use /generate-article instead.");
        return ResponseEntity.ok(resp);
    }

    /**
     * Generate multiple articles by source IDs (not applicable for MiniMax web search).
     * Returns a "not implemented" response.
     */
    @PostMapping(path = "/generate-articles/bulk", produces = MediaType.APPLICATION_JSON_VALUE)
    @Override
    public ResponseEntity<?> createMultipleArticles(@Valid @RequestBody BulkArticleByIdsRequest request) throws IOException {
        Map<String, Object> resp = new HashMap<>();
        resp.put("error", "not_implemented");
        resp.put("message", "MiniMax uses web search - bulk generation from source IDs is not applicable. Use /generate-article instead.");
        return ResponseEntity.ok(resp);
    }

    /**
     * Find credible source URLs for an article topic using MiniMax web search.
     * Accepts { title, summary, content, debug } from frontend.
     */
    @PostMapping(path = "/find-sources", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> findSources(@RequestBody Map<String, Object> request) {
        try {
            String title = (String) request.get("title");
            Boolean debug = (Boolean) request.getOrDefault("debug", false);
            var results = miniMaxWebSearchService.searchWeb(title != null ? title : "");
            List<Map<String, Object>> sources = new ArrayList<>();
            for (MiniMaxWebSearchService.SearchResult r : results) {
                Map<String, Object> source = new HashMap<>();
                source.put("url", r.getUrl());
                source.put("title", r.getTitle());
                source.put("snippet", r.getSnippet());
                source.put("source", r.getSource() != null ? r.getSource() : "web");
                if (debug) {
                    source.put("date", r.getDate());
                }
                sources.add(source);
            }
            Map<String, Object> resp = new HashMap<>();
            resp.put("sources", sources);
            resp.put("count", sources.size());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return errorHandler.getError(e);
        }
    }

    /**
     * Fact-check an article using MiniMax web search.
     * Accepts { title, summary, content } from frontend.
     */
    @PostMapping(path = "/fact-check", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> factCheck(@RequestBody Map<String, Object> request) {
        try {
            String title = (String) request.get("title");
            String summary = (String) request.get("summary");
            String content = (String) request.get("content");
            String query = (title != null ? title : "") + " " + (summary != null ? summary : "") + " " + (content != null ? content : "");
            var results = miniMaxWebSearchService.searchWeb(query.trim());
            List<Map<String, Object>> sources = new ArrayList<>();
            for (MiniMaxWebSearchService.SearchResult r : results) {
                Map<String, Object> source = new HashMap<>();
                source.put("url", r.getUrl());
                source.put("title", r.getTitle());
                source.put("snippet", r.getSnippet());
                sources.add(source);
            }
            Map<String, Object> resp = new HashMap<>();
            resp.put("factCheck", true);
            resp.put("query", query.trim());
            resp.put("sources", sources);
            resp.put("sourceCount", sources.size());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return errorHandler.getError(e);
        }
    }
}