package com.minimax.examples.search.laudium;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

/**
 * Search Result Cache for Laudium Community Search
 * 
 * Specialized caching system for Laudium community search results with
 * community relevance tracking and emergency result handling.
 * 
 * @author MiniMax Agent
 * @version 2.0.0 - Laudium Community Edition
 */
class LaudiumSearchCache {
    private final ConcurrentHashMap<String, CacheEntry> cache;
    private final Duration defaultExpiration;
    private final Duration emergencyExpiration;
    private int maxSize;
    private int hits;
    private int misses;
    private int communityRelevantHits;
    private int emergencyCacheHits;
    
    public LaudiumSearchCache() {
        this(Duration.ofHours(1), Duration.ofMinutes(15), 1000);
    }
    
    public LaudiumSearchCache(Duration defaultExpiration, Duration emergencyExpiration, int maxSize) {
        this.cache = new ConcurrentHashMap<>();
        this.defaultExpiration = defaultExpiration;
        this.emergencyExpiration = emergencyExpiration;
        this.maxSize = maxSize;
        this.hits = 0;
        this.misses = 0;
        this.communityRelevantHits = 0;
        this.emergencyCacheHits = 0;
    }
    
    /**
     * Store a search result in cache with community relevance
     */
    public void put(String key, SearchResult result, Duration expiration, boolean isEmergency, double communityRelevance) {
        if (cache.size() >= maxSize) {
            evictOldest();
        }
        
        Duration exp = expiration != null ? expiration : defaultExpiration;
        CacheEntry entry = new CacheEntry(result, LocalDateTime.now().plus(exp), isEmergency, communityRelevance);
        cache.put(key, entry);
    }
    
    /**
     * Store a search result with default expiration
     */
    public void put(String key, SearchResult result) {
        put(key, result, defaultExpiration, false, 0.5);
    }
    
    /**
     * Store emergency search result
     */
    public void putEmergencyResult(String key, SearchResult result, double communityRelevance) {
        put(key, result, emergencyExpiration, true, communityRelevance);
    }
    
    /**
     * Retrieve a cached search result
     */
    public SearchResult get(String key) {
        CacheEntry entry = cache.get(key);
        
        if (entry == null) {
            misses++;
            return null;
        }
        
        if (entry.isExpired()) {
            cache.remove(key);
            misses++;
            return null;
        }
        
        hits++;
        
        // Track community-relevant hits
        if (entry.getCommunityRelevance() > 0.7) {
            communityRelevantHits++;
        }
        
        // Track emergency cache hits
        if (entry.isEmergency()) {
            emergencyCacheHits++;
        }
        
        return entry.getResult();
    }
    
    /**
     * Get cached Laudium search result
     */
    public LaudiumSearchResult getLaudiumResult(String topic, LaudiumSearchConfig config) {
        String key = generateLaudiumCacheKey(topic, config);
        return getLaudiumResult(key);
    }
    
    /**
     * Store Laudium search result
     */
    public void putLaudiumResult(String topic, LaudiumSearchConfig config, LaudiumSearchResult result) {
        String key = generateLaudiumCacheKey(topic, config);
        Duration expiration = config.isEmergencyConfiguration() ? emergencyExpiration : defaultExpiration;
        CacheEntry entry = new CacheEntry(result, LocalDateTime.now().plus(expiration), 
                                        config.isEmergencyConfiguration(), result.getCommunityRelevance());
        cache.put(key, entry);
    }
    
    private LaudiumSearchResult getLaudiumResult(String key) {
        CacheEntry entry = cache.get(key);
        
        if (entry == null) {
            misses++;
            return null;
        }
        
        if (entry.isExpired()) {
            cache.remove(key);
            misses++;
            return null;
        }
        
        hits++;
        
        if (entry.getCommunityRelevance() > 0.7) {
            communityRelevantHits++;
        }
        
        if (entry.isEmergency()) {
            emergencyCacheHits++;
        }
        
        return (LaudiumSearchResult) entry.getResult();
    }
    
    /**
     * Generate cache key for Laudium topic and config
     */
    private String generateLaudiumCacheKey(String topic, LaudiumSearchConfig config) {
        return String.format("laudium_search:%s:depth:%s:quality:%.2f:community:%.2f:emergency:%s", 
                           topic.toLowerCase().replaceAll("\\s+", "_"),
                           config.getDepth(),
                           config.getMinQualityScore(),
                           config.getMinCommunityRelevance(),
                           config.isEmergencyConfiguration());
    }
    
    /**
     * Clear expired entries
     */
    public void clearExpired() {
        cache.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }
    
    /**
     * Clear all cache entries
     */
    public void clear() {
        cache.clear();
    }
    
    /**
     * Clear emergency cache entries
     */
    public void clearEmergencyCache() {
        cache.entrySet().removeIf(entry -> entry.getValue().isEmergency());
    }
    
    /**
     * Get cache statistics with community focus
     */
    public LaudiumCacheStatistics getStatistics() {
        int total = hits + misses;
        double hitRate = total > 0 ? (double) hits / total : 0.0;
        double communityHitRate = hits > 0 ? (double) communityRelevantHits / hits : 0.0;
        double emergencyHitRate = hits > 0 ? (double) emergencyCacheHits / hits : 0.0;
        
        return new LaudiumCacheStatistics(
            cache.size(),
            maxSize,
            hits,
            misses,
            hitRate,
            getExpiredCount(),
            communityRelevantHits,
            communityHitRate,
            emergencyCacheHits,
            emergencyHitRate
        );
    }
    
