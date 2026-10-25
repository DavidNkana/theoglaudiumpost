package com.minimax.examples.search.enhanced;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Deep Search Result - Complete results from multi-round search
 * 
 * Contains all phases of search results with analysis and summary.
 * 
 * @author MiniMax Agent
 * @version 2.0.0
 */
public class DeepSearchResult {
    private String topic;
    private LocalDateTime timestamp;
    private List<SearchResult> initialResults;
    private List<SearchResult> refinedResults;
    private List<SearchResult> deepResults;
    private List<SearchResult> finalResults;
    private SearchSummary summary;
    private int totalResults;
    private double searchQuality;
    private String error;
    private SearchMetrics metrics;
    
    public DeepSearchResult() {}
    
    // Getters and setters
    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }
    
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
    
    public SearchSummary getSummary() { return summary; }
    public void setSummary(SearchSummary summary) { this.summary = summary; }
    
    public int getTotalResults() { return totalResults; }
    public void setTotalResults(int totalResults) { this.totalResults = totalResults; }
    
    public double getSearchQuality() { return searchQuality; }
    public void setSearchQuality(double searchQuality) { this.searchQuality = searchQuality; }
    
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
    
    public SearchMetrics getMetrics() { return metrics; }
    public void setMetrics(SearchMetrics metrics) { this.metrics = metrics; }
    
    /**
     * Check if search was successful
     */
    public boolean isSuccessful() {
        return error == null && finalResults != null && !finalResults.isEmpty();
    }
    
    /**
     * Get best results (top 5)
     */
    public List<SearchResult> getBestResults() {
        if (finalResults == null || finalResults.isEmpty()) {
            return List.of();
        }
        return finalResults.stream()
            .limit(5)
            .collect(java.util.stream.Collectors.toList());
    }
    
    /**
     * Get high-quality results (score > 0.8)
     */
    public List<SearchResult> getHighQualityResults() {
        if (finalResults == null) {
            return List.of();
        }
        return finalResults.stream()
            .filter(r -> r.getQualityScore() > 0.8)
            .collect(java.util.stream.Collectors.toList());
    }
    
    /**
     * Get results by source
     */
    public java.util.Map<String, List<SearchResult>> getResultsBySource() {
        if (finalResults == null) {
            return new java.util.HashMap<>();
        }
        return finalResults.stream()
            .collect(java.util.stream.Collectors.groupingBy(
                r -> r.getSource() != null ? r.getSource() : "Unknown"
            ));
    }
    
    /**
     * Get search statistics
     */
    public String getSearchStatistics() {
        if (!isSuccessful()) {
            return "Search failed: " + (error != null ? error : "Unknown error");
        }
        
        StringBuilder stats = new StringBuilder();
        stats.append("Topic: ").append(topic).append("\n");
        stats.append("Timestamp: ").append(timestamp).append("\n");
        stats.append("Total Results: ").append(totalResults).append("\n");
        stats.append("Search Quality: ").append(String.format("%.1f%%", searchQuality * 100)).append("\n");
        
        if (initialResults != null) {
            stats.append("Initial Results: ").append(initialResults.size()).append("\n");
        }
        if (refinedResults != null) {
            stats.append("Refined Results: ").append(refinedResults.size()).append("\n");
        }
        if (deepResults != null) {
            stats.append("Deep Analysis Results: ").append(deepResults.size()).append("\n");
        }
        
        return stats.toString();
    }
    
    @Override
    public String toString() {
        return String.format("DeepSearchResult{topic='%s', totalResults=%d, quality=%.2f}", 
                           topic, totalResults, searchQuality);
    }
}

/**
 * Search Summary with Analysis
 */
class SearchSummary {
    private String topic;
    private String analysis;
    private List<String> keyFindings;
    private List<String> credibleSources;
    private List<String> researchGaps;
    private LocalDateTime timestamp;
    private double confidenceScore;
    private List<String> recommendations;
    private java.util.Map<String, Object> metadata;
    
    public SearchSummary() {}
    
