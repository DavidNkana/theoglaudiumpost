package com.laudiumbiz.Laudiumbiz.Repositories;

import com.laudiumbiz.Laudiumbiz.Models.DB.AdPlacement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AdPlacementRepository extends JpaRepository<AdPlacement, Integer> {

    Page<AdPlacement> findByStatus(String status, Pageable pageable);

    @Query("SELECT a FROM AdPlacement a WHERE a.status = :status AND a.location LIKE %:search%")
    Page<AdPlacement> findByStatusAndLocationContaining(
            @Param("status") String status,
            @Param("search") String search,
            Pageable pageable);

    @Query("SELECT a FROM AdPlacement a WHERE a.location LIKE %:search%")
    Page<AdPlacement> findByLocationContaining(@Param("search") String search, Pageable pageable);

    @Query("SELECT COUNT(a) FROM AdPlacement a WHERE a.status = :status")
    long countByStatus(@Param("status") String status);

    @Query("SELECT COUNT(a) FROM AdPlacement a WHERE a.status = :status AND a.location LIKE %:search%")
    long countByStatusAndLocationContaining(@Param("status") String status, @Param("search") String search);

    @Query("SELECT COUNT(a) FROM AdPlacement a WHERE a.location LIKE %:search%")
    long countByLocationContaining(@Param("search") String search);

    List<AdPlacement> findByStatusIn(List<String> statuses);
}
