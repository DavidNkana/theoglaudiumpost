package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Exceptions.ItemNotFoundException;
import com.laudiumbiz.Laudiumbiz.Utils.CustomRs;
import com.google.gson.Gson;
import com.laudiumbiz.Laudiumbiz.Models.ArticleRequest;
import com.laudiumbiz.Laudiumbiz.Models.ArticleResponse;
import com.laudiumbiz.Laudiumbiz.Models.DB.*;
import com.laudiumbiz.Laudiumbiz.Models.DTO.ArticleQueryParams;
import com.laudiumbiz.Laudiumbiz.Models.DTO.PublishRequestDTO;
import com.laudiumbiz.Laudiumbiz.Repositories.ArticlesRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.MediaRepository;
import com.laudiumbiz.Laudiumbiz.Utils.LaudiumJdbcUtil;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import lombok.Getter;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * PURPOSE: Core service for managing news articles throughout their lifecycle.
 * Handles article CRUD operations, publishing workflow, scheduling, archiving, and integration with notifications and image services.
 *
 * KEY METHODS:
 * - getAllArticles(ArticleQueryParams request): Retrieves paginated articles with filtering by status, type, category, date range, and search
 * - getArticleById(String id): Fetches a single article by its database ID
 * - getArticleBySlug(String slug): Retrieves an article by its URL-friendly slug
 * - createArticle(ArticleRequest req, User publisher): Creates new articles with cover/thumbnail image handling
 * - updateArticle(Integer id, ArticleRequest articleRequest, User publisher): Updates existing articles including images
 * - deleteArticle(Integer id): Soft deletes articles by marking them as archived
 * - publishScheduledArticles(PublishRequestDTO request): Publishes scheduled articles based on date range or specific IDs
 * - getStats(): Returns article statistics (total, published, draft, scheduled, archived)
 *
 * INTEGRATIONS: OneSignalService (push notifications), CloudinaryService (image uploads)
 */
@Service
public class ArticleService {

  private final Gson gson = Utils.getGson();
  private final OneSignalService oneSignalService;
  private final CloudinaryService cloudinaryService;
  private final ExecutorService virtualThreadExecutor;
  private final ArticlesRepository articlesRepository;
  private final MediaRepository mediaRepository;
  private static final Logger logger = Logger.getLogger(ArticleService.class.getName());

  public ArticleService(
      @Qualifier ("virtualThreadExecutor") ExecutorService virtualThreadExecutor,
      OneSignalService oneSignalService,
      CloudinaryService cloudinaryService,
      ArticlesRepository articlesRepository,
      MediaRepository mediaRepository) {
    this.virtualThreadExecutor = virtualThreadExecutor;
    this.oneSignalService = oneSignalService;
    this.cloudinaryService = cloudinaryService;
    this.articlesRepository = articlesRepository;
    this.mediaRepository = mediaRepository;
  }

  private static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

