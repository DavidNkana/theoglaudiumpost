package com.laudiumbiz.Laudiumbiz.Models.DB;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Category entity for article categorization.
 */
@Entity
@Table(name = "categories")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @NotBlank
    private String name;

    private String slug;
    private Boolean is_deleted;
    private LocalDateTime created_at;
    private LocalDateTime updated_at;
}