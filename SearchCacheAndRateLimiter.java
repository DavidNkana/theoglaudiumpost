package com.minimax.examples.search.enhanced;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

/**
 * Search Result Cache
 * 
 * Provides intelligent caching for search results with expiration
 * and quality-based storage.
 * 
 * @author MiniMax Agent
 * @version 2.0.0
 */
class SearchCache {
    private final ConcurrentHashMap<String, CacheEntry> cache;
    private final Duration defaultExpiration;
    private int maxSize;
    private int hits;
    private int misses;
    
    public SearchCache() {
        this(Duration.ofHours(1), 1000);
    }
    
    public SearchCache(Duration expiration, int maxSize) {
        this.cache = new ConcurrentHashMap<>();
        this.defaultExpiration = expiration;
        this.maxSize = maxSize;
        this.hits = 0;
        this.misses = 0;
    }
    
    /**
     * Store a search result in cache
     */
    public void put(String key, SearchResult result, Duration expiration) {
        if (cache.size() >= maxSize) {
            evictOldest();
        }
        
        Duration exp = expiration != null ? expiration : defaultExpiration;
        CacheEntry entry = new CacheEntry(result, LocalDateTime.now().plus(exp));
        cache.put(key, entry);
    }
    
    /**
     * Store a search result with default expiration
     */
    public void put(String key, SearchResult result) {
        put(key, result, defaultExpiration);
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
        return entry.getResult();
    }
    
    /**
     * Get cached deep search result
     */
    public DeepSearchResult getDeepResult(String topic, SearchConfig config) {
        String key = generateCacheKey(topic, config);
        return getDeepResult(key);
    }
    
    /**
     * Store deep search result
     */
    public void putDeepResult(String topic, SearchConfig config, DeepSearchResult result) {
        String key = generateCacheKey(topic, config);
        CacheEntry entry = new CacheEntry(result, LocalDateTime.now().plus(defaultExpiration));
        cache.put(key, entry);
    }
    
    private DeepSearchResult getDeepResult(String key) {
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
        return (DeepSearchResult) entry.getResult();
    }
    
