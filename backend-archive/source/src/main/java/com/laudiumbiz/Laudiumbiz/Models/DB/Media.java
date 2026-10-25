package com.laudiumbiz.Laudiumbiz.Models.DB;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Media entity for uploaded files (images, etc).
 */
@Entity
@Table(name = "media")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Media {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String file;
    private LocalDateTime created_at;
    private LocalDateTime updated_at;
}