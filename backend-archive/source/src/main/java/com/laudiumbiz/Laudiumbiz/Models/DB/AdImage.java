package com.laudiumbiz.Laudiumbiz.Models.DB;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * AdImage entity - junction table for ads and images.
 * Composite primary key (ad_id, image_id).
 */
@Entity
@Table(name = "ad_images")
@Getter
@Setter
public class AdImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "ad_id")
    private Integer ad_id;

    @Column(name = "image_id")
    private Integer image_id;
}