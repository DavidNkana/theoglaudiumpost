package com.laudiumbiz.Laudiumbiz.Repositories;

import com.laudiumbiz.Laudiumbiz.Models.DB.Campaigns;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CampaignsRepository extends JpaRepository<Campaigns, Integer> {

    // Note: user_id-based queries removed - Campaigns entity has no user_id field
    // These were dead code (never called) but would fail at runtime if invoked

    @Query("SELECT c FROM Campaigns c WHERE c.business_id = :businessId")
    List<Campaigns> findByBusiness_id(@Param("businessId") Integer businessId);

    @Query("SELECT c FROM Campaigns c WHERE c.business_id IN :businessIds")
    List<Campaigns> findByBusiness_idIn(@Param("businessIds") List<Integer> businessIds);
}