package com.minimax.examples.search.laudium;

import java.time.Duration;
import java.util.List;
import java.util.Set;

/**
 * Configuration for Laudium Community Search Operations
 * 
 * Specialized configuration for local Laudium news and community reporting
 * with focus on Muslim community perspective and local sources.
 * 
 * @author MiniMax Agent
 * @version 2.0.0 - Laudium Community Edition
 */
public class LaudiumSearchConfig {
    private int maxSearchRounds = 5;
    private int maxResultsPerQuery = 15;
    private int maxConcurrentQueries = 10;
    private int contentExtractionLimit = 5;
    private double minQualityScore = 0.7;
    private double minCommunityRelevance = 0.6;
    private boolean enableDeepAnalysis = true;
    private boolean enableContentExtraction = true;
    private boolean enableQueryRefinement = true;
    private boolean enableCaching = true;
    private boolean enableRateLimiting = true;
    private Duration cacheExpiration = Duration.ofHours(1);
    private List<String> preferredLocalSources;
    private Set<String> excludedSources;
    private String language = "en";
    private String region = "South Africa";
    private String localFocus = "Laudium, Centurion, Gauteng";
    private LaudiumSearchDepth depth = LaudiumSearchDepth.COMPREHENSIVE;
    private List<String> communityKeywords;
    private List<String> safetyKeywords;
    private List<String> excludeTerms;
    private boolean prioritizeLocalSources = true;
    private boolean focusOnMuslimCommunity = true;
    private boolean includeSocialMediaSources = true;
    private boolean enableEmergencyAlerts = true;
    private int maxEmergencyResults = 20;
    
    public LaudiumSearchConfig() {
        // Default configuration for Laudium community
        initializeDefaultSources();
    }
    
    private void initializeDefaultSources() {
        this.preferredLocalSources = List.of(
            "Centurion Rekord", "Laudium Sun", "Niz Media", "Laudium Today",
            "News24", "IOL", "Daily Maverick", "RT News",
            "SABC News", "eNCA", "Cape Talk", "Radio 2000"
        );
        
        this.communityKeywords = List.of(
            "Laudium", "Centurion", "Muslim", "community", "mosque", "Ramadan",
            "Islamic", "Halal", "Jummah", "Eid", "Qurbani", "Zakat"
        );
        
        this.safetyKeywords = List.of(
            "crime", "safety", "security", "alert", "emergency", "police",
            "SAPS", "incident", "accident", "roadblock", "load shedding",
            "water outage", "power failure", "community watch"
        );
        
        this.excludeTerms = List.of(
            "fake news", "hoax", "rumor", "unverified", "opinion only"
        );
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
    
    public double getMinCommunityRelevance() { return minCommunityRelevance; }
    public void setMinCommunityRelevance(double minCommunityRelevance) { this.minCommunityRelevance = Math.max(0.0, Math.min(1.0, minCommunityRelevance)); }
    
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
    
    public List<String> getPreferredLocalSources() { return preferredLocalSources; }
    public void setPreferredLocalSources(List<String> preferredLocalSources) { this.preferredLocalSources = preferredLocalSources; }
    
    public Set<String> getExcludedSources() { return excludedSources; }
    public void setExcludedSources(Set<String> excludedSources) { this.excludedSources = excludedSources; }
    
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    
    public String getLocalFocus() { return localFocus; }
    public void setLocalFocus(String localFocus) { this.localFocus = localFocus; }
    
    public LaudiumSearchDepth getDepth() { return depth; }
    public void setDepth(LaudiumSearchDepth depth) { this.depth = depth; }
    
    public List<String> getCommunityKeywords() { return communityKeywords; }
    public void setCommunityKeywords(List<String> communityKeywords) { this.communityKeywords = communityKeywords; }
    
    public List<String> getSafetyKeywords() { return safetyKeywords; }
    public void setSafetyKeywords(List<String> safetyKeywords) { this.safetyKeywords = safetyKeywords; }
    
    public List<String> getExcludeTerms() { return excludeTerms; }
    public void setExcludeTerms(List<String> excludeTerms) { this.excludeTerms = excludeTerms; }
    
    public boolean isPrioritizeLocalSources() { return prioritizeLocalSources; }
    public void setPrioritizeLocalSources(boolean prioritizeLocalSources) { this.prioritizeLocalSources = prioritizeLocalSources; }
    
    public boolean isFocusOnMuslimCommunity() { return focusOnMuslimCommunity; }
    public void setFocusOnMuslimCommunity(boolean focusOnMuslimCommunity) { this.focusOnMuslimCommunity = focusOnMuslimCommunity; }
    
    public boolean isIncludeSocialMediaSources() { return includeSocialMediaSources; }
    public void setIncludeSocialMediaSources(boolean includeSocialMediaSources) { this.includeSocialMediaSources = includeSocialMediaSources; }
    
    public boolean isEnableEmergencyAlerts() { return enableEmergencyAlerts; }
    public void setEnableEmergencyAlerts(boolean enableEmergencyAlerts) { this.enableEmergencyAlerts = enableEmergencyAlerts; }
    
    public int getMaxEmergencyResults() { return maxEmergencyResults; }
    public void setMaxEmergencyResults(int maxEmergencyResults) { this.maxEmergencyResults = maxEmergencyResults; }
    
    /**
     * Create a quick search configuration for Laudium community
     */
    public static LaudiumSearchConfig quickLaudiumSearch() {
        LaudiumSearchConfig config = new LaudiumSearchConfig();
        config.setMaxSearchRounds(2);
        config.setMaxResultsPerQuery(5);
        config.setContentExtractionLimit(3);
        config.setMinQualityScore(0.6);
        config.setMinCommunityRelevance(0.5);
        config.setEnableDeepAnalysis(false);
        config.setEnableQueryRefinement(false);
        return config;
    }
    
    /**
     * Create a comprehensive search configuration for Laudium community
     */
    public static LaudiumSearchConfig comprehensiveLaudiumSearch() {
        LaudiumSearchConfig config = new LaudiumSearchConfig();
        config.setMaxSearchRounds(5);
        config.setMaxResultsPerQuery(15);
        config.setContentExtractionLimit(10);
        config.setMinQualityScore(0.7);
        config.setMinCommunityRelevance(0.6);
        config.setEnableDeepAnalysis(true);
        config.setEnableContentExtraction(true);
        config.setEnableQueryRefinement(true);
        config.setEnableCaching(true);
        config.setDepth(LaudiumSearchDepth.COMPREHENSIVE);
        config.setPrioritizeLocalSources(true);
        config.setFocusOnMuslimCommunity(true);
        return config;
    }
    
    /**
     * Create an emergency search configuration for critical alerts
     */
    public static LaudiumSearchConfig emergencyLaudiumSearch() {
        LaudiumSearchConfig config = new LaudiumSearchConfig();
        config.setMaxSearchRounds(3);
        config.setMaxResultsPerQuery(20);
        config.setMaxEmergencyResults(30);
        config.setContentExtractionLimit(15);
        config.setMinQualityScore(0.5); // Lower threshold for emergencies
        config.setMinCommunityRelevance(0.7); // Higher threshold for emergencies
        config.setEnableDeepAnalysis(true);
        config.setEnableContentExtraction(true);
        config.setEnableQueryRefinement(true);
        config.setEnableEmergencyAlerts(true);
        config.setDepth(LaudiumSearchDepth.EMERGENCY);
        return config;
    }
    
    /**
     * Create a research-focused configuration for Laudium community
     */
    public static LaudiumSearchConfig researchLaudiumSearch() {
        LaudiumSearchConfig config = new LaudiumSearchConfig();
        config.setMaxSearchRounds(7);
        config.setMaxResultsPerQuery(20);
        config.setContentExtractionLimit(15);
        config.setMinQualityScore(0.8);
        config.setMinCommunityRelevance(0.7);
        config.setEnableDeepAnalysis(true);
        config.setEnableContentExtraction(true);
        config.setEnableQueryRefinement(true);
        config.setDepth(LaudiumSearchDepth.RESEARCH);
        config.setPrioritizeLocalSources(true);
        config.setFocusOnMuslimCommunity(true);
        config.setIncludeSocialMediaSources(true);
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
            case EMERGENCY -> Math.max(0.4, minQualityScore - 0.3);
        };
    }
    
