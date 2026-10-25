package com.laudiumbiz.Laudiumbiz.Repositories;

import com.laudiumbiz.Laudiumbiz.Models.DB.Prompt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface PromptRepository extends JpaRepository<Prompt, Integer> {
    Optional<Prompt> findByName(String name);
    List<Prompt> findByActiveTrue();
    List<Prompt> findByType(String type);
}