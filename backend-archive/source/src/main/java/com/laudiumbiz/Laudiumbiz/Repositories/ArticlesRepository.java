package com.laudiumbiz.Laudiumbiz.Repositories;

import com.laudiumbiz.Laudiumbiz.Models.DB.Articles;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ArticlesRepository extends JpaRepository<Articles, Integer>, JpaSpecificationExecutor<Articles> {

    Optional<Articles> findBySlug(String slug);

    List<Articles> findByStatus(String status);

    List<Articles> findByStatusAndArchivedFalse(String status);

    Page<Articles> findByStatus(String status, Pageable pageable);

    @Query("SELECT a FROM Articles a WHERE a.status = :status AND a.archived = false AND a.scheduled_for <= :now")
    List<Articles> findPublishedArticles(@Param("status") String status, @Param("now") LocalDateTime now);

    @Query("SELECT a FROM Articles a WHERE a.status = 'scheduled' AND a.archived = false AND a.scheduled_for >= :start AND a.scheduled_for < :end")
    List<Articles> findScheduledArticlesBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT a FROM Articles a WHERE a.status = 'scheduled' AND a.archived = false AND a.scheduled_for >= :start AND a.scheduled_for < :end AND a.id IN :ids")
    List<Articles> findScheduledArticlesByIdsBetween(@Param("ids") List<Integer> ids, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT a FROM Articles a WHERE a.id IN :ids AND a.status != 'published' AND a.archived = false")
    List<Articles> findByIdInAndStatusNotPublished(@Param("ids") List<Integer> ids);

    long countByStatus(String status);

    @Query("SELECT COUNT(a) FROM Articles a WHERE a.status = :status AND a.archived = false")
    long countByStatusAndArchivedFalse(@Param("status") String status);
}