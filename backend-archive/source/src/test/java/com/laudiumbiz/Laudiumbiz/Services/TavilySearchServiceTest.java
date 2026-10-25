package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Models.DTO.TavilySearchResult;
import com.laudiumbiz.Laudiumbiz.Models.SourceArticle;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** PURPOSE: Verifies Tavily configuration detection and provider-result merging. */
class TavilySearchServiceTest {

    private RecordingTavilySearchService service;

    @BeforeEach
    void setUp() {
        service = new RecordingTavilySearchService();
    }

    @Test
    void isConfiguredTrueWhenApiKeyPresent() {
        ReflectionTestUtils.setField(service, "tavilyApiKey", "tvly-test-key");
        assertTrue(service.isConfigured());
    }

    @Test
    void isConfiguredFalseWhenApiKeyMissing() {
        ReflectionTestUtils.setField(service, "tavilyApiKey", "");
        assertFalse(service.isConfigured());
    }

    @Test
    void mergeDeepSearchResultsPreservesProviderRowsAndTagsTavilyRows() throws Exception {
        SourceArticle providerRow = new SourceArticle();
        providerRow.setTitle("Provider result");
        service.nextResults = List.of(
                new TavilySearchResult("Tavily result", "https://example.com/news", "Summary", 0.9)
        );

        List<SourceArticle> merged = service.mergeDeepSearchResults(List.of(providerRow), "Laudium news");

        assertEquals(2, merged.size());
        assertEquals(providerRow, merged.get(0));
        assertEquals("tavily", merged.get(1).getPlatform());
        assertEquals("deep_search", merged.get(1).getType());
        assertEquals("https://example.com/news", merged.get(1).getUrl());
        assertTrue(service.lastDeepSearch);
    }

    private static final class RecordingTavilySearchService extends TavilySearchService {
        private List<TavilySearchResult> nextResults = List.of();
        private boolean lastDeepSearch;

        @Override
        public List<TavilySearchResult> search(String query, boolean deepSearch) {
            lastDeepSearch = deepSearch;
            return nextResults;
        }
    }
}
