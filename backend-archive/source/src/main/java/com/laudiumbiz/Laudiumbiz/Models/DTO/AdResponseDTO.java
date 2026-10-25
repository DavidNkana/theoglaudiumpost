/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models.DTO;

import com.laudiumbiz.Laudiumbiz.Models.DB.Ad;
import com.laudiumbiz.Laudiumbiz.Models.DB.AdImage;
import com.laudiumbiz.Laudiumbiz.Models.DB.Payment;
import com.laudiumbiz.Laudiumbiz.Models.DB.Placement;
import com.laudiumbiz.Laudiumbiz.Models.DB.Businesses;
import com.laudiumbiz.Laudiumbiz.Models.DB.Campaigns;
import com.laudiumbiz.Laudiumbiz.Models.DB.Media;
import com.laudiumbiz.Laudiumbiz.Models.DB.Tag;
import com.laudiumbiz.Laudiumbiz.Models.IAdPlacement;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 *
 * @author Imran
 */
public class AdResponseDTO {

    private Integer id;
    private Integer payment_id;
    private Integer placement_id;
    private String title;
    private String description;
    private String image_url;
    private String video_url;
    private String status;
    private String click_url;
    private Boolean is_deleted;
    private Integer impressions;
    private Integer clicks;
    private String placement_info;
    private Double total_cost;
    /**
     * Logical ad type used by the API contract. Not persisted in database.
     * Defaults to MAIN_PAGE_ADD for newly created ads as per business rule.
     */
    private String type;

    private LocalDateTime placement_date, expiry_date;

    private LocalDateTime created_at, updated_at;

    private Integer image_id;
    private List<Integer> imageIds;
    private Map<String, Object> payment;

    private Map<String, Object> placement;

    private Map<String, Object> business;

    private List<Tag> tags;

    public AdResponseDTO(Integer id, Integer payment_id, Integer placement_id, String title, String description, String placement_info,
            Double total_cost, String image_url, String video_url, String status, String click_url, Boolean is_deleted,
            Integer impressions, Integer clicks, LocalDateTime placement_date, LocalDateTime expiry_date, LocalDateTime created_at,
            LocalDateTime updated_at, Integer image_id, List<Integer> imageIds, Map<String, Object> business, Map<String, Object> payment, Map<String, Object> placement,
            List<Tag> tags, String type
    ) {
        this.id = id;
        this.payment_id = payment_id;
        this.placement_id = placement_id;
        this.title = title;
        this.description = description;
        this.placement_info = placement_info;
        this.total_cost = total_cost;
        this.image_url = image_url;
        this.video_url = video_url;
        this.status = status;
        this.click_url = click_url;
        this.is_deleted = is_deleted;
        this.impressions = impressions;
        this.clicks = clicks;
        this.placement_date = placement_date;
        this.expiry_date = expiry_date;
        this.created_at = created_at;
        this.updated_at = updated_at;
        this.image_id = image_id;
        this.imageIds = imageIds;
        this.business = business;
        this.payment = payment;
        this.placement = placement;
        this.tags = tags;
        this.type = type;
    }

    public static AdResponseDTO fromAd(Ad ad, List<Tag> tags) {
        Map<String, Object> paymentMap = mapPayment(ad.getPayment());
        Map<String, Object> businessMap = mapBusiness(ad.getBusiness());

        List<Integer> images = new ArrayList<Integer>();
        List<AdImage> adImages = ad.getImages();
        if (adImages != null) {
            for (AdImage adImage : adImages) {
                images.add(adImage.getImage_id());
            }
        }

        Map<String, Object> placementMap = mapPlacement(ad.getPlacement());

        return new AdResponseDTO(
                ad.getId(), ad.getPayment_id(), ad.getPlacement_id(), ad.getTitle(), ad.getDescription(), ad.getPlacement_info(), ad.getTotal_cost(), ad.getImage_url(), ad.getVideo_url(), ad.getStatus(),
                ad.getClick_url(), ad.getIs_deleted(), ad.getImpressions(), ad.getClicks(), ad.getPlacement_date(), ad.getExpiry_date(),
                ad.getCreated_at(), ad.getUpdated_at(), ad.getImage_id(), images, businessMap, paymentMap, placementMap, tags, "MAIN_PAGE_ADD"
        );
    }

    private static Map<String, Object> mapBusiness(Businesses business) {
        if (business == null) {
            return null;
        }

        Map<String, Object> map = new HashMap<>();
        map.put("id", business.getId());
        map.put("name", business.getName());
        return map;
    }

    private static Map<String, Object> mapPayment(Payment payment) {
        if (payment == null) {
            return null;
        }

        Map<String, Object> map = new HashMap<>();
        map.put("id", payment.getId());
        map.put("payment_id", payment.getPayment_id());
        map.put("pf_payment_id", payment.getPf_payment_id());
        map.put("status", payment.getStatus());
        map.put("amount", payment.getAmount_gross());
        map.put("payment_method", payment.getPayment_method());
        map.put("eft_reference", payment.getEft_reference());
        map.put("eft_amount", payment.getEft_amount());
        return map;
    }

    private static Map<String, Object> mapCampaign(Campaigns campaign) {
        if (campaign == null) {
            return null;
        }

        Map<String, Object> map = new HashMap<>();
        map.put("id", campaign.getId());
        map.put("name", campaign.getName());
        map.put("status", campaign.getStatus());
        map.put("payment_status", campaign.getPayment_status());
        map.put("business", mapBusiness(campaign.getBusiness()));
        return map;
    }

//    private static Map<String, Object> mapPlacement(Placement placement) {
    private static Map<String, Object> mapPlacement(Placement placement) {
        if (placement == null) {
            return null;
        }

        Map<String, Object> map = new HashMap<>();
        map.put("id", placement.getId());
        map.put("location", placement.getLocation());
        return map;
    }

    private static Map<String, String> mapFileField(Media fileField) {
        if (fileField == null) {
            return null;
        }

        Map<String, String> map = new HashMap<>();
        map.put("file", fileField.getFile());
        return map;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreated_at() {
        return created_at;
    }

    public void setCreated_at(LocalDateTime created_at) {
        this.created_at = created_at;
    }

    public List<Tag> getTags() {
        return tags;
    }

    public void setTags(List<Tag> tags) {
        this.tags = tags;
    }

}
