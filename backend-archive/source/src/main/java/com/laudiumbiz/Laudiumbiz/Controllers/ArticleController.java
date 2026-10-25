/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Controllers;

import com.google.gson.Gson;
import com.laudiumbiz.Laudiumbiz.security.LauduimUserDetails;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.laudiumbiz.Laudiumbiz.Models.DB.Articles;
import com.laudiumbiz.Laudiumbiz.Models.ArticleRequest;
import com.laudiumbiz.Laudiumbiz.Models.ArticleResponse;
import com.laudiumbiz.Laudiumbiz.Models.DTO.ArticleQueryParams;
import com.laudiumbiz.Laudiumbiz.Models.DTO.PublishRequestDTO;
import com.laudiumbiz.Laudiumbiz.Services.ArticleService;
import com.laudiumbiz.Laudiumbiz.Services.OneSignalService;
import com.laudiumbiz.Laudiumbiz.Utils.ErrorHandlig;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

/**
 *
 * @author Imran
 */
@RestController
@RequestMapping ("/api/v1/articles")
@Validated
public class ArticleController {

  Gson gson = Utils.getGson();
  private final ErrorHandlig errorHandler;
  private final OneSignalService oneSignalService;
  private final ExecutorService virtualThreadExecutor;
  private final ArticleService articleService;

  public ArticleController(
      @Qualifier ("virtualThreadExecutor") ExecutorService virtualThreadExecutor,
      ErrorHandlig errorHandler,
      OneSignalService oneSignalService,
      ArticleService articleService) {
    this.virtualThreadExecutor = virtualThreadExecutor;
    this.errorHandler = errorHandler;
    this.oneSignalService = oneSignalService;
    this.articleService = articleService;
  }

