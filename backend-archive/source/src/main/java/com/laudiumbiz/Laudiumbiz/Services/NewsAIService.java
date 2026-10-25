package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Models.ArticleGenerated;
import com.laudiumbiz.Laudiumbiz.Models.SourceArticle;

import java.io.IOException;
import java.util.List;

/**
 * PURPOSE: Unified interface for AI-powered news article generation and source article retrieval.
 * Provides a common contract for different AI provider implementations (Gemini, ChatGPT, Grok).
 *
 * KEY METHODS:
 * - generateArticle(String prompt): Generates a complete article from a prompt using AI
 * - sourceAll(): Retrieves a list of source articles from various platforms
 *
 * INTEGRATIONS: Multiple AI providers (implemented by concrete service classes)
 *
 * @see GeminiService
 * @see ChatGPTNewsService
 */
public interface NewsAIService {
    /**
     * Generate a full article based on the given prompt.
     * @param prompt input instructions/content for the model
     * @return structured generated article
     * @throws IOException on provider request or parsing errors
     */
    ArticleGenerated generateArticle(String prompt) throws IOException;

    /**
     * Retrieve a list of source articles using the provider's strategy.
     * @return list of normalized source articles
     * @throws IOException on provider request or parsing errors
     */
    List<SourceArticle> sourceAll() throws IOException;
}
