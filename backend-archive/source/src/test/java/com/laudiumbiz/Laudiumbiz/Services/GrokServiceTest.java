package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Utils.ArticleResearchEnricher;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** PURPOSE: Verifies xAI Responses API citation extraction for Grok source harvesting. */
class GrokServiceTest {

    private final GrokService service = new GrokService(
            new ArticleResearchEnricher(new TavilySearchService())
    );

    @Test
    void extractsNestedUrlCitationAnnotationsInResponseOrder() throws Exception {
        String response = """
                {
                  "output": [
                    {
                      "type": "message",
                      "content": [
                        {
                          "type": "output_text",
                          "text": "Summary",
                          "annotations": [
                            {"type": "url_citation", "url": "https://example.com/first"},
                            {"type": "other", "url": "https://example.com/ignored"},
                            {"type": "url_citation", "url": "https://example.com/second"},
                            {"type": "url_citation", "url": "https://example.com/first"}
                          ]
                        }
                      ]
                    }
                  ]
                }
                """;

        assertEquals(
                List.of("https://example.com/first", "https://example.com/second"),
                service.extractCitationUrls(response)
        );
    }

    @Test
    void keepsBackwardCompatibilityWithRootLevelCitations() throws Exception {
        String response = """
                {
                  "citations": [
                    "https://example.com/text",
                    {"url": "https://example.com/object"},
                    {"url": "http://example.com/insecure"}
                  ]
                }
                """;

        assertEquals(
                List.of("https://example.com/text", "https://example.com/object"),
                service.extractCitationUrls(response)
        );
    }
}
