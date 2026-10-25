/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models;

import java.time.LocalDateTime;
import java.util.List;


import lombok.Data;

/**
 *
 * @author Imran
 */

@Data
public class ArticleRequest {
    public String title;
    public String slug;
    public String summary;
    public String content;
    public String coverImage;
    public String thumbnailImage;
    public ArticleType articleType;
    public int categoryId;
    public Status status;
    public String authorId;
    public Boolean archived;
    public LocalDateTime scheduledFor;
    public List<String> sources;
    public List<Integer> tags;

    public Boolean notify;
    
    public enum Status {
        draft, published, scheduled
    }
    
    public enum ArticleType {
        featured, popular, top
    }
}
