package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Models.DB.Announcement;
import com.laudiumbiz.Laudiumbiz.Models.DB.AnnouncementCategory;
import com.laudiumbiz.Laudiumbiz.Models.DB.Media;
import com.laudiumbiz.Laudiumbiz.Models.DTO.AnnouncementCategoryRequestDTO;
import com.laudiumbiz.Laudiumbiz.Models.DTO.AnnouncementRequestDTO;
import com.laudiumbiz.Laudiumbiz.Models.DTO.AnnouncementResponseDTO;
import com.laudiumbiz.Laudiumbiz.Repositories.AnnouncementCategoryRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.AnnouncementRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.MediaRepository;
import com.laudiumbiz.Laudiumbiz.Utils.CustomRs;
import com.laudiumbiz.Laudiumbiz.Utils.LaudiumJdbcUtil;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * PURPOSE: Encapsulates all data access for notices/announcements and their
 * categories so the NoticeController performs no repository or raw-SQL access.
 *
 * Moved out of NoticeController: all AnnouncementRepository, AnnouncementCategoryRepository,
 * MediaRepository usage, and all LaudiumJdbcUtil raw-SQL calls. SQL strings, parameters,
 * response shapes, and status semantics are preserved exactly.
 *
 * TYPE: @Service (constructor injection)
 *
 * USED BY: NoticeController
 */
@Service
public class NoticeService {

    private final AnnouncementRepository announcementRepository;
    private final AnnouncementCategoryRepository announcementCategoryRepository;
    private final MediaRepository mediaRepository;

    public NoticeService(
            AnnouncementRepository announcementRepository,
            AnnouncementCategoryRepository announcementCategoryRepository,
            MediaRepository mediaRepository) {
        this.announcementRepository = announcementRepository;
        this.announcementCategoryRepository = announcementCategoryRepository;
        this.mediaRepository = mediaRepository;
    }

    /**
     * Builds the paginated announcements response (raw SQL, identical to the
     * previous controller logic). Returns the response map the controller serializes.
     */
    public Map<String, Object> getAll(
            int page,
            int size,
            String search,
            Long category,
            String status,
            String priority,
            Boolean exludeFunerals) throws Exception {
        CustomRs countRs = null;
        CustomRs rs = null;
        try {
            int offset = page * size;
            StringBuilder q = new StringBuilder("SELECT * FROM announcements WHERE 1=1");
            List<Object> params = new ArrayList<>();

            if (status != null && !status.isBlank()) {
                q.append(" AND status = ?");
                params.add(status);
            }

            if (search != null && !search.isBlank()) {
                q.append(" AND (title LIKE ? OR description LIKE ?)");
                String likeSearch = "%" + search + "%";
                params.add(likeSearch);
                params.add(likeSearch);
            }

            if (priority != null && !priority.isBlank()) {
                q.append(" AND priority = ?");
                params.add(priority);
            }

            if (category != null && category != 0) {
                q.append(" AND category_id = ?");
                params.add(category);
            } else if (exludeFunerals) {
                q.append(" AND category_id != 14");
            }

            // Count total
            String countQ = "SELECT COUNT(*) FROM announcements WHERE 1=1" + q.toString().replace("SELECT * FROM announcements WHERE 1=1", "");
            countRs = LaudiumJdbcUtil.getSelectRawPrepared(countQ, params.toArray());
            long total = 0;
            if (countRs != null && countRs.next()) {
                total = countRs.getLong("COUNT(*)");
            }

            // Paginated results
            q.append(" ORDER BY publish_date DESC LIMIT ? OFFSET ?");
            params.add(size);
            params.add(offset);
            rs = LaudiumJdbcUtil.getSelectRawPrepared(q.toString(), params.toArray());

            List<AnnouncementResponseDTO> announcements = new ArrayList<>();
            while (rs.next()) {
                Announcement a = new Announcement();
                a.setId(rs.getInt("id"));
                a.setTitle(rs.getString("title"));
                a.setDescription(rs.getString("description"));
                a.setSlug(rs.getString("slug"));
                a.setContent(rs.getString("content"));
                a.setStatus(rs.getString("status"));
                a.setPriority(rs.getString("priority"));
                a.setCategory_id(rs.getInt("category_id"));
                announcements.add(new AnnouncementResponseDTO(a));
            }

            Map<String, Object> response = new HashMap<>();
            response.put("announcements", announcements);
            response.put("total", total);
            response.put("page", page);
            response.put("size", size);
            response.put("totalPages", (int) Math.ceil((double) total / size));

            return response;
        } finally {
            if (countRs != null) { try { countRs.close(); } catch (Exception ignored) {} }
            if (rs != null) { try { rs.close(); } catch (Exception ignored) {} }
        }
    }

