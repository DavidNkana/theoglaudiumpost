package com.minimax.examples.search;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.reactive.config.EnableWebFlux;

/**
 * MiniMax Web Search Application
 * 
 * This application provides comprehensive web search capabilities
 * using the MiniMax API, matching agent.minima.io functionality.
 * 
 * Features:
 * - Batch web search with concurrent processing
 * - Intelligent query generation
 * - Content extraction and analysis
 * - Streaming search results
 * - Caching and rate limiting
 * 
 * @author MiniMax Agent
 * @version 1.0.0
 */
@SpringBootApplication
@EnableCaching
@EnableAsync
@EnableWebFlux
public class MiniMaxSearchApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(MiniMaxSearchApplication.class, args);
        System.out.println("🚀 MiniMax Search API started successfully!");
        System.out.println("📡 Web Search endpoint: http://localhost:8080/api/search");
        System.out.println("💡 Health check: http://localhost:8080/api/search/health");
    }
}