    /**
     * Get effective community relevance threshold based on depth
     */
    public double getEffectiveCommunityRelevanceThreshold() {
        return switch (depth) {
            case QUICK -> Math.max(0.4, minCommunityRelevance - 0.2);
            case STANDARD -> minCommunityRelevance;
            case COMPREHENSIVE -> Math.min(0.9, minCommunityRelevance + 0.1);
            case RESEARCH -> Math.min(0.95, minCommunityRelevance + 0.2);
            case EMERGENCY -> Math.max(0.6, minCommunityRelevance);
        };
    }
    
    /**
     * Check if this is an emergency configuration
     */
    public boolean isEmergencyConfiguration() {
        return depth == LaudiumSearchDepth.EMERGENCY || enableEmergencyAlerts;
    }
    
    /**
     * Get search priority for emergency situations
     */
    public int getEmergencyPriority() {
        if (isEmergencyConfiguration()) {
            return 5; // Highest priority
        }
        return Math.max(1, Math.min(5, depth.getPriority()));
    }
    
    /**
     * Check if local sources should be prioritized
     */
    public boolean shouldPrioritizeLocalSources() {
        return prioritizeLocalSources && !isEmergencyConfiguration();
    }
    
    /**
     * Check if social media should be included
     */
    public boolean shouldIncludeSocialMedia() {
        return includeSocialMediaSources && (depth != LaudiumSearchDepth.RESEARCH || isEmergencyConfiguration());
    }
    
    @Override
    public String toString() {
        return String.format("LaudiumSearchConfig{rounds=%d, results=%d, quality=%.2f, community=%.2f, depth=%s, emergency=%s}", 
                           maxSearchRounds, maxResultsPerQuery, minQualityScore, minCommunityRelevance, depth, isEmergencyConfiguration());
    }
}

/**
 * Laudium Search Depth Levels
 */
enum LaudiumSearchDepth {
    QUICK("Quick community news search", 2),
    STANDARD("Standard community search", 3),
    COMPREHENSIVE("Comprehensive community analysis", 4),
    RESEARCH("Research-grade community investigation", 5),
    EMERGENCY("Emergency alert and safety search", 5);
    
    private final String description;
    private final int priority;
    
    LaudiumSearchDepth(String description, int priority) {
        this.description = description;
        this.priority = priority;
    }
    
    public String getDescription() {
        return description;
    }
    
    public int getPriority() {
        return priority;
    }
}