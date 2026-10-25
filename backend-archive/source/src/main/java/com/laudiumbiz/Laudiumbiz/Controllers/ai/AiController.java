package com.laudiumbiz.Laudiumbiz.Controllers.ai;

import com.laudiumbiz.Laudiumbiz.Models.DTO.ArticleRefinementRequest;
import com.laudiumbiz.Laudiumbiz.Models.DTO.PromptRequest;
import com.laudiumbiz.Laudiumbiz.Models.DTO.ArticleByIdRequest;
import com.laudiumbiz.Laudiumbiz.Models.DTO.BulkArticleByIdsRequest;
import org.springframework.http.ResponseEntity;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.RequestBody;

import java.io.IOException;

/**
 * AI Controller contract for common AI endpoints.
 */
public interface AiController {
  /**
   * Generate an article from a prompt.
   *
   * @param request prompt request DTO
   * @return ResponseEntity with generated article payload
   * @throws IOException in case of downstream errors
   */
  ResponseEntity<?> generateArticle(@Valid @RequestBody PromptRequest request) throws IOException;

  /**
   * Generate an article from a SourceArticles ID.
   */
  ResponseEntity<?> generateArticleById(@Valid @RequestBody ArticleByIdRequest request) throws IOException;

  /**
   * Refine already existing article by article ID.
   */
  ResponseEntity<?> refineArticleById(@Valid @RequestBody ArticleRefinementRequest request, Integer sourceId) throws IOException;

  /**
   * Generate multiple articles from SourceArticles IDs.
   */
  ResponseEntity<?> createMultipleArticles(@Valid @RequestBody BulkArticleByIdsRequest request) throws IOException;

  /**
   * Get all source articles for the given AI provider.
   *
   * @param deepSearch when true, implementations append Tavily advanced-search results
   *                   to the provider list (provider results first, Tavily appended after)
   * @return ResponseEntity with list of source articles
   */
  // @ModifiedByJunie 2026-07-08
  ResponseEntity<?> getAllSourceArticles(boolean deepSearch);
}
