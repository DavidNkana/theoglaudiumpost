package com.laudiumbiz.Laudiumbiz.Repositories;

import com.laudiumbiz.Laudiumbiz.Models.DB.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {

    @Query("SELECT c FROM Category c WHERE c.is_deleted = false")
    List<Category> findByIs_deletedFalse();

}
