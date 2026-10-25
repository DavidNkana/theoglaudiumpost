package com.laudiumbiz.Laudiumbiz.Models.DB;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Placement entity for ad placements.
 */
@Entity
@Table(name = "ad_placements")
@Getter
@Setter
public class Placement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String location;
    private String description;
    private Double fee;
    private String fee_type;
    private String billing_unit;
    private String status;
    private String aspect_ratio;
    private Boolean is_rotating;
    private Integer image_id;
    private LocalDateTime created_at;
    private LocalDateTime updated_at;
}