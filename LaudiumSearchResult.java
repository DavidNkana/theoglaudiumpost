package com.minimax.examples.search.laudium;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Search Result specifically focused on Laudium community relevance
 * 
 * Enhanced search result with community impact assessment and local relevance scoring.
 * 
 * @author MiniMax Agent
 * @version 2.0.0 - Laudium Community Edition
 */
public class LaudiumSearchResult {
    private String topic;
    private String originalTopic;
    private LocalDateTime timestamp;
    private List<SearchResult> initialResults;
    private List<SearchResult> refinedResults;
    private List<SearchResult> deepResults;
    private List<SearchResult> finalResults;
    private LaudiumSearchSummary summary;
    private int totalResults;
    private double searchQuality;
    private double communityRelevance;
    private String error;
    private LaudiumSearchMetrics metrics;
    private List<String> communityAlerts;
    private List<String> localOfficialResponses;
    private Map<String, Integer> sourceCredibilityScores;
    
    public LaudiumSearchResult() {}
    
    // Getters and setters
    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }
    
    public String getOriginalTopic() { return originalTopic; }
    public void setOriginalTopic(String originalTopic) { this.originalTopic = originalTopic; }
    
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    
    public List<SearchResult> getInitialResults() { return initialResults; }
    public void setInitialResults(List<SearchResult> initialResults) { this.initialResults = initialResults; }
    
    public List<SearchResult> getRefinedResults() { return refinedResults; }
    public void setRefinedResults(List<SearchResult> refinedResults) { this.refinedResults = refinedResults; }
    
    public List<SearchResult> getDeepResults() { return deepResults; }
    public void setDeepResults(List<SearchResult> deepResults) { this.deepResults = deepResults; }
    
    public List<SearchResult> getFinalResults() { return finalResults; }
    public void setFinalResults(List<SearchResult> finalResults) { this.finalResults = finalResults; }
    
    public LaudiumSearchSummary getSummary() { return summary; }
    public void setSummary(LaudiumSearchSummary summary) { this.summary = summary; }
    
    public int getTotalResults() { return totalResults; }
    public void setTotalResults(int totalResults) { this.totalResults = totalResults; }
    
    public double getSearchQuality() { return searchQuality; }
    public void setSearchQuality(double searchQuality) { this.searchQuality = searchQuality; }
    
    public double getCommunityRelevance() { return communityRelevance; }
    public void setCommunityRelevance(double communityRelevance) { this.communityRelevance = communityRelevance; }
    
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
    
    public LaudiumSearchMetrics getMetrics() { return metrics; }
    public void setMetrics(LaudiumSearchMetrics metrics) { this.metrics = metrics; }
    
    public List<String> getCommunityAlerts() { return communityAlerts; }
    public void setCommunityAlerts(List<String> communityAlerts) { this.communityAlerts = communityAlerts; }
    
    public List<String> getLocalOfficialResponses() { return localOfficialResponses; }
    public void setLocalOfficialResponses(List<String> localOfficialResponses) { this.localOfficialResponses = localOfficialResponses; }
    
    public Map<String, Integer> getSourceCredibilityScores() { return sourceCredibilityScores; }
    public void setSourceCredibilityScores(Map<String, Integer> sourceCredibilityScores) { this.sourceCredibilityScores = sourceCredibilityScores; }
    
    /**
     * Check if search was successful
     */
    public boolean isSuccessful() {
        return error == null && finalResults != null && !finalResults.isEmpty();
    }
    
    /**
     * Get best results for Laudium community (top 5 with high community relevance)
     */
    public List<SearchResult> getBestCommunityResults() {
        if (finalResults == null || finalResults.isEmpty()) {
            return List.of();
        }
        return finalResults.stream()
            .filter(r -> r.getCommunityRelevance() > 0.7)
            .limit(5)
            .collect(java.util.stream.Collectors.toList());
    }
    
    /**
     * Get high-impact results (community relevance > 0.8)
     */
    public List<SearchResult> getHighImpactResults() {
        if (finalResults == null) {
            return List.of();
        }
        return finalResults.stream()
            .filter(r -> r.getCommunityRelevance() > 0.8)
            .sorted((a, b) -> Double.compare(b.getCommunityRelevance(), a.getCommunityRelevance()))
            .collect(java.util.stream.Collectors.toList());
    }
    
    /**
     * Get safety-critical results
     */
    public List<SearchResult> getSafetyCriticalResults() {
        if (finalResults == null) {
            return List.of();
        }
        return finalResults.stream()
            .filter(r -> isSafetyRelated(r))
            .collect(java.util.stream.Collectors.toList());
    }
    
    private boolean isSafetyRelated(SearchResult result) {
        String title = result.getTitle() != null ? result.getTitle().toLowerCase() : "";
        String snippet = result.getSnippet() != null ? result.getSnippet().toLowerCase() : "";
        
        return title.contains("crime") || title.contains("safety") || title.contains("alert") ||
               title.contains("security") || title.contains("emergency") ||
               snippet.contains("safety") || snippet.contains("security") || snippet.contains("alert");
    }
    
    /**
     * Get results by source type
     */
    public Map<String, List<SearchResult>> getResultsBySourceType() {
        if (finalResults == null) {
            return new java.util.HashMap<>();
        }
        
        Map<String, List<SearchResult>> grouped = new java.util.HashMap<>();
        for (SearchResult result : finalResults) {
            String sourceType = categorizeSource(result.getSource());
            grouped.computeIfAbsent(sourceType, k -> new java.util.ArrayList<>()).add(result);
        }
        return grouped;
    }
    
    private String categorizeSource(String source) {
        if (source == null) return "Unknown";
        
        String lowerSource = source.toLowerCase();
        if (lowerSource.contains("rekord") || lowerSource.contains("laudium sun") || 
            lowerSource.contains("niz media") || lowerSource.contains("laudium today")) {
            return "Local News";
        } else if (lowerSource.contains("twitter") || lowerSource.contains("facebook") || 
                   lowerSource.contains("instagram")) {
            return "Social Media";
        } else if (lowerSource.contains("news24") || lowerSource.contains("iol") || 
                   lowerSource.contains("daily maverick")) {
            return "National News";
        } else {
            return "Other";
        }
    }
    
    /**
     * Get community impact assessment
     */
    public String getCommunityImpactAssessment() {
        if (!isSuccessful()) {
            return "Search failed - impact assessment unavailable";
        }
        
        StringBuilder assessment = new StringBuilder();
        assessment.append("=== LAUDIUM COMMUNITY IMPACT ASSESSMENT ===\n\n");
        
        // Overall relevance
        assessment.append("Community Relevance Score: ")
                 .append(String.format("%.1f%%", communityRelevance * 100)).append("\n");
        assessment.append("Search Quality Score: ")
                 .append(String.format("%.1f%%", searchQuality * 100)).append("\n\n");
        
        // High-impact results summary
        List<SearchResult> highImpact = getHighImpactResults();
        if (!highImpact.isEmpty()) {
            assessment.append("HIGH-IMPACT FINDINGS:\n");
            highImpact.forEach(result -> 
                assessment.append("• ").append(result.getTitle())
                         .append(" (Impact: ").append(String.format("%.1f", result.getCommunityRelevance() * 100))
                         .append("%)\n"));
            assessment.append("\n");
        }
        
        // Safety alerts
        List<SearchResult> safetyResults = getSafetyCriticalResults();
        if (!safetyResults.isEmpty()) {
            assessment.append("SAFETY & SECURITY ALERTS:\n");
            safetyResults.forEach(result -> 
                assessment.append("• ").append(result.getTitle()).append("\n"));
            assessment.append("\n");
        }
        
        // Source credibility
        if (sourceCredibilityScores != null && !sourceCredibilityScores.isEmpty()) {
            assessment.append("SOURCE CREDIBILITY:\n");
            sourceCredibilityScores.forEach((source, score) -> 
                assessment.append("• ").append(source).append(": ")
                         .append(score).append("/100\n"));
        }
        
        return assessment.toString();
    }
    
    /**
     * Get search statistics for Laudium community
     */
    public String getLaudiumSearchStatistics() {
        if (!isSuccessful()) {
            return "Laudium search failed: " + (error != null ? error : "Unknown error");
        }
        
        StringBuilder stats = new StringBuilder();
        stats.append("=== LAUDIUM COMMUNITY SEARCH RESULTS ===\n\n");
        stats.append("Original Topic: ").append(originalTopic != null ? originalTopic : topic).append("\n");
        stats.append("Framed Topic: ").append(topic).append("\n");
        stats.append("Timestamp: ").append(timestamp).append("\n");
        stats.append("Total Results: ").append(totalResults).append("\n");
        stats.append("Community Relevance: ").append(String.format("%.1f%%", communityRelevance * 100)).append("\n");
        stats.append("Search Quality: ").append(String.format("%.1f%%", searchQuality * 100)).append("\n\n");
        
        // Result breakdown by phase
        if (initialResults != null) {
            stats.append("Initial Search Results: ").append(initialResults.size()).append("\n");
        }
        if (refinedResults != null) {
            stats.append("Refined Search Results: ").append(refinedResults.size()).append("\n");
        }
        if (deepResults != null) {
            stats.append("Deep Analysis Results: ").append(deepResults.size()).append("\n");
        }
        
        // Community-specific metrics
        stats.append("\n=== COMMUNITY METRICS ===\n");
        stats.append("High-Impact Results: ").append(getHighImpactResults().size()).append("\n");
        stats.append("Safety-Critical Results: ").append(getSafetyCriticalResults().size()).append("\n");
        stats.append("Local Source Results: ").append(getResultsBySourceType().getOrDefault("Local News", List.of()).size()).append("\n");
        
        return stats.toString();
    }
    
    @Override
    public String toString() {
        return String.format("LaudiumSearchResult{topic='%s', communityRelevance=%.2f, quality=%.2f, results=%d}", 
                           topic, communityRelevance, searchQuality, totalResults);
    }
}

