package com.laudiumbiz.Laudiumbiz.Models.DB;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

/**
 * Prompt entity for AI prompt templates.
 */
@Entity
@Table(name = "prompts")
@Getter
@Setter
public class Prompt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String type; // e.g., "system", "user"
    private String name; // e.g., "DefaultArticlePrompt"
    private String content;
    private Boolean active;
}