  public Map<String, Object> getAllArticles(ArticleQueryParams request) {
    CustomRs countRs = null;
    CustomRs rs = null;
    CustomRs dataRs = null;
    try {
      int page = request.getPage();
      int size = request.getSize();
      String search = request.getSearch();
      Integer category = request.getCategory();
      String status = request.getStatus();
      String type = request.getType();
      LocalDateTime startDate = request.getStartDate();
      LocalDateTime endDate = request.getEndDate();

      // Build query using raw SQL
      var articlesQuery = new StringBuilder("SELECT * FROM articles WHERE 1=1");

      // Apply status filter
      if (status != null && !status.isBlank()) {
        switch (status) {
          case "archived" -> articlesQuery.append(" AND archived = 1");
          case "published" -> articlesQuery.append(" AND status = 'published' AND scheduled_for <= NOW()");
          case "draft" -> articlesQuery.append(" AND status = 'draft'");
          case "scheduled" -> articlesQuery.append(" AND status = 'scheduled' AND scheduled_for > NOW()");
        }
      } else {
        articlesQuery.append(" AND archived = 0");
      }

      // Apply search filter
      if (search != null && !search.isBlank()) {
        articlesQuery.append(" AND (")
                     .append("title LIKE '%").append(search).append("%' ")
                     .append("OR summary LIKE '%").append(search).append("%')");
      }

      // Apply type filter
      if (type != null && !type.isBlank()) {
        articlesQuery.append(" AND article_type = '").append(type).append("'");
      }

      if (category != null) {
        articlesQuery.append(" AND category_id = '").append(category).append("'");
      }
      // Apply date filter
      if (startDate != null && endDate != null) {
        articlesQuery.append(" AND scheduled_for BETWEEN '").append(startDate.format(DTF)).append("' AND '").append(endDate.format(DTF)).append("'");
      } else if (startDate != null) {
        articlesQuery.append(" AND DATETIME(scheduled_for) >= DATETIME('").append(startDate.format(DTF)).append("')");
      } else if (endDate != null) {
        articlesQuery.append(" AND DATETIME(scheduled_for) <= DATETIME('").append(endDate.format(DTF)).append("')");
      }

      // Count query
      StringBuilder countSql = new StringBuilder("SELECT COUNT(*) as total FROM articles WHERE 1=1");
      if (status != null && !status.isBlank()) {
        switch (status) {
          case "archived" -> countSql.append(" AND archived = 1");
          case "published" -> countSql.append(" AND status = 'published' AND scheduled_for <= NOW()");
          case "draft" -> countSql.append(" AND status = 'draft'");
          case "scheduled" -> countSql.append(" AND status = 'scheduled' AND scheduled_for > NOW()");
        }
      } else {
        countSql.append(" AND archived = 0");
      }
      // Each filter is independent - use if (not else if) so all applicable filters are applied
      if (search != null && !search.isBlank()) {
        countSql.append(" AND (title LIKE ? OR summary LIKE ?)");
      }
      if (type != null && !type.isBlank()) {
        countSql.append(" AND article_type = ?");
      }
      if (category != null) {
        countSql.append(" AND category_id = ?");
      }

      // Execute count query - all filter combinations now handled correctly
      if (search != null && !search.isBlank() && type != null && !type.isBlank() && category != null) {
        countRs = LaudiumJdbcUtil.getSelectRawPrepared(countSql.toString(),
            "%" + search + "%", "%" + search + "%", type, category);
      } else if (search != null && !search.isBlank() && type != null && !type.isBlank()) {
        countRs = LaudiumJdbcUtil.getSelectRawPrepared(countSql.toString(),
            "%" + search + "%", "%" + search + "%", type);
      } else if (search != null && !search.isBlank() && category != null) {
        countRs = LaudiumJdbcUtil.getSelectRawPrepared(countSql.toString(),
            "%" + search + "%", "%" + search + "%", category);
      } else if (type != null && !type.isBlank() && category != null) {
        countRs = LaudiumJdbcUtil.getSelectRawPrepared(countSql.toString(), type, category);
      } else if (search != null && !search.isBlank()) {
        countRs = LaudiumJdbcUtil.getSelectRawPrepared(countSql.toString(),
            "%" + search + "%", "%" + search + "%");
      } else if (type != null && !type.isBlank()) {
        countRs = LaudiumJdbcUtil.getSelectRawPrepared(countSql.toString(), type);
      } else if (category != null) {
        countRs = LaudiumJdbcUtil.getSelectRawPrepared(countSql.toString(), category);
      } else {
        countRs = LaudiumJdbcUtil.getSelectRaw(countSql.toString());
      }

      long total = 0;
      if (countRs.next()) {
        total = countRs.getLong("total");
      }

      // Apply pagination
      articlesQuery.append(" ORDER BY COALESCE(scheduled_for, created_at) DESC, id DESC");
      articlesQuery.append(" LIMIT ").append(size).append(" OFFSET ").append(page * size);

      // Execute main query
      rs = LaudiumJdbcUtil.getSelectRaw(articlesQuery.toString());
      List<Articles> articlesList = new ArrayList<>();
      while (rs.next()) {
        Articles article = mapRsToArticle(rs);
        articlesList.add(article);
      }

      if (articlesList.isEmpty()) {
        Map<String, Object> emptyResponse = new HashMap<>();
        emptyResponse.put("articles", new ArrayList<ArticleResponse>());
        emptyResponse.put("total", total);
        emptyResponse.put("page", page);
        emptyResponse.put("size", size);
        emptyResponse.put("totalPages", (int) Math.ceil((double) total / size));
        return emptyResponse;
      }

      // Build article IDs for fetching author/category data
      String articleIds = articlesList.stream()
                                      .map(a -> "'%s'".formatted(a.getId()))
                                      .collect(Collectors.joining(","));
      var articleDataQuery = """
          SELECT
           a.id AS article_id,
           cat.id AS category_id,
           cat.name AS category_name,
           cat.slug AS category_slug,
           cat.is_deleted,
           u.id AS author_id,
           u.name AS author_name,
           u.email AS author_email,
           u.`status` AS author_status
          FROM articles a
          LEFT JOIN categories cat ON cat.id = a.category_id
          LEFT JOIN users u ON u.id = a.author_id
          WHERE a.id IN (%s)
          """.formatted(articleIds);

      Map<Integer, ArticleData> dataMap = new HashMap<>();
      dataRs = LaudiumJdbcUtil.getSelectRaw(articleDataQuery);
      while (dataRs.next()) {
        ArticleData ad = new ArticleData();
        ad.setUser(User.builder()
            .id(dataRs.getInt("author_id"))
            .name(dataRs.getString("author_name"))
            .email(dataRs.getString("author_email"))
            .build());
        ad.setCategory(Category.builder()
            .id(dataRs.getInt("category_id"))
            .name(dataRs.getString("category_name"))
            .slug(dataRs.getString("category_slug"))
            .is_deleted(dataRs.getBoolean("is_deleted"))
            .build());
        dataMap.put(dataRs.getInt("article_id"), ad);
      }

      // Convert to ArticleResponse objects
      List<ArticleResponse> articles = new ArrayList<>();
      for (Articles article : articlesList) {
        article.setCover(null);
        article.setThumbnail(null);
        var aData = dataMap.getOrDefault(article.getId(), new ArticleData());
        article.setAuthor(aData.getUser());
        article.setCategory(aData.getCategory());
        ArticleResponse dto = toArticleResponse(article);
        articles.add(dto);
      }

      Map<String, Object> response = new HashMap<>();
      response.put("articles", articles);
      response.put("total", total);
      response.put("page", page);
      response.put("size", size);
      response.put("totalPages", (int) Math.ceil((double) total / size));

      return response;
    } catch (Exception ex) {
      logger.log(Level.SEVERE, "getAllArticles: FAILED with type=" + ex.getClass().getName() + " message=" + ex.getMessage(), ex);
      throw new RuntimeException("Error getting articles", ex);
    } finally {
      try {
        if (countRs != null) countRs.close();
      } catch (Exception ignored) {}
      try {
        if (rs != null) rs.close();
      } catch (Exception ignored) {}
      try {
        if (dataRs != null) dataRs.close();
      } catch (Exception ignored) {}
    }
  }