/**
 * Search Summary specifically for Laudium community
 */
class LaudiumSearchSummary {
    private String topic;
    private String analysis;
    private List<String> communityFindings;
    private List<String> localSources;
    private List<String> safetyImplications;
    private List<String> communityRecommendations;
    private LocalDateTime timestamp;
    private double communityConfidenceScore;
    private List<String> mosqueCommunityPerspectives;
    private List<String> localOfficialStatements;
    private java.util.Map<String, Object> communityMetadata;
    
    public LaudiumSearchSummary() {}
    
    // Getters and setters
    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }
    
    public String getAnalysis() { return analysis; }
    public void setAnalysis(String analysis) { this.analysis = analysis; }
    
    public List<String> getCommunityFindings() { return communityFindings; }
    public void setCommunityFindings(List<String> communityFindings) { this.communityFindings = communityFindings; }
    
    public List<String> getLocalSources() { return localSources; }
    public void setLocalSources(List<String> localSources) { this.localSources = localSources; }
    
    public List<String> getSafetyImplications() { return safetyImplications; }
    public void setSafetyImplications(List<String> safetyImplications) { this.safetyImplications = safetyImplications; }
    
    public List<String> getCommunityRecommendations() { return communityRecommendations; }
    public void setCommunityRecommendations(List<String> communityRecommendations) { this.communityRecommendations = communityRecommendations; }
    
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    
    public double getCommunityConfidenceScore() { return communityConfidenceScore; }
    public void setCommunityConfidenceScore(double communityConfidenceScore) { this.communityConfidenceScore = communityConfidenceScore; }
    
    public List<String> getMosqueCommunityPerspectives() { return mosqueCommunityPerspectives; }
    public void setMosqueCommunityPerspectives(List<String> mosqueCommunityPerspectives) { this.mosqueCommunityPerspectives = mosqueCommunityPerspectives; }
    
    public List<String> getLocalOfficialStatements() { return localOfficialStatements; }
    public void setLocalOfficialStatements(List<String> localOfficialStatements) { this.localOfficialStatements = localOfficialStatements; }
    
    public java.util.Map<String, Object> getCommunityMetadata() { return communityMetadata; }
    public void setCommunityMetadata(java.util.Map<String, Object> communityMetadata) { this.communityMetadata = communityMetadata; }
    
    /**
     * Get formatted community summary
     */
    public String getFormattedCommunitySummary() {
        StringBuilder formatted = new StringBuilder();
        formatted.append("=== LAUDIUM COMMUNITY SEARCH SUMMARY ===\n\n");
        formatted.append("Topic: ").append(topic).append("\n\n");
        
        if (analysis != null) {
            formatted.append("COMMUNITY ANALYSIS:\n").append(analysis).append("\n\n");
        }
        
        if (communityFindings != null && !communityFindings.isEmpty()) {
            formatted.append("KEY COMMUNITY FINDINGS:\n");
            communityFindings.forEach(finding -> formatted.append("• ").append(finding).append("\n"));
            formatted.append("\n");
        }
        
        if (safetyImplications != null && !safetyImplications.isEmpty()) {
            formatted.append("SAFETY & SECURITY IMPLICATIONS:\n");
            safetyImplications.forEach(implication -> formatted.append("• ").append(implication).append("\n"));
            formatted.append("\n");
        }
        
        if (localSources != null && !localSources.isEmpty()) {
            formatted.append("CREDIBLE LOCAL SOURCES:\n");
            localSources.forEach(source -> formatted.append("• ").append(source).append("\n"));
            formatted.append("\n");
        }
        
        if (mosqueCommunityPerspectives != null && !mosqueCommunityPerspectives.isEmpty()) {
            formatted.append("MOSQUE & RELIGIOUS COMMUNITY PERSPECTIVES:\n");
            mosqueCommunityPerspectives.forEach(perspective -> formatted.append("• ").append(perspective).append("\n"));
            formatted.append("\n");
        }
        
        if (localOfficialStatements != null && !localOfficialStatements.isEmpty()) {
            formatted.append("LOCAL OFFICIAL STATEMENTS:\n");
            localOfficialStatements.forEach(statement -> formatted.append("• ").append(statement).append("\n"));
            formatted.append("\n");
        }
        
        if (communityRecommendations != null && !communityRecommendations.isEmpty()) {
            formatted.append("COMMUNITY RECOMMENDATIONS:\n");
            communityRecommendations.forEach(rec -> formatted.append("• ").append(rec).append("\n"));
        }
        
        formatted.append("\nCommunity Confidence Score: ")
                 .append(String.format("%.1f%%", communityConfidenceScore * 100));
        
        return formatted.toString();
    }
    
    @Override
    public String toString() {
        return String.format("LaudiumSearchSummary{topic='%s', confidence=%.2f}", 
                           topic, communityConfidenceScore);
    }
}

