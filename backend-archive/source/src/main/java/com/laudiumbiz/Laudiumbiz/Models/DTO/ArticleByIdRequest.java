package com.laudiumbiz.Laudiumbiz.Models.DTO;

import jakarta.validation.constraints.NotNull;

public class ArticleByIdRequest {
    @NotNull
    private Integer id;

    public ArticleByIdRequest() {}

    public ArticleByIdRequest(Integer id) {
        this.id = id;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }
}