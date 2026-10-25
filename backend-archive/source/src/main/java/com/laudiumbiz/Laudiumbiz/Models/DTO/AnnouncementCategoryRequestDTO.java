/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models.DTO;

import java.time.LocalDateTime;
import lombok.Data;

/**
 *
 * @author issai
 */

/**
 * PURPOSE: Data transfer object for creating or updating announcement categories
 *
 * TYPE: Request DTO
 *
 * USED BY: NoticeController - POST /api/v1/notices/categories, PUT /api/v1/notices/categories/{id}, PUT /api/v1/notices/categories/{id}/change-status
 *
 * @modified 2025-12-09 - Added purpose documentation
 */
@Data
public class AnnouncementCategoryRequestDTO {
    
    String name;
    
    String description; 
    
    String slug; 
    
    Boolean is_active;
   
}
