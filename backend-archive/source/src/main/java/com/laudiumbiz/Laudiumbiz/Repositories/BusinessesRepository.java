package com.laudiumbiz.Laudiumbiz.Repositories;

import com.laudiumbiz.Laudiumbiz.Models.DB.Businesses;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessesRepository extends JpaRepository<Businesses, Integer> {

    Optional<Businesses> findByEmail(String email);

    @Query("SELECT b FROM Businesses b WHERE b.is_deleted = false")
    Page<Businesses> findAllActive(Pageable pageable);

    @Query("SELECT b FROM Businesses b WHERE b.is_deleted = false AND (b.name LIKE %:search% OR b.email LIKE %:search% OR b.phone LIKE %:search%)")
    Page<Businesses> searchActive(@Param("search") String search, Pageable pageable);

    @Query("SELECT b FROM Businesses b WHERE b.is_deleted = false AND b.status = :status")
    Page<Businesses> findAllActiveByStatus(@Param("status") String status, Pageable pageable);

    @Query("SELECT b FROM Businesses b WHERE b.is_deleted = false AND (b.name LIKE %:search% OR b.email LIKE %:search% OR b.phone LIKE %:search%) AND b.status = :status")
    Page<Businesses> searchActiveByStatus(@Param("search") String search, @Param("status") String status, Pageable pageable);

    @Query("SELECT COUNT(b) FROM Businesses b WHERE b.is_deleted = false")
    long countActive();

    @Query("SELECT COUNT(b) FROM Businesses b WHERE b.is_deleted = false AND b.status = :status")
    long countActiveByStatus(@Param("status") String status);

    @Query("SELECT b FROM Businesses b WHERE b.is_deleted = false AND (b.name LIKE %:search% OR b.email LIKE %:search% OR b.phone LIKE %:search%)")
    List<Businesses> searchActiveList(@Param("search") String search);

    List<Businesses> findByStatusIn(List<String> statuses);
}
