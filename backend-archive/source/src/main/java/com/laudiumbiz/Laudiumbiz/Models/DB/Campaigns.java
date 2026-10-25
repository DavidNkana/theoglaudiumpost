package com.laudiumbiz.Laudiumbiz.Models.DB;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Campaigns entity for advertising campaigns.
 */
@Entity
@Table(name = "campaigns")
@Getter
@Setter
public class Campaigns {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private Integer business_id;
    private String name;
    private String transaction_ref;
    private Boolean is_recurring;
    private String payment_status;
    private String status;
    private Boolean is_deleted;
    private LocalDateTime start_date;
    private LocalDateTime end_date;
    private LocalDateTime created_at;

    // Relationship - marked transient for now
    @Transient
    private Businesses business;
}