package com.laudiumbiz.Laudiumbiz.Models.DB;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * DB model for storing sourced articles returned from AI providers.
 * Mirrors SourceArticle fields and adds processing flags and raw AI payload.
 */
@Entity
@Table(name = "source_articles")
@Getter
@Setter
public class SourceArticles {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // Core SourceArticle fields
    private String title;
    private String url;
    private String platform;
    private String timestamp_text; // keep original timestamp text returned by AI
    private String author;
    private String summary;
    private String slug;
    private String type;
    private Integer share_count;
    private Integer comment_count;

    // JSON-serialized fields
    private String hashtags_json;          // JSON array as text
    private String additional_data_json;   // JSON object as text

    // Provider and raw payload
    private String provider;        // e.g., gemini, chatgpt, grok
    private String raw_ai_result;   // full raw response text/JSON from AI

    // Processing flags
    private String processing_status; // NEW | PROCESSING | COMPLETED | BAD | ...
    private Boolean bad_result;

    // Timestamps
    private LocalDateTime created_at;
    private LocalDateTime updated_at;
}