  private Articles mapRsToArticle(CustomRs rs) throws Exception {
    Articles article = new Articles();
    article.setId(rs.getInt("id"));
    article.setTitle(rs.getString("title"));
    article.setSlug(rs.getString("slug"));
    article.setSummary(rs.getString("summary"));
    article.setContent(rs.getString("content"));
    article.setArticle_type(rs.getString("article_type"));
    article.setCover_id(rs.getInt("cover_id"));
    article.setThumbnail_id(rs.getInt("thumbnail_id"));
    article.setCategory_id(rs.getInt("category_id"));
    article.setAuthor_id(rs.getInt("author_id"));
    article.setArchived(rs.getBoolean("archived"));
    article.setStatus(rs.getString("status"));
    article.setSources(rs.getString("sources"));
    article.setScheduled_for(rs.getTimestamp("scheduled_for") != null
            ? rs.getTimestamp("scheduled_for").toLocalDateTime() : null);
    article.setCreated_at(rs.getTimestamp("created_at") != null
            ? rs.getTimestamp("created_at").toLocalDateTime() : null);
    article.setUpdated_at(rs.getTimestamp("updated_at") != null
            ? rs.getTimestamp("updated_at").toLocalDateTime() : null);
    return article;
  }

  public ArticleResponse getArticleById(String id) {
    try {
      Articles article = articlesRepository.findById(Integer.parseInt(id))
          .orElseThrow(() -> new ItemNotFoundException("Article Not Found"));
      return toArticleResponse(article);
    } catch (ItemNotFoundException ex) {
      throw ex;
    } catch (Exception ex) {
      logger.log(Level.SEVERE, ex.getMessage(), ex);
      throw new RuntimeException("Error getting article by ID", ex);
    }
  }

