package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Models.DB.AdPlacement;
import com.laudiumbiz.Laudiumbiz.Models.DB.Media;
import com.laudiumbiz.Laudiumbiz.Models.DTO.AdPlacementRequestDTO;
import com.laudiumbiz.Laudiumbiz.Models.DTO.AdPlacementResponseDTO;
import com.laudiumbiz.Laudiumbiz.Repositories.AdPlacementRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.MediaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * PURPOSE: Encapsulates all data access for ad placement configurations so that
 * AdPlacementController performs no direct repository or raw-SQL access.
 *
 * KEY METHODS:
 * - getAll(...): Retrieves a paginated, filtered page of ad placements as a result object.
 * - getById(String id): Retrieves a single ad placement by id, throwing when not found.
 * - create(AdPlacementRequestDTO): Persists a new ad placement (and optional image media).
 * - update(Integer id, AdPlacementRequestDTO): Updates an existing ad placement (and image media).
 * - delete(Integer id): Deletes an ad placement and any associated media.
 *
 * DEPENDENCIES:
 * - AdPlacementRepository: Ad placement persistence.
 * - MediaRepository: Image media persistence.
 *
 * @author Imran
 */
@Service
public class AdPlacementService {

    private final AdPlacementRepository adPlacementRepository;
    private final MediaRepository mediaRepository;

    public AdPlacementService(AdPlacementRepository adPlacementRepository,
            MediaRepository mediaRepository) {
        this.adPlacementRepository = adPlacementRepository;
        this.mediaRepository = mediaRepository;
    }

    /**
     * Typed result of a paginated ad-placement lookup.
     */
    public static class AdPlacementPageResult {

        private final List<AdPlacementResponseDTO> placements;
        private final long total;

        public AdPlacementPageResult(List<AdPlacementResponseDTO> placements, long total) {
            this.placements = placements;
            this.total = total;
        }

        public List<AdPlacementResponseDTO> getPlacements() {
            return placements;
        }

        public long getTotal() {
            return total;
        }
    }

    public AdPlacementPageResult getAll(int page, int size, String search, Long category,
            String status, String type) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"));
        Page<AdPlacement> placementsPage;

        boolean hasSearch = search != null && !search.isBlank();
        boolean hasStatus = status != null && !status.isBlank();

        if (hasSearch && hasStatus) {
            placementsPage = adPlacementRepository.findByStatusAndLocationContaining(status, search, pageRequest);
        } else if (hasSearch) {
            placementsPage = adPlacementRepository.findByLocationContaining(search, pageRequest);
        } else if (hasStatus) {
            placementsPage = adPlacementRepository.findByStatus(status, pageRequest);
        } else {
            placementsPage = adPlacementRepository.findAll(pageRequest);
        }

        long total = placementsPage.getTotalElements();
        List<AdPlacementResponseDTO> placements = placementsPage.getContent().stream()
                .map(AdPlacementResponseDTO::new)
                .collect(Collectors.toList());

        return new AdPlacementPageResult(placements, total);
    }

    public AdPlacementResponseDTO getById(String id) throws Exception {
        AdPlacement placement = adPlacementRepository.findById(Integer.valueOf(id)).orElse(null);
        if (placement == null) {
            throw new Exception("Ad Placement Not Found");
        }
        return new AdPlacementResponseDTO(placement);
    }

    public AdPlacementResponseDTO create(AdPlacementRequestDTO payload) throws Exception {
        String imageBase64 = payload.getImageBase64();
        Integer imageId = null;

        if (imageBase64 != null && !imageBase64.isBlank()) {
            Media media = new Media();
            media.setFile(imageBase64);
            media = mediaRepository.save(media);
            imageId = media.getId();
        }

        AdPlacement placement = new AdPlacement();
        placement.setLocation(payload.getLocation());
        placement.setDescription(payload.getDescription());
        placement.setFee(payload.getFee());
        placement.setFee_type(payload.getFee_type().name());
        placement.setBilling_unit(payload.getBilling_unit().name());
        placement.setAspect_ratio(payload.getAspectRatio());
        placement.setStatus(payload.getStatus().name());
        placement.setIs_rotating(payload.getRotating());

        if (imageId != null) {
            placement.setImage_id(imageId);
        }
        placement = adPlacementRepository.save(placement);

        return new AdPlacementResponseDTO(placement);
    }

    public AdPlacementResponseDTO update(Integer id, AdPlacementRequestDTO payload) throws Exception {
        AdPlacement placement = adPlacementRepository.findById(id).orElseThrow(() -> new Exception("Ad Placement Not Found"));

        placement.setLocation(payload.getLocation());
        placement.setDescription(payload.getDescription());
        placement.setFee(payload.getFee());
        placement.setFee_type(payload.getFee_type().name());
        placement.setBilling_unit(payload.getBilling_unit().name());
        placement.setStatus(payload.getStatus().name());
        placement.setAspect_ratio(payload.getAspectRatio());
        placement.setIs_rotating(payload.getRotating());

        if (placement.getImage_id() == null || placement.getImage_id() == 0) {
            placement.setImage_id(null);
        }

        String imageBase64 = payload.getImageBase64();

        if (imageBase64 != null && !imageBase64.isBlank()) {
            Integer mediaId = placement.getImage_id();
            if (mediaId != null && mediaId != 0) {
                Media media = mediaRepository.findById(mediaId).orElseThrow();
                media.setFile(imageBase64);
                mediaRepository.save(media);
            } else {
                Media media = new Media();
                media.setFile(imageBase64);
                media = mediaRepository.save(media);
                placement.setImage_id(media.getId());
            }
        }

        adPlacementRepository.save(placement);

        return new AdPlacementResponseDTO(placement);
    }

    public void delete(Integer id) throws Exception {
        AdPlacement placement = adPlacementRepository.findById(id).orElseThrow(() -> new Exception("Ad Placement Not Found"));

        Integer imageId = placement.getImage_id();
        adPlacementRepository.delete(placement);

        if (imageId != null) {
            mediaRepository.deleteById(imageId);
        }
    }
}
