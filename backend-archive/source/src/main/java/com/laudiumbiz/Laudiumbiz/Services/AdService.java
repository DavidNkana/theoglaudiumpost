package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Models.DB.*;
import com.laudiumbiz.Laudiumbiz.Models.DTO.AdRequestDTO;
import com.laudiumbiz.Laudiumbiz.Models.DTO.AdResponseDTO;
import com.laudiumbiz.Laudiumbiz.Repositories.AdRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.MediaRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.PaymentRepository;
import com.laudiumbiz.Laudiumbiz.Utils.CustomRs;
import com.laudiumbiz.Laudiumbiz.Utils.LaudiumJdbcUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * PURPOSE: Encapsulates all data access for advertisements so that AdController
 * performs no repository or raw-SQL (LaudiumJdbcUtil) work directly.
 *
 * KEY METHODS:
 * - getAll(...): Paginated, filterable listing of ads (raw SQL + count), returned as a response map
 * - getById(String id): Fetch a single Ad entity by id
 * - create(AdRequestDTO, userId): Handles image/video upload, payment + ad persistence, tag wiring
 * - update(Integer id, AdRequestDTO): Updates an ad, its media, and tags
 * - delete(Integer id): Soft deletes an ad
 * - getActiveByPlacement / getActiveByPlacementAndTags / getAllActiveByPlacement: Placement-scoped lookups
 * - incrementImpression / incrementClicks: Counter mutations
 * - getPlacements / getByCategory / getStats / getByCampaign: Misc reporting reads
 *
 * INTEGRATIONS: CloudinaryService (image/video uploads)
 */
@Service
@Slf4j
public class AdService {

  private final AdRepository adRepository;
  private final MediaRepository mediaRepository;
  private final PaymentRepository paymentRepository;
  private final CloudinaryService cloudinaryService;

  public AdService(
      AdRepository adRepository,
      MediaRepository mediaRepository,
      PaymentRepository paymentRepository,
      CloudinaryService cloudinaryService) {
    this.adRepository = adRepository;
    this.mediaRepository = mediaRepository;
    this.paymentRepository = paymentRepository;
    this.cloudinaryService = cloudinaryService;
  }

