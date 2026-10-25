package com.laudiumbiz.Laudiumbiz.Controllers.ai;

import com.laudiumbiz.Laudiumbiz.Models.ArticleGenerated;
import com.laudiumbiz.Laudiumbiz.Models.DB.Articles;
import com.laudiumbiz.Laudiumbiz.Models.DB.Media;
import com.laudiumbiz.Laudiumbiz.Models.DB.SourceArticles;
import com.laudiumbiz.Laudiumbiz.Models.DTO.*;
import com.laudiumbiz.Laudiumbiz.Models.SourceArticle;
import com.laudiumbiz.Laudiumbiz.Services.AiArticlePersistenceService;
import com.laudiumbiz.Laudiumbiz.Services.CloudinaryService;
import com.laudiumbiz.Laudiumbiz.Services.GPTService;
import com.laudiumbiz.Laudiumbiz.Services.NewsAIService;
import com.laudiumbiz.Laudiumbiz.Services.EmailService;
import com.laudiumbiz.Laudiumbiz.Services.TavilySearchService;
import com.laudiumbiz.Laudiumbiz.Utils.ErrorHandlig;
import com.laudiumbiz.Laudiumbiz.Utils.PromptBuilderFromSource;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ExecutorService;

/**
 * Controller for Gemini API endpoints
 *
 * Endpoints:
 * - GET  /sourceArticles/all?deepSearch=true - Returns Gemini source articles, optionally merged with Tavily deep-search results
 * - POST /generate-article                   - Generates article using Gemini API with GoogleSearch tool
 * - POST /generate-article/by-id             - Generates and persists an article from a SourceArticles ID
 * - POST /generate-articles/bulk             - Fire-and-forget bulk article generation
 * - POST /refine-article/{sourceId}          - Refines an existing article from a SourceArticles ID
 *
 * @author Junie
 */
@RestController
@RequestMapping("/api/v1/gemini")
@Validated
public class GeminiController implements AiController {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(GeminiController.class);
    private static final String DEEP_SEARCH_QUERY = "Laudium South Africa community news";

    private final NewsAIService newsAIService;
    private final ErrorHandlig errorHandler;
    private final GPTService gptService;
    private final CloudinaryService cloudinaryService;
    private final ExecutorService virtualThreadExecutor;
    private final EmailService emailService;
    private final AiArticlePersistenceService aiArticlePersistenceService;
    private final TavilySearchService tavilySearchService;

    public GeminiController(@Qualifier ("geminiService") NewsAIService newsAIService,
                            ErrorHandlig errorHandler,
                            GPTService gptService,
                            CloudinaryService cloudinaryService,
                            @Qualifier("virtualThreadExecutor") ExecutorService virtualThreadExecutor,
                            EmailService emailService,
                            AiArticlePersistenceService aiArticlePersistenceService,
                            TavilySearchService tavilySearchService) {
        this.newsAIService = newsAIService;
        this.errorHandler = errorHandler;
        this.gptService = gptService;
        this.cloudinaryService = cloudinaryService;
        this.virtualThreadExecutor = virtualThreadExecutor;
        this.emailService = emailService;
        this.aiArticlePersistenceService = aiArticlePersistenceService;
        this.tavilySearchService = tavilySearchService;
    }

    /**
     * Endpoint to generate an article using Gemini API with GoogleSearch tool
     * 
     * @param request DTO containing the prompt
     * @return Generated article
     * @throws IOException If there's an error in the API call
     */
    @PostMapping(path = "/generate-article", produces = MediaType.APPLICATION_JSON_VALUE)
    @Override
    public ResponseEntity<?> generateArticle(@Valid @RequestBody PromptRequest request) throws IOException {
        ArticleGenerated generated = newsAIService.generateArticle(request.getPrompt());
        return ResponseEntity.ok(generated);
    }

