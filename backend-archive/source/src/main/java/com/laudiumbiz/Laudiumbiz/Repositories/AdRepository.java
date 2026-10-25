package com.laudiumbiz.Laudiumbiz.Repositories;

import com.laudiumbiz.Laudiumbiz.Models.DB.Ad;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AdRepository extends JpaRepository<Ad, Integer> {

    Page<Ad> findByStatus(String status, Pageable pageable);

    @Query("SELECT a FROM Ad a WHERE a.category_id = :categoryId")
    Page<Ad> findByCategoryId(@Param("categoryId") Long categoryId, Pageable pageable);

    @Query("SELECT a FROM Ad a WHERE a.business_id = :businessId AND a.is_deleted = false ORDER BY a.created_at DESC")
    List<Ad> findByBusinessIdAndIsDeletedFalseOrderByCreatedAtDesc(@Param("businessId") Integer businessId);

    @Query("SELECT a FROM Ad a WHERE a.category_id = :categoryId AND a.status = :status AND a.is_deleted = false")
    Page<Ad> findByCategoryIdAndStatus(@Param("categoryId") Long categoryId, @Param("status") String status, Pageable pageable);

    long countByStatus(String status);

    @Query("SELECT COUNT(a) FROM Ad a WHERE a.category_id = :categoryId AND a.status = :status")
    long countByCategoryIdAndStatus(@Param("categoryId") Long categoryId, @Param("status") String status);

    List<Ad> findByStatusIn(List<String> statuses);

    @Query("SELECT a FROM Ad a WHERE a.payment_id = :paymentId")
    List<Ad> findByPaymentId(@Param("paymentId") Integer paymentId);
}