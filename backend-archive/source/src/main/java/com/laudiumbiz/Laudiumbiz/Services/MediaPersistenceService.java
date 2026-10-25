package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Models.DB.Media;
import com.laudiumbiz.Laudiumbiz.Repositories.MediaRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * PURPOSE: Owns all database access for media records so that MediaController performs no data access.
 * Wraps the MediaRepository lookups used by the media endpoints.
 *
 * KEY METHODS:
 * - findById(String id): Looks up a Media row by its String id (parsed to Integer), returning an Optional<Media>.
 *
 * INTEGRATIONS: None (internal database persistence service backed by MediaRepository).
 */
@Service
public class MediaPersistenceService {

    private final MediaRepository mediaRepository;

    public MediaPersistenceService(MediaRepository mediaRepository) {
        this.mediaRepository = mediaRepository;
    }

    /**
     * Look up a Media row by its String id, parsing it to Integer exactly as the controller did.
     *
     * @param id the media id as a String
     * @return Optional containing the Media if found, otherwise empty
     */
    public Optional<Media> findById(String id) {
        return mediaRepository.findById(Integer.valueOf(id));
    }
}
