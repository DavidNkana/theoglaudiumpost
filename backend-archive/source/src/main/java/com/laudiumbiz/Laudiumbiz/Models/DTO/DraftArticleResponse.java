package com.laudiumbiz.Laudiumbiz.Models.DTO;

import com.laudiumbiz.Laudiumbiz.Models.DB.Articles;
import lombok.Builder;
import lombok.Singular;

import java.util.List;

@Builder
public record DraftArticleResponse(
    Integer articleId,
    String slug,
    String title,
    String article,
    String summary,
    String status,
    Integer coverMediaId,
    String coverUrl,
    Integer sourceId,
    @Singular
    List<String> sources
) {

  public static class DraftArticleResponseBuilder {

    public DraftArticleResponseBuilder articleEntity(Articles article) {
      return articleId(article.getId())
          .slug(article.getSlug())
          .title(article.getTitle())
          .summary(article.getSummary())
          .article(article.getContent())
          .status(article.getStatus());
    }
  }
}