  public ArticleResponse getArticleBySlug(String slug) {
    try {
      Articles article = articlesRepository.findBySlug(slug)
          .orElseThrow(() -> new ItemNotFoundException("Article Not Found"));
      return toArticleResponse(article);
    } catch (ItemNotFoundException ex) {
      throw ex;
    } catch (Exception ex) {
      logger.log(Level.SEVERE, ex.getMessage(), ex);
      throw new RuntimeException("Error getting article by slug", ex);
    }
  }

  public ArticleResponse createArticle(ArticleRequest req, User publisher) {
    try {
      // Handle cover image
      String coverImageBase64 = req.getCoverImage();
      String thumbnailImageBase64 = req.getThumbnailImage();

      Integer coverImageId = null;
      Integer thumbnailImageId = null;

      // Handle cover image
      if (coverImageBase64 != null && !coverImageBase64.isBlank()) {
        try {
          String imageUrl = cloudinaryService.uploadImage(coverImageBase64);
          Media media = new Media();
          media.setFile(imageUrl);
          media = mediaRepository.save(media);
          coverImageId = media.getId();
        } catch (IOException e) {
          logger.log(Level.SEVERE, "Error uploading cover image to Cloudinary", e);
          throw new RuntimeException("Error uploading cover image", e);
        }
      }

      // Handle thumbnail image
      if (thumbnailImageBase64 != null && !thumbnailImageBase64.isBlank()) {
        try {
          String imageUrl = cloudinaryService.uploadImage(thumbnailImageBase64);
          Media media = new Media();
          media.setFile(imageUrl);
          media = mediaRepository.save(media);
          thumbnailImageId = media.getId();
        } catch (IOException e) {
          logger.log(Level.SEVERE, "Error uploading thumbnail image to Cloudinary", e);
          throw new RuntimeException("Error uploading thumbnail image", e);
        }
      }

      // Create article
      Articles article = new Articles();
      article.setTitle(req.getTitle());
      article.setSlug(req.getSlug());
      article.setSummary(req.getSummary());
      article.setContent(req.getContent());

      if (coverImageId != null) {
        article.setCover_id(coverImageId);
      }

      if (thumbnailImageId != null) {
        article.setThumbnail_id(thumbnailImageId);
      }

      article.setCategory_id(req.getCategoryId());

      // Allow author to be set via API; fall back to the authenticated publisher if not provided or invalid
      try {
        if (req.getAuthorId() != null && !req.getAuthorId().isBlank()) {
          article.setAuthor_id(Integer.parseInt(req.getAuthorId().trim()));
        } else {
          article.setAuthor_id(publisher.getId());
        }
      } catch (NumberFormatException nfe) {
        article.setAuthor_id(publisher.getId());
      }
      article.setStatus(req.getStatus().name());
      article.setArchived(false);
      article.setScheduled_for(req.getScheduledFor());
      article.setArticle_type(req.getArticleType().name());
      article.setCreated_at(LocalDateTime.now());
      article.setUpdated_at(LocalDateTime.now());

      article = articlesRepository.save(article);
      Integer id = article.getId();

      if (id != null && id != 0) {
        var tags = req.getTags();
        if (tags != null) {
          String deleteSql = "DELETE FROM article_tags WHERE article_id = ?";
          LaudiumJdbcUtil.getInsertRawPrepared(deleteSql, id);

          String insertTagSql = "INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)";
          for (Integer tag : tags) {
            LaudiumJdbcUtil.getInsertRawPrepared(insertTagSql, id, tag);
          }
        }
      }

      // Send Notification
      if (article.getStatus().equals("published") && req.getNotify()) {
        String title = "New Article: " + article.getTitle();
        String message = "Read our latest article — published " + Utils.getTimeAgo(article.getScheduled_for()) + ". Dive in for insights and updates!";
        oneSignalService.sendNotificationToAllUsers(
            title,
            message,
            "/news/" + article.getSlug()
        );
      }

      return toArticleResponse(article);
    } catch (Exception ex) {
      logger.log(Level.SEVERE, null, ex);
      throw new RuntimeException("Error creating article", ex);
    }
  }

