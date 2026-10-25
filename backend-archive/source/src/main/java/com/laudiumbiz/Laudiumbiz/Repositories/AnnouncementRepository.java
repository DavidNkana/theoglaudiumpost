package com.laudiumbiz.Laudiumbiz.Repositories;

import com.laudiumbiz.Laudiumbiz.Models.DB.Announcement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Integer> {

    Page<Announcement> findByStatus(String status, Pageable pageable);

    @Query("SELECT a FROM Announcement a WHERE a.is_deleted = false AND a.status = :status")
    Page<Announcement> findActiveByStatus(@Param("status") String status, Pageable pageable);

    @Query("SELECT a FROM Announcement a WHERE a.is_deleted = false AND (a.title LIKE %:search% OR a.content LIKE %:search%)")
    Page<Announcement> searchActive(@Param("search") String search, Pageable pageable);

    @Query("SELECT a FROM Announcement a WHERE a.is_deleted = false AND a.category_id = :categoryId")
    Page<Announcement> findByCategory_id(@Param("categoryId") Integer categoryId, Pageable pageable);

    @Query("SELECT a FROM Announcement a WHERE a.category_id = :categoryId AND a.is_deleted = false")
    List<Announcement> findByCategory_idAndIs_deletedFalse(@Param("categoryId") Integer categoryId);

    @Query("SELECT COUNT(a) FROM Announcement a WHERE a.is_deleted = false")
    long countActive();

    @Query("SELECT COUNT(a) FROM Announcement a WHERE a.is_deleted = false AND a.status = :status")
    long countActiveByStatus(@Param("status") String status);
}