/**
 * Search Metrics for Laudium community analysis
 */
class LaudiumSearchMetrics {
    private long startTime;
    private long endTime;
    private long durationMs;
    private int queriesGenerated;
    private int totalResultsFound;
    private int localSourcesFound;
    private int communityRelevantResults;
    private int safetyCriticalResults;
    private double averageCommunityRelevance;
    private int cacheHits;
    private int cacheMisses;
    private List<String> searchPhases;
    
    public LaudiumSearchMetrics() {
        this.startTime = System.currentTimeMillis();
        this.searchPhases = Arrays.asList(
            "Query Generation", "Initial Search", "Query Refinement", 
            "Local Content Extraction", "Community Analysis", "Final Ranking"
        );
    }
    
    public void markComplete() {
        this.endTime = System.currentTimeMillis();
        this.durationMs = endTime - startTime;
    }
    
    // Getters and setters
    public long getStartTime() { return startTime; }
    public void setStartTime(long startTime) { this.startTime = startTime; }
    
    public long getEndTime() { return endTime; }
    public void setEndTime(long endTime) { this.endTime = endTime; }
    
    public long getDurationMs() { return durationMs; }
    public void setDurationMs(long durationMs) { this.durationMs = durationMs; }
    
    public int getQueriesGenerated() { return queriesGenerated; }
    public void setQueriesGenerated(int queriesGenerated) { this.queriesGenerated = queriesGenerated; }
    
