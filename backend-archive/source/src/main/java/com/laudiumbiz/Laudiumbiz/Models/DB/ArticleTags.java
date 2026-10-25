package com.laudiumbiz.Laudiumbiz.Models.DB;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * ArticleTags entity - junction table for articles and tags.
 * Composite primary key (article_id, tag_id).
 */
@Entity
@Table(name = "article_tags")
@Getter
@Setter
public class ArticleTags {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "article_id")
    private Integer article_id;

    @Column(name = "tag_id")
    private Integer tag_id;

    // Relationship - marked transient for now
    @Transient
    private Tag tag;
}