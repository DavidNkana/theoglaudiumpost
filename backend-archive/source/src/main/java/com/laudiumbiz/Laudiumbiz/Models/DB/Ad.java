package com.laudiumbiz.Laudiumbiz.Models.DB;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Ad entity for advertisements.
 */
@Entity
@Table(name = "ads")
@Getter
@Setter
public class Ad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private Integer business_id;
    private Integer payment_id;
    private Integer placement_id;
    private Integer category_id;
    private String title;
    private String description;
    private String image_url;
    private String video_url;
    private String status;
    private String payment_status;
    private String click_url;
    private Boolean is_deleted;
    private Boolean design_ad;
    private String placement_info;
    private Double total_cost;
    private Integer impressions;
    private Integer clicks;
    private Integer image_id;

    private LocalDateTime placement_date;
    private LocalDateTime expiry_date;
    private LocalDateTime created_at;
    private LocalDateTime updated_at;

    // Relationships - marked transient for now, will be mapped via repositories
    @Transient
    private Businesses business;

    @Transient
    private Payment payment;

    @Transient
    private Placement placement;

    @Transient
    private List<AdTags> tags;

    @Transient
    private List<AdImage> images;
}