/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models.DTO;

import java.time.LocalDate;
import java.util.List;

/**
 *
 * @author issai
 */

/**
 * PURPOSE: Data transfer object for publishing scheduled articles with date range and bulk options
 *
 * TYPE: Request DTO
 *
 * USED BY: ArticleController - PUT /api/v1/articles/publish-scheduled
 *
 * @modified 2025-12-09 - Added purpose documentation
 */
public class PublishRequestDTO {
    public List<Long> articleIds;
    public LocalDate startDate;
    public LocalDate endDate;
    public Boolean publishAll;
    public Boolean publishToday;

    public List<Long> getArticleIds() {
        return articleIds;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public Boolean getPublishAll() {
        return publishAll;
    }

    public Boolean getPublishToday() {
        return publishToday;
    }
    
    
    
}