    public int getTotalResultsFound() { return totalResultsFound; }
    public void setTotalResultsFound(int totalResultsFound) { this.totalResultsFound = totalResultsFound; }
    
    public int getLocalSourcesFound() { return localSourcesFound; }
    public void setLocalSourcesFound(int localSourcesFound) { this.localSourcesFound = localSourcesFound; }
    
    public int getCommunityRelevantResults() { return communityRelevantResults; }
    public void setCommunityRelevantResults(int communityRelevantResults) { this.communityRelevantResults = communityRelevantResults; }
    
    public int getSafetyCriticalResults() { return safetyCriticalResults; }
    public void setSafetyCriticalResults(int safetyCriticalResults) { this.safetyCriticalResults = safetyCriticalResults; }
    
    public double getAverageCommunityRelevance() { return averageCommunityRelevance; }
    public void setAverageCommunityRelevance(double averageCommunityRelevance) { this.averageCommunityRelevance = averageCommunityRelevance; }
    
    public int getCacheHits() { return cacheHits; }
    public void setCacheHits(int cacheHits) { this.cacheHits = cacheHits; }
    
    public int getCacheMisses() { return cacheMisses; }
    public void setCacheMisses(int cacheMisses) { this.cacheMisses = cacheMisses; }
    
    public List<String> getSearchPhases() { return searchPhases; }
    public void setSearchPhases(List<String> searchPhases) { this.searchPhases = searchPhases; }
    
