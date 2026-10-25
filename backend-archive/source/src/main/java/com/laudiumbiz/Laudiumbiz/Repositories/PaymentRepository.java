package com.laudiumbiz.Laudiumbiz.Repositories;

import com.laudiumbiz.Laudiumbiz.Models.DB.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Integer> {

    @Query("SELECT p FROM Payment p WHERE p.business_id = :businessId")
    List<Payment> findByBusiness_id(@Param("businessId") Integer businessId);

    @Query("SELECT p FROM Payment p WHERE p.business_id IN :businessIds")
    List<Payment> findByBusiness_idIn(@Param("businessIds") List<Integer> businessIds);

    @Query("SELECT COUNT(p) FROM Payment p WHERE p.business_id = :businessId")
    long countByBusiness_id(@Param("businessId") Integer businessId);
}
