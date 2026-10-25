package com.laudiumbiz.Laudiumbiz.Utils;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** PURPOSE: Verifies AI article bodies are normalized to the paragraph blocks Article.vue expects. */
class ArticleContentFormatterTest {

    @Test
    void splitsSingleParagraphWithBlankLinesIntoMultiplePTags() {
        String input = "<p>First paragraph here.\n\nSecond paragraph here.\n\nThird paragraph here.</p>";
        String result = ArticleContentFormatter.normalizeArticleBody(input);
        assertEquals(
                "<p>First paragraph here.</p><p>Second paragraph here.</p><p>Third paragraph here.</p>",
                result
        );
    }

    @Test
    void stripsNumericCitationsAndChainedMarkers() {
        String input = "Police confirmed the incident [3, 4] late Friday [5][7].\n\nWitnesses spoke out [12].";
        String result = ArticleContentFormatter.normalizeArticleBody(input);
        assertFalse(result.contains("[3"));
        assertFalse(result.contains("[5]"));
        assertFalse(result.contains("[12]"));
        assertTrue(result.contains("<p>Police confirmed the incident late Friday .</p>"));
        assertTrue(result.contains("<p>Witnesses spoke out .</p>"));
    }

    @Test
    void preservesMarkdownLinksWhileStrippingNumericCitations() {
        String input = "Read more at [Reuters](https://reuters.com/article) [2].\n\nAnother line.";
        String result = ArticleContentFormatter.normalizeArticleBody(input);
        assertTrue(result.contains("<a href=\"https://reuters.com/article\""));
        assertFalse(result.contains("[2]"));
    }

    @Test
    void returnsEmptyForBlankInput() {
        assertEquals("", ArticleContentFormatter.normalizeArticleBody(null));
        assertEquals("", ArticleContentFormatter.normalizeArticleBody("   "));
    }
}