    /**
     * Looks up an announcement by id and maps it to a response DTO.
     * Returns null when not found (controller maps that to 404).
     */
    public AnnouncementResponseDTO getById(String id) {
        Announcement announcement = announcementRepository.findById(Integer.valueOf(id)).orElse(null);
        if (announcement == null) {
            return null;
        }
        return new AnnouncementResponseDTO(announcement);
    }

    /**
     * Finds an announcement by slug. Throws when not found (preserves the
     * previous "Notice Not Found" error behavior).
     */
    public AnnouncementResponseDTO getBySlug(String slug) throws Exception {
        List<Announcement> all = announcementRepository.findAll();
        Announcement announcement = all.stream()
                .filter(a -> slug.equals(a.getSlug()))
                .findFirst()
                .orElse(null);
        if (announcement == null) {
            throw new Exception("Notice Not Found");
        }
        return new AnnouncementResponseDTO(announcement);
    }

    /**
     * Creates an announcement (and optional media from a base64 image).
     * Returns the saved entity.
     */
    public Announcement create(AnnouncementRequestDTO payload) {
        String imageBase64 = payload.getImageBase64();
        Integer imageId = null;

        if (imageBase64 != null && !imageBase64.isBlank()) {
            Media media = new Media();
            media.setFile(imageBase64);
            media = mediaRepository.save(media);
            imageId = media.getId();
        }

        Announcement announcement = new Announcement();
        announcement.setTitle(payload.getTitle());
        announcement.setDescription(payload.getDescription());
        announcement.setSlug(payload.getSlug());
        announcement.setLocation(payload.getLocation());
        announcement.setContent(payload.getContent());
        announcement.setCategory_id(payload.getCategory_id());
        announcement.setStatus(payload.getStatus());
        announcement.setPriority(payload.getPriority());
        announcement.setPriority_order(payload.getPriority() != null && payload.getPriority().equals("high") ? 3 : payload.getPriority() != null && payload.getPriority().equals("medium") ? 2 : 1);
        announcement.setIs_featured(payload.getIs_featured());
        announcement.setIs_urgent(payload.getIs_urgent());
        announcement.setPublish_date(payload.getPublish_date());
        announcement.setExpire_date(payload.getExpire_date());

        if (imageId != null) {
            announcement.setImage_id(imageId);
        }
        announcement = announcementRepository.save(announcement);

        return announcement;
    }

    /**
     * Updates an existing announcement (and its media). Throws when the
     * announcement or referenced media is not found.
     */
    public Announcement update(Integer id, AnnouncementRequestDTO payload) throws Exception {
        Announcement announcement = announcementRepository.findById(id).orElseThrow(() -> new Exception("Announcement not found"));

        announcement.setTitle(payload.getTitle());
        announcement.setDescription(payload.getDescription());
        announcement.setContent(payload.getContent());
        announcement.setSlug(payload.getSlug());
        announcement.setLocation(payload.getLocation());
        announcement.setCategory_id(payload.getCategory_id());
        announcement.setStatus(payload.getStatus());
        announcement.setPriority(payload.getPriority());
        announcement.setPriority_order(payload.getPriority() != null && payload.getPriority().equals("high") ? 3 : payload.getPriority() != null && payload.getPriority().equals("medium") ? 2 : 1);
        announcement.setIs_featured(payload.getIs_featured());
        announcement.setIs_urgent(payload.getIs_urgent());
        announcement.setPublish_date(payload.getPublish_date());
        announcement.setExpire_date(payload.getExpire_date());

        if (announcement.getImage_id() == null || announcement.getImage_id() == 0) {
            announcement.setImage_id(null);
        }

        String imageBase64 = payload.getImageBase64();

        if (imageBase64 != null && !imageBase64.isBlank()) {
            Integer mediaId = announcement.getImage_id();
            if (mediaId != null && mediaId != 0) {
                Media media = mediaRepository.findById(mediaId).orElseThrow();
                media.setFile(imageBase64);
                mediaRepository.save(media);
            } else {
                Media media = new Media();
                media.setFile(imageBase64);
                media = mediaRepository.save(media);
                announcement.setImage_id(media.getId());
            }
        }

        announcementRepository.save(announcement);
        return announcement;
    }

