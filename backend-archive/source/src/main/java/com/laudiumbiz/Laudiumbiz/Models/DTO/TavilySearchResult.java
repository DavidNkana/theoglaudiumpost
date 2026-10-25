package com.laudiumbiz.Laudiumbiz.Models.DTO;

/**
 * PURPOSE: Represents a normalized result row returned by the Tavily search API.
 *
 * <p>Used by TavilySearchService and ArticleResearchEnricher so provider services
 * consume one stable shape instead of the vendor response payload.</p>
 */
public class TavilySearchResult {

    private String title;
    private String url;
    private String content;
    private double score;

    public TavilySearchResult() {
    }

    public TavilySearchResult(String title, String url, String content, double score) {
        this.title = title;
        this.url = url;
        this.content = content;
        this.score = score;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public double getScore() {
        return score;
    }

    public void setScore(double score) {
        this.score = score;
    }
}