  public ArticleResponse updateArticle(Integer id, ArticleRequest articleRequest, User publisher) {
    try {
      Articles article = articlesRepository.findById(id)
          .orElseThrow(() -> new ItemNotFoundException("Article not found"));

      article.setTitle(articleRequest.getTitle());
      article.setSlug(articleRequest.getSlug());
      article.setContent(articleRequest.getContent());
      article.setSummary(articleRequest.getSummary());
      article.setStatus(articleRequest.getStatus().name());
      article.setScheduled_for(articleRequest.getScheduledFor());
      article.setArticle_type(articleRequest.getArticleType().name());
      article.setArchived(articleRequest.getArchived());
      article.setCategory_id(articleRequest.getCategoryId());

      String coverImageBase64 = articleRequest.getCoverImage();
      String thumbnailImageBase64 = articleRequest.getThumbnailImage();

      if (article.getCover_id() != null && article.getCover_id() == 0) {
        article.setCover_id(null);
      }

      if (article.getThumbnail_id() != null && article.getThumbnail_id() == 0) {
        article.setThumbnail_id(null);
      }

      // Handle cover image
      if (coverImageBase64 != null && !coverImageBase64.isBlank()) {
        try {
          boolean isUrl = coverImageBase64.startsWith("http://") || coverImageBase64.startsWith("https://");
          Integer cover_id = article.getCover_id();
          if (cover_id != null && cover_id != 0) {
            Media existingMedia = mediaRepository.findById(cover_id)
                .orElseThrow(() -> new Error("Media not found"));
            String oldUrl = existingMedia.getFile();

            String imageUrl;
            if (isUrl) {
              imageUrl = coverImageBase64;
            } else {
              imageUrl = cloudinaryService.uploadImage(coverImageBase64);
            }

            existingMedia.setFile(imageUrl);
            mediaRepository.save(existingMedia);

            if (!isUrl && oldUrl != null && oldUrl.contains("cloudinary.com")) {
              try {
                String publicId = cloudinaryService.getPublicIdFromUrl(oldUrl);
                if (publicId != null) {
                  cloudinaryService.deleteImage(publicId);
                }
              } catch (Exception e) {
                logger.log(Level.WARNING, "Failed to delete old cover image: " + oldUrl, e);
              }
            }
          } else {
            String imageUrl;
            if (isUrl) {
              imageUrl = coverImageBase64;
            } else {
              imageUrl = cloudinaryService.uploadImage(coverImageBase64);
            }

            Media media = new Media();
            media.setFile(imageUrl);
            media = mediaRepository.save(media);
            article.setCover_id(media.getId());
          }
        } catch (IOException e) {
          logger.log(Level.SEVERE, "Error uploading cover image to Cloudinary", e);
          throw new RuntimeException("Error uploading cover image", e);
        }
      }

      // Handle thumbnail image
      if (thumbnailImageBase64 != null && !thumbnailImageBase64.isBlank()) {
        try {
          boolean isUrl = thumbnailImageBase64.startsWith("http://") || thumbnailImageBase64.startsWith("https://");
          Integer thumbnail_id = article.getThumbnail_id();
          if (thumbnail_id != null && thumbnail_id != 0) {
            Media existingMedia = mediaRepository.findById(thumbnail_id)
                .orElseThrow(() -> new Error("Media not found"));
            String oldUrl = existingMedia.getFile();

            String imageUrl;
            if (isUrl) {
              imageUrl = thumbnailImageBase64;
            } else {
              imageUrl = cloudinaryService.uploadImage(thumbnailImageBase64);
            }

            existingMedia.setFile(imageUrl);
            mediaRepository.save(existingMedia);

            if (!isUrl && oldUrl != null && oldUrl.contains("cloudinary.com")) {
              try {
                String publicId = cloudinaryService.getPublicIdFromUrl(oldUrl);
                if (publicId != null) {
                  cloudinaryService.deleteImage(publicId);
                }
              } catch (Exception e) {
                logger.log(Level.WARNING, "Failed to delete old thumbnail image: " + oldUrl, e);
              }
            }
          } else {
            String imageUrl;
            if (isUrl) {
              imageUrl = thumbnailImageBase64;
            } else {
              imageUrl = cloudinaryService.uploadImage(thumbnailImageBase64);
            }

            Media media = new Media();
            media.setFile(imageUrl);
            media = mediaRepository.save(media);
            article.setThumbnail_id(media.getId());
          }
        } catch (IOException e) {
          logger.log(Level.SEVERE, "Error uploading thumbnail image to Cloudinary", e);
          throw new RuntimeException("Error uploading thumbnail image", e);
        }
      }

      // Allow author to be set via API on update
      try {
        if (articleRequest.getAuthorId() != null && !articleRequest.getAuthorId().isBlank()) {
          article.setAuthor_id(Integer.parseInt(articleRequest.getAuthorId().trim()));
        }
      } catch (NumberFormatException nfe) {
        // Ignore invalid authorId on update
      }

      var tags = articleRequest.getTags();
      if (tags != null) {
        String deleteSql = "DELETE FROM article_tags WHERE article_id = ?";
        LaudiumJdbcUtil.getInsertRawPrepared(deleteSql, id);
        String insertTagSql = "INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)";
        for (Integer tag : tags) {
          LaudiumJdbcUtil.getInsertRawPrepared(insertTagSql, id, tag);
        }
      }

      article.setUpdated_at(LocalDateTime.now());
      article = articlesRepository.save(article);
      return toArticleResponse(article);
    } catch (ItemNotFoundException ex) {
      throw ex;
    } catch (Exception ex) {
      logger.log(Level.SEVERE, null, ex);
      throw new RuntimeException("Error updating article", ex);
    }
  }

