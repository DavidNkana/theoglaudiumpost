package com.laudiumbiz.Laudiumbiz.Models;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Model representing a source article from social media platforms
 * Used for returning results from AI source-article queries
 */
public class SourceArticle {
    private Integer id; // DB id when persisted
    private String title;
    private String url;
    private String platform;
    private String timestamp;
    private String author;
    private String summary;
    private String slug;
    private String type;
    private Integer shareCount;
    private Integer commentCount;
    private List<String> hashtags;
    private Map<String, Object> additionalData;

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public SourceArticle() {
    }

    public SourceArticle(String title, String url, String platform, String timestamp, String author,
                         String summary, Integer shareCount, Integer commentCount,
                         List<String> hashtags, Map<String, Object> additionalData) {
        this.title = title;
        this.url = url;
        this.platform = platform;
        this.timestamp = timestamp;
        this.author = author;
        this.summary = summary;
        this.shareCount = shareCount;
        this.commentCount = commentCount;
        this.hashtags = hashtags;
        this.additionalData = additionalData;
    }

    // Getters and Setters
    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
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

    public String getPlatform() {
        return platform;
    }

    public void setPlatform(String platform) {
        this.platform = platform;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public String getContent() {
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

    public Integer getShareCount() {
        return shareCount;
    }

    public void setShareCount(Integer shareCount) {
        this.shareCount = shareCount;
    }

    public Integer getCommentCount() {
        return commentCount;
    }

    public void setCommentCount(Integer commentCount) {
        this.commentCount = commentCount;
    }

    public List<String> getHashtags() {
        return hashtags;
    }

    public void setHashtags(List<String> hashtags) {
        this.hashtags = hashtags;
    }

    public Map<String, Object> getAdditionalData() {
        return additionalData;
    }

    public void setAdditionalData(Map<String, Object> additionalData) {
        this.additionalData = additionalData;
    }

    /**
     * Calculate the total engagement (shares + comments)
     * @return total engagement count
     */
    public Integer getTotalEngagement() {
        int shares = (shareCount != null) ? shareCount : 0;
        int comments = (commentCount != null) ? commentCount : 0;
        return shares + comments;
    }
}