package com.minimax.examples.search.enhanced;

import java.util.List;

/**
 * Enhanced Search Query with Intelligence
 * 
 * Supports advanced query parameters for deep search strategies.
 * 
 * @author MiniMax Agent
 * @version 2.0.0
 */
public class SearchQuery {
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
    
    public SearchQuery() {}
    
    public SearchQuery(String query, int numResults, int cursor, String dataRange) {
        this.query = query;
        this.numResults = numResults;
        this.cursor = cursor;
        this.dataRange = dataRange;
        this.searchType = "search";
        this.priority = 3; // Default medium priority
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
     * Get formatted query with metadata
     */
    public String getFormattedQuery() {
        StringBuilder formatted = new StringBuilder();
        formatted.append(query);
        
        if (category != null) {
            formatted.append(" [Category: ").append(category).append("]");
        }
        
        if (priority >= 4) {
            formatted.append(" [Priority: ").append(getPriorityLabel()).append("]");
        }
        
        return formatted.toString();
    }
    
    /**
     * Create a refined version of this query
     */
    public SearchQuery createRefinedQuery(String refinement, String newReasoning) {
        SearchQuery refined = new SearchQuery();
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
        
        return refined;
    }
    
    @Override
    public String toString() {
        return String.format("SearchQuery{query='%s', category='%s', priority=%d, results=%d}", 
                           query, category, priority, numResults);
    }
}