  public void deleteArticle(Integer id) {
    try {
      logger.log(Level.SEVERE, "Id: " + id, id);
      Articles article = articlesRepository.findById(id)
          .orElseThrow(() -> new ItemNotFoundException("Article not found"));
      article.setArchived(true);
      articlesRepository.save(article);
    } catch (ItemNotFoundException ex) {
      throw ex;
    } catch (Exception ex) {
      logger.log(Level.SEVERE, null, ex);
      throw new RuntimeException("Error deleting article", ex);
    }
  }

  public Map<String, Long> getStats() {
    CustomRs rs = null;
    try {
      String q = """
              SELECT
                  COUNT(*) AS total_articles,
                  SUM(archived = 1) AS total_archived,
                  SUM(status = 'published' AND archived = 0) AS total_published,
                  SUM(status = 'draft' AND archived = 0) AS total_draft,
                  SUM(status = 'scheduled' AND archived = 0) AS total_scheduled,
                  SUM(scheduled_for > NOW() AND archived = 0) AS total_upcoming
              FROM articles
          """;
      rs = LaudiumJdbcUtil.getSelectRaw(q);
      Map<String, Long> stats = new HashMap<>();
      if (rs.next()) {
        stats.put("total_articles", rs.getLong("total_articles"));
        stats.put("total_archived", rs.getLong("total_archived"));
        stats.put("total_published", rs.getLong("total_published"));
        stats.put("total_draft", rs.getLong("total_draft"));
        stats.put("total_scheduled", rs.getLong("total_scheduled"));
        stats.put("total_upcoming", rs.getLong("total_upcoming"));
      }
      return stats;
    } catch (Exception ex) {
      logger.log(Level.SEVERE, null, ex);
      throw new RuntimeException("Error getting article stats", ex);
    } finally {
      if (rs != null) { try { rs.close(); } catch (Exception ignored) {} }
    }
  }

  public long getArticleCount() {
    CustomRs rs = null;
    try {
      String q = "SELECT COUNT(*) as total FROM articles";
      rs = LaudiumJdbcUtil.getSelectRaw(q);
      if (rs.next()) {
        return rs.getLong("total");
      }
      return 0;
    } catch (Exception ex) {
      logger.log(Level.SEVERE, null, ex);
      throw new RuntimeException("Error getting article count", ex);
    } finally {
      if (rs != null) { try { rs.close(); } catch (Exception ignored) {} }
    }
  }