    /**
     * Updates only the status of an announcement. Throws when not found.
     */
    public Announcement updateStatus(Integer id, AnnouncementRequestDTO payload) throws Exception {
        Announcement announcement = announcementRepository.findById(id).orElseThrow(() -> new Exception("Announcement not found"));
        announcement.setStatus(payload.getStatus());
        announcementRepository.save(announcement);
        return announcement;
    }

    /**
     * Soft-deletes an announcement by setting its status to "archived".
     * Throws when not found.
     */
    public void delete(Integer id) throws Exception {
        Announcement announcement = announcementRepository.findById(id).orElseThrow(() -> new Exception("Announcement not found"));
        announcement.setStatus("archived");
        announcementRepository.save(announcement);
    }

    /**
     * Builds the paginated categories response (raw SQL against the
     * category_with_notice_count view, identical to the previous controller logic).
     */
    public Map<String, Object> getCategories(
            int page,
            int size,
            String search,
            Boolean status) throws Exception {
        CustomRs totalRs = null;
        CustomRs rs = null;
        try {
            StringBuilder q = new StringBuilder("SELECT * FROM category_with_notice_count");
            boolean hasWhere = false;
            List<Object> params = new ArrayList<>();

            if (status != null) {
                q.append(" WHERE is_active = ?");
                params.add(status == true ? 1 : 0);
                hasWhere = true;
            }

            if (search != null && !search.isBlank()) {
                if (!hasWhere) {
                    q.append(" WHERE ");
                    hasWhere = true;
                } else {
                    q.append(" AND ");
                }
                q.append("(name LIKE ? OR description LIKE ?)");
                String likeSearch = "%" + search + "%";
                params.add(likeSearch);
                params.add(likeSearch);
            }

            // Get total count
            String countQ = "SELECT COUNT(*) FROM (" + q.toString() + ") AS subq";
            totalRs = LaudiumJdbcUtil.getSelectRawPrepared(countQ, params.toArray());
            long total = 0;
            if (totalRs != null && totalRs.next()) {
                total = totalRs.getLong("COUNT(*)");
            }

            // Add pagination
            int offset = page * size;
            q.append(" ORDER BY announcements DESC LIMIT ? OFFSET ?");
            params.add(size);
            params.add(offset);

            rs = LaudiumJdbcUtil.getSelectRawPrepared(q.toString(), params.toArray());

            List<Map<String, Object>> categories = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> row = new HashMap<>();
                row.put("id", rs.getLong("id"));
                row.put("name", rs.getString("name"));
                row.put("description", rs.getString("description"));
                row.put("is_active", rs.getBoolean("is_active"));
                row.put("announcements", rs.getInt("announcements"));
                categories.add(row);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("categories", categories);
            response.put("total", total);
            response.put("page", page);
            response.put("size", size);
            response.put("totalPages", (int) Math.ceil((double) total / size));

            return response;
        } finally {
            if (totalRs != null) { try { totalRs.close(); } catch (Exception ignored) {} }
            if (rs != null) { try { rs.close(); } catch (Exception ignored) {} }
        }
    }

    /**
     * Creates a new announcement category. Returns the saved entity.
     */
    public AnnouncementCategory createCategory(AnnouncementCategoryRequestDTO payload) {
        AnnouncementCategory category = new AnnouncementCategory();
        category.setName(payload.getName());
        category.setDescription(payload.getDescription());
        category.setIs_active(payload.getIs_active());
        category = announcementCategoryRepository.save(category);
        return category;
    }

    /**
     * Updates an existing announcement category. Throws when not found.
     */
    public AnnouncementCategory updateCategory(Integer id, AnnouncementCategoryRequestDTO payload) throws Exception {
        AnnouncementCategory category = announcementCategoryRepository.findById(id).orElseThrow(() -> new Exception("Category not found"));
        category.setName(payload.getName());
        category.setDescription(payload.getDescription());
        category.setIs_active(payload.getIs_active());
        announcementCategoryRepository.save(category);
        return category;
    }

    /**
     * Updates only the active status of a category. Throws when not found.
     */
    public AnnouncementCategory updateCategoryStatus(Integer id, AnnouncementCategoryRequestDTO payload) throws Exception {
        AnnouncementCategory category = announcementCategoryRepository.findById(id).orElseThrow(() -> new Exception("Category not found"));
        category.setIs_active(payload.getIs_active());
        announcementCategoryRepository.save(category);
        return category;
    }

    /**
     * Deletes a category by id.
     */
    public void deleteCategory(Integer id) {
        announcementCategoryRepository.deleteById(id);
    }
}
