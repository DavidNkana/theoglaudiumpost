package com.laudiumbiz.Laudiumbiz.Models;

/**
 * Represents a generated article with title, content, summary, slug, and sources.
 * Used by GeminiService.generateText to return structured article data.
 */
public class ArticleGenerated {
    private String title;
    private String article;
    private String summary;
    private String slug;
    private String[] sources;

    // Default constructor
    public ArticleGenerated() {
        this.title = "";
        this.article = "";
        this.summary = "";
        this.slug = "";

    }

    // Constructor with all fields
    public ArticleGenerated(String title, String article, String summary, String slug, String[] sources) {
        this.title = title;
        this.article = article;
        this.summary = summary;
        this.slug = slug;
        this.sources = sources;
    }
    
    // Constructor with all fields except sources
    public ArticleGenerated(String title, String article, String summary, String slug) {
        this.title = title;
        this.article = article;
        this.summary = summary;
        this.slug = slug;

    }
    
    // Constructor without slug and sources (for backward compatibility)
    public ArticleGenerated(String title, String article, String summary) {
        this.title = title;
        this.article = article;
        this.summary = summary;

        // Generate slug from title
        if (title != null && !title.isEmpty()) {
            this.slug = title.toLowerCase()
                    .replaceAll("\\s+", "-")
                    .replaceAll("[^a-z0-9-]", "")
                    .replaceAll("-+", "-")
                    .replaceAll("^-|-$", "");
        } else {
            this.slug = "generated-article";
        }
    }

    // Getters and setters
    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
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
    
    public String getSlug() {
        return slug;
    }
    
    public void setSlug(String slug) {
        this.slug = slug;
    }
    
    public String[] getSources() {
        return sources;
    }
    
    public void setSources(String[] sources) {
        this.sources = sources;
    }
}