  /**
   * Endpoint to refine a source article using ChatGPT
   */
  @PostMapping(path = "/refine-article/{sourceId}")
  public ResponseEntity<?> refineArticleById(
      @Valid @RequestBody ArticleRefinementRequest request,
      Integer sourceId
  ){
    try{
      SourceArticles source = aiArticlePersistenceService.findSourceArticle(sourceId).orElse(null);
      if(source == null || source.getId()==null){
        throw new NoSuchElementException("Source Article not found: " + sourceId);
      }
      var article = aiArticlePersistenceService.findArticle(request.articleId()).orElse(null);
      if(article == null || article.getId()==null){
        throw new NoSuchElementException("Article not found: " + request.articleId());
      }

      String prompt = PromptBuilderFromSource.refine(source, article, request.prompt());
      ArticleGenerated generated = newsAIService.generateArticle(prompt);
      article.setContent(generated.getArticle());
      article.setUpdated_at(LocalDateTime.now());
      article = aiArticlePersistenceService.saveArticle(article);
      return ResponseEntity.ok(DraftArticleResponse.builder()
                                                   .articleEntity(article)
                                                   .sourceId(sourceId)
                                                   .sources(
                                                       generated.getSources() == null
                                                           ? List.of()
                                                           : Arrays.asList(generated.getSources()))
                                                   .build());
    } catch (Exception e) {
      return errorHandler.getError(e);
    }
  }

    /**
     * Generate an article by SourceArticles ID and persist as draft, then mark source as processed.
     */
    @PostMapping(path = "/generate-article/by-id", produces = MediaType.APPLICATION_JSON_VALUE)
    @Override
    public ResponseEntity<?> generateArticleById(@Valid @RequestBody ArticleByIdRequest request) throws IOException {
        try {
            if (request == null || request.getId() == null) throw new IllegalArgumentException("id is required");
            SourceArticles sa = aiArticlePersistenceService.findSourceArticle(request.getId()).orElse(null);
            if (sa == null) throw new NoSuchElementException("SourceArticle not found: " + request.getId());

            String prompt = PromptBuilderFromSource.build(sa);
            ArticleGenerated generated = newsAIService.generateArticle(prompt);

            Articles article = new Articles();
            article.setTitle(generated.getTitle());
            article.setSlug(Optional.ofNullable(generated.getSlug()).orElseGet(() -> slugify(generated.getTitle())));
            article.setSummary(generated.getSummary());
            article.setContent(generated.getArticle());
            article.setStatus("draft");
            article.setArchived(false);
            article.setCreated_at(LocalDateTime.now());
            article.setUpdated_at(LocalDateTime.now());

            // Generate image, upload to Cloudinary and link as cover
            Integer coverMediaId = null;
            String coverUrl = null;
            try {
                String base64 = gptService.generateImage(article.getTitle(), null, null, 1);
                String imageUrl = cloudinaryService.uploadImage(base64);
                Media media = aiArticlePersistenceService.saveMedia(imageUrl);
                coverMediaId = media.getId();
                coverUrl = imageUrl;
                article.setCover_id(coverMediaId);
            } catch (Exception ie) {
                // Ignore image errors; continue with article draft
            }

            sa.setProcessing_status("processed");
            sa.setUpdated_at(LocalDateTime.now());
            article = aiArticlePersistenceService.saveArticle(article);
            sa = aiArticlePersistenceService.saveSourceArticle(sa);
          return ResponseEntity.ok(DraftArticleResponse.builder()
                                                       .articleEntity(article)
                                                       .sourceId(request.getId())
                                                       .coverMediaId(coverMediaId)
                                                       .coverUrl(coverUrl)
                                                       .sources(Arrays.asList(generated.getSources()))
                                                       .build());

        } catch (Exception e) {
            return errorHandler.getError(e);
        }
    }