    /**
     * Count expired entries
     */
    private int getExpiredCount() {
        return (int) cache.values().stream()
            .filter(CacheEntry::isExpired)
            .count();
    }
    
    /**
     * Count emergency entries
     */
    public int getEmergencyCacheSize() {
        return (int) cache.values().stream()
            .filter(CacheEntry::isEmergency)
            .count();
    }
    
    /**
     * Count community-relevant cached entries
     */
    public int getCommunityRelevantCacheSize() {
        return (int) cache.values().stream()
            .filter(entry -> entry.getCommunityRelevance() > 0.7)
            .count();
    }
    
    /**
     * Evict oldest entries when cache is full
     */
    private void evictOldest() {
        // Remove 10% of oldest entries, prioritizing non-emergency and low community relevance
        int toRemove = Math.max(1, maxSize / 10);
        
        cache.entrySet().stream()
            .sorted((entry1, entry2) -> {
                // Prioritize keeping emergency entries
                if (entry1.getValue().isEmergency() != entry2.getValue().isEmergency()) {
                    return entry2.getValue().isEmergency() ? 1 : -1;
                }
                
                // Then prioritize community relevance
                double relevance1 = entry1.getValue().getCommunityRelevance();
                double relevance2 = entry2.getValue().getCommunityRelevance();
                if (relevance1 != relevance2) {
                    return Double.compare(relevance2, relevance1);
                }
                
                // Finally by creation time
                return entry1.getValue().getCreatedTime().compareTo(entry2.getValue().getCreatedTime());
            })
            .skip(toRemove)
            .forEach(entry -> cache.remove(entry.getKey()));
    }
    
    /**
     * Cache Entry with Laudium community focus
     */
    private static class CacheEntry {
        private final Object result;
        private final LocalDateTime createdTime;
        private final LocalDateTime expirationTime;
        private final boolean isEmergency;
        private final double communityRelevance;
        
        public CacheEntry(Object result, LocalDateTime expirationTime, boolean isEmergency, double communityRelevance) {
            this.result = result;
            this.createdTime = LocalDateTime.now();
            this.expirationTime = expirationTime;
            this.isEmergency = isEmergency;
            this.communityRelevance = communityRelevance;
        }
        
        public Object getResult() {
            return result;
        }
        
        public LocalDateTime getCreatedTime() {
            return createdTime;
        }
        
        public LocalDateTime getExpirationTime() {
            return expirationTime;
        }
        
        public boolean isExpired() {
            return LocalDateTime.now().isAfter(expirationTime);
        }
        
        public boolean isEmergency() {
            return isEmergency;
        }
        
        public double getCommunityRelevance() {
            return communityRelevance;
        }
    }
    
    /**
     * Cache Statistics with Laudium Community Focus
     */
    public static class LaudiumCacheStatistics {
        private final int currentSize;
        private final int maxSize;
        private final int hits;
        private final int misses;
        private final double hitRate;
        private final int expiredCount;
        private final int communityRelevantHits;
        private final double communityHitRate;
        private final int emergencyCacheHits;
        private final double emergencyHitRate;
        
        public LaudiumCacheStatistics(int currentSize, int maxSize, int hits, int misses, double hitRate, 
                                    int expiredCount, int communityRelevantHits, double communityHitRate,
                                    int emergencyCacheHits, double emergencyHitRate) {
            this.currentSize = currentSize;
            this.maxSize = maxSize;
            this.hits = hits;
            this.misses = misses;
            this.hitRate = hitRate;
            this.expiredCount = expiredCount;
            this.communityRelevantHits = communityRelevantHits;
            this.communityHitRate = communityHitRate;
            this.emergencyCacheHits = emergencyCacheHits;
            this.emergencyHitRate = emergencyHitRate;
        }
        
        public int getCurrentSize() { return currentSize; }
        public int getMaxSize() { return maxSize; }
        public int getHits() { return hits; }
        public int getMisses() { return misses; }
        public double getHitRate() { return hitRate; }
        public int getExpiredCount() { return expiredCount; }
        public int getCommunityRelevantHits() { return communityRelevantHits; }
        public double getCommunityHitRate() { return communityHitRate; }
        public int getEmergencyCacheHits() { return emergencyCacheHits; }
        public double getEmergencyHitRate() { return emergencyHitRate; }
        
        public double getUtilizationRate() {
            return maxSize > 0 ? (double) currentSize / maxSize : 0.0;
        }
        
        @Override
        public String toString() {
            return String.format("LaudiumCacheStats{size=%d/%d, hits=%d, hitRate=%.1f%%, communityHits=%d, communityRate=%.1f%%, emergencyHits=%d, emergencyRate=%.1f%%}", 
                               currentSize, maxSize, hits, hitRate * 100, communityRelevantHits, 
                               communityHitRate * 100, emergencyCacheHits, emergencyHitRate * 100);
        }
    }
}