/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models;

import com.laudiumbiz.Laudiumbiz.Models.DB.Articles;
import com.laudiumbiz.Laudiumbiz.Models.DB.Media;
import com.laudiumbiz.Laudiumbiz.Models.DB.Tag;
import com.laudiumbiz.Laudiumbiz.Models.DB.Category;
import com.laudiumbiz.Laudiumbiz.Models.DB.User;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.lang.reflect.Type;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;

/**
 *
 * @author Imran
 */
// @Data
public class ArticleResponse {

    private Integer id;
    private Integer category_id;
    private Integer cover_id;

    private String title;
    private String slug;
    private String summary;
    private String content;
    private String article_type;
    private String author;
    private String status;
//    private String category_name;
//    private String cover_image;
//    private String thumbnail_image

    private Boolean archived;

    private List<String> sources;

    private Map<String, String> cover;
    private Map<String, String> thumbnail;
    private Map<String, Object> category;

    private LocalDateTime scheduled_for;
    private LocalDateTime created_at;

    private List<Tag> tags;

    public ArticleResponse(
            Integer id, String title, String slug, String summary, String content, String article_type,
            Map<String, String> cover, Map<String, String> thumbnail, Map<String, Object> category,
            Integer category_id, Integer cover_id, String author, Boolean archived, String status,
            LocalDateTime scheduled_for, LocalDateTime created_at, List<Tag> tags, List<String> sources
    //            String category_name, String cover_image, String thumbnail_image
    ) {
        this.id = id;
        this.title = title;
        this.slug = slug;
        this.summary = summary;
        this.content = content;
        this.article_type = article_type;
        this.cover = cover;
        this.thumbnail = thumbnail;
        this.category = category;
//        this.category_name = category_name;
        this.category_id = category_id;
        this.cover_id = cover_id;
        this.author = author;
        this.archived = archived;
        this.status = status;
        this.scheduled_for = scheduled_for;
        this.created_at = created_at;
        this.tags = tags;
        this.sources = sources;
//        this.cover_image = cover_image;
//        this.thumbnail_image = thumbnail_image;
    }

    public static ArticleResponse fromArticle(Articles article, List<Tag> tags) {
        Map<String, Object> categoryMap = mapCategory(article.getCategory());
        Map<String, String> coverMap = mapFileField(article.getCover());
        Map<String, String> thumbnailMap = mapFileField(article.getThumbnail());
        String username = article.getAuthor() != null ? article.getAuthor().getName() : null;
        List<String> sources = parseSources(article.getSources());

        return new ArticleResponse(
                article.getId(), article.getTitle(), article.getSlug(), article.getSummary(),
                article.getContent(), article.getArticle_type(),
                coverMap, thumbnailMap, categoryMap, article.getCategory_id(), article.getCover_id(), username,
                article.getArchived(), article.getStatus(), article.getScheduled_for(),
                article.getCreated_at(), tags, sources);
    }

    public static ArticleResponse fromResultSet(ResultSet rs, List<Tag> tags) throws SQLException, Exception {
        String sourcesJson = rs.getString("sources");
        List<String> sources = parseSources(sourcesJson);

        return new ArticleResponse(
                rs.getInt("id"), rs.getString("title"), rs.getString("slug"), rs.getString("summary"),
                null, rs.getString("article_type"), null, null, null, rs.getInt("category_id"), rs.getInt("cover_id"), null,
                rs.getBoolean("archived"), rs.getString("status"),
                rs.getTimestamp("scheduled_for") != null ? rs.getTimestamp("scheduled_for").toLocalDateTime() : null,
                rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null,
                tags, sources
        //            tags, rs.getString("category_name"), rs.getString("cover_image"), rs.getString("thumbnail_image")
        );

    }

    private static Map<String, Object> mapCategory(Category category) {
        if (category == null) {
            return null;
        }

        Map<String, Object> map = new HashMap<>();
        map.put("id", category.getId());
        map.put("name", category.getName());
        map.put("slug", category.getSlug());
        return map;
    }

    private static Map<String, String> mapFileField(Media fileField) {
        if (fileField == null) {
            return null;
        }

        String fileContent = fileField.getFile();

        // Check if the file content is base64 data
        if (fileContent != null && (fileContent.startsWith("data:") ||
            fileContent.length() > 1000 && !fileContent.startsWith("http"))) {
            // It's likely base64 data, so return just a URL or null
            return null;
        }

        Map<String, String> map = new HashMap<>();
        map.put("file", fileContent);
        return map;
    }

    private static List<String> parseSources(String sourcesJson) {
        if (sourcesJson == null || sourcesJson.trim().isEmpty()) {
            return new ArrayList<>();
        }

        try {
            Gson gson = new Gson();
            Type listType = new TypeToken<List<String>>(){}.getType();
            List<String> sources = gson.fromJson(sourcesJson, listType);
            return sources != null ? sources : new ArrayList<>();
        } catch (Exception e) {
            // If parsing fails, return empty list
            return new ArrayList<>();
        }
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

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getArticle_type() {
        return article_type;
    }

    public void setArticle_type(String article_type) {
        this.article_type = article_type;
    }

    public Map<String, String> getCover() {
        return cover;
    }

    public void setCover(Media cover) {
        this.cover = mapFileField(cover);
    }

    public Map<String, String> getThumbnail() {
        return thumbnail;
    }

    public void setThumbnail(Media thumbnail) {
        this.thumbnail = mapFileField(thumbnail);
    }

    public Map<String, Object> getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = mapCategory(category);
    }

    public Integer getCategory_id() {
        return category_id;
    }

    public void setCategory_id(Integer category_id) {
        this.category_id = category_id;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(User author) {
        this.author = author.getName();
    }

    public Boolean getArchived() {
        return archived;
    }

    public void setArchived(Boolean archived) {
        this.archived = archived;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getScheduled_for() {
        return scheduled_for;
    }

    public void setScheduled_for(LocalDateTime scheduled_for) {
        this.scheduled_for = scheduled_for;
    }

    public LocalDateTime getCreated_at() {
        return created_at;
    }

    public void setCreated_at(LocalDateTime created_at) {
        this.created_at = created_at;
    }

    public List<Tag> getTags() {
        return tags;
    }

    public void setTags(List<Tag> tags) {
        this.tags = tags;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public List<String> getSources() {
        return sources;
    }

    public void setSources(List<String> sources) {
        this.sources = sources;
    }

//    public String getCategory_name() {
//        return category_name;
//    }
//
//    public String getCover_image() {
//        return cover_image;
//    }
//
//    public String getThumbnail_image() {
//        return thumbnail_image;
//    }
//

}
