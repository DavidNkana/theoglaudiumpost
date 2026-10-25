/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models.DTO;

import com.laudiumbiz.Laudiumbiz.Models.DB.Announcement;
import com.laudiumbiz.Laudiumbiz.Models.DB.AnnouncementCategory;
import com.laudiumbiz.Laudiumbiz.Models.DB.Media;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 *
 * @author issai
 */

/**
 * PURPOSE: Data transfer object for returning announcement category information
 *
 * TYPE: Response DTO
 *
 * USED BY: NoticeController - GET /api/v1/notices/categories
 *
 * @modified 2025-12-09 - Added purpose documentation
 */
public class AnnouncementCategoryResponseDTO {

    private Integer id;
    
    private String name;
    
    private String description; 
    
    private String slug; 
    
    private Boolean is_active;
    
    private LocalDateTime created_at, updated_at;
    
    
}
