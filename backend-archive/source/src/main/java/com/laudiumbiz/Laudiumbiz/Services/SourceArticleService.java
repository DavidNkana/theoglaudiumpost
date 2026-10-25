package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Models.SourceArticle;

import java.io.IOException;
import java.util.List;

/**
 * PURPOSE: Unified contract for retrieving source articles from various AI providers.
 * Provides a single interface for accessing source articles regardless of the underlying provider.
 *
 * KEY METHODS:
 * - sourceAll(): Retrieves a list of source articles using the provider's default strategy
 *
 * INTEGRATIONS: Multiple AI providers (implemented by concrete service classes)
 *
 * @deprecated Use NewsAIService instead which provides a more comprehensive interface
 */
public interface SourceArticleService {
    /**
     * Retrieve a list of source articles using the provider's default strategy.
     * Implementations should ground results appropriately and return a normalized list.
     *
     * @return list of source articles
     * @throws IOException on provider or parsing errors
     */
    List<SourceArticle> sourceAll() throws IOException;
}
