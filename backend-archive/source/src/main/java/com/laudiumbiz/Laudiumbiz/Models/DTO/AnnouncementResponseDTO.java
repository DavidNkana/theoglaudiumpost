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
 * PURPOSE: Data transfer object for returning announcement/notice information with associated media and category
 *
 * TYPE: Response DTO
 *
 * USED BY: NoticeController - GET /api/v1/notices, GET /api/v1/notices/{id}, GET /api/v1/notices/slug/{slug}
 *
 * @modified 2025-12-09 - Added purpose documentation
 */
public class AnnouncementResponseDTO {

    private Integer id;

    private String title;

    private String slug;

    private String description;
   
    private String content;

    private String location;

    private String status;

    private String priority;

    private Boolean is_featured;

    private Boolean is_urgent;

    private Map<String, String> image;

    private Map<String, Object> category;
    
     private LocalDateTime publish_date, expire_date;

    public AnnouncementResponseDTO(Integer id, String title, String slug, String description, String content, String location, String status, String priority, Boolean is_featured, Boolean is_urgent, Map<String, String> image, Map<String, Object> category, LocalDateTime publish_date, LocalDateTime expire_date) {
        this.id = id;
        this.title = title;
        this.slug = slug;
        this.description = description;
        this.content = content;
        this.location = location;
        this.status = status;
        this.priority = priority;
        this.is_featured = is_featured;
        this.is_urgent = is_urgent;
        this.image = image;
        this.category = category;
        this.publish_date = publish_date;
        this.expire_date = expire_date;
    }

    public AnnouncementResponseDTO(Announcement annoucement) {
        Map<String, Object> categoryMap = mapCategory(annoucement.getCategory());
        Map<String, String> imageMap = mapFileField(annoucement.getImage());
        this.id = annoucement.getId();
        this.title = annoucement.getTitle();
        this.slug = annoucement.getSlug();
        this.description = annoucement.getDescription();
        this.content = annoucement.getContent();
        this.location = annoucement.getLocation();
        this.status = annoucement.getStatus();
        this.priority = annoucement.getPriority(); 
        this.is_featured =  annoucement.getIs_featured();
        this.is_urgent = annoucement.getIs_urgent();
        this.image = imageMap; 
        this.category = categoryMap;
        this.publish_date =  annoucement.getPublish_date();
        this.expire_date = annoucement.getExpire_date();
        
    }
      public static AnnouncementResponseDTO fromAnnouncement(Announcement annoucement) {
        Map<String, Object> categoryMap = mapCategory(annoucement.getCategory());
        Map<String, String> imageMap = mapFileField(annoucement.getImage());
        return new AnnouncementResponseDTO(
                annoucement.getId(), annoucement.getTitle(), annoucement.getSlug(), annoucement.getDescription(),
                annoucement.getContent(), annoucement.getLocation(), annoucement.getStatus(), annoucement.getPriority(), 
                annoucement.getIs_featured(), annoucement.getIs_urgent(), imageMap, categoryMap, annoucement.getPublish_date(), 
                annoucement.getExpire_date()
        );
    }

   
    private static Map<String, Object> mapCategory(AnnouncementCategory category) {
        if (category == null) {
            return null;
        }

        Map<String, Object> map = new HashMap<>();
        map.put("id", category.getId());
        map.put("name", category.getName());
        map.put("description", category.getDescription());
        return map;
    }

    private static Map<String, String> mapFileField(Media fileField) {
        if (fileField == null) {
            return null;
        }

        Map<String, String> map = new HashMap<>();
        map.put("file", fileField.getFile());
        return map;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public Boolean getIs_featured() {
        return is_featured;
    }

    public void setIs_featured(Boolean is_featured) {
        this.is_featured = is_featured;
    }

    public Boolean getIs_urgent() {
        return is_urgent;
    }

    public void setIs_urgent(Boolean is_urgent) {
        this.is_urgent = is_urgent;
    }

    public Map<String, String> getImage() {
        return image;
    }

    public void setImage(Map<String, String> image) {
        this.image = image;
    }

    public Map<String, Object> getCategory() {
        return category;
    }

    public void setCategory(Map<String, Object> category) {
        this.category = category;
    }
    
     public LocalDateTime getPublish_date() {
        return publish_date;
    }

    public void setPlacement_date(LocalDateTime publish_date) {
        this.publish_date = publish_date;
    }

    public LocalDateTime getExpire_date() {
        return expire_date;
    }

    public void setExpiry_date(LocalDateTime expire_date) {
        this.expire_date = expire_date;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }
}
