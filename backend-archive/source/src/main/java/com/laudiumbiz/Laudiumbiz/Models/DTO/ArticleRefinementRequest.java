package com.laudiumbiz.Laudiumbiz.Models.DTO;


import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ArticleRefinementRequest(
   @NotEmpty(message = "prompt is required")
   String prompt,
   @Positive @NotNull
   Integer articleId
) {
}
