package com.laudiumbiz.Laudiumbiz.Utils;

import com.laudiumbiz.Laudiumbiz.Models.DTO.TavilySearchResult;
import com.laudiumbiz.Laudiumbiz.Services.TavilySearchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** PURPOSE: Verifies shared Tavily prompt-enrichment gates and fallback behavior. */
class ArticleResearchEnricherTest {

    private RecordingTavilySearchService tavilySearchService;
    private ArticleResearchEnricher enricher;

    @BeforeEach
    void setUp() {
        tavilySearchService = new RecordingTavilySearchService();
        enricher = new ArticleResearchEnricher(tavilySearchService);
        ReflectionTestUtils.setField(enricher, "tavilyEnabled", true);
        ReflectionTestUtils.setField(enricher, "deepSearchEnabled", false);
        ReflectionTestUtils.setField(enricher, "fallbackMinResults", 2);
        ReflectionTestUtils.setField(enricher, "supplementEnabled", false);
    }

    @Test
    void enrichForProviderWithoutSearchAppendsTavilyBlock() throws IOException {
        tavilySearchService.nextResults = List.of(
                new TavilySearchResult("Headline", "https://example.com/a", "Snippet", 0.9)
        );

        String result = enricher.enrichForProviderWithoutSearch("crime in Laudium");

        assertTrue(result.contains("Supplemental web research (Tavily)"));
        assertTrue(result.contains("https://example.com/a"));
    }

    @Test
    void enrichWhenResultsWeakSkipsWhenPrimarySearchIsEnough() throws IOException {
        String result = enricher.enrichWhenResultsWeak("topic", List.of("a", "b"));

        assertEquals("topic", result);
        assertEquals(0, tavilySearchService.searchCalls);
    }

    @Test
    void enrichWhenResultsWeakRunsTavilyForSparsePrimaryResults() throws IOException {
        tavilySearchService.nextResults = List.of(
                new TavilySearchResult("X", "https://x.com", "Y", 0.5)
        );

        String result = enricher.enrichWhenResultsWeak("topic", List.of("only-one"));

        assertTrue(result.contains("https://x.com"));
        assertEquals(1, tavilySearchService.searchCalls);
    }

    private static final class RecordingTavilySearchService extends TavilySearchService {
        private int searchCalls;
        private List<TavilySearchResult> nextResults = List.of();

        @Override
        public boolean isConfigured() {
            return true;
        }

        @Override
        public List<TavilySearchResult> search(String query, boolean deepSearch) {
            searchCalls++;
            return nextResults;
        }
    }
}
