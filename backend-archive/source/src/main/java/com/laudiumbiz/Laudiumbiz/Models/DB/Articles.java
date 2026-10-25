package com.laudiumbiz.Laudiumbiz.Models.DB;

import com.laudiumbiz.Laudiumbiz.Utils.CustomRs;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Articles entity for published/generated articles.
 */
@Entity
@Table(name = "articles")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Articles {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String title;
    private String slug;
    private String summary;
    private String content;
    private String article_type; // featured | popular | top

    @Transient
    private Media cover;
    private Integer cover_id;

    @Transient
    private Media thumbnail;
    private Integer thumbnail_id;

    @Transient
    private Category category;
    private Integer category_id;

    @Transient
    private User author;
    private Integer author_id;

    private Boolean archived;
    // draft, published, scheduled
    private String status;
    // JSON array of source URLs
    private String sources;
    private LocalDateTime scheduled_for;
    private LocalDateTime created_at;
    private LocalDateTime updated_at;

    // Aliases for camelCase compatibility with existing code
    public Boolean getIs_archived() { return archived; }
    public void setIs_archived(Boolean archived) { this.archived = archived; }

    /**
     * Factory method to create an Articles entity from a CustomRs result set.
     * Used by controllers that build entities from raw SQL queries.
     */
    public static Articles fromResultSet(CustomRs rs) throws java.sql.SQLException {
        Articles article = new Articles();
        article.setId(rs.getInt("id"));
        article.setTitle(rs.getString("title"));
        article.setSlug(rs.getString("slug"));
        article.setSummary(rs.getString("summary"));
        article.setContent(rs.getString("content"));
        article.setArticle_type(rs.getString("article_type"));
        Integer covId = rs.getInt("cover_id");
        article.setCover_id(covId);
        Integer thumbId = rs.getInt("thumbnail_id");
        article.setThumbnail_id(thumbId);
        Integer catId = rs.getInt("category_id");
        article.setCategory_id(catId);
        Integer authId = rs.getInt("author_id");
        article.setAuthor_id(authId);
        Boolean arch = rs.getBoolean("archived");
        article.setArchived(arch);
        article.setStatus(rs.getString("status"));
        article.setSources(rs.getString("sources"));
        article.setScheduled_for(rs.getLocalDateTime("scheduled_for"));
        article.setCreated_at(rs.getLocalDateTime("created_at"));
        article.setUpdated_at(rs.getLocalDateTime("updated_at"));
        return article;
    }
}