  // Get all articles
  // @ModifiedByJunie 2025-10-19: Changed list ordering to newest-first
  @PostMapping (path = "", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> getAllArticles(
      @RequestBody ArticleQueryParams request
  ) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            Map<String, Object> response = articleService.getAllArticles(request);
            return ResponseEntity.ok().body(gson.toJson(response));
          } catch (Exception ex) {
            Logger.getLogger(ArticleController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  // Get articles feed with ads mixed in (every 3rd position)
  @PostMapping (path = "/feed", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> getArticleFeedWithAds(
      @RequestBody ArticleQueryParams request
  ) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            Map<String, Object> response = articleService.getArticleFeedWithAds(request);
            return ResponseEntity.ok().body(gson.toJson(response));
          } catch (Exception ex) {
            Logger.getLogger(ArticleController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  // Get article by ID
  @GetMapping (path = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> getArticleById(@PathVariable String id) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            ArticleResponse response = articleService.getArticleById(id);
            return ResponseEntity.ok().body(gson.toJson(response));
          } catch (Exception ex) {
            Logger.getLogger(ArticleController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  // Get article by slug
  @GetMapping (path = "/slug/{slug}", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> getArticleBySlug(@PathVariable String slug) {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            ArticleResponse response = articleService.getArticleBySlug(slug);
            return ResponseEntity.ok().body(gson.toJson(response));
          } catch (Exception ex) {
            Logger.getLogger(ArticleController.class.getName()).log(Level.SEVERE, ex.getMessage(), ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  // Create article
  // @ModifiedByJunie 2025-11-04: Allow author to be explicitly set via API using ArticleRequest.authorId
  @Async
  @PostMapping (path = "create")
  public ResponseEntity<?> createArticle(
      @RequestBody ArticleRequest req,
      @AuthenticationPrincipal LauduimUserDetails userDetails) {
    try {
      ArticleResponse response = articleService.createArticle(req, userDetails.getUser());
      return ResponseEntity.status(201).body(gson.toJson(response));
    } catch (Exception ex) {
      Logger.getLogger(ArticleController.class.getName()).log(Level.SEVERE, null, ex);
      return errorHandler.getError(ex);
    }
  }

  // Update article
  @PutMapping (path = "/{id}")
  public ResponseEntity<?> updateArticle(
      @Valid @PathVariable Integer id,
      @RequestBody ArticleRequest articleRequest,
      @AuthenticationPrincipal LauduimUserDetails userDetails
  ) {
    try {
      ArticleResponse response = articleService.updateArticle(id, articleRequest, userDetails.getUser());
      return ResponseEntity.status(201).body(gson.toJson(response));
    } catch (Exception ex) {
      Logger.getLogger(ArticleController.class.getName()).log(Level.SEVERE, null, ex);
      return errorHandler.getError(ex);
    }
  }

  // Delete article
  @DeleteMapping ("/{id}")
  public ResponseEntity<?> deleteArticle(@Valid @PathVariable Integer id) {
    try {
      articleService.deleteArticle(id);
      return ResponseEntity.ok().body("Deleted Successfully");
    } catch (Exception ex) {
      Logger.getLogger(ArticleController.class.getName()).log(Level.SEVERE, null, ex);
      return errorHandler.getError(ex);
    }
  }

  @GetMapping (path = "/stats", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> getStats() {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            Map<String, Long> stats = articleService.getStats();
            return ResponseEntity.ok().body(gson.toJson(stats));
          } catch (Exception ex) {
            Logger.getLogger(ArticleController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  // Get article count
  @GetMapping (path = "/count", produces = MediaType.APPLICATION_JSON_VALUE)
  public CompletableFuture<ResponseEntity<?>> getArticleCount() {
    return CompletableFuture.supplyAsync(
        () -> {
          try {
            long count = articleService.getArticleCount();
            return ResponseEntity.ok().body(gson.toJson(Map.of("count", count)));
          } catch (Exception ex) {
            Logger.getLogger(ArticleController.class.getName()).log(Level.SEVERE, null, ex);
            return errorHandler.getError(ex);
          }
        }, virtualThreadExecutor
    );
  }

  @GetMapping ("/scheduled-today")
  public ResponseEntity<?> getScheduledTodayArticles() {
    try {
      List<Articles> articles = articleService.getScheduledTodayArticles();
      return ResponseEntity.ok(gson.toJson(articles));
    } catch (Exception ex) {
      Logger.getLogger(ArticleController.class.getName()).log(Level.SEVERE, null, ex);
      return errorHandler.getError(ex);
    }
  }

  @PutMapping (path = "/publish-scheduled")
  public ResponseEntity<?> publishScheduledArticles(
      @RequestBody PublishRequestDTO request
  ) {
    try {
      int updatedCount = articleService.publishScheduledArticles(request);
      return ResponseEntity.ok(Map.of("updated", updatedCount));
    } catch (Exception ex) {
      Logger.getLogger(ArticleController.class.getName()).log(Level.SEVERE, null, ex);
      return errorHandler.getError(ex);
    }
  }

  @PostMapping ("/simulate-load")
  public CompletableFuture<String> simulateLoad() {
    return CompletableFuture.supplyAsync(
        () -> {
          System.out.println("Handled by: " + Thread.currentThread());
          return articleService.simulateLoad();
        }, virtualThreadExecutor
    );
  }

  @GetMapping ("/test-notifcation")
  public ResponseEntity<?> testNotification() {
    articleService.sendTestNotification();
    return ResponseEntity.ok("Sent");
  }

  @GetMapping ("/test-sp")
  public ResponseEntity<?> testStoredProcedure(
      @RequestParam (defaultValue = "0") int page,
      @RequestParam (defaultValue = "10") int size,
      @RequestParam (required = false) String search,
      @RequestParam (required = false) Integer category,
      @RequestParam (required = false) String status,
      @RequestParam (required = false) String type
  ) {
    try {
      Map<String, Object> response = articleService.testStoredProcedure(page, size, search, category, status, type);
      return ResponseEntity.ok().body(gson.toJson(response));
    } catch (Exception ex) {
      Logger.getLogger(ArticleController.class.getName()).log(Level.SEVERE, null, ex);
      return errorHandler.getError(ex);
    }
  }
}
