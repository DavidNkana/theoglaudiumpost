package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Models.ArticleResponse;
import com.laudiumbiz.Laudiumbiz.Models.CategoryOrTagRequest;
import com.laudiumbiz.Laudiumbiz.Models.DB.Articles;
import com.laudiumbiz.Laudiumbiz.Models.DB.Category;
import com.laudiumbiz.Laudiumbiz.Models.DB.Tag;
import com.laudiumbiz.Laudiumbiz.Repositories.CategoryRepository;
import com.laudiumbiz.Laudiumbiz.Utils.CustomRs;
import com.laudiumbiz.Laudiumbiz.Utils.LaudiumJdbcUtil;
import org.springframework.stereotype.Service;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * PURPOSE: Encapsulates all data-access logic for category endpoints so the
 * CategoryController performs no repository or raw-SQL access.
 *
 * KEY METHODS:
 * - getActiveCategories(): non-deleted categories
 * - createCategory(CategoryOrTagRequest): persists a new category
 * - updateCategory(Integer, CategoryOrTagRequest): updates an existing category
 * - getCategoryArticles(String slug, int page, int size): paginated articles for a category (raw SQL), or null if the category is not found
 * - softDeleteCategory(Integer): marks a category as deleted
 */
@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<Category> getActiveCategories() {
        return categoryRepository.findByIs_deletedFalse();
    }

    public Category createCategory(CategoryOrTagRequest payload) {
        Category category = new Category();
        category.setName(payload.getName());
        category.setSlug(payload.getSlug());
        category.setIs_deleted(payload.getIsDeleted());
        return categoryRepository.save(category);
    }

    public Category updateCategory(Integer id, CategoryOrTagRequest payload) throws Exception {
        Category category = categoryRepository.findById(id).orElseThrow(() -> new Exception("Category not found"));
        category.setName(payload.getName());
        category.setSlug(payload.getSlug());
        category.setIs_deleted(payload.getIsDeleted());
        categoryRepository.save(category);
        return category;
    }

    /**
     * Returns the paginated articles response for a category slug, or {@code null}
     * if no category matches the slug.
     */
    public Map<String, Object> getCategoryArticles(String slug, int page, int size) throws SQLException {
        List<Category> allCategories = categoryRepository.findAll();
        Category category = allCategories.stream()
            .filter(c -> slug.equals(c.getSlug()))
            .findFirst()
            .orElse(null);
        if (category == null) {
            return null;
        }
        int offset = page * size;
        Integer id = category.getId();

        // Get total count
        String countQuery = "SELECT COUNT(*) as total FROM articles WHERE category_id = ?";
        long total = 0;
        try (CustomRs countRs = LaudiumJdbcUtil.getSelectRawPrepared(countQuery, id)) {
            if (countRs.next()) {
                total = countRs.getLong("total");
            }
        }

        // Get paginated articles using raw SQL to avoid ORM relationship resolution issues
        String articlesQuery = """
            SELECT * FROM articles
            WHERE category_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
            """;
        List<Articles> articlesList = new ArrayList<>();
        try (CustomRs rs = LaudiumJdbcUtil.getSelectRawPrepared(articlesQuery, id, size, offset)) {
            while (rs.next()) {
                articlesList.add(Articles.fromResultSet(rs));
            }
        }

        List<ArticleResponse> articlesResponses = articlesList.stream()
            .map(this::toArticleResponse)
            .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("category", category);
        response.put("articles", articlesResponses);
        response.put("total", total);
        response.put("page", page);
        response.put("size", size);
        response.put("totalPages", (int) Math.ceil((double) total / size));

        return response;
    }

    public void softDeleteCategory(Integer id) throws Exception {
        Category category = categoryRepository.findById(id).orElseThrow(() -> new Exception("Category not found"));
        category.setIs_deleted(true);
        categoryRepository.save(category);
    }

    private ArticleResponse toArticleResponse(Articles article) {
        List<Tag> tags = getTagsForArticle(article.getId());
        return ArticleResponse.fromArticle(article, tags);
    }

    private List<Tag> getTagsForArticle(int articleId) {
        try {
            String q = """
                        SELECT t.id, t.name, t.slug
                        FROM tags t
                        JOIN article_tags art_t on t.id = art_t.tag_id
                        WHERE art_t.article_id = ?
                    """;

            List<Tag> tags = new ArrayList<>();
            try (CustomRs rs = LaudiumJdbcUtil.getSelectRawPrepared(q, articleId)) {
                while (rs.next()) {
                    Tag tag = new Tag();
                    tag.setId(rs.getInt("id"));
                    tag.setName(rs.getString("name"));
                    tag.setSlug(rs.getString("slug"));
                    tags.add(tag);
                }
            }

            return tags;
        } catch (SQLException e) {
            throw new RuntimeException("Error fetching tags for article: " + articleId, e);
        }
    }
}
