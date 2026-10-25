package com.laudiumbiz.Laudiumbiz.Models.DTO;

import com.laudiumbiz.Laudiumbiz.Models.SourceArticle;
import lombok.Getter;
import lombok.Setter;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Response DTO for source articles API endpoints
 * Provides a standardized format for returning source articles with explanatory metadata
 */
public class SourceArticleResponse {
  /**
   * The list of source articles retrieved from various platforms
   */
  @Getter
  private List<SourceArticle> sourceArticles;

  /**
   * The total number of source articles returned
   */
  @Getter
  @Setter
  private int count;

  /**
   * The task type or ID associated with this response (if applicable)
   */
  @Getter
  @Setter
  private Integer taskId;

  /**
   * The custom prompt used to generate this response (if applicable)
   */
  @Getter
  @Setter
  private String prompt;

  /**
   * Explanatory metadata about the source article fields
   */
  @Getter
  @Setter
  private Map<String, String> fieldDescriptions;

  /**
   * Default constructor
   */
  public SourceArticleResponse() {
    initializeFieldDescriptions();
  }

  /**
   * Constructor with source articles
   *
   * @param sourceArticles the list of source articles
   */
  public SourceArticleResponse(List<SourceArticle> sourceArticles) {
    this.sourceArticles = sourceArticles;
    this.count = sourceArticles != null ? sourceArticles.size() : 0;
    initializeFieldDescriptions();
  }

  /**
   * Constructor with source articles and task ID
   *
   * @param sourceArticles the list of source articles
   * @param taskId         the task ID
   */
  public SourceArticleResponse(List<SourceArticle> sourceArticles, Integer taskId) {
    this.sourceArticles = sourceArticles;
    this.count = sourceArticles != null ? sourceArticles.size() : 0;
    this.taskId = taskId;
    initializeFieldDescriptions();
  }

  /**
   * Constructor with source articles and prompt
   *
   * @param sourceArticles the list of source articles
   * @param prompt         the custom prompt
   */
  public SourceArticleResponse(List<SourceArticle> sourceArticles, String prompt) {
    this.sourceArticles = sourceArticles;
    this.count = sourceArticles != null ? sourceArticles.size() : 0;
    this.prompt = prompt;
    initializeFieldDescriptions();
  }

  /**
   * Initialize the field descriptions map with explanations for each field in the source article
   */
  private void initializeFieldDescriptions() {
    fieldDescriptions = new HashMap<>();
    fieldDescriptions.put("title", "The title or headline of the article or social media post");
    fieldDescriptions.put("url", "The URL or web address where the original content can be found");
    fieldDescriptions.put("platform", "The social media platform or website where the content was published (e.g., Facebook, Twitter, news website)");
    fieldDescriptions.put("timestamp", "The date and time when the content was published in ISO-8601 format");
    fieldDescriptions.put("author", "The name of the person or organization who created the content");
    fieldDescriptions.put("content", "The main text content of the article or social media post");
    fieldDescriptions.put("shareCount", "The number of times the content has been shared (if available)");
    fieldDescriptions.put("commentCount", "The number of comments on the content (if available)");
    fieldDescriptions.put("hashtags", "A list of hashtags associated with the content (if available)");
    fieldDescriptions.put("additionalData", "Any additional data or metadata associated with the content");
    fieldDescriptions.put("totalEngagement", "The total engagement count (shares + comments)");
  }

  // Getters and Setters

  public void setSourceArticles(List<SourceArticle> sourceArticles) {
    this.sourceArticles = sourceArticles;
    this.count = sourceArticles != null ? sourceArticles.size() : 0;
  }

}