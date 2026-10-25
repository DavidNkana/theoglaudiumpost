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
 * PURPOSE: Data transfer object for creating or updating announcements/notices
 *
 * TYPE: Request DTO
 *
 * USED BY: NoticeController - POST /api/v1/notices/create, PUT /api/v1/notices/{id}, PUT /api/v1/notices/{id}/change-status
 *
 * @modified 2025-12-09 - Added purpose documentation
 */
@Data
public class AnnouncementRequestDTO {
    Integer category_id;
    
    String imageBase64;
    
    Integer author_id;
    
    String title; 
    
    String slug; 
    
    String description; 
    
    String content; 
    
    String location; 
    
    String status;
    
    String priority; 
    
    Boolean is_featured;
    
    Boolean is_urgent;
    
    Boolean is_deleted;
    
    LocalDateTime publish_date, expire_date;
}
