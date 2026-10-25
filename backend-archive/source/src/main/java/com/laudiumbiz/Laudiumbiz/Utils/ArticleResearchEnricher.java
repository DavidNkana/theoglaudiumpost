package com.laudiumbiz.Laudiumbiz.Utils;

import com.laudiumbiz.Laudiumbiz.Models.DTO.TavilySearchResult;
import com.laudiumbiz.Laudiumbiz.Services.TavilySearchService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;

/**
 * PURPOSE: Adds Tavily research context to AI article prompts under the shared
 * feature flags and fallback rules used by every provider.
 */
@Component
public class ArticleResearchEnricher {

    private final TavilySearchService tavilySearchService;

    @Value("${tavily.enabled:true}")
    private boolean tavilyEnabled;

    @Value("${tavily.deep-search.enabled:false}")
    private boolean deepSearchEnabled;

    @Value("${tavily.fallback.min-results:2}")
    private int fallbackMinResults;

    @Value("${tavily.supplement.enabled:false}")
    private boolean supplementEnabled;

    public ArticleResearchEnricher(TavilySearchService tavilySearchService) {
        this.tavilySearchService = tavilySearchService;
    }

    /**
     * Always attempts Tavily enrichment for providers without native search.
     */
    // @ModifiedByJunie 2026-07-10
    public String enrichForProviderWithoutSearch(String prompt) throws IOException {
        return enrichWhenResultsWeak(prompt, null);
    }

    /**
     * Enriches only when the primary search returned fewer than the configured minimum rows.
     */
    // @ModifiedByJunie 2026-07-10
    public String enrichWhenResultsWeak(String prompt, List<?> primaryResults) throws IOException {
        if (!tavilyEnabled || !tavilySearchService.isConfigured()) {
            return prompt;
        }
        if (primaryResults != null && primaryResults.size() >= fallbackMinResults) {
            return prompt;
        }
        return appendTavilyContext(prompt);
    }

    /**
     * Optionally supplements providers that already have native search tools.
     */
    // @ModifiedByJunie 2026-07-10
    public String enrichWhenSupplementEnabled(String prompt) throws IOException {
        if (!supplementEnabled || !tavilyEnabled || !tavilySearchService.isConfigured()) {
            return prompt;
        }
        return appendTavilyContext(prompt);
    }

    private String appendTavilyContext(String prompt) throws IOException {
        List<TavilySearchResult> results = tavilySearchService.search(prompt, deepSearchEnabled);
        if (results.isEmpty()) {
            return prompt;
        }
        StringBuilder block = new StringBuilder(prompt.length() + 512);
        block.append(prompt);
        block.append("\n\n--- Supplemental web research (Tavily");
        if (deepSearchEnabled) {
            block.append(", deep search");
        }
        block.append(") ---\n");
        for (TavilySearchResult result : results) {
            block.append("- ")
                    .append(result.getTitle() != null ? result.getTitle() : "")
                    .append(" (")
                    .append(result.getUrl())
                    .append("): ")
                    .append(result.getContent() != null ? result.getContent() : "")
                    .append("\n");
        }
        block.append("Use these URLs in the sources array where relevant.\n");
        return block.toString();
    }
}