    /**
     * Get cache hit rate
     */
    public double getCacheHitRate() {
        int total = cacheHits + cacheMisses;
        return total > 0 ? (double) cacheHits / total : 0.0;
    }
    
    /**
     * Get local source coverage percentage
     */
    public double getLocalSourceCoverage() {
        return totalResultsFound > 0 ? (double) localSourcesFound / totalResultsFound : 0.0;
    }
    
    /**
     * Get community relevance rate
     */
    public double getCommunityRelevanceRate() {
        return totalResultsFound > 0 ? (double) communityRelevantResults / totalResultsFound : 0.0;
    }
    
    /**
     * Get formatted performance report for Laudium community
     */
    public String getCommunityPerformanceReport() {
        StringBuilder report = new StringBuilder();
        report.append("=== LAUDIUM COMMUNITY SEARCH PERFORMANCE ===\n\n");
        report.append("Search Duration: ").append(durationMs).append("ms\n");
        report.append("Queries Generated: ").append(queriesGenerated).append("\n");
        report.append("Total Results Found: ").append(totalResultsFound).append("\n");
        report.append("Local Sources Found: ").append(localSourcesFound)
                 .append(" (").append(String.format("%.1f%%", getLocalSourceCoverage() * 100)).append(")\n");
        report.append("Community Relevant Results: ").append(communityRelevantResults)
                 .append(" (").append(String.format("%.1f%%", getCommunityRelevanceRate() * 100)).append(")\n");
        report.append("Safety Critical Results: ").append(safetyCriticalResults).append("\n");
        report.append("Average Community Relevance: ")
                 .append(String.format("%.2f", averageCommunityRelevance)).append("\n");
        report.append("Cache Hit Rate: ")
                 .append(String.format("%.1f%%", getCacheHitRate() * 100)).append("\n\n");
        
        report.append("SEARCH PHASES COMPLETED:\n");
        searchPhases.forEach(phase -> report.append("✓ ").append(phase).append("\n"));
        
        return report.toString();
    }
}