  public List<Articles> getScheduledTodayArticles() {
    try {
      LocalDate today = LocalDate.now();
      LocalDateTime startOfDay = today.atStartOfDay();
      LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();

      return articlesRepository.findScheduledArticlesBetween(startOfDay, endOfDay);
    } catch (Exception ex) {
      logger.log(Level.SEVERE, null, ex);
      throw new RuntimeException("Error getting scheduled articles for today", ex);
    }
  }

  public int publishScheduledArticles(PublishRequestDTO request) {
    try {
      List<Long> articleIds = request.getArticleIds();
      LocalDate startDate = request.getStartDate();
      LocalDate endDate = request.getEndDate();

      List<Articles> articles;

      if (articleIds != null && !articleIds.isEmpty()) {
        List<Integer> intIds = articleIds.stream().map(Long::intValue).collect(Collectors.toList());
        articles = articlesRepository.findByIdInAndStatusNotPublished(intIds);
      } else if (request.publishAll) {
        articles = articlesRepository.findByStatusAndArchivedFalse("published");
      } else if (request.publishToday) {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();
        articles = articlesRepository.findScheduledArticlesBetween(startOfDay, endOfDay);
      } else {
        LocalDate today = LocalDate.now();
        LocalDate fromDate = (startDate != null) ? startDate : today;
        LocalDate toDate = (endDate != null) ? endDate : fromDate;
        LocalDateTime startOfDay = fromDate.atStartOfDay();
        LocalDateTime endOfDay = toDate.plusDays(1).atStartOfDay();
        articles = articlesRepository.findScheduledArticlesBetween(startOfDay, endOfDay);
      }

      for (Articles article : articles) {
        article.setStatus("published");
        article.setScheduled_for(LocalDateTime.now());
        article.setUpdated_at(LocalDateTime.now());
        articlesRepository.save(article);
      }

      return articles.size();
    } catch (Exception ex) {
      logger.log(Level.SEVERE, null, ex);
      throw new RuntimeException("Error publishing scheduled articles", ex);
    }
  }

  public String simulateLoad() {
    try {
      Thread.sleep(2000);
      return "Handled by: " + Thread.currentThread().getName();
    } catch (InterruptedException e) {
      throw new RuntimeException(e);
    }
  }

  public void sendTestNotification() {
    oneSignalService.sendNotificationToAllUsers(
        "notificationTitle",
        "notificationMessage",
        "/news"
    );
  }

  public ArticleResponse toArticleResponse(Articles article) {
    List<Tag> tags = getTagsForArticle(article.getId());
    return ArticleResponse.fromArticle(article, tags);
  }

  public List<Tag> getTagsForArticle(int articleId) {
    CustomRs rs = null;
    try {
      String q = """
              SELECT t.id, t.name, t.slug
              FROM tags t
              JOIN article_tags art_t on t.id = art_t.tag_id
              WHERE art_t.article_id = ?
          """;

      rs = LaudiumJdbcUtil.getSelectRawPrepared(q, articleId);
      List<Tag> tags = new ArrayList<>();

      while (rs.next()) {
        Tag tag = new Tag();
        tag.setId(rs.getInt("id"));
        tag.setName(rs.getString("name"));
        tag.setSlug(rs.getString("slug"));
        tags.add(tag);
      }

      return tags;
    } catch (Exception ex) {
      logger.log(Level.SEVERE, null, ex);
      return List.of();
    } finally {
      if (rs != null) { try { rs.close(); } catch (Exception ignored) {} }
    }
  }

