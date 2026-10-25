package com.laudiumbiz.Laudiumbiz.Repositories;

import com.laudiumbiz.Laudiumbiz.Models.DB.Media;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MediaRepository extends JpaRepository<Media, Integer> {
}
