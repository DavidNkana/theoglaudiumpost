/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models.DTO;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;

/**
 *
 * @author Imran Issa
 */

/**
 * PURPOSE: Data transfer object for filtering and paginating article queries
 *
 * TYPE: Request DTO (Query Parameters)
 *
 * USED BY: ArticleController - POST /api/v1/articles (getAllArticles)
 *
 * @modified 2025-12-09 - Added purpose documentation
 */
public class ArticleQueryParams {
    private String type;
    private int page = 0;
    private int size = 10;
    private String search;
    private Integer category;
    private String status;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private List<Integer> excludeIds;

    public String getType() {
        return type;
    }

    public int getPage() {
        return page;
    }

    public int getSize() {
        return size;
    }

    public String getSearch() {
        return search;
    }

    public Integer getCategory() {
        return category;
    }

    public String getStatus() {
        return status;
    }

    public List<Integer> getExcludeIds() {
        return excludeIds;
    }

    public LocalDateTime getStartDate() {
        return startDate;
    }

    public LocalDateTime getEndDate() {
        return endDate;
    }

    public void setType(String type) { this.type = type; }
    public void setPage(int page) { this.page = page; }
    public void setSize(int size) { this.size = size; }
    public void setSearch(String search) { this.search = search; }
    public void setCategory(Integer category) { this.category = category; }
    public void setStatus(String status) { this.status = status; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }
    public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }
    public void setExcludeIds(List<Integer> excludeIds) { this.excludeIds = excludeIds; }
}
