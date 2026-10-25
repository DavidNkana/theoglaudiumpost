package com.laudiumbiz.Laudiumbiz.Models.DB;

import jakarta.persistence.*;
import lombok.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * User entity for authentication and authorization.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String name;
    private String email;
    private String password;
    private Integer role_id;
    private LocalDateTime created_at;
    private LocalDateTime updated_at;

    // Relationships - marked transient for now
    @Transient
    private Role role;

    @Transient
    private Businesses business;
}