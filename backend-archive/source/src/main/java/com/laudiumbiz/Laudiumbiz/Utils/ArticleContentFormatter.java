package com.laudiumbiz.Laudiumbiz.Utils;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * PURPOSE: Normalizes AI-generated article text into the paragraph HTML expected
 * by the frontend article renderer and removes inline numeric citation markers.
 */
public final class ArticleContentFormatter {

    /** Prompt fragment shared across AI services. */
    public static final String HTML_PARAGRAPH_RULES =
            "The article body must be HTML with ONE separate <p>...</p> block per paragraph "
                    + "(use a blank line between paragraphs in plain text). "
                    + "Never wrap the entire article in a single <p> tag. "
                    + "Do not use inline numeric citations such as [1], [3, 4], or [5][7] in the article text - "
                    + "list source URLs only in the sources JSON array.";

    private static final Pattern NUMERIC_CITATION = Pattern.compile(
            "(?:\\[\\s*\\d+(?:\\s*,\\s*\\d+)*\\s*\\])+"
    );

    private static final Pattern PARAGRAPH_TAG = Pattern.compile("(?is)<p[^>]*>(.*?)</p>");

    private ArticleContentFormatter() {
    }

    /**
     * Strips numeric citations, splits real paragraphs, applies basic inline Markdown,
     * and wraps each block in its own {@code <p>} element.
     */
    // @ModifiedByJunie 2026-07-10
    public static String normalizeArticleBody(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        String cleaned = stripNumericCitations(text.trim());
        List<String> paragraphs = extractParagraphs(cleaned);
        List<String> withInlineHtml = applyInlineMarkdown(paragraphs);
        return wrapParagraphs(withInlineHtml);
    }

    private static String stripNumericCitations(String text) {
        return NUMERIC_CITATION.matcher(text).replaceAll("").replaceAll("  +", " ").trim();
    }

    private static List<String> extractParagraphs(String text) {
        Matcher matcher = PARAGRAPH_TAG.matcher(text);
        List<String> found = new ArrayList<>();
        while (matcher.find()) {
            String inner = matcher.group(1).trim();
            if (!inner.isEmpty()) {
                found.add(inner);
            }
        }
        if (!found.isEmpty()) {
            List<String> expanded = new ArrayList<>();
            for (String paragraph : found) {
                if (paragraph.contains("\n\n") || paragraph.contains("\r\n\r\n")) {
                    expanded.addAll(splitOnBlankLines(paragraph));
                } else {
                    expanded.add(paragraph);
                }
            }
            return expanded;
        }
        return splitOnBlankLines(text);
    }

    private static List<String> splitOnBlankLines(String text) {
        String plain = text.replaceAll("(?is)</?p[^>]*>", "").trim();
        String[] blocks = plain.split("(?:\\r?\\n){2,}");
        if (blocks.length == 1 && plain.contains("\n")) {
            blocks = plain.split("\\r?\\n");
        }
        List<String> result = new ArrayList<>();
        for (String block : blocks) {
            String trimmed = block.trim();
            if (!trimmed.isEmpty()) {
                result.add(trimmed);
            }
        }
        return result;
    }

    private static List<String> applyInlineMarkdown(List<String> paragraphs) {
        List<String> converted = new ArrayList<>();
        for (String paragraph : paragraphs) {
            String html = paragraph;
            html = html.replaceAll(
                    "\\[([^\\]]+)\\]\\(([^\\)]+)\\)",
                    "<a href=\"$2\" target=\"_blank\" rel=\"noopener\">$1</a>"
            );
            html = html.replaceAll("\\*\\*([^*]+)\\*\\*", "<strong>$1</strong>");
            html = html.replaceAll("(?<!\\*)\\*([^*]+)\\*(?!\\*)", "<em>$1</em>");
            converted.add(html);
        }
        return converted;
    }

    private static String wrapParagraphs(List<String> paragraphs) {
        StringBuilder html = new StringBuilder();
        for (String paragraph : paragraphs) {
            html.append("<p>").append(paragraph).append("</p>");
        }
        return html.toString();
    }
}