  @SuppressWarnings("unchecked")
  public Map<String, Object> getArticleFeedWithAds(ArticleQueryParams request) {
    logger.log(Level.INFO, "getArticleFeedWithAds: ENTRY request={0}", request);
    try {
      Map<String, Object> articlesResponse = getAllArticles(request);
      if (articlesResponse == null) {
        logger.log(Level.SEVERE, "getArticleFeedWithAds: getAllArticles returned NULL!");
        throw new RuntimeException("getAllArticles returned null");
      }
      List<ArticleResponse> articles = (List<ArticleResponse>) articlesResponse.get("articles");
      if (articles == null) {
        logger.log(Level.SEVERE, "getArticleFeedWithAds: articles list is NULL!");
        throw new RuntimeException("articles list is null");
      }
      logger.log(Level.INFO, "getArticleFeedWithAds: articles count={0}", articles.size());
      List<Map<String, Object>> activeAds = getActiveAdsForFeed();
      logger.log(Level.INFO, "getArticleFeedWithAds: activeAds count={0}", activeAds.size());

      Collections.shuffle(activeAds);

      List<Map<String, Object>> feed = new ArrayList<>();
      int adIndex = 0;

      for (int i = 0; i < articles.size(); i++) {
        Map<String, Object> articleItem = new HashMap<>();
        articleItem.put("type", "article");
        articleItem.put("data", articles.get(i));
        feed.add(articleItem);

        if ((i + 1) % 2 == 0 && activeAds.size() > 0) {
          Map<String, Object> adItem = new HashMap<>();
          adItem.put("type", "ad");
          adItem.put("data", activeAds.get(adIndex % activeAds.size()));
          feed.add(adItem);
          adIndex++;
        }
      }

      Map<String, Object> response = new HashMap<>();
      response.put("feed", feed);
      response.put("total", articlesResponse.get("total"));
      response.put("page", articlesResponse.get("page"));
      response.put("size", articlesResponse.get("size"));
      response.put("totalPages", articlesResponse.get("totalPages"));

      return response;
    } catch (Exception ex) {
      logger.log(Level.SEVERE, "getArticleFeedWithAds: FAILED with exception type=" + ex.getClass().getName() + " message=" + ex.getMessage(), ex);
      throw new RuntimeException("Error getting article feed with ads", ex);
    }
  }

  private List<Map<String, Object>> getActiveAdsForFeed() {
    CustomRs rs = null;
    try {
      String q = """
          SELECT
              ads.id,
              ads.title,
              ads.image_url,
              ads.click_url,
              biz.name as business_name,
              m.file as image
          FROM ads
          JOIN ad_placements as ad_p ON ads.placement_id = ad_p.id
          LEFT JOIN media AS m ON ads.image_id = m.id
          JOIN payments AS p ON ads.payment_id = p.id
          JOIN businesses AS biz ON ads.business_id = biz.id
          WHERE ads.status != 'expired'
          AND DATE(placement_date) <= CURDATE()
          AND expiry_date >= NOW()
          AND p.status = 'COMPLETE'
          AND ads.is_deleted = 0
          ORDER BY ads.placement_date DESC LIMIT 50
          """;

      rs = LaudiumJdbcUtil.getSelectRaw(q);
      List<Map<String, Object>> ads = new ArrayList<>();

      while (rs.next()) {
        Map<String, Object> ad = new HashMap<>();
        ad.put("id", rs.getInt("id"));
        ad.put("title", rs.getString("title"));
        ad.put("image_url", rs.getString("image_url"));
        ad.put("image", rs.getString("image"));
        ad.put("click_url", rs.getString("click_url"));
        ad.put("business_name", rs.getString("business_name"));
        ads.add(ad);
      }

      return ads;
    } catch (Exception ex) {
      logger.log(Level.SEVERE, "getActiveAdsForFeed: FAILED with type=" + ex.getClass().getName() + " message=" + ex.getMessage(), ex);
      return new ArrayList<>();
    } finally {
      try {
        if (rs != null) rs.close();
      } catch (Exception ignored) {}
    }
  }

  /**
   * Test endpoint for stored procedure-style article queries.
   * Delegates to getAllArticles after wrapping parameters in ArticleQueryParams.
   */
  public Map<String, Object> testStoredProcedure(int page, int size, String search, Integer category, String status, String type) {
    ArticleQueryParams params = new ArticleQueryParams();
    params.setPage(page);
    params.setSize(size);
    params.setSearch(search);
    params.setCategory(category);
    params.setStatus(status);
    params.setType(type);
    return getAllArticles(params);
  }

  @Getter
  @Setter
  private static class ArticleData {
    private User user;
    private Category category;
  }
}