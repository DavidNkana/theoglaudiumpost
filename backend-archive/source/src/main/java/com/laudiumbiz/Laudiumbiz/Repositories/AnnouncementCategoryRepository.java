package com.laudiumbiz.Laudiumbiz.Repositories;

import com.laudiumbiz.Laudiumbiz.Models.DB.AnnouncementCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AnnouncementCategoryRepository extends JpaRepository<AnnouncementCategory, Integer> {
    @Query("SELECT a FROM AnnouncementCategory a WHERE a.is_active = true")
    List<AnnouncementCategory> findByIs_activeTrue();
}
