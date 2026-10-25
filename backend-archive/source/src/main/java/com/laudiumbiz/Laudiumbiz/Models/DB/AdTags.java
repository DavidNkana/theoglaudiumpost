package com.laudiumbiz.Laudiumbiz.Models.DB;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * AdTags entity - junction table for ads and tags.
 * Composite primary key (ad_id, tag_id).
 */
@Entity
@Table(name = "ad_tags")
@Getter
@Setter
public class AdTags {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "ad_id")
    private Integer ad_id;

    @Column(name = "tag_id")
    private Integer tag_id;

    // Relationship - marked transient for now
    @Transient
    private Tag tag;
}