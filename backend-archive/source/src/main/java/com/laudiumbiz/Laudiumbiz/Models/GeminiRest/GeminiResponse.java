package com.laudiumbiz.Laudiumbiz.Models.GeminiRest;

import java.util.List;

/**
 * Model class for Gemini REST API response
 */
public class GeminiResponse {
    private List<Candidate> candidates;
    private UsageMetadata usageMetadata;
    private String modelVersion;
    private String createTime;
    private String responseId;

    public GeminiResponse() {
    }

    public GeminiResponse(List<Candidate> candidates, UsageMetadata usageMetadata, String modelVersion, String createTime, String responseId) {
        this.candidates = candidates;
        this.usageMetadata = usageMetadata;
        this.modelVersion = modelVersion;
        this.createTime = createTime;
        this.responseId = responseId;
    }

    public List<Candidate> getCandidates() {
        return candidates;
    }

    public void setCandidates(List<Candidate> candidates) {
        this.candidates = candidates;
    }

    public UsageMetadata getUsageMetadata() {
        return usageMetadata;
    }

    public void setUsageMetadata(UsageMetadata usageMetadata) {
        this.usageMetadata = usageMetadata;
    }

    public String getModelVersion() {
        return modelVersion;
    }

    public void setModelVersion(String modelVersion) {
        this.modelVersion = modelVersion;
    }

    public String getCreateTime() {
        return createTime;
    }

    public void setCreateTime(String createTime) {
        this.createTime = createTime;
    }

    public String getResponseId() {
        return responseId;
    }

    public void setResponseId(String responseId) {
        this.responseId = responseId;
    }
}