package com.laudiumbiz.Laudiumbiz.Models.DTO;

/**
 * DTO for the response of the article generation endpoint.
 * Contains the title, slug, article text, and summary.
 * 
 * @author Junie
 */
public class GeneratedArticleResponse {
    private String title;
    private String slug;
    private String article;
    private String summary;

    public GeneratedArticleResponse() {
    }

    public GeneratedArticleResponse(String title, String slug, String article, String summary) {
        this.title = title;
        this.slug = slug;
        this.article = article;
        this.summary = summary;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getArticle() {
        return article;
    }

    public void setArticle(String article) {
        this.article = article;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }
}