    // Getters and setters
    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }
    
    public String getAnalysis() { return analysis; }
    public void setAnalysis(String analysis) { this.analysis = analysis; }
    
    public List<String> getKeyFindings() { return keyFindings; }
    public void setKeyFindings(List<String> keyFindings) { this.keyFindings = keyFindings; }
    
    public List<String> getCredibleSources() { return credibleSources; }
    public void setCredibleSources(List<String> credibleSources) { this.credibleSources = credibleSources; }
    
    public List<String> getResearchGaps() { return researchGaps; }
    public void setResearchGaps(List<String> researchGaps) { this.researchGaps = researchGaps; }
    
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
    
    public double getConfidenceScore() { return confidenceScore; }
    public void setConfidenceScore(double confidenceScore) { this.confidenceScore = confidenceScore; }
    
    public List<String> getRecommendations() { return recommendations; }
    public void setRecommendations(List<String> recommendations) { this.recommendations = recommendations; }
    
    public java.util.Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(java.util.Map<String, Object> metadata) { this.metadata = metadata; }
    
    /**
     * Get summary as formatted text
     */
    public String getFormattedSummary() {
        StringBuilder formatted = new StringBuilder();
        formatted.append("=== SEARCH SUMMARY FOR: ").append(topic).append(" ===\n\n");
        
        if (analysis != null) {
            formatted.append("ANALYSIS:\n").append(analysis).append("\n\n");
        }
        
        if (keyFindings != null && !keyFindings.isEmpty()) {
            formatted.append("KEY FINDINGS:\n");
            keyFindings.forEach(finding -> formatted.append("• ").append(finding).append("\n"));
            formatted.append("\n");
        }
        
        if (credibleSources != null && !credibleSources.isEmpty()) {
            formatted.append("CREDIBLE SOURCES:\n");
            credibleSources.forEach(source -> formatted.append("• ").append(source).append("\n"));
            formatted.append("\n");
        }
        
        if (researchGaps != null && !researchGaps.isEmpty()) {
            formatted.append("RESEARCH GAPS:\n");
            researchGaps.forEach(gap -> formatted.append("• ").append(gap).append("\n"));
            formatted.append("\n");
        }
        
        if (recommendations != null && !recommendations.isEmpty()) {
            formatted.append("RECOMMENDATIONS:\n");
            recommendations.forEach(rec -> formatted.append("• ").append(rec).append("\n"));
        }
        
        formatted.append("\nConfidence Score: ").append(String.format("%.1f%%", confidenceScore * 100));
        
        return formatted.toString();
    }
    
    @Override
    public String toString() {
        return String.format("SearchSummary{topic='%s', confidence=%.2f}", 
                           topic, confidenceScore);
    }
}

/**
 * Search Metrics for Performance Analysis
 */
class SearchMetrics {
    private long startTime;
    private long endTime;
    private long durationMs;
    private int queriesGenerated;
    private int totalResultsFound;
    private int deepAnalysesPerformed;
    private double averageQualityScore;
    private int cacheHits;
    private int cacheMisses;
    
    public SearchMetrics() {
        this.startTime = System.currentTimeMillis();
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
    
    public int getDeepAnalysesPerformed() { return deepAnalysesPerformed; }
    public void setDeepAnalysesPerformed(int deepAnalysesPerformed) { this.deepAnalysesPerformed = deepAnalysesPerformed; }
    
    public double getAverageQualityScore() { return averageQualityScore; }
    public void setAverageQualityScore(double averageQualityScore) { this.averageQualityScore = averageQualityScore; }
    
    public int getCacheHits() { return cacheHits; }
    public void setCacheHits(int cacheHits) { this.cacheHits = cacheHits; }
    
    public int getCacheMisses() { return cacheMisses; }
    public void setCacheMisses(int cacheMisses) { this.cacheMisses = cacheMisses; }
    
    /**
     * Get cache hit rate
     */
    public double getCacheHitRate() {
        int total = cacheHits + cacheMisses;
        return total > 0 ? (double) cacheHits / total : 0.0;
    }
    
    /**
     * Get formatted performance report
     */
    public String getPerformanceReport() {
        StringBuilder report = new StringBuilder();
        report.append("=== SEARCH PERFORMANCE METRICS ===\n");
        report.append("Duration: ").append(durationMs).append("ms\n");
        report.append("Queries Generated: ").append(queriesGenerated).append("\n");
        report.append("Total Results: ").append(totalResultsFound).append("\n");
        report.append("Deep Analyses: ").append(deepAnalysesPerformed).append("\n");
        report.append("Average Quality: ").append(String.format("%.2f", averageQualityScore)).append("\n");
        report.append("Cache Hit Rate: ").append(String.format("%.1f%%", getCacheHitRate() * 100)).append("\n");
        
        return report.toString();
    }
}