package com.laudiumbiz.Laudiumbiz.Models.DTO;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public class BulkArticleByIdsRequest {
    @NotEmpty
    private List<@NotNull Integer> ids;

    // Optional recipient email to notify when bulk processing completes
    private String email;

    public BulkArticleByIdsRequest() {}

    public BulkArticleByIdsRequest(List<Integer> ids) {
        this.ids = ids;
    }

    public List<Integer> getIds() {
        return ids;
    }

    public void setIds(List<Integer> ids) {
        this.ids = ids;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}