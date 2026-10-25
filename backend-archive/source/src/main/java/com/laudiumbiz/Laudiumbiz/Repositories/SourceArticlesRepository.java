package com.laudiumbiz.Laudiumbiz.Repositories;

import com.laudiumbiz.Laudiumbiz.Models.DB.SourceArticles;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SourceArticlesRepository extends JpaRepository<SourceArticles, Integer> {
    // NOTE: findByProcessingStatus removed - was dead code (zero callers) and would fail
    // Spring Data parses "ProcessingStatus" as nested property path "processing.Status"
    // but SourceArticles entity has snake_case field "processing_status" not a "Status" sub-property.
    // Use explicit @Query if this method is needed in future: @Query("...") or rename to findByProcessing_status.
    List<SourceArticles> findByProvider(String provider);
}