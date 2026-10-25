package com.minimax.examples.search.laudium;

import java.util.List;

/**
 * Search Query specifically tailored for Laudium community news
 * 
 * Enhanced query class with local context and community relevance indicators.
 * 
 * @author MiniMax Agent
 * @version 2.0.0 - Laudium Community Edition
 */
public class LaudiumSearchQuery {
    private String query;
    private String category;
    private int priority; // 1-5, with 5 being highest
    private int numResults;
    private int cursor;
    private String dataRange;
    private String searchType;
    private String reasoning;
    private List<String> keywords;
    private String language;
    private String region;
    private List<String> excludeTerms;
    private List<String> requiredTerms;
    private String localFocus;
    private String communityRelevance;
    private List<String> targetSources;
    private boolean isEmergencyAlert;
    
    public LaudiumSearchQuery() {}
    
    public LaudiumSearchQuery(String query, String category, int priority) {
        this.query = query;
        this.category = category;
        this.priority = priority;
        this.numResults = 10;
        this.cursor = 1;
        this.dataRange = "y";
        this.searchType = "search";
        this.region = "South Africa";
        this.language = "en";
        this.localFocus = "Laudium, Centurion, Gauteng";
    }
    
    // Getters and setters
    public String getQuery() { return query; }
    public void setQuery(String query) { this.query = query; }
    
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    
    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = Math.max(1, Math.min(5, priority)); }
    
    public int getNumResults() { return numResults; }
    public void setNumResults(int numResults) { this.numResults = numResults; }
    
    public int getCursor() { return cursor; }
    public void setCursor(int cursor) { this.cursor = cursor; }
    
    public String getDataRange() { return dataRange; }
    public void setDataRange(String dataRange) { this.dataRange = dataRange; }
    
    public String getSearchType() { return searchType; }
    public void setSearchType(String searchType) { this.searchType = searchType; }
    
    public String getReasoning() { return reasoning; }
    public void setReasoning(String reasoning) { this.reasoning = reasoning; }
    
    public List<String> getKeywords() { return keywords; }
    public void setKeywords(List<String> keywords) { this.keywords = keywords; }
    
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    
    public List<String> getExcludeTerms() { return excludeTerms; }
    public void setExcludeTerms(List<String> excludeTerms) { this.excludeTerms = excludeTerms; }
    
    public List<String> getRequiredTerms() { return requiredTerms; }
    public void setRequiredTerms(List<String> requiredTerms) { this.requiredTerms = requiredTerms; }
    
    public String getLocalFocus() { return localFocus; }
    public void setLocalFocus(String localFocus) { this.localFocus = localFocus; }
    
    public String getCommunityRelevance() { return communityRelevance; }
    public void setCommunityRelevance(String communityRelevance) { this.communityRelevance = communityRelevance; }
    
    public List<String> getTargetSources() { return targetSources; }
    public void setTargetSources(List<String> targetSources) { this.targetSources = targetSources; }
    
    public boolean isEmergencyAlert() { return isEmergencyAlert; }
    public void setEmergencyAlert(boolean emergencyAlert) { isEmergencyAlert = emergencyAlert; }
    
    /**
     * Get priority as string for display
     */
    public String getPriorityLabel() {
        return switch (priority) {
            case 1 -> "Low";
            case 2 -> "Medium-Low";
            case 3 -> "Medium";
            case 4 -> "High";
            case 5 -> "Critical";
            default -> "Unknown";
        };
    }
    
    /**
     * Check if this is a high-priority query
     */
    public boolean isHighPriority() {
        return priority >= 4;
    }
    
    /**
     * Check if this is a safety/security related query
     */
    public boolean isSafetyRelated() {
        return category != null && (
            category.toLowerCase().contains("safety") ||
            category.toLowerCase().contains("security") ||
            category.toLowerCase().contains("crime") ||
            category.toLowerCase().contains("alert")
        );
    }
    
    /**
     * Get formatted query with Laudium context
     */
    public String getFormattedLaudiumQuery() {
        StringBuilder formatted = new StringBuilder();
        formatted.append(query);
        
        if (localFocus != null && !localFocus.isEmpty()) {
            formatted.append(" [Location: ").append(localFocus).append("]");
        }
        
        if (category != null) {
            formatted.append(" [Category: ").append(category).append("]");
        }
        
        if (priority >= 4) {
            formatted.append(" [Priority: ").append(getPriorityLabel()).append("]");
        }
        
        if (isEmergencyAlert) {
            formatted.append(" [🚨 EMERGENCY ALERT]");
        }
        
        return formatted.toString();
    }
    
    /**
     * Create a refined version of this query for better local targeting
     */
    public LaudiumSearchQuery createRefinedLaudiumQuery(String refinement, String newReasoning) {
        LaudiumSearchQuery refined = new LaudiumSearchQuery();
        refined.query = this.query + " " + refinement;
        refined.category = this.category;
        refined.priority = Math.min(5, this.priority + 1);
        refined.numResults = this.numResults;
        refined.cursor = this.cursor;
        refined.dataRange = this.dataRange;
        refined.searchType = this.searchType;
        refined.reasoning = newReasoning;
        refined.keywords = this.keywords;
        refined.language = this.language;
        refined.region = this.region;
        refined.localFocus = this.localFocus;
        refined.isEmergencyAlert = this.isEmergencyAlert;
        
        // Enhance target sources for refinement
        if (this.targetSources != null) {
            refined.targetSources = java.util.stream.Stream.concat(
                this.targetSources.stream(),
                java.util.Arrays.asList("Local officials", "Community leaders").stream()
            ).distinct().collect(java.util.stream.Collectors.toList());
        }
        
        return refined;
    }
    
    /**
     * Create an emergency version of this query
     */
    public LaudiumSearchQuery createEmergencyQuery() {
        LaudiumSearchQuery emergency = new LaudiumSearchQuery();
        emergency.query = this.query;
        emergency.category = this.category;
        emergency.priority = 5; // Highest priority
        emergency.numResults = this.numResults + 5; // More results for emergencies
        emergency.isEmergencyAlert = true;
        emergency.localFocus = this.localFocus;
        emergency.reasoning = "Emergency alert - immediate community impact";
        
        // Add emergency-specific terms
        if (this.query.toLowerCase().contains("safety") || 
            this.query.toLowerCase().contains("alert")) {
            emergency.query += " urgent immediate";
        }
        
        return emergency;
    }
    
    @Override
    public String toString() {
        return String.format("LaudiumSearchQuery{query='%s', category='%s', priority=%d, localFocus='%s', emergency=%s}", 
                           query, category, priority, localFocus, isEmergencyAlert);
    }
}