    /**
     * Generate cache key for topic and config
     */
    private String generateCacheKey(String topic, SearchConfig config) {
        return String.format("search:%s:depth:%s:quality:%.2f", 
                           topic.toLowerCase().replaceAll("\\s+", "_"),
                           config.getDepth(),
                           config.getMinQualityScore());
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
     * Get cache statistics
     */
    public CacheStatistics getStatistics() {
        int total = hits + misses;
        double hitRate = total > 0 ? (double) hits / total : 0.0;
        
        return new CacheStatistics(
            cache.size(),
            maxSize,
            hits,
            misses,
            hitRate,
            getExpiredCount()
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
     * Evict oldest entries when cache is full
     */
    private void evictOldest() {
        // Remove 10% of oldest entries
        int toRemove = Math.max(1, maxSize / 10);
        
        cache.entrySet().stream()
            .sorted(Map.Entry.comparingByValue(CacheEntry::getCreatedTime))
            .limit(toRemove)
            .forEach(entry -> cache.remove(entry.getKey()));
    }
    
    /**
     * Cache Entry with expiration
     */
    private static class CacheEntry {
        private final Object result;
        private final LocalDateTime createdTime;
        private final LocalDateTime expirationTime;
        
        public CacheEntry(Object result, LocalDateTime expirationTime) {
            this.result = result;
            this.createdTime = LocalDateTime.now();
            this.expirationTime = expirationTime;
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
    }
    
    /**
     * Cache Statistics
     */
    public static class CacheStatistics {
        private final int currentSize;
        private final int maxSize;
        private final int hits;
        private final int misses;
        private final double hitRate;
        private final int expiredCount;
        
        public CacheStatistics(int currentSize, int maxSize, int hits, int misses, double hitRate, int expiredCount) {
            this.currentSize = currentSize;
            this.maxSize = maxSize;
            this.hits = hits;
            this.misses = misses;
            this.hitRate = hitRate;
            this.expiredCount = expiredCount;
        }
        
        public int getCurrentSize() { return currentSize; }
        public int getMaxSize() { return maxSize; }
        public int getHits() { return hits; }
        public int getMisses() { return misses; }
        public double getHitRate() { return hitRate; }
        public int getExpiredCount() { return expiredCount; }
        
        public double getUtilizationRate() {
            return maxSize > 0 ? (double) currentSize / maxSize : 0.0;
        }
        
        @Override
        public String toString() {
            return String.format("CacheStats{size=%d/%d, hits=%d, misses=%d, hitRate=%.1f%%, expired=%d}", 
                               currentSize, maxSize, hits, misses, hitRate * 100, expiredCount);
        }
    }
}

/**
 * Rate Limiter for API calls
 * 
 * Implements token bucket algorithm for rate limiting.
 * 
 * @author MiniMax Agent
 * @version 2.0.0
 */
class RateLimiter {
    private final int maxTokens;
    private final long refillIntervalMs;
    private volatile long lastRefillTime;
    private volatile int availableTokens;
    
    public RateLimiter() {
        this(10, 1000); // 10 requests per second
    }
    
    public RateLimiter(int maxTokens, long refillIntervalMs) {
        this.maxTokens = maxTokens;
        this.refillIntervalMs = refillIntervalMs;
        this.lastRefillTime = System.currentTimeMillis();
        this.availableTokens = maxTokens;
    }
    
    /**
     * Try to acquire a token without blocking
     */
    public boolean tryAcquire() {
        refill();
        if (availableTokens > 0) {
            availableTokens--;
            return true;
        }
        return false;
    }
    
    /**
     * Acquire a token, blocking if necessary
     */
    public void acquire() throws InterruptedException {
        while (!tryAcquire()) {
            Thread.sleep(calculateWaitTime());
        }
    }
    
    /**
     * Acquire tokens for batch operations
     */
    public boolean tryAcquire(int tokens) {
        refill();
        if (availableTokens >= tokens) {
            availableTokens -= tokens;
            return true;
        }
        return false;
    }
    
    /**
     * Get available tokens
     */
    public int getAvailableTokens() {
        refill();
        return availableTokens;
    }
    
    /**
     * Reset rate limiter
     */
    public void reset() {
        lastRefillTime = System.currentTimeMillis();
        availableTokens = maxTokens;
    }
    
    /**
     * Refill tokens based on time passed
     */
    private synchronized void refill() {
        long now = System.currentTimeMillis();
        long timePassed = now - lastRefillTime;
        
        if (timePassed >= refillIntervalMs) {
            long tokensToAdd = (timePassed / refillIntervalMs) * maxTokens;
            availableTokens = Math.min(maxTokens, availableTokens + (int) tokensToAdd);
            lastRefillTime = now;
        }
    }
    
    /**
     * Calculate wait time for next token
     */
    private long calculateWaitTime() {
        return Math.max(1, refillIntervalMs / maxTokens);
    }
    
    /**
     * Get rate limiter statistics
     */
    public RateLimiterStatistics getStatistics() {
        return new RateLimiterStatistics(
            availableTokens,
            maxTokens,
            refillIntervalMs,
            maxTokens * 1000.0 / refillIntervalMs // requests per second
        );
    }
    
    /**
     * Rate Limiter Statistics
     */
    public static class RateLimiterStatistics {
        private final int availableTokens;
        private final int maxTokens;
        private final long refillIntervalMs;
        private final double requestsPerSecond;
        
        public RateLimiterStatistics(int availableTokens, int maxTokens, long refillIntervalMs, double requestsPerSecond) {
            this.availableTokens = availableTokens;
            this.maxTokens = maxTokens;
            this.refillIntervalMs = refillIntervalMs;
            this.requestsPerSecond = requestsPerSecond;
        }
        
        public int getAvailableTokens() { return availableTokens; }
        public int getMaxTokens() { return maxTokens; }
        public long getRefillIntervalMs() { return refillIntervalMs; }
        public double getRequestsPerSecond() { return requestsPerSecond; }
        
        public double getUtilizationRate() {
            return maxTokens > 0 ? 1.0 - (double) availableTokens / maxTokens : 0.0;
        }
        
        @Override
        public String toString() {
            return String.format("RateLimiterStats{tokens=%d/%d, rate=%.1f req/s, interval=%dms}", 
                               availableTokens, maxTokens, requestsPerSecond, refillIntervalMs);
        }
    }
}