package com.laudiumbiz.Laudiumbiz.Models.DB;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Announcement entity for community announcements and notices.
 */
@Entity
@Table(name = "announcements")
@Getter
@Setter
public class Announcement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private Integer category_id;
    private Integer image_id;
    private Integer author_id;
    private String title;
    private String slug;
    private String description;
    private String content;
    private String location;
    private String status;
    private String priority;
    private Integer priority_order;
    private Boolean is_featured;
    private Boolean is_urgent;
    private Boolean is_deleted;
    private LocalDateTime publish_date;
    private LocalDateTime expire_date;
    private LocalDateTime created_at;
    private LocalDateTime updated_at;

    // Relationships - marked transient for now
    @Transient
    private Media image;

    @Transient
    private AnnouncementCategory category;
}