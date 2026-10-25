package com.laudiumbiz.Laudiumbiz.Models.GeminiRest;

import java.util.List;
import java.util.Map;

/**
 * Model class for the "usageMetadata" field in the GeminiResponse class
 */
public class UsageMetadata {
    private Integer promptTokenCount;
    private Integer candidatesTokenCount;
    private Integer totalTokenCount;
    private String trafficType;
    private List<Map<String, Object>> promptTokensDetails;
    private List<Map<String, Object>> candidatesTokensDetails;

    public UsageMetadata() {
    }

    public UsageMetadata(Integer promptTokenCount, Integer candidatesTokenCount, Integer totalTokenCount,
                         String trafficType, List<Map<String, Object>> promptTokensDetails,
                         List<Map<String, Object>> candidatesTokensDetails) {
        this.promptTokenCount = promptTokenCount;
        this.candidatesTokenCount = candidatesTokenCount;
        this.totalTokenCount = totalTokenCount;
        this.trafficType = trafficType;
        this.promptTokensDetails = promptTokensDetails;
        this.candidatesTokensDetails = candidatesTokensDetails;
    }

    public Integer getPromptTokenCount() {
        return promptTokenCount;
    }

    public void setPromptTokenCount(Integer promptTokenCount) {
        this.promptTokenCount = promptTokenCount;
    }

    public Integer getCandidatesTokenCount() {
        return candidatesTokenCount;
    }

    public void setCandidatesTokenCount(Integer candidatesTokenCount) {
        this.candidatesTokenCount = candidatesTokenCount;
    }

    public Integer getTotalTokenCount() {
        return totalTokenCount;
    }

    public void setTotalTokenCount(Integer totalTokenCount) {
        this.totalTokenCount = totalTokenCount;
    }

    public String getTrafficType() {
        return trafficType;
    }

    public void setTrafficType(String trafficType) {
        this.trafficType = trafficType;
    }

    public List<Map<String, Object>> getPromptTokensDetails() {
        return promptTokensDetails;
    }

    public void setPromptTokensDetails(List<Map<String, Object>> promptTokensDetails) {
        this.promptTokensDetails = promptTokensDetails;
    }

    public List<Map<String, Object>> getCandidatesTokensDetails() {
        return candidatesTokensDetails;
    }

    public void setCandidatesTokensDetails(List<Map<String, Object>> candidatesTokensDetails) {
        this.candidatesTokensDetails = candidatesTokensDetails;
    }
}