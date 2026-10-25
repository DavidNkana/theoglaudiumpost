package com.minimax.examples.search.enhanced;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Enhanced Search Result with Deep Analysis
 * 
 * Contains comprehensive information about search results including
 * quality scores, extracted content, and analysis metadata.
 * 
 * @author MiniMax Agent
 * @version 2.0.0
 */
public class SearchResult {
    private String title;
    private String url;
    private String snippet;
    private String source;
    private String imageUrl;
    private int index;
    private LocalDateTime timestamp;
    private LocalDateTime publishDate;
    private double qualityScore;
    private String extractedContent;
    private String queryUsed;
    private boolean deepAnalysis;
    private Map<String, Object> metadata;
    private List<String> keyFacts;
    private List<String> relatedTopics;
    private String credibilityAssessment;
    private String biasAssessment;
    private String factualAccuracy;
    private List<String> expertQuotes;
    private Map<String, Object> additionalData;
    
    public SearchResult() {}
    
    public SearchResult(String title, String url, String snippet, String source) {
        this.title = title;
        this.url = url;
        this.snippet = snippet;
        this.source = source;
        this.timestamp = LocalDateTime.now();
        this.qualityScore = 0.5; // Default medium score
    }
    
    // Getters and setters
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    
    public String getSnippet() { return snippet; }
    public void setSnippet(String snippet) { this.snippet = snippet; }
    
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    
    public int getIndex() { return index; }
    public void setIndex(int index) { this.index = index; }
    
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    
    public LocalDateTime getPublishDate() { return publishDate; }
    public void setPublishDate(LocalDateTime publishDate) { this.publishDate = publishDate; }
    
    public double getQualityScore() { return qualityScore; }
    public void setQualityScore(double qualityScore) { this.qualityScore = qualityScore; }
    
    public String getExtractedContent() { return extractedContent; }
    public void setExtractedContent(String extractedContent) { this.extractedContent = extractedContent; }
    
    public String getQueryUsed() { return queryUsed; }
    public void setQueryUsed(String queryUsed) { this.queryUsed = queryUsed; }
    
    public boolean isDeepAnalysis() { return deepAnalysis; }
    public void setDeepAnalysis(boolean deepAnalysis) { this.deepAnalysis = deepAnalysis; }
    
    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
    
    public List<String> getKeyFacts() { return keyFacts; }
    public void setKeyFacts(List<String> keyFacts) { this.keyFacts = keyFacts; }
    
    public List<String> getRelatedTopics() { return relatedTopics; }
    public void setRelatedTopics(List<String> relatedTopics) { this.relatedTopics = relatedTopics; }
    
    public String getCredibilityAssessment() { return credibilityAssessment; }
    public void setCredibilityAssessment(String credibilityAssessment) { this.credibilityAssessment = credibilityAssessment; }
    
    public String getBiasAssessment() { return biasAssessment; }
    public void setBiasAssessment(String biasAssessment) { this.biasAssessment = biasAssessment; }
    
    public String getFactualAccuracy() { return factualAccuracy; }
    public void setFactualAccuracy(String factualAccuracy) { this.factualAccuracy = factualAccuracy; }
    
    public List<String> getExpertQuotes() { return expertQuotes; }
    public void setExpertQuotes(List<String> expertQuotes) { this.expertQuotes = expertQuotes; }
    
    public Map<String, Object> getAdditionalData() { return additionalData; }
    public void setAdditionalData(Map<String, Object> additionalData) { this.additionalData = additionalData; }
    
    /**
     * Get quality score as percentage
     */
    public int getQualityScorePercentage() {
        return (int) (qualityScore * 100);
    }
    
    /**
     * Check if result meets minimum quality threshold
     */
    public boolean meetsQualityThreshold(double threshold) {
        return qualityScore >= threshold;
    }
    
    /**
     * Get summary of key information
     */
    public String getSummary() {
        StringBuilder summary = new StringBuilder();
        summary.append("Title: ").append(title != null ? title : "N/A").append("\n");
        summary.append("Source: ").append(source != null ? source : "N/A").append("\n");
        summary.append("Quality Score: ").append(String.format("%.1f%%", qualityScore * 100)).append("\n");
        
        if (keyFacts != null && !keyFacts.isEmpty()) {
            summary.append("Key Facts: ").append(String.join(", ", keyFacts)).append("\n");
        }
        
        return summary.toString();
    }
    
    @Override
    public String toString() {
        return String.format("SearchResult{title='%s', url='%s', qualityScore=%.2f, source='%s'}", 
                           title, url, qualityScore, source);
    }
    
    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        SearchResult that = (SearchResult) obj;
        return url != null && url.equals(that.url);
    }
    
    @Override
    public int hashCode() {
        return url != null ? url.hashCode() : 0;
    }
}