    /**
     * Bulk create articles from SourceArticles IDs.
     */
    @PostMapping(path = "/generate-articles/bulk", produces = MediaType.APPLICATION_JSON_VALUE)
    @Override
    public ResponseEntity<?> createMultipleArticles(@Valid @RequestBody BulkArticleByIdsRequest request) throws IOException {
        try {
            List<Integer> ids = (request != null && request.getIds() != null) ? request.getIds() : Collections.emptyList();
            if (ids.isEmpty()) throw new IllegalArgumentException("ids must not be empty");
            List<Integer> uniqueIds = new ArrayList<>(new LinkedHashSet<>(ids));

            String email = (request != null && request.getEmail() != null && !request.getEmail().isBlank()) ? request.getEmail() : null;

            // Fire-and-forget background processing
            java.util.concurrent.CompletableFuture.runAsync(() -> {
                int success = 0;
                java.util.List<Integer> failedIds = new java.util.ArrayList<>();
                for (Integer id : uniqueIds) {
                    try {
                        SourceArticles sa = aiArticlePersistenceService.findSourceArticle(id).orElse(null);
                        if (sa == null) throw new NoSuchElementException("SourceArticle not found: " + id);

                        String prompt = PromptBuilderFromSource.build(sa);
                        ArticleGenerated generated = newsAIService.generateArticle(prompt);

                        Articles article = new Articles();
                        article.setTitle(generated.getTitle());
                        article.setSlug(Optional.ofNullable(generated.getSlug()).orElseGet(() -> slugify(generated.getTitle())));
                        article.setSummary(generated.getSummary());
                        article.setContent(generated.getArticle());
                        article.setStatus("draft");
                        article.setArchived(false);
                        article.setCreated_at(LocalDateTime.now());
                        article.setUpdated_at(LocalDateTime.now());
                        article = aiArticlePersistenceService.saveArticle(article);

                        // Generate image, upload to Cloudinary and link as cover
                        try {
                            Integer coverMediaId = null;
                            String base64 = gptService.generateImage(article.getTitle(), null, null, 1);
                            String imageUrl = cloudinaryService.uploadImage(base64);
                            Media media = aiArticlePersistenceService.saveMedia(imageUrl);
                            coverMediaId = media.getId();
                            article.setCover_id(coverMediaId);
                            article = aiArticlePersistenceService.saveArticle(article);
                        } catch (Exception ie) {
                            // Ignore image errors; continue with article draft
                        }

                        sa.setProcessing_status("processed");
                        sa.setUpdated_at(LocalDateTime.now());
                        sa = aiArticlePersistenceService.saveSourceArticle(sa);
                        success++;
                    } catch (Exception ex) {
                        failedIds.add(id);
                        logger.error("[Gemini bulk] Error processing id={}: {}", id, ex.getMessage());
                    }
                }
                try {
                    if (email != null) {
                        emailService.sendBulkSummary(email, "gemini", uniqueIds.size(), success, failedIds);
                    }
                } catch (Exception ignore) {}
            }, virtualThreadExecutor);

            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "processing");
            resp.put("totalRequested", uniqueIds.size());
            resp.put("ids", uniqueIds);
            return ResponseEntity.accepted().body(resp);
        } catch (Exception e) {
            return errorHandler.getError(e);
        }
    }

    /**
     * Endpoint to fetch all source articles (synchronous).
     * When {@code deepSearch=true}, Tavily advanced search results are appended to the provider list.
     */
    @GetMapping(path = "/sourceArticles/all", produces = MediaType.APPLICATION_JSON_VALUE)
    // @ModifiedByJunie 2026-07-08
    @Override
    public ResponseEntity<?> getAllSourceArticles(
            @RequestParam(defaultValue = "false") boolean deepSearch) {
        try {
            List<SourceArticle> articles = newsAIService.sourceAll();
            if (deepSearch && tavilySearchService.isConfigured()) {
                articles = tavilySearchService.mergeDeepSearchResults(articles, DEEP_SEARCH_QUERY);
            }
            SourceArticleResponse response = new SourceArticleResponse(articles);
            return ResponseEntity.ok().body(response);
        } catch (Exception e) {
            return errorHandler.getError(e);
        }
    }

    private String slugify(String title) {
        if (title == null) return "generated-article";
        return title.toLowerCase()
                .replaceAll("\\s+", "-")
                .replaceAll("[^a-z0-9-]", "")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }
}