  // Get all ads (paginated + filtered). Returns the response payload map; the
  // controller is responsible for JSON serialization to preserve prior behavior.
  public Map<String, Object> getAll(int page, int size, String search, Long category, String status, String type)
      throws Exception {
    CustomRs countRs = null;
    CustomRs rs = null;
    try {
      int offset = page * size;
      StringBuilder q = new StringBuilder("SELECT * FROM ads WHERE is_deleted != 1");
      List<Object> params = new ArrayList<>();

      if (status != null && !status.isBlank()) {
        q.append(" AND status = ?");
        params.add(status);
      }

      if (search != null && !search.isBlank()) {
        q.append(" AND title LIKE ?");
        params.add("%" + search + "%");
      }

      if (type != null && !type.isBlank()) {
        q.append(" AND type = ?");
        params.add(type);
      }

      // Count total
      String countQ = q.toString().replace("SELECT *", "SELECT COUNT(*)");
      countRs = LaudiumJdbcUtil.getSelectRawPrepared(countQ, params.toArray());
      long total = 0;
      if (countRs.next()) {
        total = countRs.getLong("COUNT(*)");
      }
      countRs.close();

      // Paginated results using raw SQL (complex multi-join, easier to keep as SQL)
      q.append(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
      params.add(size);
      params.add(offset);
      rs = LaudiumJdbcUtil.getSelectRawPrepared(q.toString(), params.toArray());

      List<AdResponseDTO> adsResponses = new ArrayList<>();
      while (rs.next()) {
        Ad ad = new Ad();
        ad.setId(rs.getInt("id"));
        ad.setTitle(rs.getString("title"));
        ad.setDescription(rs.getString("description"));
        ad.setStatus(rs.getString("status"));
        ad.setImage_url(rs.getString("image_url"));
        ad.setVideo_url(rs.getString("video_url"));
        ad.setClick_url(rs.getString("click_url"));
        ad.setBusiness_id(rs.getInt("business_id"));
        ad.setPlacement_id(rs.getInt("placement_id"));
        ad.setPayment_id(rs.getInt("payment_id"));
        adsResponses.add(toAdResponse(ad));
      }

      Map<String, Object> response = new HashMap<>();
      response.put("ads", adsResponses);
      response.put("total", total);
      response.put("page", page);
      response.put("size", size);
      response.put("totalPages", (int) Math.ceil((double) total / size));

      return response;
    } finally {
      if (countRs != null) {
        try {
          countRs.close();
        } catch (Exception ignored) {}
      }
      if (rs != null) {
        try {
          rs.close();
        } catch (Exception ignored) {}
      }
    }
  }

  // Fetch a single Ad by id (string id parsed to Integer), or null if not found.
  public Ad getById(String id) {
    return adRepository.findById(Integer.valueOf(id)).orElse(null);
  }

  // Create a new ad: handles image/video uploads, payment + ad persistence, and tags.
  public AdResponseDTO create(AdRequestDTO payload, Integer userId) throws Exception {
    String imageBase64 = payload.getImageBase64();
    Integer imageId = null;

    // Handle image upload to Cloudinary
    if (imageBase64 != null && !imageBase64.isBlank()) {
      try {
        String imageUrl = cloudinaryService.uploadImage(imageBase64);
        Media media = new Media();
        media.setFile(imageUrl);
        media = mediaRepository.save(media);
        imageId = media.getId();
        if (payload.getImageUrl() == null || payload.getImageUrl().isBlank()) {
          payload.setImageUrl(imageUrl);
        }
      } catch (Exception e) {
        Logger.getLogger(AdService.class.getName()).log(Level.SEVERE, "Error uploading image to Cloudinary", e);
        throw new RuntimeException("Error uploading image", e);
      }
    }
    var formatter = DateTimeFormatter.ofPattern("yyyy/MM/dd");
    var paymentInfo = payload.getPayment_info();
    Payment payment = new Payment();
    payment.setStatus(paymentInfo.getStatus());
    payment.setPayment_id(paymentInfo.getReference());
    payment.setPf_payment_id(paymentInfo.getReference());
    payment.setUser_id(userId);
    payment.setBusiness_id(payload.getBusiness_id());
    payment.setAmount_gross(payload.getTotal_cost());
    payment.setAmount_fee(0.0);
    payment.setAmount_net(payload.getTotal_cost());
    payment.setCurrency("ZAR");
    payment.setItem_name("Advertisement: " + payload.getTitle());
    payment.setItem_description("Main Page Ad - %s to %s"
                                    .formatted(
                                        payload.getPlacementDate().format(formatter),
                                        payload.getExpiryDate().format(formatter)
                                    ));
    payment.setCustomer_email(paymentInfo.getCustomerEmail());
    payment.setCustomer_name(paymentInfo.getCustomerName());
    payment.setPayment_method(paymentInfo.getPaymentMethod());
    payment.setEft_reference(paymentInfo.getReference());
    payment.setEft_amount(payload.getTotal_cost());
    payment.setCreated_at(LocalDateTime.now());
    payment.setUpdated_at(LocalDateTime.now());
    payment = paymentRepository.save(payment);

    // Handle video upload to Cloudinary
    String videoUrl = payload.getVideoUrl();
    String videoBase64 = payload.getVideoBase64();
    if (videoBase64 != null && !videoBase64.isBlank()) {
      try {
        videoUrl = cloudinaryService.uploadVideo(videoBase64);
        log.info("Video uploaded to Cloudinary: {}", videoUrl);
      } catch (Exception e) {
        Logger.getLogger(AdService.class.getName()).log(Level.SEVERE, "Error uploading video to Cloudinary", e);
        throw new RuntimeException("Error uploading video", e);
      }
    }

    Ad ad = new Ad();
    ad.setTitle(payload.getTitle());
    ad.setDescription(payload.getDescription());
    ad.setPayment_id(payload.getPayment_id());
    ad.setBusiness_id(payload.getBusiness_id());
    ad.setPlacement_id(payload.getPlacement_id());
    ad.setPayment_id(payment.getId());
    ad.setPayment_status(payment.getStatus());
    ad.setPlacement_info(payload.getPlacement_info());
    ad.setTotal_cost(payload.getTotal_cost());
    ad.setImage_url(payload.getImageUrl());
    ad.setVideo_url(videoUrl);
    ad.setClick_url(payload.getClickUrl());
    ad.setStatus(payload.getStatus().name());
    ad.setPayment_status(payload.getPayment_status());
    ad.setPlacement_date(payload.getPlacementDate());
    ad.setExpiry_date(payload.getExpiryDate());

    if (imageId != null) {
      ad.setImage_id(imageId);
    }
    ad = adRepository.save(ad);

    Integer id = ad.getId();
    if (id != null && id != 0) {
      var tags = payload.getTags();
      if (tags != null) {
        LaudiumJdbcUtil.getInsertRawPrepared("DELETE FROM ad_tags WHERE ad_id = ?", id);
        String insertTagSql = "INSERT INTO ad_tags (ad_id, tag_id) VALUES (?, ?)";
        for (Integer tag : tags) {
          LaudiumJdbcUtil.getInsertRawPrepared(insertTagSql, id, tag);
        }
      }
    }

    return toAdResponse(ad);
  }

  // Update an existing ad: media, fields, and tags.
  public Ad update(Integer id, AdRequestDTO payload) throws Exception {
    Ad ad = adRepository.findById(id).orElseThrow(() -> new Exception("Ad not found"));

    // Handle video upload to Cloudinary
    String videoUrl = payload.getVideoUrl();
    String videoBase64 = payload.getVideoBase64();
    if (videoBase64 != null && !videoBase64.isBlank()) {
      try {
        videoUrl = cloudinaryService.uploadVideo(videoBase64);
        log.info("Video uploaded to Cloudinary: {}", videoUrl);
      } catch (Exception e) {
        Logger.getLogger(AdService.class.getName()).log(Level.SEVERE, "Error uploading video to Cloudinary", e);
        throw new RuntimeException("Error uploading video", e);
      }
    }

    ad.setTitle(payload.getTitle());
    ad.setDescription(payload.getDescription());
    ad.setBusiness_id(payload.getBusiness_id());
    ad.setPayment_id(payload.getPayment_id());
    ad.setPlacement_id(payload.getPlacement_id());
    ad.setPlacement_info(payload.getPlacement_info());
    ad.setTotal_cost(payload.getTotal_cost());
    ad.setImage_url(payload.getImageUrl());
    ad.setVideo_url(videoUrl);
    ad.setClick_url(payload.getClickUrl());
    ad.setStatus(payload.getStatus().name());
    ad.setPlacement_date(payload.getPlacementDate());
    ad.setExpiry_date(payload.getExpiryDate());

    if (ad.getImage_id() == null || ad.getImage_id() == 0) {
      ad.setImage_id(null);
    }

    String imageBase64 = payload.getImageBase64();

    if (imageBase64 != null && !imageBase64.isBlank()) {
      try {
        Integer mediaId = ad.getImage_id();
        if (mediaId != null && mediaId != 0) {
          Media existingMedia = mediaRepository.findById(mediaId).orElseThrow();
          String oldUrl = existingMedia.getFile();
          String imageUrl = cloudinaryService.uploadImage(imageBase64);
          existingMedia.setFile(imageUrl);
          mediaRepository.save(existingMedia);
          ad.setImage_url(imageUrl);

          if (oldUrl != null && oldUrl.contains("cloudinary.com")) {
            try {
              String publicId = cloudinaryService.getPublicIdFromUrl(oldUrl);
              if (publicId != null) {
                cloudinaryService.deleteImage(publicId);
              }
            } catch (Exception e) {
              Logger.getLogger(AdService.class.getName()).log(Level.WARNING, "Failed to delete old image: " + oldUrl, e);
            }
          }
        } else {
          String imageUrl = cloudinaryService.uploadImage(imageBase64);
          Media media = new Media();
          media.setFile(imageUrl);
          media = mediaRepository.save(media);
          ad.setImage_id(media.getId());
          ad.setImage_url(imageUrl);
        }
      } catch (Exception e) {
        Logger.getLogger(AdService.class.getName()).log(Level.SEVERE, "Error uploading image to Cloudinary", e);
        throw new RuntimeException("Error uploading image", e);
      }
    }

    var tags = payload.getTags();
    if (tags != null) {
      LaudiumJdbcUtil.getInsertRawPrepared("DELETE FROM ad_tags WHERE ad_id = ?", id);
      String insertTagSql = "INSERT INTO ad_tags (ad_id, tag_id) VALUES (?, ?)";
      for (Integer tag : tags) {
        if (tag == null) continue;
        LaudiumJdbcUtil.getInsertRawPrepared(insertTagSql, id, tag);
      }
    }

    adRepository.save(ad);
    return ad;
  }

  // Soft delete an ad.
  public void delete(Integer id) throws Exception {
    Ad ad = adRepository.findById(id).orElseThrow(() -> new Exception("Ad not found"));
    ad.setIs_deleted(true);
    adRepository.save(ad);
  }

  // Single active ad for a placement location (exact match). Returns null when none found.
  public HashMap<String, Object> getActiveByPlacement(String placement) throws Exception {
    CustomRs rs = null;
    try {
      String q = """
              SELECT
                  ads.*,
                  biz.name as business_name,
                  biz.email as business_email,
                  m.file
              FROM ads
              JOIN ad_placements as ad_p ON ads.placement_id = ad_p.id
              LEFT JOIN media AS m ON ads.image_id = m.id
              JOIN payments AS p ON ads.payment_id = p.id
              JOIN businesses AS biz ON ads.business_id = biz.id
              WHERE ads.status != 'expired'
              AND ad_p.location = ?
              AND placement_date <= NOW()
              AND expiry_date >= NOW()
              AND p.status = 'COMPLETE'
              AND ads.is_deleted = 0
              ORDER BY RAND()
              LIMIT 1
          """;
      rs = LaudiumJdbcUtil.getSelectRawPrepared(q, placement);

      HashMap<String, Object> ad = new HashMap<>();

      if (rs.next()) {
        ad.put("id", rs.getString("id"));
        ad.put("campaign_id", rs.getString("campaign_id"));
        ad.put("placement_id", rs.getString("placement_id"));
        ad.put("title", rs.getString("title"));
        ad.put("image_url", rs.getString("image_url"));
        ad.put("video_url", rs.getString("video_url"));
        ad.put("click_url", rs.getString("click_url"));
        ad.put("placement_location", rs.getString("location"));
        ad.put("image", rs.getString("file"));
        ad.put("business_name", rs.getString("business_name"));
        ad.put("business_email", rs.getString("business_email"));
      } else {
        ad = null;
      }

      return ad;
    } finally {
      if (rs != null) {
        try {
          rs.close();
        } catch (Exception ignored) {}
      }
    }
  }

  // Single active ad for a placement location filtered by tags, with an untagged fallback.
  public HashMap<String, Object> getActiveByPlacementAndTags(String placement, List<Integer> tags) throws Exception {
    CustomRs rs = null;
    try {
      String placeholders = tags.stream().map(t -> "?").collect(Collectors.joining(","));

      String qTagged = """
              SELECT
              	ad.*,
              	buss.name AS business_name,
              	buss.email AS business_email
              FROM ads ad
              JOIN campaigns camp ON camp.id = ad.campaign_id
              JOIN ad_placements place ON place.id = ad.placement_id
              LEFT JOIN businesses buss ON buss.id = ad.business_id
              LEFT JOIN payments pay ON pay.id = ad.payment_id
              LEFT JOIN media m ON m.id = ad.image_id
              JOIN ad_tags tag ON tag.ad_id = ad.id
              WHERE ad.`status` != 'expired'
              AND ad.is_deleted = 0
              AND place.location LIKE ?
              AND ad.placement_date <= NOW()
              AND ad.expiry_date >= NOW()
              AND camp.status != 'completed'
              AND tag.tag_id IN (%s)
              ORDER BY RAND()
              LIMIT 1
          """.formatted(placeholders);

      List<Object> params = new ArrayList<>();
      params.add(placement);
      params.addAll(tags);

      rs = LaudiumJdbcUtil.getSelectRawPrepared(qTagged, params.toArray());
      HashMap<String, Object> ad = null;
      var hasNext = rs.next();

      if (!hasNext) {
        // Close the tagged query result set before running fallback
        rs.close();
        String qFallback = """
             SELECT
             ad.*,
             buss.name AS business_name,
             buss.email AS business_email
            FROM ads ad
            JOIN campaigns camp ON camp.id = ad.campaign_id
            JOIN ad_placements place ON place.id = ad.placement_id
            LEFT JOIN businesses buss ON buss.id = ad.business_id
            LEFT JOIN payments pay ON pay.id = ad.payment_id
            LEFT JOIN media m ON m.id = ad.image_id
            WHERE ad.`status` != 'expired'
            AND ad.is_deleted = 0
            AND place.location LIKE ?
            AND ad.placement_date <= NOW()
            AND ad.expiry_date >= NOW()
            AND camp.status != 'completed'
            ORDER BY RAND()
            LIMIT 1
            """;
        rs = LaudiumJdbcUtil.getSelectRawPrepared(qFallback, placement);
      }

      if (hasNext || rs.next()) {
        ad = new HashMap<>();
        ad.put("id", rs.getString("id"));
        ad.put("campaign_id", rs.getString("campaign_id"));
        ad.put("placement_id", rs.getString("placement_id"));
        ad.put("title", rs.getString("title"));
        ad.put("image_url", rs.getString("image_url"));
        ad.put("video_url", rs.getString("video_url"));
        ad.put("click_url", rs.getString("click_url"));
        ad.put("placement_location", rs.getString("location"));
        ad.put("image", rs.getString("file"));
        ad.put("business_name", rs.getString("business_name"));
        ad.put("business_email", rs.getString("business_email"));
      }

      return ad;
    } finally {
      if (rs != null) {
        try {
          rs.close();
        } catch (Exception ignored) {}
      }
    }
  }

  // All active ads for a placement location (LIKE match).
  public List<HashMap<String, Object>> getAllActiveByPlacement(String placement) throws Exception {
    CustomRs rs = null;
    try {
      String q = """
          SELECT
              ads.*,
              biz.name as business_name,
              biz.email as business_email,
              m.file
           FROM ads
           JOIN ad_placements as ad_p ON ads.placement_id = ad_p.id
           LEFT JOIN media AS m ON ads.image_id = m.id
           JOIN payments AS p ON ads.payment_id = p.id
           JOIN businesses AS biz ON ads.business_id = biz.id
           WHERE ads.status != 'expired'
           AND ad_p.location LIKE ?
           AND DATE(placement_date) <= CURDATE()
           AND expiry_date >= NOW()
           AND p.status = 'COMPLETE'
           AND ads.is_deleted = 0
           ORDER BY ads.placement_date DESC LIMIT 100
          """;
      rs = LaudiumJdbcUtil.getSelectRawPrepared(
          q, placement.equalsIgnoreCase("main_page_ad")
              ? "%%" : "%" + placement + "%"
      );

      List<HashMap<String, Object>> ads = new ArrayList<>();

      while (rs.next()) {
        HashMap<String, Object> ad = new HashMap<>();
        ad.put("id", rs.getString("id"));
        ad.put("placement_id", rs.getString("placement_id"));
        ad.put("title", rs.getString("title"));
        ad.put("image_url", rs.getString("image_url"));
        ad.put("video_url", rs.getString("video_url"));
        ad.put("click_url", rs.getString("click_url"));
        ad.put("placement_location", rs.getString("location"));
        ad.put("image", rs.getString("file"));
        ad.put("business_name", rs.getString("business_name"));
        ad.put("business_email", rs.getString("business_email"));
        ads.add(ad);
      }

      return ads;
    } finally {
      if (rs != null) {
        try {
          rs.close();
        } catch (Exception ignored) {}
      }
    }
  }

  // Increment an ad's impression counter.
  public void incrementImpression(Integer id) throws Exception {
    Ad ad = adRepository.findById(id).orElseThrow(() -> new Exception("Ad not found"));
    Integer current = ad.getImpressions() != null ? ad.getImpressions() : 0;
    ad.setImpressions(current + 1);
    adRepository.save(ad);
  }

  // Increment an ad's click counter.
  public void incrementClicks(Integer id) throws Exception {
    Ad ad = adRepository.findById(id).orElseThrow(() -> new Exception("Ad not found"));
    Integer current = ad.getClicks() != null ? ad.getClicks() : 0;
    ad.setClicks(current + 1);
    adRepository.save(ad);
  }

  // List all ad placements.
  public List<Map<String, Object>> getPlacements() throws Exception {
    CustomRs rs = null;
    try {
      String q = "SELECT * FROM ad_placements ORDER BY id";
      rs = LaudiumJdbcUtil.getSelectRaw(q);

      List<Map<String, Object>> placements = new ArrayList<>();
      while (rs.next()) {
        Map<String, Object> placement = new HashMap<>();
        placement.put("id", rs.getInt("id"));
        placement.put("location", rs.getString("location"));
        placement.put("description", rs.getString("description"));
        placement.put("fee", rs.getDouble("fee"));
        placement.put("fee_type", rs.getString("fee_type"));
        placement.put("billing_unit", rs.getString("billing_unit"));
        placement.put("width", rs.getString("width"));
        placement.put("height", rs.getString("height"));
        placement.put("aspect_ratio", rs.getString("aspect_ratio"));
        placement.put("status", rs.getString("status"));
        placement.put("is_rotating", rs.getBoolean("is_rotating"));
        placements.add(placement);
      }
      return placements;
    } finally {
      if (rs != null) {
        try {
          rs.close();
        } catch (Exception ignored) {}
      }
    }
  }

  // Active ads for a given category.
  public List<HashMap<String, Object>> getByCategory(Long categoryId) throws Exception {
    CustomRs rs = null;
    try {
      String q = """
          SELECT
              ads.*,
              biz.name as business_name,
              biz.email as business_email,
              m.file,
              cat.name as category_name
          FROM ads
          LEFT JOIN media AS m ON ads.image_id = m.id
          JOIN businesses AS biz ON ads.business_id = biz.id
          JOIN categories AS cat ON ads.category_id = cat.id
          LEFT JOIN payments AS p ON ads.payment_id = p.id
          WHERE ads.category_id = ?
          AND ads.status = 'active'
          AND ads.is_deleted = 0
          AND p.status = 'COMPLETE'
          ORDER BY ads.created_at DESC
          """;
      rs = LaudiumJdbcUtil.getSelectRawPrepared(q, categoryId);

      List<HashMap<String, Object>> ads = new ArrayList<>();
      while (rs.next()) {
        HashMap<String, Object> ad = new HashMap<>();
        ad.put("id", rs.getString("id"));
        ad.put("title", rs.getString("title"));
        ad.put("description", rs.getString("description"));
        ad.put("image_url", rs.getString("image_url"));
        ad.put("video_url", rs.getString("video_url"));
        ad.put("click_url", rs.getString("click_url"));
        ad.put("image", rs.getString("file"));
        ad.put("business_name", rs.getString("business_name"));
        ad.put("business_email", rs.getString("business_email"));
        ad.put("category_name", rs.getString("category_name"));
        ads.add(ad);
      }
      return ads;
    } finally {
      if (rs != null) {
        try {
          rs.close();
        } catch (Exception ignored) {}
      }
    }
  }

  // Aggregate ad status statistics.
  public HashMap<String, Object> getStats() throws Exception {
    CustomRs rs = null;
    try {
      String q = """
          SELECT
              COUNT(*) as total,
              SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired
          FROM ads
          WHERE is_deleted = 0
          """;
      rs = LaudiumJdbcUtil.getSelectRaw(q);

      HashMap<String, Object> stats = new HashMap<>();
      if (rs.next()) {
        stats.put("total", rs.getInt("total"));
        stats.put("active", rs.getInt("active"));
        stats.put("pending", rs.getInt("pending"));
        stats.put("expired", rs.getInt("expired"));
      }
      return stats;
    } finally {
      if (rs != null) {
        try {
          rs.close();
        } catch (Exception ignored) {}
      }
    }
  }

  // Ads belonging to a campaign.
  public List<HashMap<String, Object>> getByCampaign(Integer campaignId) throws Exception {
    CustomRs rs = null;
    try {
      String q = """
          SELECT
              ads.*,
              biz.name as business_name,
              biz.email as business_email,
              m.file
          FROM ads
          LEFT JOIN media AS m ON ads.image_id = m.id
          JOIN businesses AS biz ON ads.business_id = biz.id
          WHERE ads.campaign_id = ?
          AND ads.is_deleted = 0
          ORDER BY ads.created_at DESC
          """;
      rs = LaudiumJdbcUtil.getSelectRawPrepared(q, campaignId);

      List<HashMap<String, Object>> ads = new ArrayList<>();
      while (rs.next()) {
        HashMap<String, Object> ad = new HashMap<>();
        ad.put("id", rs.getString("id"));
        ad.put("title", rs.getString("title"));
        ad.put("description", rs.getString("description"));
        ad.put("image_url", rs.getString("image_url"));
        ad.put("video_url", rs.getString("video_url"));
        ad.put("click_url", rs.getString("click_url"));
        ad.put("image", rs.getString("file"));
        ad.put("business_name", rs.getString("business_name"));
        ad.put("business_email", rs.getString("business_email"));
        ad.put("status", rs.getString("status"));
        ad.put("impressions", rs.getString("impressions"));
        ad.put("clicks", rs.getString("clicks"));
        ads.add(ad);
      }
      return ads;
    } finally {
      if (rs != null) {
        try {
          rs.close();
        } catch (Exception ignored) {}
      }
    }
  }

  // Helper method to convert Ad entity to AdResponseDTO
  private AdResponseDTO toAdResponse(Ad ad) {
    List<Tag> tags = ad.getTags() == null ? Collections.emptyList() : ad.getTags().stream()
        .map(AdTags::getTag)
        .filter(Objects::nonNull)
        .collect(Collectors.toList());
    return AdResponseDTO.fromAd(ad, tags);
  }
}
