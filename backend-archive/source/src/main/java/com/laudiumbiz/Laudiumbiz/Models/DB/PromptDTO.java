/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models.DB;

import lombok.Data;

/**
 *
 * @author Imran
 */
@Data
public class PromptDTO {
    private Long id;

    private String type;
    private String name; // e.g., "DefaultArticlePrompt"

    private String content;

    private Boolean active;   
}
