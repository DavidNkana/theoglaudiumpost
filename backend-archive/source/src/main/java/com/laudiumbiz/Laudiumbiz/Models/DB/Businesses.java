package com.laudiumbiz.Laudiumbiz.Models.DB;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Businesses entity for business accounts.
 */
@Entity
@Table(name = "businesses")
@Getter
@Setter
public class Businesses {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private Integer user_id;
    private String name;
    private String email;
    private String phone;
    private String location;
    private Boolean is_deleted;
    private String status;
    private LocalDateTime created_at;
}