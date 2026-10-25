package com.laudiumbiz.Laudiumbiz.Models.DB;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Tag entity for article categorization.
 */
@Entity
@Table(name = "tags")
@Getter
@Setter
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;
    private String slug;
    private Boolean is_deleted;
    private LocalDateTime created_at;
    private LocalDateTime updated_at;
}