package com.minimax.examples.search.enhanced;

import java.time.Duration;
import java.util.List;
import java.util.Set;

/**
 * Configuration for Deep Search Operations
 * 
 * Controls various aspects of the search process including
 * quality thresholds, caching, and analysis depth.
 * 
 * @author MiniMax Agent
 * @version 2.0.0
 */
public class SearchConfig {
    private int maxSearchRounds = 5;
    private int maxResultsPerQuery = 15;
    private int maxConcurrentQueries = 10;
    private int contentExtractionLimit = 5;
    private double minQualityScore = 0.7;
    private boolean enableDeepAnalysis = true;
    private boolean enableContentExtraction = true;
    private boolean enableQueryRefinement = true;
    private boolean enableCaching = true;
    private boolean enableRateLimiting = true;
    private Duration cacheExpiration = Duration.ofHours(1);
    private List<String> preferredSources;
    private Set<String> excludedSources;
    private String language = "en";
    private String region = "global";
    private SearchDepth depth = SearchDepth.COMPREHENSIVE;
    private List<String> keywords;
    private List<String> excludeTerms;
    
    public SearchConfig() {
        // Default configuration
    }
    
    // Getters and setters
    public int getMaxSearchRounds() { return maxSearchRounds; }
    public void setMaxSearchRounds(int maxSearchRounds) { this.maxSearchRounds = Math.max(1, maxSearchRounds); }
    
    public int getMaxResultsPerQuery() { return maxResultsPerQuery; }
    public void setMaxResultsPerQuery(int maxResultsPerQuery) { this.maxResultsPerQuery = Math.max(1, maxResultsPerQuery); }
    
    public int getMaxConcurrentQueries() { return maxConcurrentQueries; }
    public void setMaxConcurrentQueries(int maxConcurrentQueries) { this.maxConcurrentQueries = Math.max(1, maxConcurrentQueries); }
    
    public int getContentExtractionLimit() { return contentExtractionLimit; }
    public void setContentExtractionLimit(int contentExtractionLimit) { this.contentExtractionLimit = Math.max(1, contentExtractionLimit); }
    
    public double getMinQualityScore() { return minQualityScore; }
    public void setMinQualityScore(double minQualityScore) { this.minQualityScore = Math.max(0.0, Math.min(1.0, minQualityScore)); }
    
    public boolean isEnableDeepAnalysis() { return enableDeepAnalysis; }
    public void setEnableDeepAnalysis(boolean enableDeepAnalysis) { this.enableDeepAnalysis = enableDeepAnalysis; }
    
    public boolean isEnableContentExtraction() { return enableContentExtraction; }
    public void setEnableContentExtraction(boolean enableContentExtraction) { this.enableContentExtraction = enableContentExtraction; }
    
    public boolean isEnableQueryRefinement() { return enableQueryRefinement; }
    public void setEnableQueryRefinement(boolean enableQueryRefinement) { this.enableQueryRefinement = enableQueryRefinement; }
    
    public boolean isEnableCaching() { return enableCaching; }
    public void setEnableCaching(boolean enableCaching) { this.enableCaching = enableCaching; }
    
    public boolean isEnableRateLimiting() { return enableRateLimiting; }
    public void setEnableRateLimiting(boolean enableRateLimiting) { this.enableRateLimiting = enableRateLimiting; }
    
    public Duration getCacheExpiration() { return cacheExpiration; }
    public void setCacheExpiration(Duration cacheExpiration) { this.cacheExpiration = cacheExpiration; }
    
    public List<String> getPreferredSources() { return preferredSources; }
    public void setPreferredSources(List<String> preferredSources) { this.preferredSources = preferredSources; }
    
    public Set<String> getExcludedSources() { return excludedSources; }
    public void setExcludedSources(Set<String> excludedSources) { this.excludedSources = excludedSources; }
    
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    
    public SearchDepth getDepth() { return depth; }
    public void setDepth(SearchDepth depth) { this.depth = depth; }
    
    public List<String> getKeywords() { return keywords; }
    public void setKeywords(List<String> keywords) { this.keywords = keywords; }
    
    public List<String> getExcludeTerms() { return excludeTerms; }
    public void setExcludeTerms(List<String> excludeTerms) { this.excludeTerms = excludeTerms; }
    
    /**
     * Create a quick search configuration
     */
    public static SearchConfig quickSearch() {
        SearchConfig config = new SearchConfig();
        config.setMaxSearchRounds(2);
        config.setMaxResultsPerQuery(5);
        config.setContentExtractionLimit(3);
        config.setMinQualityScore(0.6);
        config.setEnableDeepAnalysis(false);
        config.setEnableQueryRefinement(false);
        return config;
    }
    
    /**
     * Create a comprehensive search configuration
     */
    public static SearchConfig comprehensiveSearch() {
        SearchConfig config = new SearchConfig();
        config.setMaxSearchRounds(5);
        config.setMaxResultsPerQuery(15);
        config.setContentExtractionLimit(10);
        config.setMinQualityScore(0.7);
        config.setEnableDeepAnalysis(true);
        config.setEnableContentExtraction(true);
        config.setEnableQueryRefinement(true);
        config.setEnableCaching(true);
        config.setDepth(SearchDepth.COMPREHENSIVE);
        return config;
    }
    
    /**
     * Create a research-focused configuration
     */
    public static SearchConfig researchSearch() {
        SearchConfig config = new SearchConfig();
        config.setMaxSearchRounds(7);
        config.setMaxResultsPerQuery(20);
        config.setContentExtractionLimit(15);
        config.setMinQualityScore(0.8);
        config.setEnableDeepAnalysis(true);
        config.setEnableContentExtraction(true);
        config.setEnableQueryRefinement(true);
        config.setDepth(SearchDepth.RESEARCH);
        return config;
    }
    
    /**
     * Check if caching should be used
     */
    public boolean shouldUseCache() {
        return enableCaching && cacheExpiration != null;
    }
    
    /**
     * Get effective quality threshold based on depth
     */
    public double getEffectiveQualityThreshold() {
        return switch (depth) {
            case QUICK -> Math.max(0.5, minQualityScore - 0.2);
            case STANDARD -> minQualityScore;
            case COMPREHENSIVE -> Math.min(0.9, minQualityScore + 0.1);
            case RESEARCH -> Math.min(0.95, minQualityScore + 0.2);
        };
    }
    
    @Override
    public String toString() {
        return String.format("SearchConfig{rounds=%d, results=%d, quality=%.2f, depth=%s}", 
                           maxSearchRounds, maxResultsPerQuery, minQualityScore, depth);
    }
}

/**
 * Search Depth Levels
 */
enum SearchDepth {
    QUICK("Quick search with basic results"),
    STANDARD("Standard search with moderate analysis"),
    COMPREHENSIVE("Comprehensive search with deep analysis"),
    RESEARCH("Research-grade search with extensive analysis");
    
    private final String description;
    
    SearchDepth(String description) {
        this.description = description;
    }
    
    public String getDescription() {
        return description;
    }
}