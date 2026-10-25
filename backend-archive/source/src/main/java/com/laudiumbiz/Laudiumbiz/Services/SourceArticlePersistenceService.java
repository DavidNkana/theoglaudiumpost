package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Models.DB.SourceArticles;
import com.laudiumbiz.Laudiumbiz.Models.SourceArticle;
import com.laudiumbiz.Laudiumbiz.Repositories.SourceArticlesRepository;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * PURPOSE: Manages persistence of source articles to the database.
 * Handles batch saving, status updates, and marking of bad results for source articles retrieved from AI providers.
 *
 * KEY METHODS:
 * - saveBatch(List<SourceArticle> items, String rawAiJsonOrText, String provider): Saves multiple source articles with their raw AI response
 * - markForProcessing(Integer id, String status): Updates the processing status of a source article
 * - markBadResult(Integer id): Marks a source article as having a bad result
 *
 * INTEGRATIONS: None (internal database persistence service)
 */
@Service
public class SourceArticlePersistenceService {

    @Autowired
    private SourceArticlesRepository sourceArticlesRepository;

    public void saveBatch(List<SourceArticle> items, String rawAiJsonOrText, String provider) {
        if (items == null || items.isEmpty()) return;
        for (SourceArticle sa : items) {
            try {
                SourceArticles row = new SourceArticles();
                row.setTitle(sa.getTitle());
                row.setUrl(sa.getUrl());
                row.setPlatform(sa.getPlatform());
                row.setTimestamp_text(sa.getTimestamp());
                row.setAuthor(sa.getAuthor());
                row.setSummary(sa.getContent());
                row.setSlug(sa.getSlug());
                row.setType(sa.getType());
                row.setShare_count(sa.getShareCount());
                row.setComment_count(sa.getCommentCount());
                try {
                    row.setHashtags_json(Utils.getGson().toJson(sa.getHashtags()));
                } catch (Exception e) {
                    row.setHashtags_json(null);
                }
                try {
                    row.setAdditional_data_json(Utils.getGson().toJson(sa.getAdditionalData()));
                } catch (Exception e) {
                    row.setAdditional_data_json(null);
                }
                row.setProvider(provider);
                row.setRaw_ai_result(rawAiJsonOrText);
                row.setProcessing_status("NEW");
                row.setBad_result(false);
                row.setCreated_at(LocalDateTime.now());
                row.setUpdated_at(LocalDateTime.now());
                row = sourceArticlesRepository.save(row);
                // Propagate generated DB id back to response model
                try { sa.setId(row.getId()); } catch (Exception ignore) {}
            } catch (Exception ex) {
                System.out.println("[SourceArticlePersistenceService] save error: " + ex.getMessage());
            }
        }
    }

    public void markForProcessing(Integer id, String status) {
        try {
            if (status == null || status.isBlank()) status = "PROCESSING";
            SourceArticles row = sourceArticlesRepository.findById(id).orElse(null);
            if (row != null) {
                row.setProcessing_status(status);
                row.setUpdated_at(LocalDateTime.now());
                sourceArticlesRepository.save(row);
            }
        } catch (Exception ex) {
            System.out.println("[SourceArticlePersistenceService] markForProcessing error: " + ex.getMessage());
        }
    }

    public void markBadResult(Integer id) {
        try {
            SourceArticles row = sourceArticlesRepository.findById(id).orElse(null);
            if (row != null) {
                row.setBad_result(true);
                row.setProcessing_status("BAD");
                row.setUpdated_at(LocalDateTime.now());
                sourceArticlesRepository.save(row);
            }
        } catch (Exception ex) {
            System.out.println("[SourceArticlePersistenceService] markBadResult error: " + ex.getMessage());
        }
    }
}
