package com.laudiumbiz.Laudiumbiz.Models.DB;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * AnnouncementCategory entity for organizing announcements.
 */
@Entity
@Table(name = "announcement_categories")
@Getter
@Setter
public class AnnouncementCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;
    private String description;
    private String icon;
    private String color_code;
    private Integer sort_order;
    private Boolean is_active;
    private LocalDateTime created_at;
    private LocalDateTime updated_at;
}